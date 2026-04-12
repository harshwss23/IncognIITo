// FILE: src/controllers/authController.ts
// PURPOSE: Authentication controller handles user registration, login, and token management.

import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { otpService } from '../services/otpService';
import { tokenService } from '../services/tokenService';
import { query } from '../config/database';
import { ValidationUtils } from '../utils/validation';

// --- Configuration Constants (Defensive Programming: Avoid Magic Numbers) ---
const HTTP_STATUS_OK = 200;
const HTTP_STATUS_BAD_REQUEST = 400;
const HTTP_STATUS_UNAUTHORIZED = 401;
const HTTP_STATUS_FORBIDDEN = 403;
const HTTP_STATUS_NOT_FOUND = 404;
const HTTP_STATUS_INTERNAL_SERVER_ERROR = 500;
const BCRYPT_SALT_ROUNDS = 10;

export class AuthController {
  /**
   * Requests an OTP to be sent to the user's email.
   * @param {Request} req - The Express request object containing the email.
   * @param {Response} res - The Express response object.
   * @returns {Promise<void>}
   */
  async requestOTP(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email || typeof email !== 'string') {
        res.status(HTTP_STATUS_BAD_REQUEST).json({ 
          success: false, 
          message: 'Email is required and must be a string' 
        });
        return;
      }

      await otpService.sendOTP(email);

