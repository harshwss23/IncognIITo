// FILE: src/controllers/adminController.ts
// PURPOSE: Real DB-backed admin dashboard controllers (Phase 2)

import { Request, Response } from 'express';
import { query } from '../config/database';

export class AdminController {

  // GET /api/admin/users?search=
  // Response shape matches frontend: { id, userId, email, rating, status }
  async getUsers(req: Request, res: Response): Promise<void> {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

      let sql = `
        SELECT u.id,
               COALESCE(u.display_name, u.email) AS "userId",
               u.email,
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

  // GET /api/admin/reports?status=
  // Response shape matches frontend: { id, reportId, targetUser, reason, status }
  async getReports(req: Request, res: Response): Promise<void> {
    try {
      const statusFilter = typeof req.query.status === 'string' ? req.query.status : '';

      let sql = `
        SELECT r.id,
               ('R-' || r.id)                                       AS "reportId",
               ('Reported: ' || COALESCE(t.display_name, t.email))  AS "targetUser",
               r.reason,
               r.status
        FROM reports r
        JOIN users t ON t.id = r.target_id
      `;
      const params: any[] = [];

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

  // PATCH /api/admin/reports/:id  — resolve or dismiss a report
  async updateReport(req: Request, res: Response): Promise<void> {
    try {
      const reportId = Number(req.params.id);
      const { status, adminNote } = req.body as { status: string; adminNote?: string };

      if (!['Resolved', 'Dismissed'].includes(status)) {
        res.status(400).json({ success: false, message: 'Status must be Resolved or Dismissed' });
        return;
      }

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

  // POST /api/admin/users/:id/ban — ban a user + kill sessions
  async banUser(req: Request, res: Response): Promise<void> {
    try {
      const targetId = Number(req.params.id);

      if (targetId === req.user!.userId) {
        res.status(400).json({ success: false, message: 'Cannot ban yourself' });
        return;
      }

      // Upsert ban flag
      await query(
        `INSERT INTO user_profiles (user_id, is_banned)
         VALUES ($1, TRUE)
         ON CONFLICT (user_id) DO UPDATE SET is_banned = TRUE`,
        [targetId]
      );

      // Invalidate all sessions so ban takes effect immediately
      await query(`DELETE FROM sessions WHERE user_id = $1`, [targetId]);

      res.json({ success: true, message: 'User banned successfully' });
    } catch (error) {
      console.error('Admin banUser error:', error);
      res.status(500).json({ success: false, message: 'Failed to ban user' });
    }
  }

  // POST /api/admin/users/:id/unban
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

  // GET /api/admin/stats — dashboard summary
  async getStats(_req: Request, res: Response): Promise<void> {
    try {
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
