"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const database_1 = require("../config/database");
const router = (0, express_1.Router)();
// ✅ Update: Include last_message and filter by cleared_at
router.get("/", authMiddleware_1.authMiddleware.authenticate.bind(authMiddleware_1.authMiddleware), async (req, res) => {
    try {
        const userId = req.user.userId;
        const result = await (0, database_1.query)(`SELECT 
          c.id as chat_id,
          u.id as other_user_id,
          u.display_name,
          u.email,
          p.avatar_url,
          m.body as last_message,
          m.created_at as last_message_time
       FROM chats c
       JOIN users u 
         ON u.id = CASE 
             WHEN c.user1_id = $1 THEN c.user2_id
             ELSE c.user1_id
         END
       LEFT JOIN user_profiles p ON u.id = p.user_id
       LEFT JOIN LATERAL (
         SELECT body, created_at
         FROM messages
         WHERE chat_id = c.id
           AND created_at > COALESCE(
             CASE 
               WHEN c.user1_id = $1 THEN c.user1_cleared_at
               ELSE c.user2_cleared_at
             END, 
             '1970-01-01'
           )
         ORDER BY created_at DESC
         LIMIT 1
       ) m ON true
       WHERE (c.user1_id = $1 OR c.user2_id = $1)
         AND NOT EXISTS (
           SELECT 1 FROM user_blocks 
           WHERE (blocker_id = u.id AND blocked_id = $1)
              OR (blocker_id = $1 AND blocked_id = u.id)
         )
       ORDER BY COALESCE(m.created_at, c.created_at) DESC`, [userId]);
        res.json({
            success: true,
            data: {
                chats: result.rows
            }
        });
    }
    catch (err) {
        console.error("Fetch chats error:", err);
        res.status(500).json({ success: false });
    }
});
// ✅ Update: Filter messages by cleared_at
router.get("/:chatId/messages", authMiddleware_1.authMiddleware.authenticate.bind(authMiddleware_1.authMiddleware), async (req, res) => {
    try {
        const chatId = Number(req.params.chatId);
        const userId = req.user.userId;
        const result = await (0, database_1.query)(`SELECT m.id, m.sender_id, m.body as text, m.created_at
       FROM messages m
       JOIN chats c ON c.id = m.chat_id
       WHERE m.chat_id = $1 
         AND m.created_at > COALESCE(
           CASE 
             WHEN c.user1_id = $2 THEN c.user1_cleared_at
             ELSE c.user2_cleared_at
           END, 
           '1970-01-01'
         )
       ORDER BY m.created_at ASC`, [chatId, userId]);
        res.json({
            success: true,
            data: { messages: result.rows }
        });
    }
    catch (err) {
        console.error("Fetch messages error:", err);
        res.status(500).json({ success: false, message: "Failed to load chat history" });
    }
});
// ✅ Update: Set cleared_at timestamp instead of deleting
router.delete("/:chatId/messages", authMiddleware_1.authMiddleware.authenticate.bind(authMiddleware_1.authMiddleware), async (req, res) => {
    try {
        const chatId = Number(req.params.chatId);
        const userId = req.user.userId;
        // 1. Verify user is part of this chat and update the correct cleared_at column
        const updateResult = await (0, database_1.query)(`UPDATE chats 
       SET 
         user1_cleared_at = CASE WHEN user1_id = $2 THEN CURRENT_TIMESTAMP ELSE user1_cleared_at END,
         user2_cleared_at = CASE WHEN user2_id = $2 THEN CURRENT_TIMESTAMP ELSE user2_cleared_at END
       WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)
       RETURNING id`, [chatId, userId]);
        if (updateResult.rows.length === 0) {
            return res.status(403).json({ success: false, message: "Unauthorized or chat not found" });
        }
        res.json({ success: true, message: "Chat history cleared successfully" });
    }
    catch (err) {
        console.error("Clear chat error:", err);
        res.status(500).json({ success: false, message: "Failed to clear chat history" });
    }
});
exports.default = router;