      res.status(HTTP_STATUS_OK).json({
        success: true,
        message: 'OTP sent to your email. Please check your inbox.',
      });
    } catch (error: unknown) {
      console.error('Request OTP error:', error);
      const message = error instanceof Error ? error.message : 'Failed to send OTP';
      res.status(HTTP_STATUS_BAD_REQUEST).json({
        success: false,
        message,
      });
    }
  }

  /**
   * Verifies the provided OTP and sets the user's password.
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<void>}
   */
  async verifyOTPAndSetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email, otp, password } = req.body;

      if (!email || !otp || !password) {
        res.status(HTTP_STATUS_BAD_REQUEST).json({
          success: false,
          message: 'Email, OTP, and password are required',
        });
        return;
      }

      if (!ValidationUtils.isValidPassword(password)) {
        res.status(HTTP_STATUS_BAD_REQUEST).json({
          success: false,
          message: 'Password must be at least 8 characters with letters and numbers',
        });
        return;
      }

      const verificationResult = await otpService.verifyOTP(email, String(otp));

      if (!verificationResult.success) {
        res.status(HTTP_STATUS_BAD_REQUEST).json({
          success: false,
          message: verificationResult.message,
        });
        return;
      }

      const passwordHash = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

      await query(
        'UPDATE users SET password_hash = $1 WHERE id = $2',
        [passwordHash, verificationResult.userId]
      );

      const userResult = await query(
        'SELECT id, email, verified FROM users WHERE id = $1',
        [verificationResult.userId]
      );

      const user = userResult.rows[0];
      const { accessToken, refreshToken } = await tokenService.generateTokenPair(
        user.id,
        user.email,
        user.verified
      );

      res.status(HTTP_STATUS_OK).json({
        success: true,
        message: 'Email verified and account created successfully',
        data: {
          user: {
            id: user.id,
            email: user.email,
            verified: user.verified,
          },
          accessToken,
          refreshToken,
        },
      });
    } catch (error: unknown) {
      console.error('Verify OTP error:', error);
      const message = error instanceof Error ? error.message : 'Verification failed';
      res.status(HTTP_STATUS_INTERNAL_SERVER_ERROR).json({
        success: false,
        message,
      });
    }
  }

  /**
   * Authenticates a user with email and password.
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<void>}
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
        res.status(HTTP_STATUS_BAD_REQUEST).json({
          success: false,
          message: 'Email and password are required and must be strings',
        });
        return;
      }

      const sanitizedEmail = ValidationUtils.sanitizeEmail(email);

      const userResult = await query(
        `SELECT u.id, u.email, u.password_hash, u.verified, u.display_name,
                COALESCE(p.is_banned, FALSE) AS is_banned
         FROM users u
         LEFT JOIN user_profiles p ON u.id = p.user_id
         WHERE u.email = $1`,
        [sanitizedEmail]
      );

      if (userResult.rows.length === 0) {
        res.status(HTTP_STATUS_UNAUTHORIZED).json({
          success: false,
          message: 'Invalid email or password',
        });
        return;
      }

      const user = userResult.rows[0];

      if (user.is_banned) {
        res.status(HTTP_STATUS_FORBIDDEN).json({
          success: false,
          message: 'Your account has been banned. Contact admin for support.',
        });
        return;
      }

      if (!user.verified) {
        res.status(HTTP_STATUS_FORBIDDEN).json({
          success: false,
          message: 'Email not verified. Please verify your email first.',
        });
        return;
      }

      const isPasswordValid = await bcrypt.compare(password, user.password_hash);

      if (!isPasswordValid) {
        res.status(HTTP_STATUS_UNAUTHORIZED).json({
          success: false,
          message: 'Invalid email or password',
        });
        return;
      }

      const { accessToken, refreshToken } = await tokenService.generateTokenPair(
        user.id,
        user.email,
        user.verified
      );

      res.status(HTTP_STATUS_OK).json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            displayName: user.display_name,
            verified: user.verified,
          },
          accessToken,
          refreshToken,
        },
      });
    } catch (error: unknown) {
      console.error('Login error:', error);
      res.status(HTTP_STATUS_INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Login failed',
      });
    }
  }

  /**
   * Logs out the user by invalidating their refresh token.
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<void>}
   */
  async logout(req: Request, res: Response): Promise<void> {
    try {
      const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;

      if (refreshToken) {
        await tokenService.invalidateSession(refreshToken);
      }

      res.status(HTTP_STATUS_OK).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error: unknown) {
      console.error('Logout error:', error);
      res.status(HTTP_STATUS_INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Logout failed',
      });
    }
  }

  /**
   * Refreshes the user's access token using a valid refresh token.
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<void>}
   */
  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const refreshToken = req.body.refreshToken || req.cookies?.refreshToken;

      if (!refreshToken) {
        res.status(HTTP_STATUS_UNAUTHORIZED).json({
          success: false,
          message: 'Refresh token required',
        });
        return;
      }

      const newAccessToken = await tokenService.refreshAccessToken(refreshToken);

      if (!newAccessToken) {
        res.status(HTTP_STATUS_UNAUTHORIZED).json({
          success: false,
          message: 'Invalid or expired refresh token',
        });
        return;
      }

      res.status(HTTP_STATUS_OK).json({
        success: true,
        data: {
          accessToken: newAccessToken,
        },
      });
    } catch (error: unknown) {
      console.error('Refresh token error:', error);
      res.status(HTTP_STATUS_INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Token refresh failed',
      });
    }
  }

  // ==========================================
  // FORGOT PASSWORD FLOW
  // ==========================================

  /**
   * Requests an OTP for password reset.
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<void>}
   */
 async forgotPasswordOTP(req: any, res: any) {
        try {
            const { email } = req.body;
            if (!email) return res.status(400).json({ success: false, message: 'Email required' });
            
            const sanitizedEmail = email.toLowerCase().trim();

            const userResult = await query(`
                SELECT u.id, COALESCE(p.is_banned, FALSE) AS is_banned 
                FROM users u 
                LEFT JOIN user_profiles p ON u.id = p.user_id 
                WHERE LOWER(u.email) = $1
            `, [sanitizedEmail]);

            if (userResult.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Email not found' });
            }

            const user = userResult.rows[0];
            
            // 🛑 THE CEMENT WALL 🛑
            const isBanned = user.is_banned === true || String(user.is_banned).toLowerCase() === 'true' || user.is_banned === 't';
            if (isBanned) {
                console.log(`🚨 KILLED OTP REQUEST FOR BANNED USER: ${sanitizedEmail}`);
                return res.status(403).json({ success: false, message: 'Your account is permanently banned. Access denied.' });
            }

            await otpService.sendOTP(sanitizedEmail, true);
            res.status(200).json({ success: true, message: 'OTP sent' });
        } catch (error) {
            res.status(400).json({ success: false, message: 'Failed to send OTP' });
        }
    }
  /**
   * Verifies the OTP and resets the user's password.
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<void>}
   */
