// FILE: src/routes/matchRoutes.ts
// PURPOSE: Maps URL paths to controller methods, applies auth middleware.
// WHY: Follows same pattern as authRoutes.ts / userRoutes.ts in this project.
// ALL routes here require authentication (user must be logged in).

import { Router } from 'express';
import { matchController } from '../controllers/matchController';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

/**
 * MIDDLEWARE
 * All match routes require a valid JWT token.
 * authMiddleware.authenticate reads the Bearer token and sets req.user.
 */
const auth = authMiddleware.authenticate.bind(authMiddleware);

// --- Static Routes ---

// POST /api/match/join   → Join the matching queue
router.post('/join', auth, matchController.joinQueue.bind(matchController));

// POST /api/match/leave  → Leave the matching queue
router.post('/leave', auth, matchController.leaveQueue.bind(matchController));

// GET  /api/match/status → Check current state (idle / waiting / matched)
router.get('/status', auth, matchController.getStatus.bind(matchController));

// POST /api/match/end    → End an active session
router.post('/end', auth, matchController.endSession.bind(matchController));

// POST /api/match/rate   → Submit rating for a session
router.post('/rate', auth, matchController.rateSession.bind(matchController));


// --- Prefixed Dynamic Routes ---

// GET  /api/match/session/:roomId → Get session participants
router.get('/session/:roomId', auth, matchController.getSessionDetails.bind(matchController));

// matchRoutes.ts ke andar
// POST /api/match/force-disconnect
router.post('/force-disconnect', authMiddleware.authenticate.bind(authMiddleware), matchController.forceDisconnect.bind(matchController));
// --- Catch-all Dynamic Routes ---
// NOTE: Must be at the bottom to avoid conflicting with static routes.

// GET /api/match/:roomId → Get match details (names, interests)
router.get('/:roomId', auth, matchController.getMatchDetails.bind(matchController));

export default router;