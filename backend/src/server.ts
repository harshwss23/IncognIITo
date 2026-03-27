// ============================================================================
// FILE: src/server.ts
// PURPOSE: Primary Application Entrypoint. Configures the Express HTTP server, 
//          initializes database checks, binds REST API routes, and seamlessly 
//          attaches the Socket.IO WebRTC and Messaging layers.
// ============================================================================

import express, { Application } from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import http from "http";
import { Server as SocketIOServer } from "socket.io";

import { pool } from "./config/database";

// Routes imports
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import chatRoutes from "./routes/chatRoutes";
import requestRoutes from "./routes/requestRoutes";
import adminRoutes from "./routes/adminRoutes";
import matchRoutes from "./routes/matchRoutes";

import { errorHandler } from "./middleware/errorHandler";
import { tokenService } from "./services/tokenService";
import { MatchingService } from "./services/matchingService";
import { queueService } from "./services/queueService";
import { registerSocketHandlers } from "./socket/socket";

// Load environment variables dynamically
dotenv.config();

type PgError = Error & { code?: string };

/**
 * Automates the verification and provisioning of the Administration schema constraints.
 * Ensures the `is_admin` column exists on user rows and structural tables like `reports` 
 * are correctly instantiated before accepting traffic.
 * 
 * @returns {Promise<void>} Resolves when schema verification concludes without throwing.
 */
async function ensureAdminSchema(): Promise<void> {
  try {
    // Step-by-step: Check if the 'is_admin' field is already registered in the DB
    const columnResult = await pool.query(
      `SELECT EXISTS (
         SELECT 1
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'users'
           AND column_name = 'is_admin'
       ) AS exists`
    );

    // Step-by-step: Inject 'is_admin' seamlessly if it is missing
    if (!columnResult.rows[0]?.exists) {
      await pool.query(
        `ALTER TABLE users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT FALSE`
      );
    }

    // Step-by-step: Guarantee the 'reports' table format is permanently enforced 
    await pool.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        target_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reason VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'Pending'
          CHECK (status IN ('Pending', 'Resolved', 'Dismissed')),
        admin_note TEXT,
        resolved_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    console.log("✅ Admin schema verified");
  } catch (error) {
    const pgError = error as PgError;
    // Step-by-step: Fallback gracefully if the user permissions intrinsically restrict DDL
    if (pgError.code === "42501") {
      console.warn("⚠️ Skipping admin schema migration: User does not own tables.");
      return;
    }
    console.error("⚠️ Admin schema check failed:", error);
  }
}

/**
 * Encapsulates the core structural architecture of the IncognIITo backend.
 */
