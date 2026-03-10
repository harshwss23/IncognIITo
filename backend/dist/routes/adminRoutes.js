"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const adminController_1 = require("../controllers/adminController");
const database_1 = require("../config/database");
const router = (0, express_1.Router)();
// Admin guard — runs after authenticate, checks users.is_admin
async function requireAdmin(req, res, next) {
    try {
        const result = await (0, database_1.query)(`SELECT is_admin FROM users WHERE id = $1`, [req.user.userId]);
        if (result.rows.length === 0 || !result.rows[0].is_admin) {
            res.status(403).json({ success: false, message: "Admin access required" });
            return;
        }
        next();
    }
    catch (error) {
        console.error("Admin guard error:", error);
        res.status(500).json({ success: false, message: "Authorization check failed" });
    }
}
// Protect every route: JWT first, then admin check
router.use(authMiddleware_1.authMiddleware.authenticate.bind(authMiddleware_1.authMiddleware), requireAdmin);
// GET    /api/admin/users              — list users (?search=)
router.get("/users", adminController_1.adminController.getUsers.bind(adminController_1.adminController));
// GET    /api/admin/reports            — list reports (?status=Pending)
router.get("/reports", adminController_1.adminController.getReports.bind(adminController_1.adminController));
// PATCH  /api/admin/reports/:id        — resolve / dismiss a report
router.patch("/reports/:id", adminController_1.adminController.updateReport.bind(adminController_1.adminController));
// POST   /api/admin/users/:id/ban      — ban a user
router.post("/users/:id/ban", adminController_1.adminController.banUser.bind(adminController_1.adminController));
// POST   /api/admin/users/:id/unban    — unban a user
router.post("/users/:id/unban", adminController_1.adminController.unbanUser.bind(adminController_1.adminController));
// GET    /api/admin/stats              — dashboard summary counts
router.get("/stats", adminController_1.adminController.getStats.bind(adminController_1.adminController));
exports.default = router;
