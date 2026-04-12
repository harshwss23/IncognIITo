import { Router, Request, Response } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { query } from '../config/database';
import { queueService } from '../services/queueService'; // <-- IMPORT QUEUE SERVICE

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
      const { message } = req.body;
      const receiverId = Number(req.body.receiverId);

      if (!receiverId || isNaN(receiverId)) {
        return res.status(400).json({ success: false, message: "receiverId is required" });
      }

      if (receiverId === senderId) {
        return res.status(400).json({ success: false, message: "You cannot send request to yourself" });
      }

      // 1. Check if they are already mutual friends
      const mutualCheck = await query(
        `SELECT 1 FROM connection_requests 
         WHERE status = 'ACCEPTED' 
           AND (
             (sender_id = $1 AND receiver_id = $2) 
             OR (sender_id = $2 AND receiver_id = $1)
           )`,
        [senderId, receiverId]
      );

      if (mutualCheck.rows.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: "You Both are Already Mutual Friends" 
        });
      }

      // 2. ensure receiver exists
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
                u.email as sender_email,
                u.display_name as sender_display_name,
          sp.avatar_url as sender_avatar_url,
                COALESCE(
                  ARRAY(
                    SELECT DISTINCT i
                    FROM unnest(COALESCE(sp.interests, '{}'::text[])) AS i
                    INTERSECT
                    SELECT DISTINCT j
                    FROM unnest(COALESCE(rp.interests, '{}'::text[])) AS j
                  ),
                  '{}'::text[]
                ) AS "sharedTags",
                COALESCE(
                  (
                    SELECT ROUND(
                      CASE
                        WHEN union_count.cnt = 0 THEN 0
                        ELSE (intersection_count.cnt::numeric / union_count.cnt::numeric) * 100
                      END
                    )
                    FROM
                      (
                        SELECT COUNT(*) AS cnt
                        FROM (
                          SELECT DISTINCT i
                          FROM unnest(COALESCE(sp.interests, '{}'::text[])) AS i
                          UNION
                          SELECT DISTINCT j
                          FROM unnest(COALESCE(rp.interests, '{}'::text[])) AS j
                        ) AS union_items
                      ) AS union_count,
                      (
                        SELECT COUNT(*) AS cnt
                        FROM (
                          SELECT DISTINCT i
                          FROM unnest(COALESCE(sp.interests, '{}'::text[])) AS i
                          INTERSECT
                          SELECT DISTINCT j
                          FROM unnest(COALESCE(rp.interests, '{}'::text[])) AS j
                        ) AS intersection_items
                      ) AS intersection_count
                  ),
                  0
                )::int AS "matchScore"
         FROM connection_requests r
         JOIN users u ON u.id = r.sender_id
         LEFT JOIN user_profiles sp ON sp.user_id = r.sender_id
         LEFT JOIN user_profiles rp ON rp.user_id = r.receiver_id
         WHERE r.receiver_id = $1 AND r.status = $2
           AND NOT EXISTS (
             SELECT 1 FROM user_blocks 
             WHERE (blocker_id = r.sender_id AND blocked_id = $1)
                OR (blocker_id = $1 AND blocked_id = r.sender_id)
           )
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

      console.log(`[DEBUG - MUTUAL] Fetching friends for User ${userId} with status '${status}'`);

      const result = await query(
        `SELECT * FROM (
           SELECT DISTINCT ON (u.id)
                  u.id, 
                  u.id as other_user_id,
                  c.id as chat_id,
                  u.email as sender_email, 
                  u.display_name as sender_display_name,
                  up.avatar_url as sender_avatar_url,
                  COALESCE(up.is_banned, FALSE) as is_banned,
                  m.body as last_message,
                  m.created_at as last_message_time,
                  r.created_at as connection_created_at
           FROM connection_requests r
           JOIN users u ON (u.id = r.sender_id OR u.id = r.receiver_id) AND u.id != $1
           LEFT JOIN user_profiles up ON up.user_id = u.id
           LEFT JOIN chats c ON (c.user1_id = $1 AND c.user2_id = u.id) OR (c.user1_id = u.id AND c.user2_id = $1)
           LEFT JOIN LATERAL (
             SELECT body, created_at
             FROM messages
             WHERE chat_id = c.id
             ORDER BY created_at DESC
             LIMIT 1
           ) m ON true
           WHERE (r.sender_id = $1 OR r.receiver_id = $1) AND r.status = $2
             AND COALESCE(up.is_banned, FALSE) = FALSE
             AND NOT EXISTS (
               SELECT 1 FROM user_blocks 
               WHERE (blocker_id = u.id AND blocked_id = $1)
                  OR (blocker_id = $1 AND blocked_id = u.id)
             )
           ORDER BY u.id, m.created_at DESC NULLS LAST, r.created_at DESC
         ) sub
         ORDER BY COALESCE(last_message_time, connection_created_at) DESC`,
        [userId, status]
      );

      console.log(`[DEBUG - MUTUAL] SQL Query found ${result.rows.length} friends.`);

      // Grab the global Socket.io instance from Express
      const io = req.app.get("io");

      const friends = result.rows;
      
      // ✅ BULLETPROOF LOOP: Checks actual WebSockets for true "Online" presence
      for (let friend of friends) {
        try {
          if (friend.is_banned) {
              friend.is_online = false;
          } else {
              let isOnline = false;

              // Method 1: Check true WebSocket presence
              if (io) {
                  const globalUserRoom = `user_global_${friend.other_user_id}`;
                  const sockets = await io.in(globalUserRoom).fetchSockets();
                  isOnline = sockets.length > 0;
              } 
              
              // Method 2: Fallback to Matchmaking Queue just in case
              if (!isOnline) {
                  const activeRoom = await queueService.getActiveSession(friend.other_user_id);
                  isOnline = !!activeRoom; 
              }

              friend.is_online = isOnline; 
          }
        } catch (err) {
          console.error(`[DEBUG - MUTUAL] Status check failed for user ${friend.other_user_id}. Defaulting to offline.`);
          friend.is_online = false; // Failsafe
        }
      }

      return res.status(200).json({
        success: true,
        data: { requests: friends },
      });
    } catch (error) {
      console.error("[DEBUG - MUTUAL] MASSIVE FAILURE IN ROUTE:", error);
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
           AND NOT EXISTS (
             SELECT 1 FROM user_blocks 
             WHERE (blocker_id = r.receiver_id AND blocked_id = $1)
                OR (blocker_id = $1 AND blocked_id = r.receiver_id)
           )
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

    
    await query(
      `DELETE FROM connection_requests
       WHERE sender_id=$1 AND receiver_id=$2`,
      [userId, request.sender_id]
    );

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

/**
 * POST /api/requests/remove-connection
 * body: { targetUserId: number }
 * Removes an accepted connection between the current user and targetUserId.
 * Deletes the chat and its messages, and marks the connection_request as REMOVED.
 */
router.post(
  "/remove-connection",
  authMiddleware.authenticate.bind(authMiddleware),
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.userId;
      const targetUserId = Number(req.body.targetUserId);

      if (!targetUserId || isNaN(targetUserId)) {
        return res.status(400).json({ success: false, message: "targetUserId is required" });
      }

      if (targetUserId === userId) {
        return res.status(400).json({ success: false, message: "Cannot remove connection with yourself" });
      }

      await query("BEGIN");

      // Delete the connection request row entirely
      // (schema CHECK constraint only allows PENDING/ACCEPTED/REJECTED/CANCELLED so we can't set it to REMOVED)
      const delRes = await query(
        `DELETE FROM connection_requests
         WHERE status = 'ACCEPTED'
           AND (
             (sender_id = $1 AND receiver_id = $2)
             OR (sender_id = $2 AND receiver_id = $1)
           )
         RETURNING id`,
        [userId, targetUserId]
      );

      if (delRes.rows.length === 0) {
        await query("ROLLBACK");
        return res.status(404).json({ success: false, message: "No accepted connection found with this user" });
      }

      // Find and delete the chat + messages
      const a = Math.min(userId, targetUserId);
      const b = Math.max(userId, targetUserId);

      const chatRes = await query(
        `SELECT id FROM chats WHERE user1_id = $1 AND user2_id = $2`,
        [a, b]
      );

      if (chatRes.rows.length > 0) {
        const chatId = chatRes.rows[0].id;
        await query(`DELETE FROM messages WHERE chat_id = $1`, [chatId]);
        await query(`DELETE FROM chats WHERE id = $1`, [chatId]);
      }

      await query("COMMIT");

      return res.status(200).json({ success: true, message: "Connection removed" });
    } catch (error) {
      await query("ROLLBACK");
      console.error("Remove connection error:", error);
      return res.status(500).json({ success: false, message: "Failed to remove connection" });
    }
  }
);

export default router;