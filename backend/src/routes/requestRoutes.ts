import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { query } from '../config/database';

const router = Router();

/**
 * POST /api/requests/send
 * body: { receiverId: number, message?: string }
 */
router.post(
  "/send",
  authMiddleware.authenticate.bind(authMiddleware),
  async (req: Request, res: Response) => {
    try {
      const senderId = req.user!.userId;
      const { receiverId, message } = req.body as { receiverId: number; message?: string };

      if (!receiverId || typeof receiverId !== "number") {
        return res.status(400).json({ success: false, message: "receiverId is required" });
      }

      if (receiverId === senderId) {
        return res.status(400).json({ success: false, message: "You cannot send request to yourself" });
      }

      // ensure receiver exists
      const u = await query(`SELECT id FROM users WHERE id = $1`, [receiverId]);
      if (u.rows.length === 0) {
        return res.status(404).json({ success: false, message: "Receiver not found" });
      }

      // Insert PENDING request
      // If you created the uniq_pending_request index, duplicates will error - we handle that.
      const result = await query(
        `INSERT INTO connection_requests (sender_id, receiver_id, message)
         VALUES ($1, $2, $3)
         RETURNING id, sender_id, receiver_id, status, message, created_at`,
        [senderId, receiverId, message || null]
      );

      return res.status(201).json({
        success: true,
        message: "Request sent",
        data: { request: result.rows[0] },
      });
    } catch (error: any) {
      // Duplicate pending request error (unique index)
      if (error?.code === "23505") {
        return res.status(409).json({
          success: false,
          message: "Request already pending to this user",
        });
      }

      console.error("Send request error:", error);
      return res.status(500).json({ success: false, message: "Failed to send request" });
    }
  }
);

/**
 * GET /api/requests/incoming?status=PENDING
 * default status=PENDING
 */
router.get(
  "/incoming",
  authMiddleware.authenticate.bind(authMiddleware),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const status = (req.query.status as string) || "PENDING";

      const result = await query(
        `SELECT r.id, r.sender_id, r.receiver_id, r.status, r.message, r.created_at, r.responded_at,
                u.email as sender_email, u.display_name as sender_display_name
         FROM connection_requests r
         JOIN users u ON u.id = r.sender_id
         WHERE r.receiver_id = $1 AND r.status = $2
         ORDER BY r.created_at DESC`,
        [userId, status]
      );

      return res.status(200).json({
        success: true,
        data: { requests: result.rows },
      });
    } catch (error) {
      console.error("Incoming requests error:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch incoming requests" });
    }
  }
);


// get lst of all mutual friends
router.get(
  "/mutual",
  authMiddleware.authenticate.bind(authMiddleware),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const status = (req.query.status as string) || "ACCEPTED";

      // ✅ FIXED: Now gets mutual friends whether you sent OR received the request.
      // ✅ FIXED: Using DISTINCT ON to strictly prevent duplicates
      // ✅ FIXED: Returning u.id as 'id' so React keys work correctly
      const result = await query(
        `SELECT DISTINCT ON (u.id)
                u.id, 
                c.id as chat_id,
                u.email as sender_email, 
                u.display_name as sender_display_name
         FROM connection_requests r
         JOIN users u ON (u.id = r.sender_id OR u.id = r.receiver_id) AND u.id != $1
         JOIN chats c ON (c.user1_id = $1 AND c.user2_id = u.id) OR (c.user1_id = u.id AND c.user2_id = $1)
         WHERE (r.sender_id = $1 OR r.receiver_id = $1) AND r.status = $2
         ORDER BY u.id, r.created_at DESC`,
        [userId, status]
      );

      return res.status(200).json({
        success: true,
        data: { requests: result.rows },
      });
    } catch (error) {
      console.error("Mutual friends error:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch mutual friends" });
    }
  }
);
/**
 * GET /api/requests/sent?status=PENDING
 * default status=PENDING
 */
