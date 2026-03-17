"use strict";
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
const matchRoutes_1 = __importDefault(require("./routes/matchRoutes"));
const errorHandler_1 = require("./middleware/errorHandler");
const tokenService_1 = require("./services/tokenService");
const matchingService_1 = require("./services/matchingService");
const socket_1 = require("./socket/socket");
// Load environment variables
dotenv_1.default.config();
async function ensureAdminSchema() {
    try {
        const columnResult = await database_1.pool.query(`SELECT EXISTS (
         SELECT 1
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'users'
           AND column_name = 'is_admin'
       ) AS exists`);
        if (!columnResult.rows[0]?.exists) {
            await database_1.pool.query(`ALTER TABLE users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT FALSE`);
        }
        await database_1.pool.query(`
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
    }
    catch (error) {
        const pgError = error;
        if (pgError.code === "42501") {
            console.warn("⚠️ Skipping admin schema migration: User does not own tables.");
            return;
        }
        console.error("⚠️ Admin schema check failed:", error);
    }
}
class Server {
    constructor() {
        this.app = (0, express_1.default)();
        this.port = parseInt(process.env.PORT || "5000", 10);
        this.httpServer = http_1.default.createServer(this.app);
        this.io = new socket_io_1.Server(this.httpServer, {
            cors: {
                origin: process.env.FRONTEND_URL || "http://localhost:5173",
                credentials: true,
                methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
            },
        });
        this.matchingService = new matchingService_1.MatchingService(this.io);
        this.initializeMiddlewares();
        this.initializeRoutes();
        this.initializeSockets();
        this.initializeErrorHandling();
    }
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
        this.app.use("/api/auth", authRoutes_1.default);
        this.app.use("/api/users", userRoutes_1.default);
        this.app.use("/api/match", matchRoutes_1.default);
        this.app.use("/api/requests", requestRoutes_1.default);
        this.app.use("/api/chats", chatRoutes_1.default);
        this.app.use("/api/admin", adminRoutes_1.default);
        this.app.use(errorHandler_1.errorHandler.notFound.bind(errorHandler_1.errorHandler));
    }
    // ─── WEBRTC SIGNALING & OMEGLE-STYLE SECURITY LOGIC ──────────────────
    initializeSockets() {
        (0, socket_1.registerSocketHandlers)(this.io); // Puraane handlers
        // 🔌 2. CONNECTION EVENT
        this.io.on("connection", (socket) => {
            const userId = socket.data.userId;
            console.log(`🔌 Socket Connected: ${socket.id} (User ID: ${userId})`);
            // HELPER: Room ko DB se permanently delete karna
            const destroySession = async (roomID) => {
                try {
                    await database_1.pool.query(`DELETE FROM matchmaking_sessions WHERE room_id = $1`, [roomID]);
                    console.log(`🗑️ Deleted room ${roomID} from database (Session Ended).`);
                }
                catch (err) {
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
                    const result = await database_1.pool.query(`SELECT * FROM matchmaking_sessions 
             WHERE room_id = $1 
             AND (user1_id = $2 OR user2_id = $2) 
             AND status = 'active'`, [roomID, userId]);
                    if (result.rows.length > 0) {
                        socket.join(roomID);
                        socket.emit("room_joined_success");
                        socket.to(roomID).emit("user_joined", socket.id);
                        console.log(`✅ User ${userId} joined room ${roomID}`);
                    }
                    else {
                        socket.emit("room_error", "You are not authorized to join this room, or it has been ended.");
                        console.log(`❌ Unauthorized/Expired access blocked for User ${userId}`);
                    }
                }
                catch (error) {
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
    initializeErrorHandling() {
        this.app.use(errorHandler_1.errorHandler.handle.bind(errorHandler_1.errorHandler));
    }
    start() {
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
                    console.error("❌ Database connection failed", err);
                else
                    console.log("✅ Database connected");
            });
            this.matchingService.start();
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
            this.matchingService.stop();
            this.io.close();
            await new Promise((resolve, reject) => {
                this.httpServer.close((err) => {
                    if (err)
                        reject(err);
                    else
                        resolve();
                });
            });
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
