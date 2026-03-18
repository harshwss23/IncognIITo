"use strict";
// FILE: src/services/tokenService.ts
// PURPOSE: JWT token generation and validation (like Shopio's JwtUtil)
// WHAT IT DOES:
// - Generates JWT access tokens (15min expiry)
// - Generates refresh tokens (7 days expiry)
// - Validates and decodes tokens
// - Stores tokens in database for session management
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenService = exports.TokenService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../config/database");
class TokenService {
    constructor() {
        this.JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';
        this.ACCESS_TOKEN_EXPIRY = '7d';
        this.REFRESH_TOKEN_EXPIRY = '365d';
    }
    // Generate JWT access token (like Shopio's generateToken)
    generateAccessToken(payload) {
        return jsonwebtoken_1.default.sign(payload, this.JWT_SECRET, {
            expiresIn: this.ACCESS_TOKEN_EXPIRY,
        });
    }
    // Generate refresh token
    generateRefreshToken(payload) {
        return jsonwebtoken_1.default.sign(payload, this.JWT_SECRET, {
            expiresIn: this.REFRESH_TOKEN_EXPIRY,
        });
    }
    verifyTokenDetailed(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, this.JWT_SECRET);
            return {
                payload: decoded,
                reason: 'valid',
            };
        }
        catch (error) {
            if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
                return {
                    payload: null,
                    reason: 'expired',
                };
            }
            console.warn('Token verification failed: invalid token');
            return {
                payload: null,
                reason: 'invalid',
            };
        }
    }
    // Verify and decode token (like Shopio's validateToken)
    verifyToken(token) {
        return this.verifyTokenDetailed(token).payload;
    }
    // Create session and store token in database (like Shopio's JWTToken entity)
    async createSession(userId, token) {
        const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 365 days
        await (0, database_1.query)(`INSERT INTO sessions (session_id, user_id, expires_at) 
       VALUES ($1, $2, $3)`, [token, userId, expiresAt]);
    }
    // Validate session from database
    async validateSession(token) {
        const result = await (0, database_1.query)(`SELECT id FROM sessions 
       WHERE session_id = $1 
       AND expires_at > NOW()`, [token]);
        return result.rows.length > 0;
    }
    // Invalidate session (logout)
    async invalidateSession(token) {
        await (0, database_1.query)(`DELETE FROM sessions WHERE session_id = $1`, [token]);
    }
    // Clean up expired sessions (like Shopio's CleanupScheduler)
    async cleanupExpiredSessions() {
        const result = await (0, database_1.query)(`DELETE FROM sessions WHERE expires_at < NOW()`);
        console.log(`🧹 Cleaned up ${result.rowCount} expired sessions`);
    }
    // Generate both access and refresh tokens
    async generateTokenPair(userId, email, verified) {
        const payload = { userId, email, verified };
        const accessToken = this.generateAccessToken(payload);
        const refreshToken = this.generateRefreshToken(payload);
        // Store refresh token in database
        await this.createSession(userId, refreshToken);
        return { accessToken, refreshToken };
    }
    // Refresh access token using refresh token
    async refreshAccessToken(refreshToken) {
        // Verify refresh token
        const payload = this.verifyToken(refreshToken);
        if (!payload) {
            return null;
        }
        // Check if session exists in database
        const isValid = await this.validateSession(refreshToken);
        if (!isValid) {
            return null;
        }
        // Generate new access token
        return this.generateAccessToken(payload);
    }
}
exports.TokenService = TokenService;
exports.tokenService = new TokenService();
