// ============================================================================
// FILE: src/server.ts
// PURPOSE: Primary Application Entrypoint. Configures the Express HTTP server, 
//          initializes database checks, binds REST API routes, and seamlessly 
//          attaches the Socket.IO WebRTC and Messaging layers.
// ============================================================================

import express, { Application, Request, Response } from "express";
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

async function ensureAdminSchema(): Promise<void> {
  try {
    const columnResult = await pool.query(
      `SELECT EXISTS (
         SELECT 1
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'users'
           AND column_name = 'is_admin'
       ) AS exists`
    );

    if (!columnResult.rows[0]?.exists) {
      await pool.query(
        `ALTER TABLE users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT FALSE`
      );
    }

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
    if (pgError.code === "42501") {
      console.warn("⚠️ Skipping admin schema migration: User does not own tables.");
      return;
    }
    console.error("⚠️ Admin schema check failed:", error);
  }
}

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

    this.app.set("io", this.io);
    this.matchingService = new MatchingService(this.io);

    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeSockets();
    this.initializeErrorHandling();
  }

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

  private initializeRoutes(): void {
    this.app.get("/health", (_req: Request, res: Response) => {
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

  private initializeSockets(): void {
    registerSocketHandlers(this.io);

    // 🧱 FRONT GATE: Blocks connection handshake if banned
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error("Token is missing"));

        const decoded = (await tokenService.verifyToken(token)) as any;
        const userId = decoded.userId || decoded.id;

        if (!userId) return next(new Error("Invalid token payload"));

        const banCheck = await pool.query(
          'SELECT is_banned FROM user_profiles WHERE user_id = $1', 
          [userId]
        );

        if (banCheck.rows[0]?.is_banned) {
          console.warn(`⛔ Socket Connection Denied: Banned User ${userId}`);
          return next(new Error("BANNED"));
        }

        socket.data.userId = userId;
        next();
      } catch (error) {
        console.error("Socket Auth Error:", error);
        next(new Error("Invalid or expired token"));
      }
    });

    this.io.on("connection", async (socket) => {
      const userId = socket.data.userId;
      const isTakeover = socket.handshake.auth.takeover;

      if (!userId) {
        socket.disconnect(true);
        return;
      }

      // 🧱 INNER DOOR BOUNCER: Intercepts all events mid-session
      // 🧱 INNER DOOR BOUNCER: Intercepts all events mid-session
      socket.use(async ([event, ...args], next) => {
        // Block them at ANY point they try to interact with the queue OR join a room
        if (event === 'join_queue' || event === 'find_match' || event === 'join_room') {
          try {
            const banCheck = await pool.query(
              'SELECT COALESCE(is_banned, FALSE) as is_banned FROM user_profiles WHERE user_id = $1',
              [userId]
            );

            if (banCheck.rows.length > 0 && banCheck.rows[0].is_banned) {
              console.log(`🚨 KICKED BANNED USER ${userId} OUT ON EVENT: ${event}`);
              
              // Tell frontend to kick them to the curb
              socket.emit('banned_force_logout', { message: 'Your account is banned.' });
              
              // Brutally sever the connection
              socket.disconnect(true);
              return next(new Error("User banned mid-session"));
            }
          } catch (err) {
            console.error("Event bouncer error:", err);
          }
        }
        next();
      });

      // JOIN GLOBAL ROOM FOR INSTANT ADMIN TARGETING
      const globalUserRoom = `user_global_${userId}`;
      socket.join(globalUserRoom);

      console.log(`🔌 Socket Connected: ${socket.id} (User ID: ${userId})`);

      socket.on("join_room", async (roomID) => {
        try {
          const assignedRoomId = await queueService.getActiveSession(userId);

          if (!assignedRoomId || assignedRoomId !== roomID) {
            socket.emit("room_error", "You are not authorized to join this room.");
            return;
          }

          const socketsInRoom = await this.io.in(roomID).fetchSockets();
          const isUserAlreadyInRoom = socketsInRoom.some((s) => s.data.userId === userId);

          if (isUserAlreadyInRoom) {
            socket.emit("room_error", "You are already connected in another tab.");
            return;
          }

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

      socket.on("offer", (data) => socket.to(data.roomID).emit("receive_offer", data));
      socket.on("answer", (data) => socket.to(data.roomID).emit("receive_answer", data));
      socket.on("ice_candidate", (data) => socket.to(data.roomID).emit("receive_ice_candidate", data));
      socket.on("send_message", (data) => socket.to(data.roomID).emit("receive_message", data));
      socket.on("camera_status", (data) => socket.to(data.roomID).emit("receive_camera_status", data));

      socket.on("disconnect", async () => {
        console.log(`❌ Socket Disconnected: ${socket.id} (User: ${userId})`);
        try {
          if (socket.data.killedByTakeover) return;
          if (!socket.data.hasSuccessfullyJoined) {
            await queueService.leaveQueue(userId).catch(() => { });
            return;
          }

          const roomId = await queueService.getActiveSession(userId);
          if (roomId) {
            socket.to(roomId).emit("session_ended", "Your partner disconnected.");
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
            await queueService.leaveQueue(userId).catch(() => { });
          }
        } catch (error) {
          console.error("Disconnect cleanup error:", error);
        }
      });

      setTimeout(async () => {
        if (socket.disconnected) return;
        const existingSockets = await this.io.in(globalUserRoom).fetchSockets();
        const otherSockets = existingSockets.filter(s => s.id !== socket.id);

        if (otherSockets.length > 0) {
          if (isTakeover) {
            otherSockets.forEach((oldSocket) => {
              oldSocket.data.killedByTakeover = true;
              oldSocket.emit("multiple_tabs_error", "Session taken over.");
              oldSocket.disconnect(true);
            });
            try {
              await queueService.leaveQueue(userId).catch(() => { });
              const roomId = await queueService.getActiveSession(userId);
              if (roomId) {
                this.io.to(roomId).emit("session_ended", "Partner took over session.");
                const sessionResult = await pool.query(
                  `SELECT id FROM matchmaking_sessions WHERE room_id = $1 AND status = 'active'`,
                  [roomId]
                );
                if (sessionResult.rows.length > 0) {
                  await pool.query(`UPDATE matchmaking_sessions SET status = 'completed', session_end = NOW() WHERE id = $1`, [sessionResult.rows[0].id]);
                  await queueService.clearActiveSession(userId);
                }
              }
            } catch (e) { }
            socket.emit("takeover_success");
          } else {
            socket.emit("multiple_tabs_error", "Active session exists.");
            socket.disconnect(true);
          }
        } else {
          socket.emit("no_conflict"); 
        }
      }, 0); 
    });
  }

  private initializeErrorHandling(): void {
    this.app.use(errorHandler.handle.bind(errorHandler));
  }

  public start(): void {
    this.httpServer.listen(this.port, async () => {
      console.log(`📡 Server running on port ${this.port}`);
      pool.query("SELECT NOW()", (err) => {
        if (err) console.error("❌ Database connection failed", err);
        else console.log("✅ Database connected");
      });

      this.matchingService.start();
      await ensureAdminSchema();

      setInterval(() => {
        tokenService.cleanupExpiredSessions().catch(() => {});
      }, 60 * 60 * 1000);
    });

    process.on("SIGTERM", this.shutdown.bind(this));
    process.on("SIGINT", this.shutdown.bind(this));
  }

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