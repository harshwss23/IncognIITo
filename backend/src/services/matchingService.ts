import { Server as SocketServer } from 'socket.io';
import { randomUUID } from 'node:crypto';
import { queueService, QueueEntry } from './queueService';
import { jaccardScore } from '../constants/interests';
import { query } from '../config/database';

// --- Configuration Constants (Defensive Programming: Avoid Magic Numbers) ---
const MATCHING_INTERVAL_MS = 1000;
const WAIT_TIME_SHORT_MS = 3000;
const WAIT_TIME_MEDIUM_MS = 6000;

const THRESHOLD_HIGH = 0.40;
const THRESHOLD_MEDIUM = 0.20;
const THRESHOLD_LOW = 0.00;

const SCORE_MULTIPLIER = 100;
const MINIMUM_QUEUE_SIZE_FOR_MATCH = 2;

/**
 * Calculates the required matching threshold based on how long a user has waited.
 * The threshold decays progressively to prioritize matching users over perfect matches.
 *
 * @param {number} waitMs - The duration the user has waited in milliseconds.
 * @returns {number} The threshold percentage required for a match.
 */
function getThreshold(waitMs: number): number {
  if (waitMs < WAIT_TIME_SHORT_MS) return THRESHOLD_HIGH;
  if (waitMs < WAIT_TIME_MEDIUM_MS) return THRESHOLD_MEDIUM;
  return THRESHOLD_LOW;
}

/**
 * Reconstructs the paired key to verify if the pair is blocked using O(1) matching.
 *
 * @param {number} a - The first user ID.
 * @param {number} b - The second user ID.
 * @param {Set<string>} blockedPairs - A predefined set of strings representing blocked ID pairs.
 * @returns {boolean} Returns true if the two users are in the blocked set.
 */
function isBlocked(a: number, b: number, blockedPairs: Set<string>): boolean {
  const minId = Math.min(a, b);
  const maxId = Math.max(a, b);
  const key = `${minId}:${maxId}`;
  return blockedPairs.has(key);
}

export class MatchingService {
  private io: SocketServer;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isRunning: boolean = false;

  constructor(io: SocketServer) {
    this.io = io;
  }

  /**
   * Kicks off the continuous, non-overlapping matching loop at regular intervals.
   */
  start(): void {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => this.runMatchingCycle(), MATCHING_INTERVAL_MS);
    console.log(`✅ Matching loop started (every ${MATCHING_INTERVAL_MS}ms)`);
  }

  /**
   * Halts the currently running matching loop.
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Executes a single O(N²) loop matching cycle to pair active users correctly.
   * It skips processing if an existing matching cycle is still executing.
   *
   * @private
   * @returns {Promise<void>}
   */
  private async runMatchingCycle(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      const queue = await queueService.getQueue();

      if (queue.length < MINIMUM_QUEUE_SIZE_FOR_MATCH) return;

      const userIds = queue.map(u => u.userId);
      const blockedPairs = await queueService.getBlockedPairs(userIds);

      const matched = new Set<number>();
      const now = Date.now();

      for (let i = 0; i < queue.length; i++) {
        const userA = queue[i];

        if (matched.has(userA.userId)) continue;

        const waitMs = now - userA.joinedAt;
        const threshold = getThreshold(waitMs);

        let bestMatch: QueueEntry | null = null;
        let bestScore = -1;

        for (let j = i + 1; j < queue.length; j++) {
          const userB = queue[j];

          if (matched.has(userB.userId)) continue;
          if (isBlocked(userA.userId, userB.userId, blockedPairs)) continue;

          const score = jaccardScore(userA.interestBits, userB.interestBits);

          if (score >= threshold && score > bestScore) {
            bestScore = score;
            bestMatch = userB;
          }
        }

        if (bestMatch) {
          await this.createMatch(userA, bestMatch, bestScore);
          matched.add(userA.userId);
          matched.add(bestMatch.userId);
        }
      }
    } catch (err: unknown) {
      console.error('Matching cycle error:', err);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Creates an active WebRTC match/session and emits WebSocket alerts.
   *
   * @private
   * @param {QueueEntry} userA - The first selected node queue user.
   * @param {QueueEntry} userB - The second selected node queue user.
   * @param {number} score - The matched Jaccard percentage similarity score.
   * @returns {Promise<void>}
   */
  private async createMatch(
    userA: QueueEntry,
    userB: QueueEntry,
    score: number
  ): Promise<void> {
    const roomId = randomUUID();
    const matchScore = Math.round(score * SCORE_MULTIPLIER);

    try {
      await Promise.all([
        queueService.leaveQueue(userA.userId),
        queueService.leaveQueue(userB.userId),
      ]);

      await Promise.all([
        queueService.setActiveSession(userA.userId, roomId),
        queueService.setActiveSession(userB.userId, roomId),
      ]);

      await query(
        `INSERT INTO matchmaking_sessions
           (user1_id, user2_id, match_score, room_id, status)
         VALUES ($1, $2, $3, $4, 'active')`,
        [userA.userId, userB.userId, matchScore, roomId]
      );

      const payload = {
        roomId,
        matchScore,
        event: 'matched',
      };
      
      this.io.to(`user:${userA.userId}`).emit('matched', payload);
      this.io.to(`user:${userB.userId}`).emit('matched', payload);

      console.log(
        `✅ Matched user ${userA.userId} + user ${userB.userId} | score: ${matchScore}% | room: ${roomId}`
      );
    } catch (err: unknown) {
      console.error(`Failed to create match for ${userA.userId} and ${userB.userId}:`, err);
      
      await queueService.joinQueue(userA.userId).catch(() => {});
      await queueService.joinQueue(userB.userId).catch(() => {});
    }
  }
}
