"use strict";
// FILE: src/routes/userRoutes.ts
// PURPOSE: User profile management routes
// WHAT IT DOES:
// - Handles user profile updates
// - Manages user settings
// - All routes are protected (require authentication)
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const database_1 = require("../config/database");
const router = (0, express_1.Router)();
// All user routes require authentication
router.use(authMiddleware_1.authMiddleware.authenticate.bind(authMiddleware_1.authMiddleware));
// GET /api/users/profile - Get user profile
router.get("/", async (req, res) => {
    try {
        // ✅ Optional: only verified users can access
        // if (!req.user?.verified) {
        //   return res.status(403).json({ success: false, message: "Email verification required" });
        // }
        const result = await (0, database_1.query)(`SELECT id, email, display_name, verified
         FROM users
         ORDER BY id DESC`);
        return res.status(200).json({
            success: true,
            data: { users: result.rows },
        });
    }
    catch (error) {
        console.error("Get users error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch users",
        });
    }
});
router.get('/profile', async (req, res) => {
    try {
        const userId = req.user.userId;
        const result = await (0, database_1.query)(`SELECT u.id, u.email, u.display_name, u.verified,
              p.interests, p.avatar_url, p.total_chats, p.total_reports, p.rating, p.is_banned
       FROM users u
       LEFT JOIN user_profiles p ON u.id = p.user_id
       WHERE u.id = $1`, [userId]);
        if (result.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: 'User not found',
            });
            return;
        }
        res.status(200).json({
            success: true,
            data: { user: result.rows[0] },
        });
    }
    catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get profile',
        });
    }
});
// PUT /api/users/profile - Update user profile
router.put('/profile', async (req, res) => {
    try {
        const userId = req.user.userId;
        const { displayName, interests, avatarUrl } = req.body;
        // Update user table
        if (displayName !== undefined) {
            await (0, database_1.query)('UPDATE users SET display_name = $1 WHERE id = $2', [displayName, userId]);
        }
        // Update user_profiles table
        await (0, database_1.query)(`UPDATE user_profiles 
       SET interests = COALESCE($1, interests),
           avatar_url = COALESCE($2, avatar_url)
       WHERE user_id = $3`, [interests, avatarUrl, userId]);
        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
        });
    }
    catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update profile',
        });
    }
});
// DELETE /api/users/account - Delete user account
router.delete('/account', async (req, res) => {
    try {
        const userId = req.user.userId;
        // Delete user (cascades to user_profiles, sessions, etc.)
        await (0, database_1.query)('DELETE FROM users WHERE id = $1', [userId]);
        res.status(200).json({
            success: true,
            message: 'Account deleted successfully',
        });
    }
    catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete account',
        });
    }
});
exports.default = router;
