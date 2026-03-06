/**
 * Phase 2 - Admin Dashboard API Endpoints (DB-backed)
 *
 * Implemented by: Abeer Gupta, Krish Vijay Tiwari
  * Purpose:
 * Provide backend API routes required by the Admin dashboard
 * so that the frontend team can integrate with them.
 * Mock data replace with real DB logic
 * All routes require JWT auth + admin privileges.
 */

import { Router, Request, Response, NextFunction } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { adminController } from "../controllers/adminController";
import { query } from "../config/database";

const router = Router();

// Admin guard — runs after authenticate, checks users.is_admin
async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await query(
      `SELECT is_admin FROM users WHERE id = $1`,
      [req.user!.userId]
    );

    if (result.rows.length === 0 || !result.rows[0].is_admin) {
      res.status(403).json({ success: false, message: "Admin access required" });
      return;
    }

    next();
  } catch (error) {
    console.error("Admin guard error:", error);
    res.status(500).json({ success: false, message: "Authorization check failed" });
  }
}

// Protect every route: JWT first, then admin check
router.use(
  authMiddleware.authenticate.bind(authMiddleware),
  requireAdmin
);

// GET    /api/admin/users              — list users (?search=)
router.get("/users", adminController.getUsers.bind(adminController));

// GET    /api/admin/reports            — list reports (?status=Pending)
router.get("/reports", adminController.getReports.bind(adminController));

// PATCH  /api/admin/reports/:id        — resolve / dismiss a report
router.patch("/reports/:id", adminController.updateReport.bind(adminController));

// POST   /api/admin/users/:id/ban      — ban a user
router.post("/users/:id/ban", adminController.banUser.bind(adminController));

// POST   /api/admin/users/:id/unban    — unban a user
router.post("/users/:id/unban", adminController.unbanUser.bind(adminController));

// GET    /api/admin/stats              — dashboard summary counts
router.get("/stats", adminController.getStats.bind(adminController));

export default router;
