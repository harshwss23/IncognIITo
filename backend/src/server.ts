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

  // ─── WEBRTC SIGNALING & OMEGLE-STYLE SECURITY LOGIC ──────────────────
  private initializeSockets(): void {
    registerSocketHandlers(this.io); // Puraane handlers

    // 🔒 1. MIDDLEWARE: Pre-connection Token Verification
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error("Authentication error: No token provided"));
        }

        const decoded: any = await tokenService.verifyToken(token);
        const userId = decoded?.id || decoded?.userId;

        if (!userId) {
          return next(new Error("Authentication error: Invalid or expired token"));
        }

        socket.data.userId = userId;
        next();
      } catch (err) {
        console.error("Socket authentication error:", err);
        return next(new Error("Authentication error: Server validation failed"));
      }
    });

    // 🔌 2. CONNECTION EVENT
    this.io.on("connection", (socket) => {
      const userId = socket.data.userId; 
      console.log(`🔌 Socket Connected: ${socket.id} (User ID: ${userId})`);

      // HELPER: Room ko DB se permanently delete karna
      const destroySession = async (roomID: string) => {
        try {
          await pool.query(
            `DELETE FROM matchmaking_sessions WHERE room_id = $1`,
            [roomID]
          );
          console.log(`🗑️ Deleted room ${roomID} from database (Session Ended).`);
        } catch (err) {
          console.error(`Error deleting room ${roomID}:`, err);
        }
      };

      // ─── JOIN ROOM ──────────────
      socket.on("join_room", async (roomID) => {
        try {
          // Check for Duplicate Tabs
          const socketsInRoom = await this.io.in(roomID).fetchSockets();
          const isAlreadyInRoom = socketsInRoom.some(s => s.data.userId === userId);

          if (isAlreadyInRoom) {
            socket.emit("room_error", "You are already connected to this session from another tab/device.");
            console.log(`⚠️ Blocked duplicate tab for User ${userId} in room ${roomID}`);
            return;
          }

          // Verify Database Access
          const result = await pool.query(
            `SELECT * FROM matchmaking_sessions 
             WHERE room_id = $1 
             AND (user1_id = $2 OR user2_id = $2) 
             AND status = 'active'`,
            [roomID, userId]
          );

          if (result.rows.length > 0) {
            socket.join(roomID);
            socket.emit("room_joined_success");
            socket.to(roomID).emit("user_joined", socket.id);
            console.log(`✅ User ${userId} joined room ${roomID}`);
          } else {
            socket.emit("room_error", "You are not authorized to join this room, or it has been ended.");
            console.log(`❌ Unauthorized/Expired access blocked for User ${userId}`);
          }
        } catch (error) {
          console.error("Room join error:", error);
          socket.emit("room_error", "Internal server error while verifying room.");
        }
      });

      // ─── MANUAL END CALL ──────────────
      socket.on("leave_room", async (roomID) => {
        socket.leave(roomID);
        // Dusre user ko alert bhej kar usko bhi matchmaking par bhej do
        socket.to(roomID).emit("session_ended", "Your partner has left the chat.");
        await destroySession(roomID);
      });

      // ─── ACCIDENTAL DISCONNECT (Tab closed, network drop) ──────────────
      socket.on("disconnecting", async () => {
        for (const roomID of socket.rooms) {
          if (roomID !== socket.id) { // Apna khud ka default room ignore karo
            socket.to(roomID).emit("session_ended", "Your partner got disconnected randomly.");
            await destroySession(roomID);
          }
        }
      });

      // ─── WEBRTC SIGNALING EVENTS ──────────────
      socket.on("offer", (data) => socket.to(data.roomID).emit("receive_offer", data));
      socket.on("send_message", (data) => socket.to(data.roomID).emit("receive_message", data));
      socket.on("answer", (data) => socket.to(data.roomID).emit("receive_answer", data));
      socket.on("camera_status", (data) => socket.to(data.roomID).emit("receive_camera_status", data));
      socket.on("ice_candidate", (data) => socket.to(data.roomID).emit("receive_ice_candidate", data));

      socket.on("disconnect", () => {
        console.log(`❌ Socket Disconnected: ${socket.id} (User ID: ${userId})`);
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