router.get(
  "/sent",
  authMiddleware.authenticate.bind(authMiddleware),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const status = (req.query.status as string) || "PENDING";

      const result = await query(
        `SELECT r.id, r.sender_id, r.receiver_id, r.status, r.message, r.created_at, r.responded_at,
                u.email as receiver_email, u.display_name as receiver_display_name
         FROM connection_requests r
         JOIN users u ON u.id = r.receiver_id
         WHERE r.sender_id = $1 AND r.status = $2
         ORDER BY r.created_at DESC`,
        [userId, status]
      );

      return res.status(200).json({
        success: true,
        data: { requests: result.rows },
      });
    } catch (error) {
      console.error("Sent requests error:", error);
      return res.status(500).json({ success: false, message: "Failed to fetch sent requests" });
    }
  }
);

/**
 * POST /api/requests/:id/accept
 * Only receiver can accept a PENDING request
 */
/**
 * POST /api/requests/:id/accept
 * Only receiver can accept a PENDING request
 */
router.post("/:id/accept", authMiddleware.authenticate.bind(authMiddleware), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const requestId = Number(req.params.id);

    await query("BEGIN");

    const requestRes = await query(
      `SELECT sender_id, receiver_id, status
       FROM connection_requests
       WHERE id=$1
       FOR UPDATE`,
      [requestId]
    );

    if (requestRes.rows.length === 0) {
      await query("ROLLBACK");
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    const request = requestRes.rows[0];

    // ✅ FIXED: Changed request.to_user_id to request.receiver_id
    if (Number(request.receiver_id) !== Number(userId)) {
      await query("ROLLBACK");
      return res.status(403).json({ success: false, message: "Not authorized to accept this request" });
    }

    await query(
      `UPDATE connection_requests
       SET status='ACCEPTED', responded_at=NOW()
       WHERE id=$1`,
      [requestId]
    );

    // ✅ FIXED: Changed to request.sender_id and request.receiver_id
    const a = Math.min(request.sender_id, request.receiver_id);
    const b = Math.max(request.sender_id, request.receiver_id);

    const chatRes = await query(
      `INSERT INTO chats(user1_id, user2_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [a, b]
    );

    await query("COMMIT");

    res.json({
      success: true,
      message: "Connection accepted",
      data: {
        chatId: chatRes.rows[0]?.id || null
      }
    });

  } catch (err) {
    await query("ROLLBACK");
    console.error("Accept request error:", err);
    res.status(500).json({ success: false, message: "Database error" });
  }
});

/**
 * POST /api/requests/:id/reject
 * Only receiver can reject a PENDING request
 */
router.post(
  "/:id/reject",
  authMiddleware.authenticate.bind(authMiddleware),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const requestId = Number(req.params.id);

      if (!requestId) {
        return res.status(400).json({ success: false, message: "Invalid request id" });
      }

      const result = await query(
        `UPDATE connection_requests
         SET status = 'REJECTED', responded_at = NOW()
         WHERE id = $1 AND receiver_id = $2 AND status = 'PENDING'
         RETURNING id, sender_id, receiver_id, status, message, created_at, responded_at`,
        [requestId, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Request not found or not pending (or not yours)",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Request rejected",
        data: { request: result.rows[0] },
      });
    } catch (error) {
      console.error("Reject request error:", error);
      return res.status(500).json({ success: false, message: "Failed to reject request" });
    }
  }
);

/**
 * POST /api/requests/:id/cancel
 * Only sender can cancel a PENDING request
 */
router.post(
  "/:id/cancel",
  authMiddleware.authenticate.bind(authMiddleware),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const requestId = Number(req.params.id);

      if (!requestId) {
        return res.status(400).json({ success: false, message: "Invalid request id" });
      }

      const result = await query(
        `UPDATE connection_requests
         SET status = 'CANCELLED', responded_at = NOW()
         WHERE id = $1 AND sender_id = $2 AND status = 'PENDING'
         RETURNING id, sender_id, receiver_id, status, message, created_at, responded_at`,
        [requestId, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Request not found or not pending (or not yours)",
        });
      }

      return res.status(200).json({
        success: true,
        message: "Request cancelled",
        data: { request: result.rows[0] },
      });
    } catch (error) {
      console.error("Cancel request error:", error);
      return res.status(500).json({ success: false, message: "Failed to cancel request" });
    }
  }
);

export default router;