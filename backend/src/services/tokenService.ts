// FILE: src/services/tokenService.ts
// PURPOSE: JWT token generation and validation (like Shopio's JwtUtil)
// WHAT IT DOES:
// - Generates JWT access tokens (15min expiry)
// - Generates refresh tokens (7 days expiry)
// - Validates and decodes tokens
// - Stores tokens in database for session management

import jwt from 'jsonwebtoken';
import { query } from '../config/database';

interface TokenPayload {
  userId: number;
  email: string;
  verified: boolean;
}

export class TokenService {
  private JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';
  private ACCESS_TOKEN_EXPIRY = '7d';
  private REFRESH_TOKEN_EXPIRY = '365d';

  // Generate JWT access token (like Shopio's generateToken)
  generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
    } as jwt.SignOptions);
  }

  // Generate refresh token
  generateRefreshToken(payload: TokenPayload): string {
    return jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.REFRESH_TOKEN_EXPIRY,
    } as jwt.SignOptions);
  }

  // Verify and decode token (like Shopio's validateToken)
  verifyToken(token: string): TokenPayload | null {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as TokenPayload;
      return decoded;
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  }

  // Create session and store token in database (like Shopio's JWTToken entity)
  async createSession(userId: number, token: string): Promise<void> {
    const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 365 days

    await query(
      `INSERT INTO sessions (session_id, user_id, expires_at) 
       VALUES ($1, $2, $3)`,
      [token, userId, expiresAt]
    );
  }

  // Validate session from database
  async validateSession(token: string): Promise<boolean> {
    const result = await query(
      `SELECT id FROM sessions 
       WHERE session_id = $1 
       AND expires_at > NOW()`,
      [token]
    );

    return result.rows.length > 0;
  }

  // Invalidate session (logout)
  async invalidateSession(token: string): Promise<void> {
    await query(
      `DELETE FROM sessions WHERE session_id = $1`,
      [token]
    );
  }

  // Clean up expired sessions (like Shopio's CleanupScheduler)
  async cleanupExpiredSessions(): Promise<void> {
    const result = await query(
      `DELETE FROM sessions WHERE expires_at < NOW()`
    );
    console.log(`🧹 Cleaned up ${result.rowCount} expired sessions`);
  }

  // Generate both access and refresh tokens
  async generateTokenPair(userId: number, email: string, verified: boolean): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const payload: TokenPayload = { userId, email, verified };

    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);

    // Store refresh token in database
    await this.createSession(userId, refreshToken);

    return { accessToken, refreshToken };
  }

  // Refresh access token using refresh token
  async refreshAccessToken(refreshToken: string): Promise<string | null> {
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

export const tokenService = new TokenService();
