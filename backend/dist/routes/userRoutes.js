"use strict";
// FILE: src/routes/userRoutes.ts
// PURPOSE: User profile management routes
// WHAT IT DOES:
// - Handles user profile updates
// - Manages user settings
// - Handles avatar upload / removal via Cloudinary
// - All routes are protected (require authentication)
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const database_1 = require("../config/database");
const interests_1 = require("../constants/interests");
const cloudinary_1 = __importDefault(require("../config/cloudinary"));
const uploadMiddleware_1 = require("../middleware/uploadMiddleware");
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
        // Normalize and validate interests against the allowed list
        const allowedInterests = new Set(interests_1.INTERESTS);
        const interestsProvided = Array.isArray(interests);
        const sanitizedInterests = interestsProvided
            ? Array.from(new Set(interests
                .map((i) => (typeof i === 'string' ? i.trim() : ''))
                .filter((i) => i && allowedInterests.has(i))))
            : null;
        // Ensure profile row exists so updates don't noop
        await (0, database_1.query)(`INSERT INTO user_profiles (user_id)
       VALUES ($1)
       ON CONFLICT (user_id) DO NOTHING`, [userId]);
        // Update user table
        if (displayName !== undefined) {
            await (0, database_1.query)('UPDATE users SET display_name = $1 WHERE id = $2', [displayName, userId]);
        }
        // Update user_profiles table
        await (0, database_1.query)(`UPDATE user_profiles 
       SET interests = COALESCE($1, interests),
           avatar_url = COALESCE($2, avatar_url)
       WHERE user_id = $3`, [sanitizedInterests, avatarUrl, userId]);
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
// POST /api/users/avatar - Upload profile picture to Cloudinary
router.post('/avatar', uploadMiddleware_1.upload.single('avatar'), async (req, res) => {
    try {
        const userId = req.user.userId;
        if (!req.file) {
            res.status(400).json({ success: false, message: 'No file uploaded' });
            return;
        }
        // Pipe the in-memory buffer to Cloudinary using upload_stream
        const uploadResult = await new Promise((resolve, reject) => {
            const stream = cloudinary_1.default.uploader.upload_stream({
                folder: 'incogniito/avatars',
                public_id: `user_${userId}`, // Deterministic ID — overwrites old avatar
                overwrite: true,
                transformation: [
                    { width: 400, height: 400, crop: 'fill', gravity: 'face' }, // Auto face-center crop
                ],
            }, (error, result) => {
                if (error || !result)
                    return reject(error ?? new Error('Cloudinary upload failed'));
                resolve(result);
            });
            stream.end(req.file.buffer);
        });
        // Ensure profile row exists
        await (0, database_1.query)(`INSERT INTO user_profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`, [userId]);
        // Save Cloudinary CDN URL to DB
        await (0, database_1.query)(`UPDATE user_profiles SET avatar_url = $1 WHERE user_id = $2`, [uploadResult.secure_url, userId]);
        console.log(`Avatar updated for user ${userId}: ${uploadResult.secure_url}`);
        res.status(200).json({
            success: true,
            message: 'Avatar uploaded successfully',
            avatarUrl: uploadResult.secure_url,
        });
    }
    catch (error) {
        console.error('Avatar upload error:', error);
        res.status(500).json({ success: false, message: 'Failed to upload avatar' });
    }
});
// DELETE /api/users/avatar - Remove profile picture
router.delete('/avatar', async (req, res) => {
    try {
        const userId = req.user.userId;
        // Optional: also delete from Cloudinary storage
        await cloudinary_1.default.uploader.destroy(`incogniito/avatars/user_${userId}`).catch(() => { });
        await (0, database_1.query)(`UPDATE user_profiles SET avatar_url = NULL WHERE user_id = $1`, [userId]);
        res.status(200).json({ success: true, message: 'Avatar removed successfully' });
    }
    catch (error) {
        console.error('Avatar remove error:', error);
        res.status(500).json({ success: false, message: 'Failed to remove avatar' });
    }
});
exports.default = router;
