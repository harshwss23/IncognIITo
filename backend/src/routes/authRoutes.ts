// FILE: src/routes/authRoutes.ts
// PURPOSE: Authentication API routes (like Shopio's RestController endpoints)
// WHAT IT DOES:
// - Defines all authentication endpoints
// - Maps routes to controller methods
// - Applies middleware to protected routes

import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// PUBLIC ROUTES (no authentication required)

// POST /api/auth/request-otp - Send OTP to email
router.post('/request-otp', authController.requestOTP.bind(authController));
// POST /api/auth/verify-otp - Verify OTP and set password
router.post('/verify-otp', authController.verifyOTPAndSetPassword.bind(authController));
// POST /api/auth/login - Login with email and password
router.post('/login', authController.login.bind(authController));
// POST /api/auth/resend-otp - Resend OTP
router.post('/resend-otp', authController.resendOTP.bind(authController));
// POST /api/auth/refresh - Refresh access token
router.post('/refresh', authController.refreshToken.bind(authController));

// PROTECTED ROUTES (authentication required)

// POST /api/auth/logout - Logout and invalidate session
router.post(
  '/logout',
  authMiddleware.authenticate.bind(authMiddleware),
  authController.logout.bind(authController)
);

// GET /api/auth/me - Get current user info
router.get(
  '/me',
  authMiddleware.authenticate.bind(authMiddleware),
  authController.getCurrentUser.bind(authController)
);

export default router;
