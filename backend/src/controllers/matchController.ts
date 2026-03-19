// FILE: src/controllers/matchController.ts
// WHY: Frontend needs REST endpoints to join/leave queue + check status + get match details.

import { Request, Response } from 'express';
import { queueService } from '../services/queueService';
import { query } from '../config/database';

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
        const dbCheck = await query(
          `SELECT id FROM matchmaking_sessions WHERE room_id = $1 AND status = 'active'`,
          [roomId]
        );

        if (dbCheck.rows.length === 0) {
          // Redis says matched, but DB disagrees → stale key, self-heal
          await queueService.clearActiveSession(userId);
          console.log(`Cleared stale Redis session for user ${userId} (roomId: ${roomId} not active in DB)`);
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
  async endSession(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const roomId = await queueService.getActiveSession(userId);
      if (!roomId) {
        res.status(400).json({ success: false, message: 'No active session' });
        return;
      }
      
      // Always clear the caller's session from Redis immediately
      await queueService.clearActiveSession(userId);  

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
        await queueService.clearActiveSession(partnerId);  
      }
      res.status(200).json({ success: true, message: 'Session ended' });
    } catch (error) {
      console.error('End session error:', error);
      res.status(500).json({ success: false, message: 'Failed to end session' });
    }
  }

  // ==========================================
  // NEW: GET /api/match/:roomId
  // Gets the usernames and interests for the video call overlay
  // ==========================================
 async getMatchDetails(req: Request, res: Response): Promise<void> {
    try {
      const { roomId } = req.params;
      const userId = Number(req.user!.userId); // 🚨 FIX: Force convert to Number

      // 1. Find the active match for this room
      const sessionResult = await query(
        `SELECT user1_id, user2_id 
         FROM matchmaking_sessions 
         WHERE room_id = $1 AND status = 'active'`,
        [roomId]
      );

      if (sessionResult.rows.length === 0) {
        res.status(404).json({ success: false, message: 'Active match not found' });
        return;
      }

      const session = sessionResult.rows[0];
      const u1 = Number(session.user1_id); // 🚨 BIGINT to Number
      const u2 = Number(session.user2_id); // 🚨 BIGINT to Number

      // 2. Security Check: Ensure caller is in this match
      if (u1 !== userId && u2 !== userId) {
        res.status(403).json({ success: false, message: 'Unauthorized to view this match' });
        return;
      }

      // 3. Identify partner
      const partnerId = u1 === userId ? u2 : u1;

      // 4. Fetch Display Names and Interests for BOTH users
      const profilesResult = await query(
        `SELECT u.id, u.display_name, p.interests 
         FROM users u
         LEFT JOIN user_profiles p ON u.id = p.user_id
         WHERE u.id IN ($1, $2)`,
        [userId, partnerId]
      );

      let me: any = null;
      let them: any = null;

      profilesResult.rows.forEach(row => {
        // Make sure interests array is formatted correctly
        const userInterests = Array.isArray(row.interests) ? row.interests : [];

        const userData = {
          username: row.display_name || `IncognIITo User`, 
          interests: userInterests
        };

        // 🚨 MAIN FIX: Compare safely as Numbers!
        if (Number(row.id) === userId) {
          me = userData;
        } else {
          them = userData;
        }
      });

      // 5. Send back the data for the frontend overlays
      res.status(200).json({
        success: true,
        me,
        them
      });

    } catch (error) {
      console.error('Get match details error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch match details' });
    }
  }
}

export const matchController = new MatchController();