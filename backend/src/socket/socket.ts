// ============================================================================
// FILE: src/socket/socket.ts
// PURPOSE: Primary WebSocket sub-controller focused purely on standard chatting 
//          logic (real-time messages, typing indicators). Auth validation restricts 
//          unverified connections.
// ============================================================================

import type { Server, Socket } from "socket.io";
import { tokenService } from "../services/tokenService";
import { query } from "../config/database"; 

type AuthedSocket = Socket & {
  user?: { userId: number; email: string; verified: boolean };
};

/**
 * Parses and returns the JSON Web Token natively traversing WebSockets via headers or auth payloads.
 * 
 * @param {Socket} socket - Connecting Socket client
 * @returns {string | null} The raw token string or null if unauthenticated
 */
function getToken(socket: Socket) {
  const authToken = (socket.handshake.auth as any)?.token;
  if (authToken) return authToken;

  const authHeader = socket.handshake.headers?.authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
}

/**
 * Wires standard interaction and messaging chat events directly into the Socket.IO Server.
 * 
 * @param {Server} io - Initialized Main Socket.io Server instance
 */
export function registerSocketHandlers(io: Server) {
  
  // Step-by-step: Evaluate tokens directly inside connection lifecycle to sever 
  // compromised connections instantly.
  io.use((socket, next) => {
    try {
      const token = getToken(socket);
      if (!token) return next(new Error("AUTH_REQUIRED"));

      const { payload, reason } = tokenService.verifyTokenDetailed(token);
      if (!payload) return next(new Error(reason === "expired" ? "TOKEN_EXPIRED" : "INVALID_TOKEN"));

      // Inject parsed user constraints directly back onto the socket context 
      (socket as AuthedSocket).user = {
        userId: payload.userId,
        email: payload.email,
        verified: payload.verified,
      };
      
      // Duplicate to core Socket Data architecture
      socket.data.userId = payload.userId;

      next();
    } catch {
      next(new Error("AUTH_FAILED"));
    }
  });

  io.on("connection", (socket) => {
    const s = socket as AuthedSocket;
    const userId = s.user!.userId;

    console.log("✅ Socket connected:", socket.id, "user:", userId);

    // Personal room allocation enabling direct notifications to single specific users
    socket.join(`user:${userId}`);

    // Join a general Chat room
    socket.on("join_chat", ({ chatId }: { chatId: number | string }) => {
      socket.join(`chat:${chatId}`);
      console.log(`User ${userId} joined chat:${chatId}`);
    });

    socket.on("leave_chat", ({ chatId }: { chatId: number | string }) => {
      socket.leave(`chat:${chatId}`);
      console.log(`User ${userId} left chat:${chatId}`);
    });

    // ------------------------------------------------------------------------
    // REALTIME PERSISTENCE LOGIC (Direct Database Bind)
    // ------------------------------------------------------------------------
    socket.on("send_message", async ({ chatId, text, tempId }: { chatId: number; text: string; tempId?: string }) => {
      // Step-by-step: Fast-exit guards returning immediately if fundamental data is missing
      if (!chatId || !text?.trim()) return;

      try {
        // Step-by-step: Write natively back to PostgreSQL to prevent message loss 
        // even if frontend instances collapse right after sending.
        const result = await query(
          `INSERT INTO messages (chat_id, sender_id, body)
           VALUES ($1, $2, $3)
           RETURNING id, chat_id, sender_id, body, created_at`,
          [chatId, userId, text.trim()]
        );

        const savedMessage = result.rows[0];

        // Frame the payload into strict frontend contract parameters
        const msgToEmit = {
          id: savedMessage.id, // Absolute server ID representation
          tempId: tempId,      // Client's mapping reference to clear loading indicators
          chatId: savedMessage.chat_id,
          senderId: savedMessage.sender_id,
          text: savedMessage.body,
          time: new Date(savedMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        // Broadcast exclusively back within the encapsulated chat boundaries
        io.to(`chat:${chatId}`).emit("new_message", msgToEmit);

      } catch (err) {
        console.error("❌ Socket Error:", err);
      }
    });

    // ------------------------------------------------------------------------
    // TRANSIENT INDICATORS
    // ------------------------------------------------------------------------
    socket.on("typing", ({ chatId }: { chatId: number | string }) => {
      socket.to(`chat:${chatId}`).emit("typing_status", { chatId, userId, isTyping: true });
    });

    socket.on("stop_typing", ({ chatId }: { chatId: number | string }) => {
      socket.to(`chat:${chatId}`).emit("typing_status", { chatId, userId, isTyping: false });
    });

    socket.on("disconnect", () => {
      console.log("❌ Socket disconnected:", socket.id, "user:", userId);
    });
  });
}