// FILE: src/controllers/matchController.ts
// WHY: Frontend needs REST endpoints to join/leave queue + check status + get match details.

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
        queuePosition: queueSize,
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
  async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const roomId = await queueService.getActiveSession(userId);
      if (roomId) {
        const dbCheck = await query(
          `SELECT id FROM matchmaking_sessions WHERE room_id = $1 AND status = 'active'`,
          [roomId]
        );

        if (dbCheck.rows.length === 0) {
          await queueService.clearActiveSession(userId);
        } else {
          res.status(200).json({ success: true, status: 'matched', roomId });
          return;
        }
      }

      const inQueue = await queueService.isInQueue(userId);
      if (inQueue) {
        const queueSize = await queueService.getQueueSize();
        res.status(200).json({ success: true, status: 'waiting', queueSize });
        return;
      }

      res.status(200).json({ success: true, status: 'idle' });
    } catch (error) {
      console.error('Status check error:', error);
      res.status(500).json({ success: false, message: 'Failed to check status' });
    }
  }

  // POST /api/match/end
  async endSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const roomId = await queueService.getActiveSession(userId);
      if (!roomId) {
        res.status(400).json({ success: false, message: 'No active session' });
        return;
      }
      
      await queueService.clearActiveSession(userId);  

      const sessionResult = await query(
        `SELECT id, user1_id, user2_id FROM matchmaking_sessions
         WHERE room_id = $1 AND status = 'active'`,
        [roomId]
      );

      if (sessionResult.rows.length > 0) {
        const session = sessionResult.rows[0];
        const partnerId = session.user1_id === userId ? session.user2_id : session.user1_id;

        await query(
          `UPDATE matchmaking_sessions SET status = 'completed', session_end = NOW() WHERE id = $1`,
          [session.id]
        );
        await queueService.clearActiveSession(partnerId);  
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
        await client.query(`INSERT INTO user_profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`, [targetUserId]);
        
        const sessionsUpdate = await client.query(
          `UPDATE users SET sessions = COALESCE(sessions, 0) + 1 WHERE id = $1 RETURNING sessions`,
          [targetUserId]
        );

        const newSessions = Number(sessionsUpdate.rows[0].sessions);
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

  // GET /api/match/:roomId
  async getMatchDetails(req: Request, res: Response): Promise<void> {
    try {
      const { roomId } = req.params;
      const userId = Number(req.user!.userId); 

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
}

export const matchController = new MatchController();