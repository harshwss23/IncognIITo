// FILE: src/routes/userRoutes.ts
// PURPOSE: User profile management routes
// WHAT IT DOES:
// - Handles user profile updates
// - Manages user settings
// - All routes are protected (require authentication)

import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware';
import { query } from '../config/database';
import { Request, Response } from 'express';
import { INTERESTS } from '../constants/interests';

const router = Router();

// All user routes require authentication
router.use(authMiddleware.authenticate.bind(authMiddleware));

// GET /api/users/profile - Get user profile
router.get(
  "/",
  async (req: Request, res: Response) => {
    try {
      // ✅ Optional: only verified users can access
      // if (!req.user?.verified) {
      //   return res.status(403).json({ success: false, message: "Email verification required" });
      // }

      const result = await query(
        `SELECT id, email, display_name, verified
         FROM users
         ORDER BY id DESC`
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

export default router;
