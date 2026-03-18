// FILE: src/controllers/authController.ts
// PURPOSE: Authentication controller (like Shopio's AuthController and UserController)
// WHAT IT DOES:
// - POST /auth/request-otp - Send OTP to IITK email
// - POST /auth/verify-otp - Verify OTP and set password
// - POST /auth/login - Login with email and password
// - POST /auth/logout - Invalidate session
// - POST /auth/refresh - Refresh access token
// - POST /auth/resend-otp - Resend OTP

import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { otpService } from '../services/otpService';
import { tokenService } from '../services/tokenService';
import { query } from '../config/database';
import { ValidationUtils } from '../utils/validation';

export class AuthController {
  // Step 1: Request OTP (like Shopio's register endpoint)
  async requestOTP(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({ 
          success: false, 
          message: 'Email is required' 
        });
        return;
      }

      // Send OTP
      await otpService.sendOTP(email);

      res.status(200).json({
        success: true,
        message: 'OTP sent to your email. Please check your inbox.',
      });
    } catch (error: any) {
      console.error('Request OTP error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to send OTP',
      });
    }
  }

  // Step 2: Verify OTP and set password (like Shopio's verifyOtp endpoint)
  async verifyOTPAndSetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email, otp, password } = req.body;

      if (!email || !otp || !password) {
        res.status(400).json({
          success: false,
          message: 'Email, OTP, and password are required',
        });
        return;
      }

      // Validate password strength
      if (!ValidationUtils.isValidPassword(password)) {
        res.status(400).json({
          success: false,
          message: 'Password must be at least 8 characters with letters and numbers',
        });
        return;
      }

      // Verify OTP
      const verificationResult = await otpService.verifyOTP(email, otp);

      if (!verificationResult.success) {
        res.status(400).json({
          success: false,
          message: verificationResult.message,
        });
        return;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Update user password
      await query(
        'UPDATE users SET password_hash = $1 WHERE id = $2',
        [passwordHash, verificationResult.userId]
      );

      // Generate tokens (like Shopio's login response)
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

      res.status(200).json({
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
    } catch (error: any) {
      console.error('Verify OTP error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Verification failed',
      });
    }
  }

  // Step 3: Login with email and password (like Shopio's login endpoint)
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({
          success: false,
          message: 'Email and password are required',
        });
        return;
      }

      const sanitizedEmail = ValidationUtils.sanitizeEmail(email);

      // Find user
      const userResult = await query(
        `SELECT u.id, u.email, u.password_hash, u.verified, u.display_name,
                COALESCE(p.is_banned, FALSE) AS is_banned
         FROM users u
         LEFT JOIN user_profiles p ON u.id = p.user_id
         WHERE u.email = $1`,
        [sanitizedEmail]
      );

      if (userResult.rows.length === 0) {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
        return;
      }

      const user = userResult.rows[0];

      // Check if banned
      if (user.is_banned) {
        res.status(403).json({
          success: false,
          message: 'Your account has been banned. Contact admin for support.',
        });
        return;
      }

      // Check if verified (from Shopio's logic)
      if (!user.verified) {
        res.status(403).json({
          success: false,
          message: 'Email not verified. Please verify your email first.',
        });
        return;
      }

      // Check password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);

      if (!isPasswordValid) {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
        return;
      }

      // Generate tokens
      const { accessToken, refreshToken } = await tokenService.generateTokenPair(
        user.id,
        user.email,
        user.verified
      );

      res.status(200).json({
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
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Login failed',
      });
    }
  }

  // Logout (invalidate session)
  async logout(req: Request, res: Response): Promise<void> {
    try {
      const refreshToken = req.body.refreshToken || req.cookies.refreshToken;

      if (refreshToken) {
        await tokenService.invalidateSession(refreshToken);
      }

      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error: any) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Logout failed',
      });
    }
  }

  // Refresh access token
  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const refreshToken = req.body.refreshToken || req.cookies.refreshToken;

      if (!refreshToken) {
        res.status(401).json({
          success: false,
          message: 'Refresh token required',
        });
        return;
      }

      const newAccessToken = await tokenService.refreshAccessToken(refreshToken);

      if (!newAccessToken) {
        res.status(401).json({
          success: false,
          message: 'Invalid or expired refresh token',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          accessToken: newAccessToken,
        },
      });
    } catch (error: any) {
      console.error('Refresh token error:', error);
      res.status(500).json({
        success: false,
        message: 'Token refresh failed',
      });
    }
  }

  // ==========================================
  // FORGOT PASSWORD FLOW
  // ==========================================

  // Step 1: Request OTP for Forgot Password
  async forgotPasswordOTP(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({ success: false, message: 'Email is required' });
        return;
      }

      const sanitizedEmail = ValidationUtils.sanitizeEmail(email);

      // Check if user exists FIRST
      const userResult = await query('SELECT id FROM users WHERE email = $1', [sanitizedEmail]);
      
      if (userResult.rows.length === 0) {
        res.status(404).json({ success: false, message: 'No account found with this email.' });
        return;
      }

      // Generate and send OTP (passing true for isPasswordReset)
      try {
        await otpService.sendOTP(sanitizedEmail, true); // 🔥 FIX APPLIED HERE
      } catch (otpError: any) {
        throw otpError;
      }

      res.status(200).json({
        success: true,
        message: 'Password reset OTP sent to your email.',
      });
    } catch (error: any) {
      console.error('Forgot Password OTP error:', error);
      res.status(400).json({ success: false, message: error.message || 'Failed to send OTP' });
    }
  }

  // Step 2: Verify OTP and Reset Password
  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email, otp, password } = req.body;

      if (!email || !otp || !password) {
        res.status(400).json({ success: false, message: 'Email, OTP, and new password are required' });
        return;
      }

      if (!ValidationUtils.isValidPassword(password)) {
        res.status(400).json({ success: false, message: 'Password must be at least 8 characters with letters and numbers' });
        return;
      }

      // Verify the OTP (passing true for isPasswordReset)
      const verificationResult = await otpService.verifyOTP(email, otp, true); // 🔥 FIX ALREADY APPLIED HERE

      if (!verificationResult.success) {
        res.status(400).json({ success: false, message: verificationResult.message });
        return;
      }

      // Hash the NEW password
      const passwordHash = await bcrypt.hash(password, 10);

      // Update user password in Database
      await query(
        'UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id, verified',
        [passwordHash, email]
      );

      // Find user to generate login tokens
      const userResult = await query('SELECT id, email, verified FROM users WHERE email = $1', [email]);
      const user = userResult.rows[0];

      // Generate tokens so user is instantly logged in after reset
      const { accessToken, refreshToken } = await tokenService.generateTokenPair(
        user.id,
        user.email,
        user.verified
      );

      res.status(200).json({
        success: true,
        message: 'Password has been reset successfully!',
        data: {
          user: { id: user.id, email: user.email, verified: user.verified },
          accessToken,
          refreshToken,
        },
      });
    } catch (error: any) {
      console.error('Reset Password error:', error);
      res.status(500).json({ success: false, message: error.message || 'Failed to reset password' });
    }
  }

  // Resend OTP (with cooldown)
  async resendOTP(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      
      // Determine if this is a resend for password reset or normal registration
      // You can pass an optional flag from the frontend if needed, but for now 
      // we'll default to standard resend to avoid breaking your current frontend setup.
      const isPasswordReset = req.body.isPasswordReset || false;

      if (!email) {
        res.status(400).json({
          success: false,
          message: 'Email is required',
        });
        return;
      }

      await otpService.resendOTP(email, isPasswordReset);

      res.status(200).json({
        success: true,
        message: 'OTP resent successfully',
      });
    } catch (error: any) {
      console.error('Resend OTP error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to resend OTP',
      });
    }
  }

  // Get current user info (protected route)
  async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      // @ts-ignore - user is attached by authMiddleware
      const userId = req.user.userId;

      const userResult = await query(
        `SELECT u.id, u.email, u.display_name, u.verified, u.is_admin,
                p.interests, p.avatar_url, p.total_chats, p.total_reports, p.rating, p.is_banned
         FROM users u
         LEFT JOIN user_profiles p ON u.id = p.user_id
         WHERE u.id = $1`,
        [userId]
      );

      if (userResult.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: 'User not found',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          user: userResult.rows[0],
        },
      });
    } catch (error: any) {
      console.error('Get current user error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user info',
      });
    }
  }
}

export const authController = new AuthController();