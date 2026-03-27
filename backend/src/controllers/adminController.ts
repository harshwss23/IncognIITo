// ============================================================================
// FILE: src/controllers/adminController.ts
// PURPOSE: Real Database-backed administrative dashboard controllers. Handles 
//          moderating reports, enforcing bans, fetching active metrics, and user logs.
// ============================================================================

import { Request, Response } from 'express';
import { query } from '../config/database';

export class AdminController {

  /**
   * Fetches all registered users (excluding admins). Supports partial search filtering.
   * 
   * @param {Request} req - The Express request object containing the '?search=' query.
   * @param {Response} res - The Express response object transmitting the JSON array constraint.
   * @returns {Promise<void>}
   */
  async getUsers(req: Request, res: Response): Promise<void> {
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
      const params: any[] = [];

      // Step-by-step: Concatenate ILIKE clause strictly through safe parameterized variables
      if (search) {
        sql += ` AND (u.display_name ILIKE $1 OR u.email ILIKE $1)`;
        params.push(`%${search}%`);
      }

      sql += ` ORDER BY u.id DESC`;

      const result = await query(sql, params);
      res.json(result.rows);
    } catch (error) {
      console.error('Admin getUsers error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch users' });
    }
  }

  /**
   * Fetches active user-submitted violation reports, allowing status filtration.
   * 
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<void>}
   */
  async getReports(req: Request, res: Response): Promise<void> {
    try {
      const statusFilter = typeof req.query.status === 'string' ? req.query.status : '';

      let sql = `
        SELECT r.id,
               ('R-' || r.id)                                       AS "reportId",
               (reporter.email || ' ➡️ ' || t.email) AS "targetUser",
               r.reason,
               r.status
        FROM reports r
        JOIN users t ON t.id = r.target_id
        JOIN users reporter ON reporter.id = r.reporter_id
      `;
      const params: any[] = [];

      // Step-by-step: Apply exact-match filtering safely via parameterization
      if (statusFilter) {
        sql += ` WHERE r.status = $1`;
        params.push(statusFilter);
      }

      sql += ` ORDER BY r.created_at DESC`;

      const result = await query(sql, params);
      res.json(result.rows);
    } catch (error) {
      console.error('Admin getReports error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch reports' });
    }
  }

  /**
   * Resolves or dismisses an active user report based on administrator actions.
   * 
   * @param {Request} req - The Express request object containing the target report ID and payload.
   * @param {Response} res - The Express response object reflecting status mutation.
   * @returns {Promise<void>}
   */
  async updateReport(req: Request, res: Response): Promise<void> {
    try {
      const reportId = Number(req.params.id);
      const { status, adminNote } = req.body as { status: string; adminNote?: string };

      // Defense: Strict enumeration to prevent arbitrary status bindings
      if (!['Resolved', 'Dismissed'].includes(status)) {
        res.status(400).json({ success: false, message: 'Status must be Resolved or Dismissed' });
        return;
      }

      // Step-by-step: Safely update report logs tying resolution identity mathematically to the admin
      const result = await query(
        `UPDATE reports
         SET status      = $1,
             admin_note  = COALESCE($2, admin_note),
             resolved_by = $3,
             updated_at  = NOW()
         WHERE id = $4
         RETURNING id, status`,
        [status, adminNote || null, req.user!.userId, reportId]
      );

      if (result.rows.length === 0) {
        res.status(404).json({ success: false, message: 'Report not found' });
        return;
      }

      res.json({ success: true, data: result.rows[0] });
    } catch (error) {
      console.error('Admin updateReport error:', error);
      res.status(500).json({ success: false, message: 'Failed to update report' });
    }
  }

  /**
   * Instantly enacts a platform block marking the specified user as banned.
   * Immediately disrupts underlying cached session tokens to drop current connections.
   * 
   * @param {Request} req - The Express request object containing the target offender ID.
   * @param {Response} res - The Express response object.
   * @returns {Promise<void>}
   */
  async banUser(req: Request, res: Response): Promise<void> {
    try {
      const targetId = Number(req.params.id);

      // Defense: Prevent catastrophic locking logic
      if (targetId === req.user!.userId) {
        res.status(400).json({ success: false, message: 'Cannot ban yourself' });
        return;
      }

      // Step-by-step: Upsert query flags the target's underlying operational record as banned conclusively
      await query(
        `INSERT INTO user_profiles (user_id, is_banned)
         VALUES ($1, TRUE)
         ON CONFLICT (user_id) DO UPDATE SET is_banned = TRUE`,
        [targetId]
      );

      // Step-by-step: Actively severe current authorized communication by stripping session tokens securely
      await query(`DELETE FROM sessions WHERE user_id = $1`, [targetId]);

      res.json({ success: true, message: 'User banned successfully' });
    } catch (error) {
      console.error('Admin banUser error:', error);
      res.status(500).json({ success: false, message: 'Failed to ban user' });
    }
  }

  /**
   * Lifts an active ban off a user profile.
   * 
   * @param {Request} req - The Express request object encompassing the target ID.
   * @param {Response} res - The Express response object.
   * @returns {Promise<void>}
   */
  async unbanUser(req: Request, res: Response): Promise<void> {
    try {
      const targetId = Number(req.params.id);

      await query(
        `UPDATE user_profiles SET is_banned = FALSE WHERE user_id = $1`,
        [targetId]
      );

      res.json({ success: true, message: 'User unbanned successfully' });
    } catch (error) {
      console.error('Admin unbanUser error:', error);
      res.status(500).json({ success: false, message: 'Failed to unban user' });
    }
  }

  /**
   * Retrieves high-level numeric overviews for central administrative visualization.
   * 
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<void>}
   */
  async getStats(_req: Request, res: Response): Promise<void> {
    try {
      // Step-by-step: Efficiently multiplex analytical queries concurrently
      const [total, active, banned, pending] = await Promise.all([
        query(`SELECT COUNT(*) AS count FROM users`),
        query(`SELECT COUNT(*) AS count FROM users u LEFT JOIN user_profiles p ON u.id = p.user_id WHERE COALESCE(p.is_banned, FALSE) = FALSE`),
        query(`SELECT COUNT(*) AS count FROM user_profiles WHERE is_banned = TRUE`),
        query(`SELECT COUNT(*) AS count FROM reports WHERE status = 'Pending'`),
      ]);

      res.json({
        totalUsers:     Number(total.rows[0].count),
        activeUsers:    Number(active.rows[0].count),
        bannedUsers:    Number(banned.rows[0].count),
        pendingReports: Number(pending.rows[0].count),
      });
    } catch (error) {
      console.error('Admin getStats error:', error);
      res.status(500).json({ success: false, message: 'Failed to fetch stats' });
    }
  }
}

export const adminController = new AdminController();
