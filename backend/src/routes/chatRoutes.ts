import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { query } from '../config/database';

const router = Router();

// ✅ FIXED: Changed "/chats" to "/" so it resolves to "/api/chats"
router.get("/", authMiddleware.authenticate.bind(authMiddleware), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const result = await query(
      `SELECT 
          c.id as chat_id,
          u.id as other_user_id,
          u.display_name,
          u.email
       FROM chats c
       JOIN users u 
         ON u.id = CASE 
             WHEN c.user1_id = $1 THEN c.user2_id
             ELSE c.user1_id
         END
       WHERE c.user1_id = $1 OR c.user2_id = $1
       ORDER BY c.created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      data: {
        chats: result.rows
      }
    });

  } catch (err) {
    console.error("Fetch chats error:", err);
    res.status(500).json({ success: false });
  }
});

// ✅ FIXED: Changed "/chats/:chatId/messages" to "/:chatId/messages"
// ✅ FIXED: Added try/catch block
router.get("/:chatId/messages", authMiddleware.authenticate.bind(authMiddleware), async (req: Request, res: Response) => {
  try {
    const chatId = Number(req.params.chatId);

    // ✅ FIXED: Changed 'body' to 'text' to match your database schema
    const result = await query(
      `SELECT id, sender_id, body as text, created_at
       FROM messages
       WHERE chat_id=$1
       ORDER BY created_at ASC`,
      [chatId]
    );

    res.json({
      success: true,
      data: { messages: result.rows }
    });
  } catch (err) {
    console.error("Fetch messages error:", err);
    res.status(500).json({ success: false, message: "Failed to load chat history" });
  }
});

export default router;