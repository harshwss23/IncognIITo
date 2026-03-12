<<<<<<< HEAD
// FILE: src/server.ts

=======
>>>>>>> upstream/main
import express, { Application } from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import http from "http";
import { Server as SocketIOServer } from "socket.io";

<<<<<<< HEAD
import { pool } from "./config/database";
import { transporter } from "./config/smtp";

=======
<<<<<<< HEAD
import express, { Application } from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { Server as SocketServer } from 'socket.io';
import { pool } from './config/database';
import { transporter } from './config/smtp';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import matchRoutes from './routes/matchRoutes';
import { errorHandler } from './middleware/errorHandler';
import { tokenService } from './services/tokenService';
import { MatchingService } from './services/matchingService';
import { queueService } from './services/queueService';
=======
import { pool } from "./config/database";
import { transporter } from "./config/smtp";
>>>>>>> upstream/main
import authRoutes from "./routes/authRoutes";
import userRoutes from "./routes/userRoutes";
import chatRoutes from "./routes/chatRoutes";
import requestRoutes from "./routes/requestRoutes";
import adminRoutes from "./routes/adminRoutes";
<<<<<<< HEAD

import { errorHandler } from "./middleware/errorHandler";
import { tokenService } from "./services/tokenService";

import { registerSocketHandlers } from "./socket/socket";
=======
import { errorHandler } from "./middleware/errorHandler";
import { tokenService } from "./services/tokenService";
import { registerSocketHandlers } from "./socket/socket";
>>>>>>> main
>>>>>>> upstream/main

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
      console.warn(
        "⚠️ Skipping admin schema migration because the database user does not own existing tables. Apply schema.sql as a local superuser to complete setup."
      );
      return;
    }

    console.error("⚠️ Admin schema check failed:", error);
  }
}

class Server {
  public app: Application;
<<<<<<< HEAD
  private port: number;

=======
>>>>>>> upstream/main
  private httpServer: http.Server;
  public io: SocketIOServer;
  private port: number;
  private httpServer: http.Server;
  private io: SocketServer;
  private matchingService: MatchingService;

  constructor() {
    this.app = express();
<<<<<<< HEAD
    this.port = parseInt(process.env.PORT || '5000');

<<<<<<< HEAD
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();

    // Create HTTP server
=======
    // Create HTTP server manually so socket.io can attach to it
    // WHY: socket.io needs access to the raw http.Server, not just Express app
>>>>>>> upstream/main
    this.httpServer = http.createServer(this.app);

    // Initialize socket.io with CORS (same origin as Express)
    this.io = new SocketServer(this.httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

<<<<<<< HEAD
    registerSocketHandlers(this.io);
=======
    // Pass socket.io instance to matching service so it can emit events
    this.matchingService = new MatchingService(this.io);

=======
    this.port = parseInt(process.env.PORT || "5000", 10);
    this.httpServer = http.createServer(this.app);

    this.io = new SocketIOServer(this.httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      },
    });

>>>>>>> main
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeSocketHandlers();
    this.initializeErrorHandling();
    this.initializeSockets();
>>>>>>> upstream/main
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

<<<<<<< HEAD
    // API routes
=======
<<<<<<< HEAD
    // API routes
    this.app.use('/api/auth', authRoutes);
    this.app.use('/api/users', userRoutes);
    this.app.use('/api/match', matchRoutes);

