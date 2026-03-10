"use strict";
// FILE: src/server.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const database_1 = require("./config/database");
const smtp_1 = require("./config/smtp");
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const chatRoutes_1 = __importDefault(require("./routes/chatRoutes"));
const requestRoutes_1 = __importDefault(require("./routes/requestRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const errorHandler_1 = require("./middleware/errorHandler");
const tokenService_1 = require("./services/tokenService");
const socket_1 = require("./socket/socket");
// Load environment variables
dotenv_1.default.config();
async function ensureAdminSchema() {
    try {
        const isAdminColumnResult = await database_1.pool.query(`SELECT EXISTS (
         SELECT 1
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'users'
           AND column_name = 'is_admin'
       ) AS exists`);
        if (!isAdminColumnResult.rows[0]?.exists) {
            await database_1.pool.query(`ALTER TABLE users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT FALSE`);
        }
        await database_1.pool.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id            SERIAL PRIMARY KEY,
        reporter_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        target_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reason        VARCHAR(255) NOT NULL,
        description   TEXT,
        status        VARCHAR(20) NOT NULL DEFAULT 'Pending'
                      CHECK (status IN ('Pending', 'Resolved', 'Dismissed')),
        admin_note    TEXT,
        resolved_by   INTEGER REFERENCES users(id),
        created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
        console.log("✅ Admin schema verified");
    }
    catch (error) {
        const pgError = error;
        if (pgError.code === "42501") {
            console.warn("⚠️ Skipping admin schema migration because the database user does not own the existing tables. Run schema.sql as the application user or a database owner to enable admin features.");
            return;
        }
        console.error("⚠️ Admin schema check failed:", error);
    }
}
class Server {
    constructor() {
        this.app = (0, express_1.default)();
        this.port = parseInt(process.env.PORT || "5000", 10);
        // Create HTTP server from express app
        this.httpServer = http_1.default.createServer(this.app);
        // Initialize Socket.IO on top of the HTTP server
        this.io = new socket_io_1.Server(this.httpServer, {
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
    initializeMiddlewares() {
        this.app.use((0, cors_1.default)({
            origin: process.env.FRONTEND_URL || "http://localhost:5173",
            credentials: true,
            methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
            allowedHeaders: ["Content-Type", "Authorization"],
        }));
        this.app.use(express_1.default.json());
        this.app.use(express_1.default.urlencoded({ extended: true }));
        this.app.use((0, cookie_parser_1.default)());
        if (process.env.NODE_ENV === "development") {
            this.app.use((req, _res, next) => {
                console.log(`${req.method} ${req.path}`);
                next();
            });
        }
    }
    initializeRoutes() {
        this.app.get("/health", (_req, res) => {
            res.status(200).json({
                success: true,
                message: "Server is running",
                timestamp: new Date().toISOString(),
            });
        });
        // API routes
        this.app.use("/api/auth", authRoutes_1.default);
        this.app.use("/api/users", userRoutes_1.default);
        this.app.use("/api/requests", requestRoutes_1.default);
        this.app.use("/api/chats", chatRoutes_1.default);
        this.app.use("/api/admin", adminRoutes_1.default);
        // 404 handler
        this.app.use(errorHandler_1.errorHandler.notFound.bind(errorHandler_1.errorHandler));
    }
    // WebRTC Signaling Logic & Disconnections
    initializeSockets() {
        // Keep existing socket handler registration (auth + chat handlers etc.)
        (0, socket_1.registerSocketHandlers)(this.io);
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
    initializeErrorHandling() {
        this.app.use(errorHandler_1.errorHandler.handle.bind(errorHandler_1.errorHandler));
    }
    start() {
        // Listen on the HTTP server, NOT the Express app directly
        this.httpServer.listen(this.port, async () => {
            console.log("🚀 IncognIITo Backend Server");
            console.log("================================");
            console.log(`📡 Server running on port ${this.port}`);
            console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
            console.log(`🔗 API Base URL: http://localhost:${this.port}/api`);
            console.log(`🧩 Socket URL: http://localhost:${this.port}`);
            console.log("================================");
            database_1.pool.query("SELECT NOW()", (err) => {
                if (err)
                    console.error("❌ Database connection failed");
                else
                    console.log("✅ Database connected");
            });
            await ensureAdminSchema();
            setInterval(() => {
                tokenService_1.tokenService.cleanupExpiredSessions().catch((err) => {
                    console.error("Session cleanup error:", err);
                });
            }, 60 * 60 * 1000);
        });
        process.on("SIGTERM", this.shutdown.bind(this));
        process.on("SIGINT", this.shutdown.bind(this));
    }
    async shutdown() {
        console.log("\nShutting down server...");
        try {
            // close sockets + http server
            this.io.close();
            this.httpServer.close();
            await database_1.pool.end();
            console.log("Database connections closed");
            smtp_1.transporter.close();
            console.log("SMTP connection closed");
            process.exit(0);
        }
        catch (error) {
            console.error("Error during shutdown:", error);
            process.exit(1);
        }
    }
}
const server = new Server();
server.start();
exports.default = server;