class Server {
  public app: Application;
  private httpServer: http.Server;
  public io: SocketIOServer;
  private port: number;
  private matchingService: MatchingService;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || "5000", 10);

    this.httpServer = http.createServer(this.app);

    this.io = new SocketIOServer(this.httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      },
    });
    // Link IO to the express application for cross-module usage
    this.app.set("io", this.io);
    this.matchingService = new MatchingService(this.io);

    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeSockets();
    this.initializeErrorHandling();
  }

  /**
   * Orchestrates base cross-site request policies and HTTP payload parsers.
   * @private
   */
  private initializeMiddlewares(): void {
    this.app.use(
      cors({
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
        allowedHeaders: ["Content-Type", "Authorization"],
      })
    );

    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(cookieParser());

    if (process.env.NODE_ENV === "development") {
      this.app.use((req, _res, next) => {
        console.log(`${req.method} ${req.path}`);
        next();
      });
    }
  }

  /**
   * Mounts all independent service routers into the primary Express application logic.
   * @private
   */
  private initializeRoutes(): void {
    this.app.get("/health", (_req, res) => {
      res.status(200).json({
        success: true,
        message: "Server is running",
        timestamp: new Date().toISOString(),
      });
    });

    this.app.use("/api/auth", authRoutes);
    this.app.use("/api/users", userRoutes);
    this.app.use("/api/match", matchRoutes);
    this.app.use("/api/requests", requestRoutes);
    this.app.use("/api/chats", chatRoutes);
    this.app.use("/api/admin", adminRoutes);

    this.app.use(errorHandler.notFound.bind(errorHandler));
  }

  // ==========================================================================
  // WEBRTC & SOCKET LOGIC SUBSYSTEM
  // ==========================================================================
  
  /**
   * Boots the WebSocket event listeners, enforcing rigid authentication and handling
   * complex 'ghost' tab conflicts cleanly.
   * @private
   */
  private initializeSockets(): void {
    registerSocketHandlers(this.io);

    // Step-by-step: SOCKET AUTHENTICATION MIDDLEWARE
    // Refuses upgrading standard HTTP requests to WS connections without valid tokens.
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error("Token is missing"));
        }

        const decoded = (await tokenService.verifyToken(token)) as any;
        socket.data.userId = decoded.userId || decoded.id;

        if (!socket.data.userId) {
          return next(new Error("Invalid token payload"));
        }

        next();
      } catch (error) {
        console.error("Socket Auth Error:", error);
        next(new Error("Invalid or expired token"));
      }
    });

    // Step-by-step: MAIN CONNECTION EVENT
    this.io.on("connection", async (socket) => {
      const userId = socket.data.userId;
      const isTakeover = socket.handshake.auth.takeover;

      // Restrict access if the user ID wasn't properly assigned through auth
      if (!userId) {
        console.warn(`🚨 Ignored socket ${socket.id} (No valid User ID)`);
        socket.disconnect(true);
        return;
      }

      console.log(`🔌 Socket Connected: ${socket.id} (User ID: ${userId}, Takeover: ${isTakeover})`);

      // ----------------------------------------------------------------------
      // SUBSCRIBER EVENTS REGISTRY
      // ----------------------------------------------------------------------
      socket.on("join_room", async (roomID) => {
        try {
          const assignedRoomId = await queueService.getActiveSession(userId);

          // Defense: Must be joining their dynamically assigned queue target
          if (!assignedRoomId || assignedRoomId !== roomID) {
            socket.emit("room_error", "You are not authorized to join this room.");
            return;
          }

          const socketsInRoom = await this.io.in(roomID).fetchSockets();
          const isUserAlreadyInRoom = socketsInRoom.some((s) => s.data.userId === userId);

          // Defense: Cannot join twice from tabs duplicating identical socket flows
          if (isUserAlreadyInRoom) {
            socket.emit("room_error", "You are already connected to this session in another tab/window.");
            return;
          }

          // Defense: 1-on-1 logic restriction
          if (socketsInRoom.length >= 2) {
            socket.emit("room_error", "This room is already full.");
            return;
          }

          socket.join(roomID);
          socket.data.hasSuccessfullyJoined = true;
          socket.emit("room_joined_success");
          socket.to(roomID).emit("user_joined", socket.id);
        } catch (error) {
          socket.emit("room_error", "Server error verifying your room.");
        }
      });

      socket.on("leave_room", (roomID) => {
        socket.leave(roomID);
        socket.to(roomID).emit("session_ended", "Your partner has left the chat.");
      });

      // Peer-to-Peer Relay WebRTC Handshake Nodes
      socket.on("offer", (data) => socket.to(data.roomID).emit("receive_offer", data));
      socket.on("answer", (data) => socket.to(data.roomID).emit("receive_answer", data));
      socket.on("ice_candidate", (data) => socket.to(data.roomID).emit("receive_ice_candidate", data));
      socket.on("send_message", (data) => socket.to(data.roomID).emit("receive_message", data));
      socket.on("camera_status", (data) => socket.to(data.roomID).emit("receive_camera_status", data));

      // DISCONNECT LOGIC: Triggered natively when WS drops OR manually fired via `socket.disconnect()`
      socket.on("disconnect", async () => {
        console.log(`❌ Socket Disconnected: ${socket.id} (User: ${userId})`);

        try {
          // If the socket was forcefully purged because they refreshed, don't cascade destroy the rooms
          if (socket.data.killedByTakeover) {
            console.log(`⚠️ Skipped DB Cleanup for ${socket.id} (Killed by Force Takeover)`);
            return;
          }

          if (!socket.data.hasSuccessfullyJoined) {
            await queueService.leaveQueue(userId).catch(() => { });
            return;
          }

          const roomId = await queueService.getActiveSession(userId);

          // Graceful session shutdown & Database update 
          if (roomId) {
            socket.to(roomId).emit("session_ended", "Your partner disconnected. Redirecting...");

            const sessionResult = await pool.query(
               `SELECT id, user1_id, user2_id FROM matchmaking_sessions WHERE room_id = $1 AND status = 'active'`,
              [roomId]
            );

            if (sessionResult.rows.length > 0) {
              const session = sessionResult.rows[0];
              await pool.query(`UPDATE matchmaking_sessions SET status = 'completed', session_end = NOW() WHERE id = $1`, [session.id]);
              await queueService.clearActiveSession(session.user1_id);
              await queueService.clearActiveSession(session.user2_id);
            }
          } else {
            // Revert them silently if they hadn't actually joined a room yet
            await queueService.leaveQueue(userId).catch(() => { });
          }
        } catch (error) {
          console.error("Error handling forceful disconnect cleanup:", error);
        }
      });

      // ----------------------------------------------------------------------
      // MULTI-TAB & GHOST CONNECTION RESOLVER (Force Takeover)
      // ----------------------------------------------------------------------
      // Placed inside a timeout block to enable transient connections to drop 
      // natively if it was just a raw double-refresh blink.
      setTimeout(async () => {
        // Halt if the timeout fired natively on an already dead socket
        if (socket.disconnected) return;

        const globalUserRoom = `user_global_${userId}`;
        const existingSockets = await this.io.in(globalUserRoom).fetchSockets();

        // Extract parallel sockets belonging strictly to other distinct tabs/devices
        const otherSockets = existingSockets.filter(s => s.id !== socket.id);

        if (otherSockets.length > 0) {
          if (isTakeover) {
            console.log(`🔥 User ${userId} requested a FORCE TAKEOVER.`);
            
            // Substep 1: Kill strictly old sockets gracefully
            otherSockets.forEach((oldSocket) => {
              oldSocket.data.killedByTakeover = true;
              oldSocket.emit("multiple_tabs_error", "Session taken over by another device.");
              oldSocket.disconnect(true);
            });

            // Substep 2: Tear down lingering database/queue remnants tying up the user
            try {
              await queueService.leaveQueue(userId).catch(() => { });
              const roomId = await queueService.getActiveSession(userId);
              if (roomId) {
                this.io.to(roomId).emit("session_ended", "Your partner disconnected (Session Taken Over).");
                const sessionResult = await pool.query(
                  `SELECT id, user1_id, user2_id FROM matchmaking_sessions WHERE room_id = $1 AND status = 'active'`,
                  [roomId]
                );
                if (sessionResult.rows.length > 0) {
                  const session = sessionResult.rows[0];
                  await pool.query(`UPDATE matchmaking_sessions SET status = 'completed', session_end = NOW() WHERE id = $1`, [session.id]);
                  await queueService.clearActiveSession(session.user1_id);
                  await queueService.clearActiveSession(session.user2_id);
                }
              }
            } catch (error) {
              console.error("Error clearing session:", error);
            }

            // Bind explicitly to the global tracking room
            socket.join(globalUserRoom);
            socket.emit("takeover_success");

          } else {
            // Stop them entirely if not forcefully requesting a takeover
            console.warn(`🚨 User ${userId} blocked. Genuine multiple tab detected.`);
            socket.emit("multiple_tabs_error", "You already have an active session in another window.");
            socket.disconnect(true);
          }
        } else {
          // Fresh, uncontested connection state
          socket.join(globalUserRoom);
          console.log(`✅ User ${userId} claimed the primary session.`);
          socket.emit("no_conflict"); 
        }
      }, 0); 
    });
  }

  /**
   * Embeds customized application error interception middlewares at the base stack level.
   * @private
   */
  private initializeErrorHandling(): void {
    this.app.use(errorHandler.handle.bind(errorHandler));
  }

  /**
   * Initiates HTTP listening, tests the database, loops matchmakers, and initializes purifiers.
   */
  public start(): void {
    this.httpServer.listen(this.port, async () => {
      console.log(`📡 Server running on port ${this.port}`);
      pool.query("SELECT NOW()", (err: Error | null) => {
        if (err) console.error("❌ Database connection failed", err);
        else console.log("✅ Database connected");
      });

      this.matchingService.start();
      await ensureAdminSchema();

      // Trigger standard background cleanup cache sweep every hour
      setInterval(() => {
        tokenService.cleanupExpiredSessions().catch(() => {});
      }, 60 * 60 * 1000);
    });

    process.on("SIGTERM", this.shutdown.bind(this));
    process.on("SIGINT", this.shutdown.bind(this));
  }

  /**
   * Catches interrupt signals (SIGTERM/SIGINT) to close databases and WebSocket 
   * rooms neatly instead of crashing openly.
   * @private
   */
  private async shutdown(): Promise<void> {
    try {
      this.matchingService.stop();
      this.io.close();

      await new Promise<void>((resolve, reject) => {
        this.httpServer.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      await pool.end();
      process.exit(0);
    } catch (error) {
      process.exit(1);
    }
  }
}

const server = new Server();
server.start();

export default server;
