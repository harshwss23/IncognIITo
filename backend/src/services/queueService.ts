// ============================================================================
// FILE: src/services/queueService.ts
// PURPOSE: Directly structures all asynchronous pairing queue methodologies. 
//          Synchronizes rapid Redis queues systematically with primary PostgreSQL 
//          databases representing robust memory buffers mitigating systemic race-conditions.
// ============================================================================

import redisClient from '../config/redis';
import { interestsToBigInt } from '../constants/interests';
import { query } from '../config/database';

export interface QueueEntry {
  userId: number;
  joinedAt: number; // Unix timestamp ms
  interestBits: bigint;
}

export class QueueService {

  /**
   * Securely embeds an authenticating target payload structure into both active
   * Redis buffers and deeply mirrored PostgreSQL fallback tables natively.
   * * @param {number} userId - The core persistent internal ID.
   * @returns {Promise<void>} 
   */
 async joinQueue(userId: number): Promise<void> {
    const existing = await redisClient.zScore('match_queue', String(userId));
    if (existing !== null) {
      throw new Error('Already in queue');
    }

    // 🧱 CORE MATCHMAKING FIREWALL 🧱
    const result = await query(
      'SELECT interests, COALESCE(is_banned, FALSE) as is_banned FROM user_profiles WHERE user_id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('User profile not found');
    }

    const userProfile = result.rows[0];
    const isBanned = userProfile.is_banned === true || 
                     String(userProfile.is_banned).toLowerCase() === 'true' || 
                     userProfile.is_banned === 't';
                     
    if (isBanned) {
        console.log(`🚨 CORE FIREWALL BLOCKED BANNED USER ${userId} FROM JOINING QUEUE`);
        throw new Error('Your account is permanently banned.');
    }
    // 🧱 ================================= 🧱

    const interests: string[] = userProfile.interests || [];
    const interestBits = interestsToBigInt(interests);
    const now = Date.now();

    await redisClient.set(`user:interests:${userId}`, interestBits.toString());
    await redisClient.zAdd('match_queue', { score: now, value: String(userId) });

    await query(
      `INSERT INTO matchmaking_queue (user_id, status, preferred_interests)
       VALUES ($1, 'waiting', $2)
       ON CONFLICT (user_id) DO UPDATE
       SET status = 'waiting', joined_at = NOW(), updated_at = NOW(),
           preferred_interests = $2`,
      [userId, interests]
    );

    console.log(`User ${userId} joined queue.`);
  }

  /**
   * Systematically evicts a node from waiting mechanics erasing traces cleanly natively.
   * * @param {number} userId - The identity matching key to decouple.
   * @returns {Promise<void>}
   */
  async leaveQueue(userId: number): Promise<void> {
    // Drop cleanly from volatile Redis sorted queue buffers securely
    await redisClient.zRem('match_queue', String(userId));

    // Release linked dependent cache nodes directly 
    await redisClient.del(`user:interests:${userId}`);

    // Update SQL logs permanently flagging abandonment 
    await query(
      `UPDATE matchmaking_queue SET status = 'expired', updated_at = NOW()
       WHERE user_id = $1 AND status = 'waiting'`,
      [userId]
    );

    console.log(`User ${userId} left queue`);
  }

  /**
   * Gathers all queued identities effectively traversing structures in O(log N) formats 
   * rendering them iteratively for cyclical pairing evaluation algorithms.
   * * @returns {Promise<QueueEntry[]>} Ordered timeline elements mapping oldest waiting sequentially.
   */
  async getQueue(): Promise<QueueEntry[]> {
    // Extract queue linearly mapping against joining score values natively
    const members = await redisClient.zRangeWithScores('match_queue', 0, -1);

    if (members.length === 0) return [];

    // Step-by-step: Batch execution compiling MGET logic rapidly retrieving parallel metadata efficiently
    const interestKeys = members.map((member: { value: string }) => `user:interests:${member.value}`);
    const interestValues = await redisClient.mGet(interestKeys);

    const entries: QueueEntry[] = [];
    for (let i = 0; i < members.length; i++) {
      const { value: userIdStr, score: joinedAt } = members[i];
      const bitsStr = interestValues[i];

      // Defensively disregard fragments catching missing nodes transitioning natively out dynamically
      if (bitsStr === null) continue;

      entries.push({
        userId: parseInt(userIdStr),
        joinedAt,
        interestBits: BigInt(bitsStr),
      });
    }

    return entries;
  }