    // 404 handler
    this.app.use(errorHandler.notFound.bind(errorHandler));
  }

  // Socket.io connection handling
  // WHY: Each user joins a personal room "user:{userId}" when they connect.
  //      The matching algorithm emits to "user:{userId}" when they are matched.
  //      This way events go to the RIGHT user only.
  private initializeSocketHandlers(): void {
    this.io.on('connection', (socket) => {
      const userId = socket.handshake.auth?.userId;

      if (!userId) {
        socket.disconnect();
        return;
      }

      // Join personal room so we can target this user specifically
      socket.join(`user:${userId}`);
      console.log(`Socket connected: user ${userId}`);

      // When user disconnects (closes browser, loses connection)
      // Clean up their queue entry so they don't stay in queue forever
      socket.on('disconnect', async () => {
        console.log(`Socket disconnected: user ${userId}`);
        try {
          await queueService.cleanupUser(parseInt(userId));
        } catch (err) {
          console.error(`Cleanup error for user ${userId}:`, err);
        }
=======
>>>>>>> upstream/main
    this.app.use("/api/auth", authRoutes);
    this.app.use("/api/users", userRoutes);
    this.app.use("/api/requests", requestRoutes);
    this.app.use("/api/chats", chatRoutes);
    this.app.use("/api/admin", adminRoutes);
<<<<<<< HEAD

=======
>>>>>>> upstream/main
    this.app.use(errorHandler.notFound.bind(errorHandler));
  }

  private initializeSockets(): void {
    registerSocketHandlers(this.io);

    this.io.on("connection", (socket) => {
      console.log(`🔌 Socket Connected: ${socket.id}`);

      socket.on("join_room", (roomID) => {
        socket.join(roomID);
        socket.to(roomID).emit("user_joined", socket.id);
      });

      socket.on("offer", (data) => {
        socket.to(data.roomID).emit("receive_offer", data);
      });

      socket.on("send_message", (data) => {
        socket.to(data.roomID).emit("receive_message", data);
      });

      socket.on("answer", (data) => {
        socket.to(data.roomID).emit("receive_answer", data);
      });

      socket.on("camera_status", (data) => {
        socket.to(data.roomID).emit("receive_camera_status", data);
      });

      socket.on("ice_candidate", (data) => {
        socket.to(data.roomID).emit("receive_ice_candidate", data);
      });

      socket.on("disconnecting", () => {
        socket.rooms.forEach((room) => {
          if (room !== socket.id) {
            socket.to(room).emit("peer_disconnected");
          }
        });
      });

      socket.on("disconnect", () => {
        console.log(`❌ Socket Disconnected: ${socket.id}`);
>>>>>>> main
      });
    });
  }

<<<<<<< HEAD
  // Error handling
=======
>>>>>>> main
  private initializeErrorHandling(): void {
    this.app.use(errorHandler.handle.bind(errorHandler));
  }

  public start(): void {
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> upstream/main
    this.httpServer.listen(this.port, () => {
      console.log('IncognIITo Backend Server');
      console.log('================================');
      console.log(`Server running on port ${this.port}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`API Base URL: http://localhost:${this.port}/api`);
      console.log('================================');
      
      // Test database connection
      pool.query('SELECT NOW()', (err: any) => {
        if (err) {
          console.error('Database connection failed');
        } else {
          console.log('Database connected');
=======
    this.httpServer.listen(this.port, async () => {
      console.log("🚀 IncognIITo Backend Server");
      console.log("================================");
      console.log(`📡 Server running on port ${this.port}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`🔗 API Base URL: http://localhost:${this.port}/api`);
      console.log(`🧩 Socket URL: http://localhost:${this.port}`);
      console.log("================================");

      pool.query("SELECT NOW()", (err: unknown) => {
        if (err) {
          console.error("❌ Database connection failed");
          return;
>>>>>>> main
        }

        console.log("✅ Database connected");
      });

<<<<<<< HEAD
      // Start matching loop (runs every 500ms)
      // WHY: Must start AFTER server is listening so socket.io is ready
      this.matchingService.start();

      // Schedule cleanup job (runs every hour)
=======
      await ensureAdminSchema();

>>>>>>> main
      setInterval(() => {
        tokenService.cleanupExpiredSessions().catch((err) => {
          console.error("Session cleanup error:", err);
        });
      }, 60 * 60 * 1000);
    });

    process.on("SIGTERM", this.shutdown.bind(this));
    process.on("SIGINT", this.shutdown.bind(this));
  }

  private async shutdown(): Promise<void> {
<<<<<<< HEAD
    console.log('\nShutting down server...');

    try {
      // Stop matching loop
      this.matchingService.stop();

      // Close socket.io
      this.io.close();

      // Close database connections
      await pool.end();
      console.log('Database connections closed');
=======
    console.log("\nShutting down server...");

    try {
      this.io.close();
      this.httpServer.close();

      await pool.end();
      console.log("Database connections closed");
>>>>>>> main

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