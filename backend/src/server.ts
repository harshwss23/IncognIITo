// FILE: src/server.ts

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

import { errorHandler } from "./middleware/errorHandler";
import { tokenService } from "./services/tokenService";
import { registerSocketHandlers } from "./socket/socket";
<<<<<<< Updated upstream
=======
import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { pool } from './config/database';
import { transporter } from './config/smtp';
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import adminRoutes from "./routes/adminRoutes";
import { errorHandler } from './middleware/errorHandler';
import { tokenService } from './services/tokenService';
>>>>>>> Stashed changes

// Load environment variables
dotenv.config();

class Server {
  public app: Application;
  private httpServer: http.Server;
  public io: SocketIOServer;
  private port: number;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || "5000", 10);

    // Create HTTP server from express app
    this.httpServer = http.createServer(this.app);

    // Initialize Socket.IO on top of the HTTP server
    this.io = new SocketIOServer(this.httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      },
    });

    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
    this.initializeSockets();
  }

  // Configure middleware
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

<<<<<<< Updated upstream
    // API routes
=======
>>>>>>> Stashed changes
    this.app.use("/api/auth", authRoutes);
    this.app.use("/api/users", userRoutes);
    this.app.use("/api/requests", requestRoutes);
    this.app.use("/api/chats", chatRoutes);
    this.app.use("/api/admin", adminRoutes);

    // 404 handler
    this.app.use(errorHandler.notFound.bind(errorHandler));
  }

  // WebRTC Signaling Logic & Disconnections
  private initializeSockets(): void {
    // Keep existing socket handler registration (auth + chat handlers etc.)
    registerSocketHandlers(this.io);

    // Keep WebRTC signaling logic unchanged
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
      });
    });
  }

  private initializeErrorHandling(): void {
    this.app.use(errorHandler.handle.bind(errorHandler));
  }

  public start(): void {
    // Listen on the HTTP server, NOT the Express app directly
    this.httpServer.listen(this.port, () => {
      console.log("🚀 IncognIITo Backend Server");
      console.log("================================");
      console.log(`📡 Server running on port ${this.port}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`🔗 API Base URL: http://localhost:${this.port}/api`);
      console.log(`🧩 Socket URL: http://localhost:${this.port}`);
      console.log("================================");

      pool.query("SELECT NOW()", (err: any) => {
        if (err) console.error("❌ Database connection failed");
        else console.log("✅ Database connected");
      });

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
    console.log("\nShutting down server...");

    try {
      // close sockets + http server
      this.io.close();
      this.httpServer.close();

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