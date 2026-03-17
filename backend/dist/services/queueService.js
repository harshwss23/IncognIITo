"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.queueService = exports.QueueService = void 0;
const redis_1 = __importDefault(require("../config/redis"));
const interests_1 = require("../constants/interests");
const database_1 = require("../config/database");
class QueueService {
    // ─── ADD USER TO QUEUE ───────────────────────────────────────────────
    // Called when user hits POST /api/match/join
    // 1. Fetch interests from PostgreSQL (one-time)
    // 2. Convert interests → BigInt
    // 3. Store in Redis (queue + interests cache)
    // 4. Write backup row to PostgreSQL matchmaking_queue
    async joinQueue(userId) {
        // Check user isn't already in queue
        const existing = await redis_1.default.zScore('match_queue', String(userId));
        if (existing !== null) {
            throw new Error('Already in queue');
        }
        // Fetch interests from PostgreSQL user_profiles
        const result = await (0, database_1.query)('SELECT interests FROM user_profiles WHERE user_id = $1', [userId]);
        if (!result.rows.length) {
            throw new Error('User profile not found');
        }
        const interests = result.rows[0].interests || [];
        const interestBits = (0, interests_1.interestsToBigInt)(interests);
        const now = Date.now();
        // Store BigInt as string in Redis (Redis only stores strings)
        // Key: "user:interests:5" → Value: "35" (BigInt as string)
        await redis_1.default.set(`user:interests:${userId}`, interestBits.toString());
        // Add to sorted queue with join timestamp as score
        // ZADD match_queue 1709462400000 "5"
        await redis_1.default.zAdd('match_queue', { score: now, value: String(userId) });
        // Backup to PostgreSQL (audit trail + recovery on Redis crash)
        await (0, database_1.query)(`INSERT INTO matchmaking_queue (user_id, status, preferred_interests)
       VALUES ($1, 'waiting', $2)
       ON CONFLICT (user_id) DO UPDATE
       SET status = 'waiting', joined_at = NOW(), updated_at = NOW(),
           preferred_interests = $2`, [userId, interests]);
        console.log(`User ${userId} joined queue with interests: ${interests.join(', ')}`);
    }
    // ─── REMOVE USER FROM QUEUE ──────────────────────────────────────────
    // Called when user logs out, leaves queue, or gets matched
    async leaveQueue(userId) {
        // Remove from Redis sorted set
        await redis_1.default.zRem('match_queue', String(userId));
        // Delete cached interests
        await redis_1.default.del(`user:interests:${userId}`);
        // Update PostgreSQL status to 'expired'
        await (0, database_1.query)(`UPDATE matchmaking_queue SET status = 'expired', updated_at = NOW()
       WHERE user_id = $1 AND status = 'waiting'`, [userId]);
        console.log(`User ${userId} left queue`);
    }
    // ─── GET ALL USERS IN QUEUE ──────────────────────────────────────────
    // Returns users sorted by join time (oldest first = waited longest)
    // This is what the matching algorithm reads every 500ms
    async getQueue() {
        // ZRANGE match_queue 0 -1 WITHSCORES → sorted by score (join time)
        const members = await redis_1.default.zRangeWithScores('match_queue', 0, -1);
        if (members.length === 0)
            return [];
        // Batch fetch all interests in ONE Redis call using MGET
        // Instead of N separate GET calls → single round trip ⚡
        const interestKeys = members.map((member) => `user:interests:${member.value}`);
        const interestValues = await redis_1.default.mGet(interestKeys);
        const entries = [];
        for (let i = 0; i < members.length; i++) {
            const { value: userIdStr, score: joinedAt } = members[i];
            const bitsStr = interestValues[i];
            // Skip if interests cache is gone (user may have just left)
            if (bitsStr === null)
                continue;
            entries.push({
                userId: parseInt(userIdStr),
                joinedAt,
                interestBits: BigInt(bitsStr),
            });
        }
        return entries;
    }
    // ─── CHECK IF USER IS IN QUEUE ───────────────────────────────────────
    async isInQueue(userId) {
        const score = await redis_1.default.zScore('match_queue', String(userId));
        return score !== null;
    }
    // ─── GET QUEUE SIZE ──────────────────────────────────────────────────
    async getQueueSize() {
        return await redis_1.default.zCard('match_queue');
    }
    // ─── STORE ACTIVE SESSION ────────────────────────────────────────────
    // After two users match, store their session mapping in Redis
    // Key: "user:session:5" → Value: "room_abc123"
    async setActiveSession(userId, roomId) {
        // Expire after 2 hours (session can't last longer than this)
        await redis_1.default.set(`user:session:${userId}`, roomId, { EX: 7200 });
    }
    // ─── GET ACTIVE SESSION ──────────────────────────────────────────────
    async getActiveSession(userId) {
        return await redis_1.default.get(`user:session:${userId}`);
    }
    // ─── CLEAR ACTIVE SESSION ────────────────────────────────────────────
    async clearActiveSession(userId) {
        await redis_1.default.del(`user:session:${userId}`);
    }
    // ─── REMOVE USER (full cleanup on logout/disconnect) ─────────────────
    async cleanupUser(userId) {
        // Remove from queue + delete all their Redis keys
        await Promise.all([
            redis_1.default.zRem('match_queue', String(userId)),
            redis_1.default.del(`user:interests:${userId}`),
            redis_1.default.del(`user:session:${userId}`),
        ]);
        // Update PostgreSQL
        await (0, database_1.query)(`UPDATE matchmaking_queue SET status = 'expired', updated_at = NOW()
       WHERE user_id = $1 AND status = 'waiting'`, [userId]);
    }
    // ─── GET BLOCKED USERS ───────────────────────────────────────────────
    // Returns set of user IDs that userId has blocked OR who blocked userId
    // Called once when building the queue snapshot during matching
    async getBlockedPairs(userIds) {
        if (userIds.length === 0)
            return new Set();
        // Query all blocks involving any user in the queue
        const result = await (0, database_1.query)(`SELECT blocker_id, blocked_id FROM user_blocks
       WHERE blocker_id = ANY($1) OR blocked_id = ANY($1)`, [userIds]);
        // Build a Set of "smaller_id:larger_id" pairs for O(1) lookup
        const blocked = new Set();
        for (const row of result.rows) {
            const a = Math.min(row.blocker_id, row.blocked_id);
            const b = Math.max(row.blocker_id, row.blocked_id);
            blocked.add(`${a}:${b}`);
        }
        return blocked;
    }
}
exports.QueueService = QueueService;
exports.queueService = new QueueService();