async resetPassword(req: any, res: any) {
        try {
            const { email, otp, password } = req.body;
            const sanitizedEmail = email.toLowerCase().trim();

            const verificationResult = await otpService.verifyOTP(sanitizedEmail, otp, true);
            if (!verificationResult.success) return res.status(400).json({ success: false, message: verificationResult.message });

            const userCheck = await query(`
                SELECT u.id, u.verified, COALESCE(p.is_banned, FALSE) AS is_banned 
                FROM users u 
                LEFT JOIN user_profiles p ON u.id = p.user_id 
                WHERE LOWER(u.email) = $1
            `, [sanitizedEmail]);

            const user = userCheck.rows[0];
            if (!user) return res.status(404).json({ success: false, message: 'User not found' });

            // 🛑 THE SECOND CEMENT WALL 🛑
            const isBanned = user.is_banned === true || String(user.is_banned).toLowerCase() === 'true' || user.is_banned === 't';
            if (isBanned) {
                console.log(`🚨 KILLED RESET PASSWORD FOR BANNED USER: ${sanitizedEmail}`);
                return res.status(403).json({ success: false, message: 'Your account is permanently banned.' });
            }

            const passwordHash = await bcrypt.hash(password, 10);
            await query('UPDATE users SET password_hash = $1 WHERE LOWER(email) = $2', [passwordHash, sanitizedEmail]);
            
            const { accessToken, refreshToken } = await tokenService.generateTokenPair(user.id, sanitizedEmail, user.verified);
            res.status(200).json({ success: true, data: { accessToken, refreshToken } });
        } catch (error) {
            res.status(500).json({ success: false, message: 'Reset failed' });
        }
    }

  /**
   * Resends an OTP with a cooldown check.
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<void>}
   */
  async resendOTP(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      const isPasswordReset = req.body.isPasswordReset || false;

      if (!email || typeof email !== 'string') {
        res.status(HTTP_STATUS_BAD_REQUEST).json({
          success: false,
          message: 'Email is required and must be a string',
        });
        return;
      }

      await otpService.resendOTP(email, isPasswordReset);

      res.status(HTTP_STATUS_OK).json({
        success: true,
        message: 'OTP resent successfully',
      });
    } catch (error: unknown) {
      console.error('Resend OTP error:', error);
      const message = error instanceof Error ? error.message : 'Failed to resend OTP';
      res.status(HTTP_STATUS_BAD_REQUEST).json({
        success: false,
        message,
      });
    }
  }

  /**
   * Retrieves the current authenticated user's profile information.
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<void>}
   */
  async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      // @ts-ignore - user is attached by authMiddleware
      const userId = req.user?.userId;

      if (!userId) {
        res.status(HTTP_STATUS_UNAUTHORIZED).json({
          success: false,
          message: 'User authentication failed',
        });
        return;
      }

      const userResult = await query(
        `SELECT u.id, u.email, u.display_name, u.verified, u.is_admin,
                p.interests, p.avatar_url, p.total_chats, p.total_reports, p.rating, p.is_banned
         FROM users u
         LEFT JOIN user_profiles p ON u.id = p.user_id
         WHERE u.id = $1`,
        [userId]
      );

      if (userResult.rows.length === 0) {
        res.status(HTTP_STATUS_NOT_FOUND).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      res.status(HTTP_STATUS_OK).json({
        success: true,
        data: {
          user: userResult.rows[0],
        },
      });
    } catch (error: unknown) {
      console.error('Get current user error:', error);
      res.status(HTTP_STATUS_INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to get user info',
      });
    }
  }
}

export const authController = new AuthController();