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
// All match routes require valid JWT token
// authMiddleware.authenticate reads the Bearer token and sets req.user
// POST /api/match/join   → Join the matching queue
router.post('/join', authMiddleware_1.authMiddleware.authenticate.bind(authMiddleware_1.authMiddleware), matchController_1.matchController.joinQueue.bind(matchController_1.matchController));
// POST /api/match/leave  → Leave the matching queue
router.post('/leave', authMiddleware_1.authMiddleware.authenticate.bind(authMiddleware_1.authMiddleware), matchController_1.matchController.leaveQueue.bind(matchController_1.matchController));
// GET  /api/match/status → Check current state (idle / waiting / matched)
router.get('/status', authMiddleware_1.authMiddleware.authenticate.bind(authMiddleware_1.authMiddleware), matchController_1.matchController.getStatus.bind(matchController_1.matchController));
// POST /api/match/end    → End an active session
router.post('/end', authMiddleware_1.authMiddleware.authenticate.bind(authMiddleware_1.authMiddleware), matchController_1.matchController.endSession.bind(matchController_1.matchController));
exports.default = router;
