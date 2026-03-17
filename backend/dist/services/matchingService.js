"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MatchingService = void 0;
const node_crypto_1 = require("node:crypto");
const queueService_1 = require("./queueService");
const interests_1 = require("../constants/interests");
const database_1 = require("../config/database");
// Threshold decays as user waits longer
// WHY: Don't make users wait forever for a perfect match.
function getThreshold(waitMs) {
    if (waitMs < 5000)
        return 0.40; // 0-5s: Need 40% match
    if (waitMs < 10000)
        return 0.20; // 5-10s: Need 20% match
    return 0.00; // 10s+: Accept anyone (force match)
}
// Check if a pair is blocked using the prebuilt Set
// Set stores "smaller_id:larger_id" strings for O(1) lookup
function isBlocked(a, b, blockedPairs) {
    const key = `${Math.min(a, b)}:${Math.max(a, b)}`;
    return blockedPairs.has(key);
}
class MatchingService {
    constructor(io) {
        this.intervalId = null;
        this.isRunning = false; // Prevent overlapping loops
        this.io = io;
    }
    // ─── START MATCHING LOOP ─────────────────────────────────────────────
    // Called once from server.ts when the server starts
    start() {
        if (this.intervalId)
            return; // Already running
        this.intervalId = setInterval(() => this.runMatchingCycle(), 500);
        console.log('✅ Matching loop started (every 500ms)');
    }
    // ─── STOP MATCHING LOOP ──────────────────────────────────────────────
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
    // ─── ONE MATCHING CYCLE ──────────────────────────────────────────────
    // This runs every 500ms. Single thread, no overlap.
    async runMatchingCycle() {
        if (this.isRunning)
            return; // Previous cycle still running, skip
        this.isRunning = true;
        try {
            // Step 1: Read queue (sorted by join time, oldest first)
            const queue = await queueService_1.queueService.getQueue();
            if (queue.length < 2)
                return; // Need at least 2 to match
            // Step 2: Fetch blocked pairs from PostgreSQL (ONE query for all users)
            const userIds = queue.map(u => u.userId);
            const blockedPairs = await queueService_1.queueService.getBlockedPairs(userIds);
            // Step 3: Track who got matched this cycle
            const matched = new Set();
            const now = Date.now();
            // Step 4: N² matching loop
            // Outer loop: process oldest-waiting user first
            for (let i = 0; i < queue.length; i++) {
                const userA = queue[i];
                if (matched.has(userA.userId))
                    continue; // Already matched this cycle
                const waitMs = now - userA.joinedAt;
                const threshold = getThreshold(waitMs);
                let bestMatch = null;
                let bestScore = -1;
                // Inner loop: find best unmatched B for A
                for (let j = i + 1; j < queue.length; j++) {
                    const userB = queue[j];
                    if (matched.has(userB.userId))
                        continue; // Already matched
                    if (isBlocked(userA.userId, userB.userId, blockedPairs))
                        continue; // Blocked
                    const score = (0, interests_1.jaccardScore)(userA.interestBits, userB.interestBits);
                    // Must be above threshold AND better than current best
                    if (score >= threshold && score > bestScore) {
                        bestScore = score;
                        bestMatch = userB;
                    }
                }
                // Step 5: If best match found → create session immediately
                if (bestMatch) {
                    await this.createMatch(userA, bestMatch, bestScore);
                    matched.add(userA.userId);
                    matched.add(bestMatch.userId);
                }
                // If no match found: skip A for now, retry in next 500ms cycle
            }
        }
        catch (err) {
            console.error('Matching cycle error:', err);
        }
        finally {
            this.isRunning = false;
        }
    }
    // ─── CREATE MATCH (called when two users are paired) ─────────────────
    async createMatch(userA, userB, score) {
        const roomId = (0, node_crypto_1.randomUUID)(); // Unique room ID for WebRTC later
        const matchScore = Math.round(score * 100);
        try {
            // 1. Remove both from Redis queue + clear their interest cache
            await Promise.all([
                queueService_1.queueService.leaveQueue(userA.userId),
                queueService_1.queueService.leaveQueue(userB.userId),
            ]);
            // 2. Store active session in Redis (used by frontend to know room_id)
            await Promise.all([
                queueService_1.queueService.setActiveSession(userA.userId, roomId),
                queueService_1.queueService.setActiveSession(userB.userId, roomId),
            ]);
            // 3. Create permanent session record in PostgreSQL
            await (0, database_1.query)(`INSERT INTO matchmaking_sessions
           (user1_id, user2_id, match_score, room_id, status)
         VALUES ($1, $2, $3, $4, 'active')`, [userA.userId, userB.userId, matchScore, roomId]);
            // 4. Emit socket event to BOTH users
            // Frontend listens for "matched" event and redirects to video room
            const payload = {
                roomId,
                matchScore,
                event: 'matched',
            };
            this.io.to(`user:${userA.userId}`).emit('matched', payload);
            this.io.to(`user:${userB.userId}`).emit('matched', payload);
            console.log(`✅ Matched user ${userA.userId} + user ${userB.userId} | score: ${matchScore}% | room: ${roomId}`);
        }
        catch (err) {
            console.error(`Failed to create match for ${userA.userId} and ${userB.userId}:`, err);
            // Put them back in queue if session creation failed
            await queueService_1.queueService.joinQueue(userA.userId).catch(() => { });
            await queueService_1.queueService.joinQueue(userB.userId).catch(() => { });
        }
    }
}
exports.MatchingService = MatchingService;
