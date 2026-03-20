import express, { Application } from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import http from "http";
import { Server as SocketIOServer } from "socket.io";

import { pool } from "./config/database";
import { transporter } from "./config/smtp";

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

// Load environment variables
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

  // ─── WEBRTC SOCKET LOGIC (SECURED) ──────────────────
  private initializeSockets(): void {
    registerSocketHandlers(this.io); // Puraane handlers

    // 1. SOCKET AUTHENTICATION MIDDLEWARE
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

    // 🔌 2. CONNECTION EVENT (Made Async for single-session check)
    this.io.on("connection", async (socket) => {
      const userId = socket.data.userId;
      console.log(`🔌 Socket Connected: ${socket.id} (User ID: ${userId})`);

      // ─── 🛡️ THE "OLDEST SURVIVES" CHECK (NEW ADDITION) ──────────────
      const globalUserRoom = `user_global_${userId}`;
      const existingSockets = await this.io.in(globalUserRoom).fetchSockets();

      if (existingSockets.length > 0) {
        console.warn(`🚨 User ${userId} tried connecting from a new tab/device. Keeping oldest session, killing new one.`);
        
        socket.emit("multiple_tabs_error", "You already have an active session in another window or device.");
        
        socket.disconnect(true);
        return; // Halt completely! Do not register any other events for this socket.
      }

      // ─── 🟢 FIRST / OLDEST CONNECTION ──────────────
      socket.join(globalUserRoom);
      console.log(`✅ User ${userId} claimed the primary session.`);
      socket.on("force_takeover", async () => {
        console.log(`🔥 User ${userId} requested a FORCE TAKEOVER.`);
        
        // 1. Us user ke saare current active sockets (purane tabs) ko dhundho
        const existingSockets = await this.io.in(globalUserRoom).fetchSockets();
        
        // 2. Un sabko ek silent death signal do aur server se disconnect kar do
        existingSockets.forEach((oldSocket) => {
          // Khud ko disconnect mat karna (though naya socket abhi tak is room mein nahi hai)
          if (oldSocket.id !== socket.id) {
            console.log(`Killing old socket ${oldSocket.id} for user ${userId}`);
            oldSocket.emit("duplicate_session_detected"); 
            oldSocket.disconnect(true);
          }
        });

        // 3. Queue aur Active sessions database se clear karo
        try {
          await queueService.leaveQueue(userId).catch(() => {});
          
          const roomId = await queueService.getActiveSession(userId);
          if (roomId) {
            this.io.to(roomId).emit("session_ended", "Your partner disconnected (Session Taken Over).");
            
            const sessionResult = await pool.query(
              `SELECT id, user1_id, user2_id FROM matchmaking_sessions WHERE room_id = $1 AND status = 'active'`,
              [roomId]
            );

            if (sessionResult.rows.length > 0) {
              const session = sessionResult.rows[0];
              await pool.query(
                `UPDATE matchmaking_sessions SET status = 'completed', session_end = NOW() WHERE id = $1`,
                [session.id]
              );
              await queueService.clearActiveSession(session.user1_id);
              await queueService.clearActiveSession(session.user2_id);
            }
          }
        } catch (error) {
          console.error("Error clearing session during takeover:", error);
        }

        // 4. Ab naye tab ko primary session dedo
        socket.join(globalUserRoom);
        socket.emit("takeover_success");
      });
      // ──────────────────────────────────────────────────────────────

      // ─── SECURE JOIN ROOM ──────────────
      socket.on("join_room", async (roomID) => {
        try {
          const assignedRoomId = await queueService.getActiveSession(userId);

          if (!assignedRoomId || assignedRoomId !== roomID) {
            console.warn(
              `🚨 Security: User ${userId} blocked from entering unauthorized Room ${roomID}`
            );
            socket.emit("room_error", "You are not authorized to join this room.");
            return;
          }

          const socketsInRoom = await this.io.in(roomID).fetchSockets();

          const isUserAlreadyInRoom = socketsInRoom.some(
            (s) => s.data.userId === userId
          );

          if (isUserAlreadyInRoom) {
            console.warn(
              `⚠️ User ${userId} tried to join room ${roomID} multiple times (Multiple tabs).`
            );
            socket.emit(
              "room_error",
              "You are already connected to this session in another tab/window."
            );
            return;
          }

          if (socketsInRoom.length >= 2) {
            console.warn(`⚠️ Room ${roomID} is already full.`);
            socket.emit("room_error", "This room is already full.");
            return;
          }

          socket.join(roomID);

          socket.data.hasSuccessfullyJoined = true;

          console.log(`🔓 User ${userId} securely joined room ${roomID}`);

          socket.emit("room_joined_success");

          socket.to(roomID).emit("user_joined", socket.id);
        } catch (error) {
          console.error(`Room validation failed for user ${userId}:`, error);
          socket.emit("room_error", "Server error verifying your room.");
        }
      });

      // ─── MANUAL END CALL ──────────────
      socket.on("leave_room", (roomID) => {
        socket.leave(roomID);
        socket.to(roomID).emit("session_ended", "Your partner has left the chat.");
        console.log(`🚪 User ${userId} left room ${roomID}`);
      });

      // ─── WEBRTC SIGNALING EVENTS (PURE RELAY) ──────────────
      socket.on("offer", (data) =>
        socket.to(data.roomID).emit("receive_offer", data)
      );
      socket.on("answer", (data) =>
        socket.to(data.roomID).emit("receive_answer", data)
      );
      socket.on("ice_candidate", (data) =>
        socket.to(data.roomID).emit("receive_ice_candidate", data)
      );

      // ─── EXTRA DATA RELAY ──────────────
      socket.on("send_message", (data) =>
        socket.to(data.roomID).emit("receive_message", data)
      );
      socket.on("camera_status", (data) =>
        socket.to(data.roomID).emit("receive_camera_status", data)
      );

      // ─── DISCONNECT ──────────────
      socket.on("disconnect", async () => {
        console.log(`❌ Socket Disconnected: ${socket.id} (User: ${userId})`);

        try {
          if (!socket.data.hasSuccessfullyJoined) {
            console.log(
              `⚠️ Ignored session cleanup for ${socket.id} (Was denied access / Second tab)`
            );
            await queueService.leaveQueue(userId).catch(() => {});
            return;
          }

          const roomId = await queueService.getActiveSession(userId);

          if (roomId) {
            socket
              .to(roomId)
              .emit("session_ended", "Your partner disconnected. Redirecting...");

            const sessionResult = await pool.query(
              `SELECT id, user1_id, user2_id FROM matchmaking_sessions 
               WHERE room_id = $1 AND status = 'active'`,
              [roomId]
            );

            if (sessionResult.rows.length > 0) {
              const session = sessionResult.rows[0];

              await pool.query(
                `UPDATE matchmaking_sessions 
                 SET status = 'completed', session_end = NOW() 
                 WHERE id = $1`,
                [session.id]
              );

              await queueService.clearActiveSession(session.user1_id);
              await queueService.clearActiveSession(session.user2_id);
              console.log(`🧹 Cleaned up session ${roomId} due to disconnect.`);
            }
          } else {
            await queueService.leaveQueue(userId).catch(() => {});
          }
        } catch (error) {
          console.error("Error handling forceful disconnect cleanup:", error);
        }
      });
    });
  }

  private initializeErrorHandling(): void {
    this.app.use(errorHandler.handle.bind(errorHandler));
  }

  public start(): void {
    this.httpServer.listen(this.port, async () => {
      console.log("🚀 IncognIITo Backend Server");
      console.log("================================");
      console.log(`📡 Server running on port ${this.port}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`🔗 API Base URL: http://localhost:${this.port}/api`);
      console.log(`🧩 Socket URL: http://localhost:${this.port}`);
      console.log("================================");

      pool.query("SELECT NOW()", (err: Error | null) => {
        if (err) console.error("❌ Database connection failed", err);
        else console.log("✅ Database connected");
      });

      this.matchingService.start();
      await ensureAdminSchema();

      setInterval(() => {
        tokenService.cleanupExpiredSessions().catch((err: Error) => {
          console.error("Session cleanup error:", err);
        });
      }, 60 * 60 * 1000);
    });

    process.on("SIGTERM", this.shutdown.bind(this));
    process.on("SIGINT", this.shutdown.bind(this));
  }

  private async shutdown(): Promise<void> {
    console.log("\nShutting down server...");
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
      console.log("Database connections closed");
      transporter.close();
      console.log("SMTP connection closed");

      process.exit(0);
    } catch (error) {
      console.error("Error during shutdown:", error);
      process.exit(1);
    }
  }
}

const server = new Server();
server.start();

export default server;