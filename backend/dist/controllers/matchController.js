"use strict";
// FILE: src/controllers/matchController.ts
// WHY: Frontend needs REST endpoints to join/leave queue, check status, and manage match data.
// ENDPOINTS:
//   POST /api/match/join       → Put user in queue
//   POST /api/match/leave      → Remove user from queue
//   GET  /api/match/status     → Are you in queue or in a session?
//   POST /api/match/end        → End active session
//   POST /api/match/rate       → Rate a completed match
//   GET  /api/match/:roomId    → Get rich match details (me & them)
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
    async endSession(req, res) {
        try {
            const userId = req.user.userId;
            const roomId = await queueService_1.queueService.getActiveSession(userId);
            if (!roomId) {
                res.status(400).json({ success: false, message: 'No active session' });
                return;
            }
            // Always clear the caller's session from Redis immediately
            await queueService_1.queueService.clearActiveSession(userId);
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
                await queueService_1.queueService.clearActiveSession(partnerId);
            }
            res.status(200).json({ success: true, message: 'Session ended' });
        }
        catch (error) {
            console.error('End session error:', error);
            res.status(500).json({ success: false, message: 'Failed to end session' });
        }
    }
    // GET /api/match/session/:roomId (Example route, adjust if needed)
    // Basic session details fetcher
    async getSessionDetails(req, res) {
        try {
            const userId = req.user.userId;
            const roomId = req.params.roomId;
            const sessionResult = await (0, database_1.query)(`SELECT s.id, s.user1_id, s.user2_id, 
                u1.display_name as user1_name, u2.display_name as user2_name,
                u1.email as user1_email, u2.email as user2_email
         FROM matchmaking_sessions s
         JOIN users u1 ON s.user1_id = u1.id
         JOIN users u2 ON s.user2_id = u2.id
         WHERE s.room_id = $1`, [roomId]);
            if (sessionResult.rows.length === 0) {
                res.status(404).json({ success: false, message: 'Session not found' });
                return;
            }
            const session = sessionResult.rows[0];
            // Ensure the requesting user was part of this session
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
        }
        catch (error) {
            console.error('Get session details error:', error);
            res.status(500).json({ success: false, message: 'Failed to get session details' });
        }
    }
    // POST /api/match/rate
    // Rate the session user just completed
    async rateSession(req, res) {
        const userId = req.user.userId;
        const { roomId, rating } = req.body;
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
            const sessionResult = await (0, database_1.query)(`SELECT id, user1_id, user2_id, rated_by_user1, rated_by_user2
         FROM matchmaking_sessions WHERE room_id = $1`, [roomId]);
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
            const client = await database_1.pool.connect();
            try {
                await client.query('BEGIN');
                await client.query(`INSERT INTO user_profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`, [targetUserId]);
                const sessionsUpdate = await client.query(`UPDATE user_profiles SET total_chats = COALESCE(total_chats, 0) + 1 WHERE user_id = $1 RETURNING total_chats`, [targetUserId]);
                const newSessions = Number(sessionsUpdate.rows[0].total_chats);
                const ratingResult = await client.query(`SELECT rating_sum FROM user_profiles WHERE user_id = $1`, [targetUserId]);
                const currentSum = Number(ratingResult.rows[0]?.rating_sum || 0);
                const newSum = currentSum + numericRating;
                const updatedRating = newSum / newSessions;
                await client.query(`UPDATE user_profiles SET rating = $1, rating_sum = $2 WHERE user_id = $3`, [updatedRating, newSum, targetUserId]);
                await client.query(`UPDATE matchmaking_sessions SET ${flagColumn} = TRUE WHERE id = $1`, [session.id]);
                await client.query('COMMIT');
                res.status(200).json({ success: true, message: 'Rating submitted' });
            }
            catch (error) {
                await client.query('ROLLBACK');
                throw error;
            }
            finally {
                client.release();
            }
        }
        catch (error) {
            console.error('Rate session error:', error);
            res.status(500).json({ success: false, message: 'Failed to submit rating' });
        }
    }
    // GET /api/match/:roomId
    // Rich match details fetcher (includes 'me' and 'them' separation with interests)
    async getMatchDetails(req, res) {
        try {
            const { roomId } = req.params;
            const userId = Number(req.user.userId);
            const sessionResult = await (0, database_1.query)(`SELECT user1_id, user2_id FROM matchmaking_sessions WHERE room_id = $1 AND status = 'active'`, [roomId]);
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
            const profilesResult = await (0, database_1.query)(`SELECT u.id, u.display_name, u.email, p.interests FROM users u
         LEFT JOIN user_profiles p ON u.id = p.user_id WHERE u.id IN ($1, $2)`, [userId, partnerId]);
            let me = null, them = null;
            profilesResult.rows.forEach(row => {
                const userData = {
                    id: Number(row.id),
                    username: row.display_name || `IncognIITo User`,
                    email: row.email,
                    interests: Array.isArray(row.interests) ? row.interests : []
                };
                if (Number(row.id) === userId)
                    me = userData;
                else
                    them = userData;
            });
            res.status(200).json({ success: true, me, them });
        }
        catch (error) {
            console.error('Get match details error:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch match details' });
        }
    }
    // POST /api/match/force-disconnect
    // Takes over the session by kicking out frozen/background tabs
    async forceDisconnect(req, res) {
        try {
            const userId = req.user.userId;
            // 1. Get the Socket.IO instance from Express app
            const io = req.app.get("io");
            if (io) {
                // 2. Find all old sockets (frozen tabs) for this user
                const globalUserRoom = `user_global_${userId}`;
                const existingSockets = await io.in(globalUserRoom).fetchSockets();
                // 3. Forcefully disconnect them from the server side
                existingSockets.forEach((socket) => {
                    console.log(`🧨 Force disconnecting frozen socket ${socket.id} for user ${userId}`);
                    socket.emit("duplicate_session_detected");
                    socket.disconnect(true);
                });
            }
            // 4. Clean up Queue & Matchmaking States
            await queueService_1.queueService.leaveQueue(userId).catch(() => { });
            const roomId = await queueService_1.queueService.getActiveSession(userId);
            if (roomId) {
                // Tell the partner that the session ended
                if (io)
                    io.to(roomId).emit("session_ended", "Your partner's session was taken over by another device.");
                // Mark session as completed in PostgreSQL
                const sessionResult = await (0, database_1.query)(`SELECT id, user1_id, user2_id FROM matchmaking_sessions WHERE room_id = $1 AND status = 'active'`, [roomId]);
                if (sessionResult.rows.length > 0) {
                    const session = sessionResult.rows[0];
                    await (0, database_1.query)(`UPDATE matchmaking_sessions SET status = 'completed', session_end = NOW() WHERE id = $1`, [session.id]);
                    // Clear Redis active sessions for both users
                    await queueService_1.queueService.clearActiveSession(session.user1_id);
                    await queueService_1.queueService.clearActiveSession(session.user2_id);
                }
            }
            res.status(200).json({ success: true, message: "Old sessions forcefully terminated." });
        }
        catch (error) {
            console.error("Force disconnect error:", error);
            res.status(500).json({ success: false, message: "Failed to force disconnect old sessions" });
        }
    }
}
exports.MatchController = MatchController;
exports.matchController = new MatchController();
