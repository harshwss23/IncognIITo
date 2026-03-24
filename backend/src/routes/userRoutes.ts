// FILE: src/routes/userRoutes.ts
// PURPOSE: User profile management routes
// WHAT IT DOES:
// - Handles user profile updates
// - Manages user settings
// - Handles avatar upload / removal via Cloudinary
// - All routes are protected (require authentication)

import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { query } from '../config/database';
import { Request, Response } from 'express';
import { INTERESTS } from '../constants/interests';
import cloudinary from '../config/cloudinary';
import { upload } from '../middleware/uploadMiddleware';

const router = Router();

// All user routes require authentication
router.use(authMiddleware.authenticate.bind(authMiddleware));

// GET /api/users - Get all users (useful for user discovery/active users)
router.get(
  "/",
  async (req: Request, res: Response) => {
    try {
      const result = await query(
        `SELECT u.id, u.email, u.display_name, u.verified, p.avatar_url
         FROM users u
         LEFT JOIN user_profiles p ON u.id = p.user_id
         ORDER BY u.id DESC`
      );

      return res.status(200).json({
        success: true,
        data: { users: result.rows },
      });
    } catch (error) {
      console.error("Get users error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch users",
      });
    }
  }
);

// This route is handled separately below as /profile/:id

router.get('/profile', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    const result = await query(
      `SELECT u.id, u.email, u.display_name, u.verified,
              p.interests, p.avatar_url, p.total_chats, p.total_reports, p.rating, p.is_banned
       FROM users u
       LEFT JOIN user_profiles p ON u.id = p.user_id
       WHERE u.id = $1`,
      [userId]
    );

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
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile',
    });
  }
});

// GET /api/users/profile/:id - Get another user's public profile
router.get('/profile/:id', async (req: Request, res: Response) => {
  try {
    const targetId = Number(req.params.id);
    const requesterId = req.user!.userId;

    if (!targetId || Number.isNaN(targetId)) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }

    // Only allow self or accepted connections to view another user's profile
    if (targetId !== requesterId) {
      const connection = await query(
        `SELECT 1
         FROM connection_requests
         WHERE status = 'ACCEPTED'
           AND ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1))
         LIMIT 1`,
        [requesterId, targetId]
      );

      if (connection.rows.length === 0) {
        const selfProfile = await query(
          `SELECT u.id, u.email, u.display_name, u.verified,
                  p.interests, p.avatar_url, p.total_chats, p.total_reports, p.rating, p.is_banned
           FROM users u
           LEFT JOIN user_profiles p ON u.id = p.user_id
           WHERE u.id = $1`,
          [requesterId]
        );

        if (selfProfile.rows.length === 0) {
          return res.status(404).json({ success: false, message: 'User not found' });
        }

        return res.status(200).json({
          success: true,
          redirectToSelf: true,
          data: { user: selfProfile.rows[0] },
        });
      }
    }

    const result = await query(
      `SELECT u.id, u.email, u.display_name, u.verified,
              p.avatar_url, p.interests, p.total_chats, p.total_reports, p.rating
       FROM users u
       LEFT JOIN user_profiles p ON u.id = p.user_id
       WHERE u.id = $1`,
      [targetId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const dbdata=result.rows[0];
    dbdata.email="hidden";
    return res.status(200).json({
      success: true,
      data: { user: dbdata },
    });
  } catch (error) {
    console.error('Get public profile error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get user profile',
    });
  }
});

// PUT /api/users/profile - Update user profile
router.put('/profile', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { displayName, interests, avatarUrl } = req.body;

    // Normalize and validate interests against the allowed list
    const allowedInterests = new Set(INTERESTS);
    const interestsProvided = Array.isArray(interests);
    const sanitizedInterests = interestsProvided
      ? Array.from(
        new Set(
          (interests as unknown[])
            .map((i) => (typeof i === 'string' ? i.trim() : ''))
            .filter((i) => i && allowedInterests.has(i))
        )
      )
      : null;

    // Ensure profile row exists so updates don't noop
    await query(
      `INSERT INTO user_profiles (user_id)
       VALUES ($1)
       ON CONFLICT (user_id) DO NOTHING`,
      [userId]
    );

    // Update user table
    if (displayName !== undefined) {
      await query(
        'UPDATE users SET display_name = $1 WHERE id = $2',
        [displayName, userId]
      );
    }

    // Update user_profiles table
    await query(
      `UPDATE user_profiles 
       SET interests = COALESCE($1, interests),
           avatar_url = COALESCE($2, avatar_url)
       WHERE user_id = $3`,
      [sanitizedInterests, avatarUrl, userId]
    );

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
    });
  }
});

