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
// Routes imports
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const chatRoutes_1 = __importDefault(require("./routes/chatRoutes"));
const requestRoutes_1 = __importDefault(require("./routes/requestRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const matchRoutes_1 = __importDefault(require("./routes/matchRoutes"));
const errorHandler_1 = require("./middleware/errorHandler");
const tokenService_1 = require("./services/tokenService");
const matchingService_1 = require("./services/matchingService");
const queueService_1 = require("./services/queueService");
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
        this.app.set("io", this.io);
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
    // ─── WEBRTC SOCKET LOGIC (SECURED) ──────────────────
    initializeSockets() {
        (0, socket_1.registerSocketHandlers)(this.io);
        // 1. SOCKET AUTHENTICATION MIDDLEWARE
        this.io.use(async (socket, next) => {
            try {
                const token = socket.handshake.auth.token;
                if (!token) {
                    return next(new Error("Token is missing"));
                }
                const decoded = (await tokenService_1.tokenService.verifyToken(token));
                socket.data.userId = decoded.userId || decoded.id;
                if (!socket.data.userId) {
                    return next(new Error("Invalid token payload"));
                }
                next();
            }
            catch (error) {
                console.error("Socket Auth Error:", error);
                next(new Error("Invalid or expired token"));
            }
        });
        // 🔌 2. CONNECTION EVENT
        this.io.on("connection", async (socket) => {
            const userId = socket.data.userId;
            const isTakeover = socket.handshake.auth.takeover;
            // 🛑 BUG FIX: Agar userId missing hai, ignore it
            if (!userId) {
                console.warn(`🚨 Ignored socket ${socket.id} (No valid User ID)`);
                socket.disconnect(true);
                return;
            }
            console.log(`🔌 Socket Connected: ${socket.id} (User ID: ${userId}, Takeover: ${isTakeover})`);
            // ─── REGISTER EVENTS IMMEDIATELY ──────────────
            socket.on("join_room", async (roomID) => {
                try {
                    const assignedRoomId = await queueService_1.queueService.getActiveSession(userId);
                    if (!assignedRoomId || assignedRoomId !== roomID) {
                        socket.emit("room_error", "You are not authorized to join this room.");
                        return;
                    }
                    const socketsInRoom = await this.io.in(roomID).fetchSockets();
                    const isUserAlreadyInRoom = socketsInRoom.some((s) => s.data.userId === userId);
                    if (isUserAlreadyInRoom) {
                        socket.emit("room_error", "You are already connected to this session in another tab/window.");
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
                }
                catch (error) {
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
                    if (socket.data.killedByTakeover) {
                        console.log(`⚠️ Skipped DB Cleanup for ${socket.id} (Killed by Force Takeover)`);
                        return;
                    }
                    if (!socket.data.hasSuccessfullyJoined) {
                        await queueService_1.queueService.leaveQueue(userId).catch(() => { });
                        return;
                    }
                    const roomId = await queueService_1.queueService.getActiveSession(userId);
                    if (roomId) {
                        socket.to(roomId).emit("session_ended", "Your partner disconnected. Redirecting...");
                        const sessionResult = await database_1.pool.query(`SELECT id, user1_id, user2_id FROM matchmaking_sessions WHERE room_id = $1 AND status = 'active'`, [roomId]);
                        if (sessionResult.rows.length > 0) {
                            const session = sessionResult.rows[0];
                            await database_1.pool.query(`UPDATE matchmaking_sessions SET status = 'completed', session_end = NOW() WHERE id = $1`, [session.id]);
                            await queueService_1.queueService.clearActiveSession(session.user1_id);
                            await queueService_1.queueService.clearActiveSession(session.user2_id);
                        }
                    }
                    else {
                        await queueService_1.queueService.leaveQueue(userId).catch(() => { });
                    }
                }
                catch (error) {
                    console.error("Error handling forceful disconnect cleanup:", error);
                }
            });
            // ─── 🔥 THE "GHOST SOCKET" KILLER (500ms Delay) ──────────────
            setTimeout(async () => {
                // Agar in 500ms mein socket khud hi marr gaya, toh do nothing
                if (socket.disconnected)
                    return;
                const globalUserRoom = `user_global_${userId}`;
                const existingSockets = await this.io.in(globalUserRoom).fetchSockets();
                // Apne aap ko list se bahar nikalo
                const otherSockets = existingSockets.filter(s => s.id !== socket.id);
                if (otherSockets.length > 0) {
                    if (isTakeover) {
                        console.log(`🔥 User ${userId} requested a FORCE TAKEOVER.`);
                        // 1. Kill old sockets
                        otherSockets.forEach((oldSocket) => {
                            oldSocket.data.killedByTakeover = true;
                            oldSocket.emit("multiple_tabs_error", "Session taken over by another device.");
                            oldSocket.disconnect(true);
                        });
                        // 2. DB Cleanup
                        try {
                            await queueService_1.queueService.leaveQueue(userId).catch(() => { });
                            const roomId = await queueService_1.queueService.getActiveSession(userId);
                            if (roomId) {
                                this.io.to(roomId).emit("session_ended", "Your partner disconnected (Session Taken Over).");
                                const sessionResult = await database_1.pool.query(`SELECT id, user1_id, user2_id FROM matchmaking_sessions WHERE room_id = $1 AND status = 'active'`, [roomId]);
                                if (sessionResult.rows.length > 0) {
                                    const session = sessionResult.rows[0];
                                    await database_1.pool.query(`UPDATE matchmaking_sessions SET status = 'completed', session_end = NOW() WHERE id = $1`, [session.id]);
                                    await queueService_1.queueService.clearActiveSession(session.user1_id);
                                    await queueService_1.queueService.clearActiveSession(session.user2_id);
                                }
                            }
                        }
                        catch (error) {
                            console.error("Error clearing session:", error);
                        }
                        socket.join(globalUserRoom);
                        socket.emit("takeover_success");
                    }
                    else {
                        console.warn(`🚨 User ${userId} blocked. Genuine multiple tab detected.`);
                        socket.emit("multiple_tabs_error", "You already have an active session in another window.");
                        socket.disconnect(true);
                    }
                }
                else {
                    // ─── 🟢 FIRST / CLEAN CONNECTION ──────────────
                    socket.join(globalUserRoom);
                    console.log(`✅ User ${userId} claimed the primary session.`);
                    // 🔥 NEW: Frontend ko batao ki sab theek hai, koi doosra tab nahi hai
                    socket.emit("no_conflict");
                }
            }, 0);
        });
    }
    initializeErrorHandling() {
        this.app.use(errorHandler_1.errorHandler.handle.bind(errorHandler_1.errorHandler));
    }
    start() {
        this.httpServer.listen(this.port, async () => {
            console.log(`📡 Server running on port ${this.port}`);
            database_1.pool.query("SELECT NOW()", (err) => {
                if (err)
                    console.error("❌ Database connection failed", err);
                else
                    console.log("✅ Database connected");
            });
            this.matchingService.start();
            await ensureAdminSchema();
            setInterval(() => {
                tokenService_1.tokenService.cleanupExpiredSessions().catch(() => { });
            }, 60 * 60 * 1000);
        });
        process.on("SIGTERM", this.shutdown.bind(this));
        process.on("SIGINT", this.shutdown.bind(this));
    }
    async shutdown() {
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
            process.exit(0);
        }
        catch (error) {
            process.exit(1);
        }
    }
}
const server = new Server();
server.start();
exports.default = server;