  /**
   * Checks boolean states without expensive traversal logic dynamically natively inside Redis.
   * * @param {number} userId - Identification binding key.
   * @returns {Promise<boolean>} True if currently caching properly.
   */
  async isInQueue(userId: number): Promise<boolean> {
    const score = await redisClient.zScore('match_queue', String(userId));
    return score !== null;
  }

  /**
   * Determines exact wait pool dimension values instantaneously seamlessly.
   * * @returns {Promise<number>} Live Queue node count cleanly.
   */
  async getQueueSize(): Promise<number> {
    return await redisClient.zCard('match_queue');
  }

  /**
   * Marks a successful algorithmic connection mapping directly binding identities 
   * dynamically temporarily inside fast storage instances exclusively.
   * * @param {number} userId - Authenticated node linking context organically.
   * @param {string} roomId - Assigned generated shared UUID logically natively.
   * @returns {Promise<void>} 
   */
  async setActiveSession(userId: number, roomId: string): Promise<void> {
    // Force aggressive temporary bounding explicitly holding sessions solely max 2 hours internally.
    await redisClient.set(`user:session:${userId}`, roomId, { EX: 7200 });
  }

  /**
   * Inspects cache boundaries cleanly for existing operational session indicators functionally.
   * * @param {number} userId - Base node mapped organically natively.
   * @returns {Promise<string | null>} UUID of session mapped context properly or null smoothly natively.
   */
  async getActiveSession(userId: number): Promise<string | null> {
    return await redisClient.get(`user:session:${userId}`);
  }

  /**
   * Terminates cache bounds associated strictly with session properties natively organically natively.
   * * @param {number} userId - Terminated node mapped structurally natively.
   * @returns {Promise<void>} 
   */
  async clearActiveSession(userId: number): Promise<void> {
    await redisClient.del(`user:session:${userId}`);
  }

  /**
   * Wipes structural elements globally securely mapping user exit flows seamlessly natively natively.
   * * @param {number} userId - Completely severed contextual node systematically natively.
   * @returns {Promise<void>} 
   */
  async cleanupUser(userId: number): Promise<void> {
    await Promise.all([
      redisClient.zRem('match_queue', String(userId)),
      redisClient.del(`user:interests:${userId}`),
      redisClient.del(`user:session:${userId}`),
    ]);

    await query(
      `UPDATE matchmaking_queue SET status = 'expired', updated_at = NOW()
       WHERE user_id = $1 AND status = 'waiting'`,
      [userId]
    );
  }

  /**
   * Compiles strict constraint lists preventing negative matching experiences natively explicitly cleanly.
   * * @param {number[]} userIds - Current active iteration target map.
   * @returns {Promise<Set<string>>} Unidirectional exclusion set mathematically natively correctly compactly mapped natively.
   */
  async getBlockedPairs(userIds: number[]): Promise<Set<string>> {
    if (userIds.length === 0) return new Set();

    const result = await query(
      `SELECT blocker_id, blocked_id FROM user_blocks
       WHERE blocker_id = ANY($1) OR blocked_id = ANY($1)`,
      [userIds]
    );

    // Step-by-step: Construct mathematical bidirectional blocking set efficiently in O(1) structures explicitly natively 
    const blocked = new Set<string>();
    for (const row of result.rows) {
      const a = Math.min(row.blocker_id, row.blocked_id);
      const b = Math.max(row.blocker_id, row.blocked_id);
      blocked.add(`${a}:${b}`);
    }
    return blocked;
  }
}

export const queueService = new QueueService();