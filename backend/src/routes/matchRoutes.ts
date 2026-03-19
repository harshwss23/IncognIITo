// FILE: src/routes/matchRoutes.ts
// PURPOSE: Maps URL paths to controller methods, applies auth middleware.
// WHY: Follows same pattern as authRoutes.ts / userRoutes.ts in this project.
// ALL routes here require authentication (user must be logged in).

import { Router } from 'express';
import { matchController } from '../controllers/matchController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// All match routes require valid JWT token
// authMiddleware.authenticate reads the Bearer token and sets req.user

// POST /api/match/join   → Join the matching queue
router.post('/join', authMiddleware.authenticate.bind(authMiddleware), matchController.joinQueue.bind(matchController));

// POST /api/match/leave  → Leave the matching queue
router.post('/leave', authMiddleware.authenticate.bind(authMiddleware), matchController.leaveQueue.bind(matchController));

// GET  /api/match/status → Check current state (idle / waiting / matched)
router.get('/status', authMiddleware.authenticate.bind(authMiddleware), matchController.getStatus.bind(matchController));

// POST /api/match/end    → End an active session
router.post('/end', authMiddleware.authenticate.bind(authMiddleware), matchController.endSession.bind(matchController));

// POST /api/match/rate   → Submit rating for a session
router.post('/rate', authMiddleware.authenticate.bind(authMiddleware), matchController.rateSession.bind(matchController));

// ==========================================
// GET /api/match/:roomId → Get match details (names, interests)
// NOTE: Dynamic routes with parameters MUST be at the bottom 
// to avoid conflicting with static routes like /status or /join.
// ==========================================
router.get('/:roomId', authMiddleware.authenticate.bind(authMiddleware), matchController.getMatchDetails.bind(matchController));

export default router;