// DELETE /api/users/account - Delete user account
router.delete('/account', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    // Delete user (cascades to user_profiles, sessions, etc.)
    await query('DELETE FROM users WHERE id = $1', [userId]);

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete account',
    });
  }
});

// POST /api/users/report - Report a user
router.post('/report', async (req: Request, res: Response) => {
  try {
    const reporterId = req.user!.userId;
    const { targetId, reason, description } = req.body;

    if (!targetId || !reason) {
      res.status(400).json({ success: false, message: 'Target ID and reason are required' });
      return;
    }

    if (reporterId === targetId) {
      res.status(400).json({ success: false, message: 'You cannot report yourself' });
      return;
    }

    // Check for existing report
    const existingReport = await query(
      `SELECT id FROM reports WHERE reporter_id = $1 AND target_id = $2`,
      [reporterId, targetId]
    );

    if (existingReport.rows.length > 0) {
      res.status(400).json({ success: false, message: 'You have already reported this user' });
      return;
    }

    // Insert report into reports table
    await query(
      `INSERT INTO reports (reporter_id, target_id, reason, description)
       VALUES ($1, $2, $3, $4)`,
      [reporterId, targetId, reason, description || null]
    );

    // Block the user so they don't match again
    await query(
      `INSERT INTO user_blocks (blocker_id, blocked_id, reason)
       VALUES ($1, $2, $3)
       ON CONFLICT (blocker_id, blocked_id) DO NOTHING`,
      [reporterId, targetId, reason]
    );

    // Increment total_reports for the reported user
    await query(
      `INSERT INTO user_profiles (user_id, total_reports)
       VALUES ($1, 1)
       ON CONFLICT (user_id) DO UPDATE SET total_reports = user_profiles.total_reports + 1`,
      [targetId]
    );

    res.status(200).json({ success: true, message: 'User reported successfully' });
  } catch (error) {
    console.error('Report user error:', error);
    res.status(500).json({ success: false, message: 'Failed to report user' });
  }
});

// POST /api/users/avatar - Upload profile picture to Cloudinary
router.post('/avatar', upload.single('avatar'), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }

    // Pipe the in-memory buffer to Cloudinary using upload_stream
    const uploadResult = await new Promise<{ secure_url: string; public_id: string }>(
      (resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: 'incogniito/avatars',
            public_id: `user_${userId}`,      // Deterministic ID — overwrites old avatar
            overwrite: true,
            transformation: [
              { width: 400, height: 400, crop: 'fill', gravity: 'face' }, // Auto face-center crop
            ],
          },
          (error, result) => {
            if (error || !result) return reject(error ?? new Error('Cloudinary upload failed'));
            resolve(result as { secure_url: string; public_id: string });
          }
        );
        stream.end(req.file!.buffer);
      }
    );

    // Ensure profile row exists
    await query(
      `INSERT INTO user_profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
      [userId]
    );

    // Save Cloudinary CDN URL to DB
    await query(
      `UPDATE user_profiles SET avatar_url = $1 WHERE user_id = $2`,
      [uploadResult.secure_url, userId]
    );

    console.log(`Avatar updated for user ${userId}: ${uploadResult.secure_url}`);

    res.status(200).json({
      success: true,
      message: 'Avatar uploaded successfully',
      avatarUrl: uploadResult.secure_url,
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload avatar' });
  }
});

// DELETE /api/users/avatar - Remove profile picture
router.delete('/avatar', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;

    // Optional: also delete from Cloudinary storage
    await cloudinary.uploader.destroy(`incogniito/avatars/user_${userId}`).catch(() => { });

    await query(
      `UPDATE user_profiles SET avatar_url = NULL WHERE user_id = $1`,
      [userId]
    );

    res.status(200).json({ success: true, message: 'Avatar removed successfully' });
  } catch (error) {
    console.error('Avatar remove error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove avatar' });
  }
});

export default router;
