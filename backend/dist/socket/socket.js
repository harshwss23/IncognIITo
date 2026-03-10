"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSocketHandlers = registerSocketHandlers;
const tokenService_1 = require("../services/tokenService");
const database_1 = require("../config/database"); // ✅ Added Database import
function getToken(socket) {
    const authToken = socket.handshake.auth?.token;
    if (authToken)
        return authToken;
    const authHeader = socket.handshake.headers?.authorization;
    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        return authHeader.slice(7);
    }
    return null;
}
// ✅ IMPORTANT: Notice the "export" keyword here! This fixes your crash.
function registerSocketHandlers(io) {
    // ✅ Auth middleware for sockets
    io.use((socket, next) => {
        try {
            const token = getToken(socket);
            if (!token)
                return next(new Error("AUTH_REQUIRED"));
            const payload = tokenService_1.tokenService.verifyToken(token);
            if (!payload)
                return next(new Error("INVALID_TOKEN"));
            socket.user = {
                userId: payload.userId,
                email: payload.email,
                verified: payload.verified,
            };
            next();
        }
        catch {
            next(new Error("AUTH_FAILED"));
        }
    });
    io.on("connection", (socket) => {
        const s = socket;
        const userId = s.user.userId;
        console.log("✅ Socket connected:", socket.id, "user:", userId);
        // Personal room (for notifications)
        socket.join(`user:${userId}`);
        // Join a chat room
        socket.on("join_chat", ({ chatId }) => {
            socket.join(`chat:${chatId}`);
            console.log(`User ${userId} joined chat:${chatId}`);
        });
        socket.on("leave_chat", ({ chatId }) => {
            socket.leave(`chat:${chatId}`);
            console.log(`User ${userId} left chat:${chatId}`);
        });
        // ✅ REALTIME PERSISTENCE: Save to DB then emit
        // ✅ Updated send_message handler in your Socket Controller
        socket.on("send_message", async ({ chatId, text, tempId }) => {
            if (!chatId || !text?.trim())
                return;
            try {
                const result = await (0, database_1.query)(`INSERT INTO messages (chat_id, sender_id, body)
       VALUES ($1, $2, $3)
       RETURNING id, chat_id, sender_id, body, created_at`, [chatId, userId, text.trim()]);
                const savedMessage = result.rows[0];
                const msgToEmit = {
                    id: savedMessage.id, // The real Database ID
                    tempId: tempId, // ✅ The frontend's temporary ID
                    chatId: savedMessage.chat_id,
                    senderId: savedMessage.sender_id,
                    text: savedMessage.body,
                    time: new Date(savedMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                };
                // Broadcast to the whole room (including sender)
                io.to(`chat:${chatId}`).emit("new_message", msgToEmit);
            }
            catch (err) {
                console.error("❌ Socket Error:", err);
            }
        });
        socket.on("disconnect", () => {
            console.log("❌ Socket disconnected:", socket.id, "user:", userId);
        });
    });
}
