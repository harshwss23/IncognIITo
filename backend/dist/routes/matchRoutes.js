"use strict";
// FILE: src/routes/matchRoutes.ts
// PURPOSE: Maps URL paths to controller methods, applies auth middleware.
// WHY: Follows same pattern as authRoutes.ts / userRoutes.ts in this project.
// ALL routes here require authentication (user must be logged in).
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const matchController_1 = require("../controllers/matchController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = (0, express_1.Router)();
/**
 * MIDDLEWARE
 * All match routes require a valid JWT token.
 * authMiddleware.authenticate reads the Bearer token and sets req.user.
 */
const auth = authMiddleware_1.authMiddleware.authenticate.bind(authMiddleware_1.authMiddleware);
// --- Static Routes ---
// POST /api/match/join   → Join the matching queue
router.post('/join', auth, matchController_1.matchController.joinQueue.bind(matchController_1.matchController));
// POST /api/match/leave  → Leave the matching queue
router.post('/leave', auth, matchController_1.matchController.leaveQueue.bind(matchController_1.matchController));
// GET  /api/match/status → Check current state (idle / waiting / matched)
router.get('/status', auth, matchController_1.matchController.getStatus.bind(matchController_1.matchController));
// POST /api/match/end    → End an active session
router.post('/end', auth, matchController_1.matchController.endSession.bind(matchController_1.matchController));
// POST /api/match/rate   → Submit rating for a session
router.post('/rate', auth, matchController_1.matchController.rateSession.bind(matchController_1.matchController));
// --- Prefixed Dynamic Routes ---
// GET  /api/match/session/:roomId → Get session participants
router.get('/session/:roomId', auth, matchController_1.matchController.getSessionDetails.bind(matchController_1.matchController));
// matchRoutes.ts ke andar
// POST /api/match/force-disconnect
router.post('/force-disconnect', authMiddleware_1.authMiddleware.authenticate.bind(authMiddleware_1.authMiddleware), matchController_1.matchController.forceDisconnect.bind(matchController_1.matchController));
// --- Catch-all Dynamic Routes ---
// NOTE: Must be at the bottom to avoid conflicting with static routes.
// GET /api/match/:roomId → Get match details (names, interests)
router.get('/:roomId', auth, matchController_1.matchController.getMatchDetails.bind(matchController_1.matchController));
exports.default = router;
