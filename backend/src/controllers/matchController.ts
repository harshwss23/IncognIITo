// ============================================================================
// FILE: src/controllers/matchController.ts
// PURPOSE: Handles REST capabilities for queueing mechanics. Enables joining, 
//          leaving, and terminating dynamic 1-on-1 relationships.
// ============================================================================

import { Request, Response } from 'express';
import { queueService } from '../services/queueService';
import { pool, query } from '../config/database';

export class MatchController {

  /**
   * Submits the authenticated user into the live matchmaking queue waiting list.
   * * @param {Request} req - The client HTTPS request wrapping the execution context.
   * @param {Response} res - The server HTTP dispatch object.
   * @returns {Promise<void>}
   */
  async joinQueue(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;

      // 🧱 API MATCHMAKING BOUNCER 🧱
      const banCheck = await query(
          'SELECT COALESCE(is_banned, FALSE) as is_banned FROM user_profiles WHERE user_id = $1',
          [userId]
      );

      if (banCheck.rows.length > 0 && banCheck.rows[0].is_banned) {
          console.log(`🚨 BLOCKED API QUEUE JOIN FOR BANNED USER: ${userId}`);
          res.status(403).json({ 
              success: false, 
              message: 'Your account is permanently banned. You cannot join matchmaking.' 
          });
          return;
      }
      // 🧱 ========================== 🧱

      // Step-by-step: Ensure they are not already actively interacting before caching into queue again
      const activeSession = await queueService.getActiveSession(userId);
      if (activeSession) {
        res.status(400).json({
          success: false,
          message: 'You are already in an active session',
          roomId: activeSession,
        });
        return;
      }

      await queueService.joinQueue(userId);

      const queueSize = await queueService.getQueueSize();

      res.status(200).json({
        success: true,
        message: 'Joined matching queue',
        queuePosition: queueSize,
      });
    } catch (error: any) {
      // Step-by-step: Relay harmless Redis queue exceptions appropriately 
      if (error.message === 'Already in queue') {
        res.status(400).json({ success: false, message: 'Already in queue' });
        return;
      }
      console.error('Join queue error:', error);
      res.status(500).json({ success: false, message: 'Failed to join queue' });
    }
  }

  /**
   * Preemptively extracts a user from the active algorithmic search pool.
   * * @param {Request} req - The HTTPS Request node.
   * @param {Response} res - The HTTPS Response node.
   * @returns {Promise<void>}
   */
  async leaveQueue(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      await queueService.leaveQueue(userId);

      res.status(200).json({ success: true, message: 'Left queue' });
    } catch (error) {
      console.error('Leave queue error:', error);
      res.status(500).json({ success: false, message: 'Failed to leave queue' });
    }
  }

  /**
   * Checks the user's volatile matching status across the Redis and persistent DB strata.
   * Typically continuously queried by the frontend clients traversing state workflows.
   * * @param {Request} req - The HTTPS Request node.
   * @param {Response} res - The HTTPS Response node reflecting an idle, waiting, or matched state.
   * @returns {Promise<void>}
   */
  async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;

      // 🧱 THE ACTIVE QUEUE BOUNCER 🧱
      const banCheck = await query(
        'SELECT COALESCE(is_banned, FALSE) as is_banned FROM user_profiles WHERE user_id = $1',
        [userId]
      );

      if (banCheck.rows.length > 0 && banCheck.rows[0].is_banned) {
        console.log(`🚨 KICKING BANNED USER ${userId} OUT OF ACTIVE QUEUE (Polling Intercepted)`);
        
        // Vigorously scrub them from Redis and the DB queue
        await queueService.cleanupUser(userId).catch(() => {});
        
        res.status(403).json({ 
          success: false, 
          status: 'banned',
          message: 'Your account has been permanently banned.' 
        });
        return;
      }
      // 🧱 ============================ 🧱

      // Step-by-step: Validate initial cached session markers targeting the fast volatile memory (Redis)
      const roomId = await queueService.getActiveSession(userId);
      if (roomId) {
        // Step-by-step: CROSS-VALIDATION against hard truth PostgreSQL
        // Pre-empts phantom Redis sessions resulting from ungraceful backend restarts out-syncing states
        const dbCheck = await query(
          `SELECT id FROM matchmaking_sessions WHERE room_id = $1 AND status = 'active'`,
          [roomId]
        );

        if (dbCheck.rows.length === 0) {
          // Self-heal operation if the session metadata degraded across layers unexpectedly
          await queueService.clearActiveSession(userId);
          console.log(`Cleared stale Redis session for user ${userId} (roomId: ${roomId} not active in DB)`);
        } else {
          // Reliable true-positive active match
          res.status(200).json({
            success: true,
            status: 'matched',
            roomId,
          });
          return;
        }
      }

      // Step-by-step: If unassigned, confirm queue presence logic
      const inQueue = await queueService.isInQueue(userId);
      if (inQueue) {
        const queueSize = await queueService.getQueueSize();
        res.status(200).json({
          success: true,
          status: 'waiting',
          queueSize,
        });
        return;
      }

      res.status(200).json({ success: true, status: 'idle' });
    } catch (error) {
      console.error('Status check error:', error);
      res.status(500).json({ success: false, message: 'Failed to check status' });
    }
  }

  /**
   * Forcibly destroys the authenticated agent's active session, allowing queues to reset cleanly.
   * * @param {Request} req - The HTTPS Request node.
   * @param {Response} res - The HTTPS Response node.
   * @returns {Promise<void>}
   */
  async endSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const roomId = await queueService.getActiveSession(userId);
      
      if (!roomId) {
        res.status(400).json({ success: false, message: 'No active session' });
        return;
      }
      
      // Step-by-step: Pre-emptively evict native host to prevent phantom holds internally
      await queueService.clearActiveSession(userId);  

      // Step-by-step: Extract corresponding paired user data structurally from primary repository
      const sessionResult = await query(
        `SELECT id, user1_id, user2_id FROM matchmaking_sessions
         WHERE room_id = $1 AND status = 'active'`,
        [roomId]
      );
      
      if (sessionResult.rows.length > 0) {
        const session = sessionResult.rows[0];
        const partnerId = session.user1_id === userId
          ? session.user2_id
          : session.user1_id;
          
        // Substep: Register termination in central ledger tracking history
        await query(
          `UPDATE matchmaking_sessions
           SET status = 'completed', session_end = NOW()
           WHERE id = $1`,
          [session.id]
        );
        // Substep: Clear remote peer cache cleanly enabling both re-queue procedures simultaneously
        await queueService.clearActiveSession(partnerId);  
      }
      res.status(200).json({ success: true, message: 'Session ended' });
    } catch (error) {
      console.error('End session error:', error);
      res.status(500).json({ success: false, message: 'Failed to end session' });
    }
  }

  /**
   * Accumulates foundational identity statistics matching contextual IDs cleanly.
   * * @param {Request} req - The HTTPS Request containing the associated Room lookup ID parameter.
   * @param {Response} res - The HTTPS Response defining identity objects logically.
   * @returns {Promise<void>}
   */
  async getSessionDetails(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const roomId = req.params.roomId;

      const sessionResult = await query(
        `SELECT s.id, s.user1_id, s.user2_id, 
                u1.display_name as user1_name, u2.display_name as user2_name,
                u1.email as user1_email, u2.email as user2_email
         FROM matchmaking_sessions s
         JOIN users u1 ON s.user1_id = u1.id
         JOIN users u2 ON s.user2_id = u2.id
         WHERE s.room_id = $1`,
        [roomId]
      );

      if (sessionResult.rows.length === 0) {
        res.status(404).json({ success: false, message: 'Session not found' });
        return;
      }

      const session = sessionResult.rows[0];
      
      // Defense: Strict ownership alignment validation to shield PII (Personally Identifiable Information)
      if (session.user1_id !== userId && session.user2_id !== userId) {
         res.status(403).json({ success: false, message: 'Unauthorized access to session' });
         return;
      }

      const partnerId = session.user1_id === userId ? session.user2_id : session.user1_id;
      const partnerName = session.user1_id === userId ? session.user2_name : session.user1_name;
      const partnerEmail = session.user1_id === userId ? session.user2_email : session.user1_email;

      res.status(200).json({ 
        success: true, 
        partnerId, 
        partnerName,
        partnerEmail 
      });
    } catch (error) {
      console.error('Get session details error:', error);
      res.status(500).json({ success: false, message: 'Failed to get session details' });
    }
  }

  /**
   * Applies cumulative moving-average profile scores seamlessly at session exit, recording inputs dynamically.
   * * @param {Request} req - The HTTPS Request supplying numerical rating points for an existing room.
   * @param {Response} res - The HTTPS Response acknowledging score placement.
   * @returns {Promise<void>}
   */
  async rateSession(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { roomId, rating } = req.body as { roomId?: string; rating?: number };

    // Defense: Ensure foundational parameters exist and hold strictly scalar boundaries securely 
    if (!roomId || typeof roomId !== 'string') {
      res.status(400).json({ success: false, message: 'roomId is required' });
      return;
    }

    const numericRating = Number(rating);
    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      res.status(400).json({ success: false, message: 'rating must be an integer between 1 and 5' });
      return;
    }

    try {
      const sessionResult = await query(
        `SELECT id, user1_id, user2_id, rated_by_user1, rated_by_user2
         FROM matchmaking_sessions WHERE room_id = $1`,
        [roomId]
      );

      if (sessionResult.rows.length === 0) {
        res.status(404).json({ success: false, message: 'Session not found' });
        return;
      }

      const session = sessionResult.rows[0];
      const isUser1 = session.user1_id === userId;
      const isUser2 = session.user2_id === userId;

      if (!isUser1 && !isUser2) {
        res.status(403).json({ success: false, message: 'You are not part of this session' });
        return;
      }

      // Step-by-step: Lock users out of duplicated score multipliers for fairness calculations natively 
      const alreadyRated = isUser1 ? session.rated_by_user1 : session.rated_by_user2;
      if (alreadyRated) {
        res.status(409).json({ success: false, message: 'Rating already submitted for this session' });
        return;
      }

      const targetUserId = isUser1 ? session.user2_id : session.user1_id;
      const flagColumn = isUser1 ? 'rated_by_user1' : 'rated_by_user2';

      // Step-by-step: Encapsulate operations within ACID Transaction logic enabling uniform consistency structurally
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(`INSERT INTO user_profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`, [targetUserId]);
        
        const sessionsUpdate = await client.query(
          `UPDATE user_profiles SET total_chats = COALESCE(total_chats, 0) + 1 WHERE user_id = $1 RETURNING total_chats`,
          [targetUserId]
        );

        // Calculate moving average mathematical logic
        const newSessions = Number(sessionsUpdate.rows[0].total_chats);
        const ratingResult = await client.query(`SELECT rating_sum FROM user_profiles WHERE user_id = $1`, [targetUserId]);
        const currentSum = Number(ratingResult.rows[0]?.rating_sum || 0);
        const newSum = currentSum + numericRating;
        const updatedRating = newSum / newSessions;

        await client.query(`UPDATE user_profiles SET rating = $1, rating_sum = $2 WHERE user_id = $3`, [updatedRating, newSum, targetUserId]);
        await client.query(`UPDATE matchmaking_sessions SET ${flagColumn} = TRUE WHERE id = $1`, [session.id]);
        
        await client.query('COMMIT');
        res.status(200).json({ success: true, message: 'Rating submitted' });
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Rate session error:', error);
      res.status(500).json({ success: false, message: 'Failed to submit rating' });
    }
  }

  /**
   * Supplies composite relationship structural metadata extracting "me" & "them" formats directly.
   * Leveraged principally during internal active chat contexts dynamically parsing interests.
   * * @param {Request} req - The HTTPS Request payload targeting the specific active interaction.
   * @param {Response} res - The payload holding dynamically computed interest structures.
   * @returns {Promise<void>}
   */
  async getMatchDetails(req: Request, res: Response): Promise<void> {
    try {
      const { roomId } = req.params;
      const userId = Number(req.user!.userId); 

      // Data normalization query resolving dual-axis structures cleanly
      const sessionResult = await query(
        `SELECT user1_id, user2_id FROM matchmaking_sessions WHERE room_id = $1 AND status = 'active'`,
        [roomId]
      );

      if (sessionResult.rows.length === 0) {
        res.status(404).json({ success: false, message: 'Active match not found' });
        return;
      }

      const session = sessionResult.rows[0];
      const u1 = Number(session.user1_id); 
      const u2 = Number(session.user2_id); 

      // Access prohibition 
      if (u1 !== userId && u2 !== userId) {
        res.status(403).json({ success: false, message: 'Unauthorized' });
        return;
      }

      const partnerId = u1 === userId ? u2 : u1;
      const profilesResult = await query(
        `SELECT u.id, u.display_name, u.email, p.interests FROM users u
         LEFT JOIN user_profiles p ON u.id = p.user_id WHERE u.id IN ($1, $2)`,
        [userId, partnerId]
      );

      // Step-by-step: Evaluate rows programmatically parsing individual profiles into contextual identities representing me and them natively
      let me: any = null, them: any = null;
      profilesResult.rows.forEach(row => {
        const userData = {
          id: Number(row.id),
          username: row.display_name || `IncognIITo User`, 
          email: row.email,
          interests: Array.isArray(row.interests) ? row.interests : []
        };
        if (Number(row.id) === userId) me = userData;
        else them = userData;
      });

      res.status(200).json({ success: true, me, them });
    } catch (error) {
      console.error('Get match details error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch match details' });
    }
  }

  /**
   * Explicitly evicts underlying structural hooks associated with inactive 'ghost' sessions. 
   * Executes socket kills implicitly allowing safe reconnection instances globally. 
   * * @param {Request} req - Target node calling the cleanup sequence payload safely. 
   * @param {Response} res - Response dictating execution success metrics properly.
   * @returns {Promise<void>}
   */
  async forceDisconnect(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      
      // Step-by-step: Capture WebRTC underlying network logic statically hooked into Express explicitly
      const io = req.app.get("io"); 

      if (io) {
        const globalUserRoom = `user_global_${userId}`;
        const existingSockets = await io.in(globalUserRoom).fetchSockets();

        // Step-by-step: Destroy unverified orphaned sockets gracefully pushing messages externally telling them they were dropped natively
        existingSockets.forEach((socket: any) => {
          console.log(`🧨 Force disconnecting frozen socket ${socket.id} for user ${userId}`);
          socket.emit("duplicate_session_detected");
          socket.disconnect(true);
        });
      }

      // Step-by-step: Clean up native server queue bindings completely tearing down legacy states internally
      await queueService.leaveQueue(userId).catch(() => {});
      
      const roomId = await queueService.getActiveSession(userId);
      if (roomId) {
        if (io) io.to(roomId).emit("session_ended", "Your partner's session was taken over by another device.");
        
        const sessionResult = await query(
          `SELECT id, user1_id, user2_id FROM matchmaking_sessions WHERE room_id = $1 AND status = 'active'`,
          [roomId]
        );

        if (sessionResult.rows.length > 0) {
          const session = sessionResult.rows[0];
          await query(
            `UPDATE matchmaking_sessions SET status = 'completed', session_end = NOW() WHERE id = $1`,
            [session.id]
          );
          
          await queueService.clearActiveSession(session.user1_id);
          await queueService.clearActiveSession(session.user2_id);
        }
      }

      res.status(200).json({ success: true, message: "Old sessions forcefully terminated." });
    } catch (error) {
      console.error("Force disconnect error:", error);
      res.status(500).json({ success: false, message: "Failed to force disconnect old sessions" });
    }
  }
}

export const matchController = new MatchController();