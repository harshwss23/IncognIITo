"use strict";
// ============================================================================
// FILE: src/server.ts
// PURPOSE: Primary Application Entrypoint. Configures the Express HTTP server, 
//          initializes database checks, binds REST API routes, and seamlessly 
//          attaches the Socket.IO WebRTC and Messaging layers.
// ============================================================================
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
// Load environment variables dynamically
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
    initializeSockets() {
        (0, socket_1.registerSocketHandlers)(this.io);
        // 🧱 FRONT GATE: Blocks connection handshake if banned
        this.io.use(async (socket, next) => {
            try {
                const token = socket.handshake.auth.token;
                if (!token)
                    return next(new Error("Token is missing"));
                const decoded = (await tokenService_1.tokenService.verifyToken(token));
                const userId = decoded.userId || decoded.id;
                if (!userId)
                    return next(new Error("Invalid token payload"));
                const banCheck = await database_1.pool.query('SELECT is_banned FROM user_profiles WHERE user_id = $1', [userId]);
                if (banCheck.rows[0]?.is_banned) {
                    console.warn(`⛔ Socket Connection Denied: Banned User ${userId}`);
                    return next(new Error("BANNED"));
                }
                socket.data.userId = userId;
                next();
            }
            catch (error) {
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
                        const banCheck = await database_1.pool.query('SELECT COALESCE(is_banned, FALSE) as is_banned FROM user_profiles WHERE user_id = $1', [userId]);
                        if (banCheck.rows.length > 0 && banCheck.rows[0].is_banned) {
                            console.log(`🚨 KICKED BANNED USER ${userId} OUT ON EVENT: ${event}`);
                            // Tell frontend to kick them to the curb
                            socket.emit('banned_force_logout', { message: 'Your account is banned.' });
                            // Brutally sever the connection
                            socket.disconnect(true);
                            return next(new Error("User banned mid-session"));
                        }
                    }
                    catch (err) {
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
                    const assignedRoomId = await queueService_1.queueService.getActiveSession(userId);
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
                    if (socket.data.killedByTakeover)
                        return;
                    if (!socket.data.hasSuccessfullyJoined) {
                        await queueService_1.queueService.leaveQueue(userId).catch(() => { });
                        return;
                    }
                    const roomId = await queueService_1.queueService.getActiveSession(userId);
                    if (roomId) {
                        socket.to(roomId).emit("session_ended", "Your partner disconnected.");
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
                    console.error("Disconnect cleanup error:", error);
                }
            });
            setTimeout(async () => {
                if (socket.disconnected)
                    return;
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
                            await queueService_1.queueService.leaveQueue(userId).catch(() => { });
                            const roomId = await queueService_1.queueService.getActiveSession(userId);
                            if (roomId) {
                                this.io.to(roomId).emit("session_ended", "Partner took over session.");
                                const sessionResult = await database_1.pool.query(`SELECT id FROM matchmaking_sessions WHERE room_id = $1 AND status = 'active'`, [roomId]);
                                if (sessionResult.rows.length > 0) {
                                    await database_1.pool.query(`UPDATE matchmaking_sessions SET status = 'completed', session_end = NOW() WHERE id = $1`, [sessionResult.rows[0].id]);
                                    await queueService_1.queueService.clearActiveSession(userId);
                                }
                            }
                        }
                        catch (e) { }
                        socket.emit("takeover_success");
                    }
                    else {
                        socket.emit("multiple_tabs_error", "Active session exists.");
                        socket.disconnect(true);
                    }
                }
                else {
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
