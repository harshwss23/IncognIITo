// FILE: src/controllers/matchController.ts
// WHY: Frontend needs REST endpoints to join/leave queue + check status.
//      The actual match notification comes via WebSocket (not HTTP).
// ENDPOINTS:
//   POST /api/match/join     → Put user in queue
//   POST /api/match/leave    → Remove user from queue
//   GET  /api/match/status   → Are you in queue or in a session?
//   POST /api/match/end      → End active session

import { Request, Response } from 'express';
import { queueService } from '../services/queueService';
import { pool, query } from '../config/database';

export class MatchController {

  // POST /api/match/join
  // User clicks "Find Match" button
  async joinQueue(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;

      // Check if user is already in an active session
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
        queuePosition: queueSize, // Approx position (not exact, for display only)
      });
    } catch (error: any) {
      if (error.message === 'Already in queue') {
        res.status(400).json({ success: false, message: 'Already in queue' });
        return;
      }
      console.error('Join queue error:', error);
      res.status(500).json({ success: false, message: 'Failed to join queue' });
    }
  }

  // POST /api/match/leave
  // User clicks "Cancel" while waiting
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

  // GET /api/match/status
  // Frontend polls this to know current state
  // Returns: waiting | matched | idle
  async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;

      // Check active session first (Redis)
      const roomId = await queueService.getActiveSession(userId);
      if (roomId) {
        // Cross-validate: confirm DB also says this session is still active
        // Prevents stale Redis keys (from crashes/restarts) from returning ghost roomIds
        const dbCheck = await query(
          `SELECT id FROM matchmaking_sessions WHERE room_id = $1 AND status = 'active'`,
          [roomId]
        );

        if (dbCheck.rows.length === 0) {
          // Redis says matched, but DB disagrees → stale key, self-heal
          await queueService.clearActiveSession(userId);
          console.log(`Cleared stale Redis session for user ${userId} (roomId: ${roomId} not active in DB)`);
          // Fall through to idle below
        } else {
          res.status(200).json({
            success: true,
            status: 'matched',
            roomId,
          });
          return;
        }
      }

      // Check if in queue
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


  // POST /api/match/end
  // User ends the session (clicks "Next" or "Leave")
  // async endSession(req: Request, res: Response): Promise<void> {
  //   try {
  //     const userId = req.user!.userId;

  //     const roomId = await queueService.getActiveSession(userId);
  //     if (!roomId) {
  //       res.status(400).json({ success: false, message: 'No active session' });
  //       return;
  //     }

  //     // Get session from DB to find the other user
  //     const sessionResult = await query(
  //       `SELECT id, user1_id, user2_id FROM matchmaking_sessions
  //        WHERE room_id = $1 AND status = 'active'`,
  //       [roomId]
  //     );

  //     if (sessionResult.rows.length > 0) {
  //       const session = sessionResult.rows[0];
  //       const partnerId = session.user1_id === userId
  //         ? session.user2_id
  //         : session.user1_id;

  //       // Mark session as completed in PostgreSQL
  //       await query(
  //         `UPDATE matchmaking_sessions
  //          SET status = 'completed', session_end = NOW()
  //          WHERE id = $1`,
  //         [session.id]
  //       );

  //       // Clear both users' session from Redis
  //       await Promise.all([
  //         queueService.clearActiveSession(userId),
  //         queueService.clearActiveSession(partnerId),
  //       ]);
  //     }

  //     res.status(200).json({ success: true, message: 'Session ended' });
  //   } catch (error) {
  //     console.error('End session error:', error);
  //     res.status(500).json({ success: false, message: 'Failed to end session' });
  //   }
  // }
  async endSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const roomId = await queueService.getActiveSession(userId);
      if (!roomId) {
        res.status(400).json({ success: false, message: 'No active session' });
        return;
      }
      // Always clear the caller's session from Redis immediately
      await queueService.clearActiveSession(userId);  // ← MOVED OUT of the if block
      // Get session from DB to find the other user
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
        // Mark session as completed in PostgreSQL
        await query(
          `UPDATE matchmaking_sessions
          SET status = 'completed', session_end = NOW()
          WHERE id = $1`,
          [session.id]
        );
        // Clear partner's session from Redis
        await queueService.clearActiveSession(partnerId);  // ← Only partner here now
      }
      res.status(200).json({ success: true, message: 'Session ended' });
    } catch (error) {
      console.error('End session error:', error);
      res.status(500).json({ success: false, message: 'Failed to end session' });
    }
  }

  // POST /api/match/rate
  async rateSession(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { roomId, rating } = req.body as { roomId?: string; rating?: number };

    if (!roomId || typeof roomId !== 'string') {
      res.status(400).json({ success: false, message: 'roomId is required' });
      return;
    }

    const numericRating = Number(rating);
    if (!Number.isFinite(numericRating) || numericRating < 1 || numericRating > 5) {
      res.status(400).json({ success: false, message: 'rating must be between 1 and 5' });
      return;
    }

    try {
      const sessionResult = await query(
        `SELECT id, user1_id, user2_id, rated_by_user1, rated_by_user2
         FROM matchmaking_sessions
         WHERE room_id = $1`,
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

      const alreadyRated = isUser1 ? session.rated_by_user1 : session.rated_by_user2;
      if (alreadyRated) {
        res.status(409).json({ success: false, message: 'Rating already submitted for this session' });
        return;
      }

      const targetUserId = isUser1 ? session.user2_id : session.user1_id;
      const flagColumn = isUser1 ? 'rated_by_user1' : 'rated_by_user2';

      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        await client.query(
          `INSERT INTO user_profiles (user_id) VALUES ($1)
           ON CONFLICT (user_id) DO NOTHING`,
          [targetUserId]
        );

        const sessionsUpdate = await client.query(
          `UPDATE users SET sessions = COALESCE(sessions, 0) + 1
           WHERE id = $1 RETURNING sessions`,
          [targetUserId]
        );

        if (sessionsUpdate.rowCount === 0) {
          await client.query('ROLLBACK');
          res.status(404).json({ success: false, message: 'Target user not found' });
          return;
        }

        const newSessions: number = Number(sessionsUpdate.rows[0].sessions);
        const previousSessions = newSessions - 1;

        const ratingResult = await client.query(
          `SELECT rating_sum, rating FROM user_profiles WHERE user_id = $1`,
          [targetUserId]
        );

        const currentSum = ratingResult.rows.length > 0 ? Number(ratingResult.rows[0].rating_sum || 0) : 0;
        const newSum = currentSum + numericRating;
        const updatedRating = newSum / newSessions;

        await client.query(
          `UPDATE user_profiles SET rating = $1, rating_sum = $2 WHERE user_id = $3`,
          [updatedRating, newSum, targetUserId]
        );

        await client.query(
          `UPDATE matchmaking_sessions SET ${flagColumn} = TRUE WHERE id = $1`,
          [session.id]
        );

        await client.query('COMMIT');

        res.status(200).json({
          success: true,
          message: 'Rating submitted',
          data: {
            targetUserId,
            rating: updatedRating,
            sessions: newSessions,
          },
        });
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Rate session error:', error);
        res.status(500).json({ success: false, message: 'Failed to submit rating' });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Rate session error:', error);
      res.status(500).json({ success: false, message: 'Failed to submit rating' });
    }
  }

}

export const matchController = new MatchController();

