// FILE: src/server.ts
// PURPOSE: Main Express server setup (like Shopio's main application class)
// WHAT IT DOES:
// - Initializes Express app
// - Configures middleware (CORS, JSON parsing, etc.)
// - Registers routes
// - Starts the server
// - Handles graceful shutdown

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

// Load environment variables
dotenv.config();

class Server {
  public app: Application;
  private port: number;

  constructor() {
    this.app = express();
    this.port = parseInt(process.env.PORT || '5000');
    
    this.initializeMiddlewares();
    this.initializeRoutes();
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
    this.app.use("/api/admin", adminRoutes);
    // 404 handler
    this.app.use(errorHandler.notFound.bind(errorHandler));
  }

  // Error handling
  private initializeErrorHandling(): void {
    this.app.use(errorHandler.handle.bind(errorHandler));
  }

  // Start server
  public start(): void {
    this.app.listen(this.port, () => {
      console.log('🚀 IncognIITo Backend Server');
      console.log('================================');
      console.log(`📡 Server running on port ${this.port}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🔗 API Base URL: http://localhost:${this.port}/api`);
      console.log('================================');
      
      // Test database connection
      pool.query('SELECT NOW()', (err: any) => {
        if (err) {
          console.error('❌ Database connection failed');
        } else {
          console.log('✅ Database connected');
        }
      });

      // Schedule cleanup job (runs every hour like Shopio's CleanupScheduler)
      setInterval(() => {
        tokenService.cleanupExpiredSessions().catch(err => {
          console.error('Session cleanup error:', err);
        });
      }, 60 * 60 * 1000); // 1 hour
    });

    // Graceful shutdown
    process.on('SIGTERM', this.shutdown.bind(this));
    process.on('SIGINT', this.shutdown.bind(this));
  }

  // Graceful shutdown
  private async shutdown(): Promise<void> {
    console.log('\nShutting down server...');
    
    try {
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
