// FILE: src/middleware/authMiddleware.ts
// PURPOSE: JWT authentication middleware (like Shopio's JwtAuthenticationFilter)
// WHAT IT DOES:
// - Extracts JWT token from Authorization header
// - Validates the token
// - Attaches user info to request object
// - Protects routes that require authentication

import { Request, Response, NextFunction } from 'express';
import { tokenService } from '../services/tokenService';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        email: string;
        verified: boolean;
      };
    }
  }
}

export class AuthMiddleware {
  // Verify JWT token (like Shopio's JwtAuthenticationFilter.doFilterInternal)
  authenticate(req: Request, res: Response, next: NextFunction): void {
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
      const payload = tokenService.verifyToken(token);

      if (!payload) {
        res.status(401).json({
          success: false,
          message: 'Invalid or expired token',
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
    } catch (error) {
      console.error('Authentication error:', error);
      res.status(401).json({
        success: false,
        message: 'Authentication failed',
      });
    }
  }

  // Optional authentication (doesn't fail if no token)
  optionalAuth(req: Request, res: Response, next: NextFunction): void {
    try {
      const authHeader = req.headers.authorization;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const payload = tokenService.verifyToken(token);

        if (payload) {
          req.user = {
            userId: payload.userId,
            email: payload.email,
            verified: payload.verified,
          };
        }
      }

      next();
    } catch (error) {
      // Continue without authentication
      next();
    }
  }

  // Require verified email (like Shopio's verification check)
  requireVerified(req: Request, res: Response, next: NextFunction): void {
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

export const authMiddleware = new AuthMiddleware();
