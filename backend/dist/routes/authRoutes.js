"use strict";
// FILE: src/routes/authRoutes.ts
// PURPOSE: Authentication API routes (like Shopio's RestController endpoints)
// WHAT IT DOES:
// - Defines all authentication endpoints
// - Maps routes to controller methods
// - Applies middleware to protected routes
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
// PUBLIC ROUTES (no authentication required)
// POST /api/auth/request-otp - Send OTP to email
router.post('/request-otp', authController_1.authController.requestOTP.bind(authController_1.authController));
// POST /api/auth/verify-otp - Verify OTP and set password
router.post('/verify-otp', authController_1.authController.verifyOTPAndSetPassword.bind(authController_1.authController));
// POST /api/auth/login - Login with email and password
router.post('/login', authController_1.authController.login.bind(authController_1.authController));
// POST /api/auth/resend-otp - Resend OTP
router.post('/resend-otp', authController_1.authController.resendOTP.bind(authController_1.authController));
// POST /api/auth/refresh - Refresh access token
router.post('/refresh', authController_1.authController.refreshToken.bind(authController_1.authController));
// PROTECTED ROUTES (authentication required)
// POST /api/auth/logout - Logout and invalidate session
router.post('/logout', authMiddleware_1.authMiddleware.authenticate.bind(authMiddleware_1.authMiddleware), authController_1.authController.logout.bind(authController_1.authController));
// GET /api/auth/me - Get current user info
router.get('/me', authMiddleware_1.authMiddleware.authenticate.bind(authMiddleware_1.authMiddleware), authController_1.authController.getCurrentUser.bind(authController_1.authController));
exports.default = router;
