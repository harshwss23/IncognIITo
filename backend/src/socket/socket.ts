import type { Server, Socket } from "socket.io";
import { tokenService } from "../services/tokenService";
import { query } from "../config/database"; // ✅ Added Database import

type AuthedSocket = Socket & {
  user?: { userId: number; email: string; verified: boolean };
};

function getToken(socket: Socket) {
  const authToken = (socket.handshake.auth as any)?.token;
  if (authToken) return authToken;

  const authHeader = socket.handshake.headers?.authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
}

// ✅ IMPORTANT: Notice the "export" keyword here! This fixes your crash.
export function registerSocketHandlers(io: Server) {
  // ✅ Auth middleware for sockets
  io.use((socket, next) => {
    try {
      const token = getToken(socket);
      if (!token) return next(new Error("AUTH_REQUIRED"));

      const { payload, reason } = tokenService.verifyTokenDetailed(token);
      if (!payload) return next(new Error(reason === "expired" ? "TOKEN_EXPIRED" : "INVALID_TOKEN"));

      (socket as AuthedSocket).user = {
        userId: payload.userId,
        email: payload.email,
        verified: payload.verified,
      };
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

    // Personal room (for notifications)
    socket.join(`user:${userId}`);

    // Join a chat room
    socket.on("join_chat", ({ chatId }: { chatId: number | string }) => {
      socket.join(`chat:${chatId}`);
      console.log(`User ${userId} joined chat:${chatId}`);
    });

    socket.on("leave_chat", ({ chatId }: { chatId: number | string }) => {
      socket.leave(`chat:${chatId}`);
      console.log(`User ${userId} left chat:${chatId}`);
    });

    // ✅ REALTIME PERSISTENCE: Save to DB then emit
// ✅ Updated send_message handler in your Socket Controller
socket.on("send_message", async ({ chatId, text, tempId }: { chatId: number; text: string; tempId?: string }) => {
  if (!chatId || !text?.trim()) return;

  try {
    const result = await query(
      `INSERT INTO messages (chat_id, sender_id, body)
       VALUES ($1, $2, $3)
       RETURNING id, chat_id, sender_id, body, created_at`,
      [chatId, userId, text.trim()]
    );

    const savedMessage = result.rows[0];

    const msgToEmit = {
      id: savedMessage.id, // The real Database ID
      tempId: tempId,      // ✅ The frontend's temporary ID
      chatId: savedMessage.chat_id,
      senderId: savedMessage.sender_id,
      text: savedMessage.body,
      time: new Date(savedMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Broadcast to the whole room (including sender)
    io.to(`chat:${chatId}`).emit("new_message", msgToEmit);

  } catch (err) {
    console.error("❌ Socket Error:", err);
  }
});

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