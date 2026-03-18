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

      // Check active session first
      const roomId = await queueService.getActiveSession(userId);
      if (roomId) {
        res.status(200).json({
          success: true,
          status: 'matched',
          roomId,
        });
        return;
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

        // Clear both users' session from Redis
        await Promise.all([
          queueService.clearActiveSession(userId),
          queueService.clearActiveSession(partnerId),
        ]);
      }

      res.status(200).json({ success: true, message: 'Session ended' });
    } catch (error) {
      console.error('End session error:', error);
      res.status(500).json({ success: false, message: 'Failed to end session' });
    }
  }

  // POST /api/match/rate
  // User rates the person they just chatted with (optional)
  async rateUser(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { rating } = req.body;

      // Validate rating if provided
      if (rating !== null && rating !== undefined) {
        if (rating < 1 || rating > 5 || !Number.isInteger(rating)) {
          res.status(400).json({
            success: false,
            message: 'Rating must be an integer between 1 and 5'
          });
          return;
        }
      }

      // Get the current session's room ID
      const roomId = await queueService.getActiveSession(userId);
      if (!roomId) {
        res.status(400).json({ success: false, message: 'No active session found' });
        return;
      }

      // Get session from DB to find the other user
      const sessionResult = await query(
        `SELECT id, user1_id, user2_id FROM matchmaking_sessions
         WHERE room_id = $1 AND (status = 'active' OR status = 'completed')`,
        [roomId]
      );

      if (sessionResult.rows.length === 0) {
        res.status(400).json({ success: false, message: 'Session not found' });
        return;
      }

      const session = sessionResult.rows[0];
      const targetUserId = session.user1_id === userId
        ? session.user2_id
        : session.user1_id;

      // Only update rating if provided
      if (rating !== null && rating !== undefined) {
        const profileResult = await query(
          `SELECT rating, rating_count FROM user_profiles WHERE user_id = $1`,
          [targetUserId]
        );

        let newRating = rating;
        let newRatingCount = 1;

        if (profileResult.rows.length > 0) {
          const { rating: currentRating, rating_count: currentCount } = profileResult.rows[0];
          newRatingCount = (currentCount || 0) + 1;
          
          // Calculate weighted average: (current_rating * current_count + new_rating) / new_count
          newRating = ((currentRating * (currentCount || 0)) + rating) / newRatingCount;
        }

        // Update user profile with new rating and rating count
        await query(
          `UPDATE user_profiles
           SET rating = $1, rating_count = $2, updated_at = NOW()
           WHERE user_id = $3`,
          [newRating, newRatingCount, targetUserId]
        );

        res.status(200).json({
          success: true,
          message: 'Rating submitted successfully',
          newRating: newRating.toFixed(2),
          ratingCount: newRatingCount
        });
      } else {
        res.status(200).json({
          success: true,
          message: 'Feedback submitted successfully'
        });
      }
    } catch (error) {
      console.error('Rate user error:', error);
      res.status(500).json({ success: false, message: 'Failed to submit feedback' });
    }
  }
}

export const matchController = new MatchController();
