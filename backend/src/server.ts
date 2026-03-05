// FILE: src/server.ts
// PURPOSE: Main Express server setup (like Shopio's main application class)
// WHAT IT DOES:
// - Initializes Express app
// - Configures middleware (CORS, JSON parsing, etc.)
// - Registers routes
// - Starts the server
// - Handles graceful shutdown

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

// Load environment variables
dotenv.config();

class Server {
  public app: Application;
  private port: number;
  private httpServer: http.Server;
  private io: SocketServer;
  private matchingService: MatchingService;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '5000');

    // Create HTTP server manually so socket.io can attach to it
    // WHY: socket.io needs access to the raw http.Server, not just Express app
    this.httpServer = http.createServer(this.app);

    // Initialize socket.io with CORS (same origin as Express)
    this.io = new SocketServer(this.httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    // Pass socket.io instance to matching service so it can emit events
    this.matchingService = new MatchingService(this.io);

    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeSocketHandlers();
    this.initializeErrorHandling();
  }

  // Configure middleware (like Shopio's SecurityConfig)
  private initializeMiddlewares(): void {
    // CORS configuration
    this.app.use(cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      credentials: true, // Allow cookies
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }));

    // Body parsing middleware
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    
    // Cookie parser
    this.app.use(cookieParser());

    // Request logging (development)
    if (process.env.NODE_ENV === 'development') {
      this.app.use((req, res, next) => {
        console.log(`${req.method} ${req.path}`);
        next();
      });
    }
  }

  // Register API routes (like Shopio's RestController mappings)
  private initializeRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
      });
    });

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
      });
    });
  }

  // Error handling
  private initializeErrorHandling(): void {
    this.app.use(errorHandler.handle.bind(errorHandler));
  }

  // Start server
  public start(): void {
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
        }
      });

      // Start matching loop (runs every 500ms)
      // WHY: Must start AFTER server is listening so socket.io is ready
      this.matchingService.start();

      // Schedule cleanup job (runs every hour)
      setInterval(() => {
        tokenService.cleanupExpiredSessions().catch(err => {
          console.error('Session cleanup error:', err);
        });
      }, 60 * 60 * 1000);
    });

    // Graceful shutdown
    process.on('SIGTERM', this.shutdown.bind(this));
    process.on('SIGINT', this.shutdown.bind(this));
  }

  // Graceful shutdown
  private async shutdown(): Promise<void> {
    console.log('\nShutting down server...');

    try {
      // Stop matching loop
      this.matchingService.stop();

      // Close socket.io
      this.io.close();

      // Close database connections
      await pool.end();
      console.log('Database connections closed');

      // Close SMTP connection
      transporter.close();
      console.log('SMTP connection closed');

      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  }
}

// Create and start server
const server = new Server();
server.start();

export default server;
