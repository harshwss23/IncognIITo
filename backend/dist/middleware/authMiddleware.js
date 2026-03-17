"use strict";
// FILE: src/middleware/authMiddleware.ts
// PURPOSE: JWT authentication middleware (like Shopio's JwtAuthenticationFilter)
// WHAT IT DOES:
// - Extracts JWT token from Authorization header
// - Validates the token
// - Attaches user info to request object
// - Protects routes that require authentication
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = exports.AuthMiddleware = void 0;
const tokenService_1 = require("../services/tokenService");
class AuthMiddleware {
    // Verify JWT token (like Shopio's JwtAuthenticationFilter.doFilterInternal)
    authenticate(req, res, next) {
        try {
            // Extract token from Authorization header
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                res.status(401).json({
                    success: false,
                    message: 'Authorization token required',
                });
                return;
            }
            const token = authHeader.substring(7); // Remove 'Bearer ' prefix
            // Verify token
            const { payload, reason } = tokenService_1.tokenService.verifyTokenDetailed(token);
            if (!payload) {
                res.status(401).json({
                    success: false,
                    message: reason === 'expired' ? 'Token expired' : 'Invalid token',
                });
                return;
            }
            // Attach user info to request
            req.user = {
                userId: payload.userId,
                email: payload.email,
                verified: payload.verified,
            };
            next();
        }
        catch (error) {
            console.error('Authentication error:', error);
            res.status(401).json({
                success: false,
                message: 'Authentication failed',
            });
        }
    }
    // Optional authentication (doesn't fail if no token)
    optionalAuth(req, res, next) {
        try {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.substring(7);
                const payload = tokenService_1.tokenService.verifyToken(token);
                if (payload) {
                    req.user = {
                        userId: payload.userId,
                        email: payload.email,
                        verified: payload.verified,
                    };
                }
            }
            next();
        }
        catch (error) {
            // Continue without authentication
            next();
        }
    }
    // Require verified email (like Shopio's verification check)
    requireVerified(req, res, next) {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required',
            });
            return;
        }
        if (!req.user.verified) {
            res.status(403).json({
                success: false,
                message: 'Email verification required',
            });
            return;
        }
        next();
    }
}
exports.AuthMiddleware = AuthMiddleware;
exports.authMiddleware = new AuthMiddleware();
