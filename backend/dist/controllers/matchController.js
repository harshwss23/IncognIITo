"use strict";
// FILE: src/controllers/matchController.ts
// WHY: Frontend needs REST endpoints to join/leave queue + check status.
//      The actual match notification comes via WebSocket (not HTTP).
// ENDPOINTS:
//   POST /api/match/join     → Put user in queue
//   POST /api/match/leave    → Remove user from queue
//   GET  /api/match/status   → Are you in queue or in a session?
//   POST /api/match/end      → End active session
Object.defineProperty(exports, "__esModule", { value: true });
exports.matchController = exports.MatchController = void 0;
const queueService_1 = require("../services/queueService");
const database_1 = require("../config/database");
class MatchController {
    // POST /api/match/join
    // User clicks "Find Match" button
    async joinQueue(req, res) {
        try {
            const userId = req.user.userId;
            // Check if user is already in an active session
            const activeSession = await queueService_1.queueService.getActiveSession(userId);
            if (activeSession) {
                res.status(400).json({
                    success: false,
                    message: 'You are already in an active session',
                    roomId: activeSession,
                });
                return;
            }
            await queueService_1.queueService.joinQueue(userId);
            const queueSize = await queueService_1.queueService.getQueueSize();
            res.status(200).json({
                success: true,
                message: 'Joined matching queue',
                queuePosition: queueSize, // Approx position (not exact, for display only)
            });
        }
        catch (error) {
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
    async leaveQueue(req, res) {
        try {
            const userId = req.user.userId;
            await queueService_1.queueService.leaveQueue(userId);
            res.status(200).json({ success: true, message: 'Left queue' });
        }
        catch (error) {
            console.error('Leave queue error:', error);
            res.status(500).json({ success: false, message: 'Failed to leave queue' });
        }
    }
    // GET /api/match/status
    // Frontend polls this to know current state
    // Returns: waiting | matched | idle
    async getStatus(req, res) {
        try {
            const userId = req.user.userId;
            // Check active session first (Redis)
            const roomId = await queueService_1.queueService.getActiveSession(userId);
            if (roomId) {
                // Cross-validate: confirm DB also says this session is still active
                // Prevents stale Redis keys (from crashes/restarts) from returning ghost roomIds
                const dbCheck = await (0, database_1.query)(`SELECT id FROM matchmaking_sessions WHERE room_id = $1 AND status = 'active'`, [roomId]);
                if (dbCheck.rows.length === 0) {
                    // Redis says matched, but DB disagrees → stale key, self-heal
                    await queueService_1.queueService.clearActiveSession(userId);
                    console.log(`Cleared stale Redis session for user ${userId} (roomId: ${roomId} not active in DB)`);
                    // Fall through to idle below
                }
                else {
                    res.status(200).json({
                        success: true,
                        status: 'matched',
                        roomId,
                    });
                    return;
                }
            }
            // Check if in queue
            const inQueue = await queueService_1.queueService.isInQueue(userId);
            if (inQueue) {
                const queueSize = await queueService_1.queueService.getQueueSize();
                res.status(200).json({
                    success: true,
                    status: 'waiting',
                    queueSize,
                });
                return;
            }
            res.status(200).json({ success: true, status: 'idle' });
        }
        catch (error) {
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
    async endSession(req, res) {
        try {
            const userId = req.user.userId;
            const roomId = await queueService_1.queueService.getActiveSession(userId);
            if (!roomId) {
                res.status(400).json({ success: false, message: 'No active session' });
                return;
            }
            // Always clear the caller's session from Redis immediately
            await queueService_1.queueService.clearActiveSession(userId); // ← MOVED OUT of the if block
            // Get session from DB to find the other user
            const sessionResult = await (0, database_1.query)(`SELECT id, user1_id, user2_id FROM matchmaking_sessions
        WHERE room_id = $1 AND status = 'active'`, [roomId]);
            if (sessionResult.rows.length > 0) {
                const session = sessionResult.rows[0];
                const partnerId = session.user1_id === userId
                    ? session.user2_id
                    : session.user1_id;
                // Mark session as completed in PostgreSQL
                await (0, database_1.query)(`UPDATE matchmaking_sessions
          SET status = 'completed', session_end = NOW()
          WHERE id = $1`, [session.id]);
                // Clear partner's session from Redis
                await queueService_1.queueService.clearActiveSession(partnerId); // ← Only partner here now
            }
            res.status(200).json({ success: true, message: 'Session ended' });
        }
        catch (error) {
            console.error('End session error:', error);
            res.status(500).json({ success: false, message: 'Failed to end session' });
        }
    }
}
exports.MatchController = MatchController;
exports.matchController = new MatchController();
