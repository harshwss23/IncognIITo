"use strict";
// ============================================================================
// FILE: src/controllers/adminController.ts
// PURPOSE: Real Database-backed administrative dashboard controllers. Handles 
//          moderating reports, enforcing bans, fetching active metrics, and user logs.
// ============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminController = exports.AdminController = void 0;
const database_1 = require("../config/database");
const queueService_1 = require("../services/queueService"); // <-- IMPORT QUEUE SERVICE
class AdminController {
    /**
     * Fetches all registered users (excluding admins). Supports partial search filtering.
     * * @param {Request} req - The Express request object containing the '?search=' query.
     * @param {Response} res - The Express response object transmitting the JSON array constraint.
     * @returns {Promise<void>}
     */
    async getUsers(req, res) {
        try {
            const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
            // Step-by-step: Construct dynamic parameterized query to retrieve flattened
            // status details based on violation history and bans.
            let sql = `
        SELECT u.id,
               COALESCE(u.display_name, 'No Name') AS "userId",
               u.email,
               u.verified,
               COALESCE(p.total_reports, 0)       AS "totalReports",
               COALESCE(p.rating, 0)              AS rating,
               CASE
                 WHEN p.is_banned = TRUE   THEN 'banned'
                 WHEN p.total_reports >= 3 THEN 'flagged'
                 ELSE 'active'
               END                                 AS status
        FROM users u
        LEFT JOIN user_profiles p ON u.id = p.user_id
        WHERE COALESCE(u.is_admin, FALSE) = FALSE
      `;
            const params = [];
            // Step-by-step: Concatenate ILIKE clause strictly through safe parameterized variables
            if (search) {
                sql += ` AND (u.display_name ILIKE $1 OR u.email ILIKE $1)`;
                params.push(`%${search}%`);
            }
            sql += ` ORDER BY u.id DESC`;
            const result = await (0, database_1.query)(sql, params);
            res.json(result.rows);
        }
        catch (error) {
            console.error('Admin getUsers error:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch users' });
        }
    }
    /**
     * Fetches active user-submitted violation reports, allowing status filtration.
     * * @param {Request} req - The Express request object.
     * @param {Response} res - The Express response object.
     * @returns {Promise<void>}
     */
    async getReports(req, res) {
        try {
            const statusFilter = typeof req.query.status === 'string' ? req.query.status : '';
            let sql = `
        SELECT r.id,
               r.target_id AS "targetId",  -- THIS WAS MISSING!
               ('R-' || r.id)                                       AS "reportId",
               (reporter.email || ' ➡️ ' || t.email) AS "targetUser",
               r.reason,
               r.status
        FROM reports r
        JOIN users t ON t.id = r.target_id
        JOIN users reporter ON reporter.id = r.reporter_id
      `;
            const params = [];
            // Step-by-step: Apply exact-match filtering safely via parameterization
            if (statusFilter) {
                sql += ` WHERE r.status = $1`;
                params.push(statusFilter);
            }
            sql += ` ORDER BY r.created_at DESC`;
            const result = await (0, database_1.query)(sql, params);
            res.json(result.rows);
        }
        catch (error) {
            console.error('Admin getReports error:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch reports' });
        }
    }
    /**
     * Resolves or dismisses an active user report based on administrator actions.
     * * @param {Request} req - The Express request object containing the target report ID and payload.
     * @param {Response} res - The Express response object reflecting status mutation.
     * @returns {Promise<void>}
     */
    async updateReport(req, res) {
        try {
            const reportId = Number(req.params.id);
            const { status, adminNote } = req.body;
            // Defense: Strict enumeration to prevent arbitrary status bindings
            if (!['Resolved', 'Dismissed'].includes(status)) {
                res.status(400).json({ success: false, message: 'Status must be Resolved or Dismissed' });
                return;
            }
            // Step-by-step: Safely update report logs tying resolution identity mathematically to the admin
            const result = await (0, database_1.query)(`UPDATE reports
         SET status      = $1,
             admin_note  = COALESCE($2, admin_note),
             resolved_by = $3,
             updated_at  = NOW()
         WHERE id = $4
         RETURNING id, status`, [status, adminNote || null, req.user.userId, reportId]);
            if (result.rows.length === 0) {
                res.status(404).json({ success: false, message: 'Report not found' });
                return;
            }
            res.json({ success: true, data: result.rows[0] });
        }
        catch (error) {
            console.error('Admin updateReport error:', error);
            res.status(500).json({ success: false, message: 'Failed to update report' });
        }
    }
    /**
     * Instantly enacts a platform block marking the specified user as banned.
     * Immediately disrupts underlying cached session tokens to drop current connections.
     * * @param {Request} req - The Express request object containing the target offender ID.
     * @param {Response} res - The Express response object.
     * @returns {Promise<void>}
     */
    async banUser(req, res) {
        try {
            const targetId = Number(req.params.id);
            // ADD THIS SAFETY CHECK:
            if (isNaN(targetId)) {
                res.status(400).json({ success: false, message: 'Invalid User ID provided by frontend' });
                return;
            }
            const adminId = req.user?.userId || req.user?.id || 1;
            if (targetId === adminId) {
                res.status(400).json({ success: false, message: 'Cannot ban yourself' });
                return;
            }
            // ==========================================
            // STEP 1: ENFORCE THE BAN (Mandatory)
            // ==========================================
            await (0, database_1.query)(`UPDATE user_profiles SET is_banned = TRUE WHERE user_id = $1`, [targetId]);
            // ==========================================
            // STEP 2: RESOLVE REPORTS (Safe Zone)
            // ==========================================
            try {
                await (0, database_1.query)(`UPDATE reports 
           SET status = 'Resolved', 
               admin_note = 'User banned by admin', 
               resolved_by = $1, 
               updated_at = NOW() 
           WHERE target_id = $2 AND status = 'Pending'`, [adminId, targetId]);
            }
            catch (reportErr) {
                console.error("Non-fatal error cleaning reports:", reportErr);
            }
            // ==========================================
            // STEP 3: KILL SESSIONS (Safe Zone)
            // ==========================================
            try {
                await (0, database_1.query)(`DELETE FROM sessions WHERE user_id = $1`, [targetId]);
            }
            catch (sessionErr) {
                console.error("Non-fatal error deleting sessions (table might not exist):", sessionErr);
            }
            // ==========================================
            // STEP 4: 💥 THE ACTIVE STRIKE 💥
            // ==========================================
            try {
                // 1. Violently rip them out of the Redis queue and active DB sessions
                await queueService_1.queueService.cleanupUser(targetId).catch(err => console.error("Failed to clean queue on ban:", err));
                // 2. Grab the global Socket.io instance
                const io = req.app.get("io");
                if (io) {
                    const globalUserRoom = `user_global_${targetId}`;
                    // Tell their frontend to self-destruct immediately
                    io.to(globalUserRoom).emit("banned_force_logout", {
                        message: "Your account has been permanently banned."
                    });
                    // Brutally sever all active TCP/WebSocket connections they currently have open
                    const existingSockets = await io.in(globalUserRoom).fetchSockets();
                    existingSockets.forEach((socket) => {
                        console.log(`🧨 Snipping active socket ${socket.id} for freshly banned user ${targetId}`);
                        socket.disconnect(true);
                    });
                }
            }
            catch (strikeErr) {
                console.error("Non-fatal error during Active Strike:", strikeErr);
            }
            // ==========================================
            res.json({ success: true, message: 'User banned successfully' });
        }
        catch (error) {
            console.error('CRITICAL Admin banUser error:', error);
            res.status(500).json({ success: false, message: `DB Error: ${error.message}` });
        }
    }
    /**
     * Lifts an active ban off a user profile.
     * * @param {Request} req - The Express request object encompassing the target ID.
     * @param {Response} res - The Express response object.
     * @returns {Promise<void>}
     */
    async unbanUser(req, res) {
        try {
            const targetId = Number(req.params.id);
            await (0, database_1.query)(`UPDATE user_profiles SET is_banned = FALSE WHERE user_id = $1`, [targetId]);
            res.json({ success: true, message: 'User unbanned successfully' });
        }
        catch (error) {
            console.error('Admin unbanUser error:', error);
            res.status(500).json({ success: false, message: 'Failed to unban user' });
        }
    }
    /**
     * Retrieves high-level numeric overviews for central administrative visualization.
     * * @param {Request} req - The Express request object.
     * @param {Response} res - The Express response object.
     * @returns {Promise<void>}
     */
    async getStats(_req, res) {
        try {
            // Step-by-step: Efficiently multiplex analytical queries concurrently
            const [total, active, banned, pending] = await Promise.all([
                (0, database_1.query)(`SELECT COUNT(*) AS count FROM users`),
                (0, database_1.query)(`SELECT COUNT(*) AS count FROM users u LEFT JOIN user_profiles p ON u.id = p.user_id WHERE COALESCE(p.is_banned, FALSE) = FALSE`),
                (0, database_1.query)(`SELECT COUNT(*) AS count FROM user_profiles WHERE is_banned = TRUE`),
                (0, database_1.query)(`SELECT COUNT(*) AS count FROM reports WHERE status = 'Pending'`),
            ]);
            res.json({
                totalUsers: Number(total.rows[0].count),
                activeUsers: Number(active.rows[0].count),
                bannedUsers: Number(banned.rows[0].count),
                pendingReports: Number(pending.rows[0].count),
            });
        }
        catch (error) {
            console.error('Admin getStats error:', error);
            res.status(500).json({ success: false, message: 'Failed to fetch stats' });
        }
    }
}
exports.AdminController = AdminController;
exports.adminController = new AdminController();
