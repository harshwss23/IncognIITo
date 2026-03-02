// FILE: src/config/database.ts
// PURPOSE: PostgreSQL database connection pool configuration
// WHAT IT DOES: 
// - Creates a connection pool to PostgreSQL database
// - Reads DB credentials from .env file
// - Provides a query function for executing SQL queries
// - Handles connection errors

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20, // Maximum number of connections in pool
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 2000, // Return error after 2 seconds if no connection available
});

// Event listeners for connection monitoring
pool.on('connect', () => {
  console.log('Database connected successfully');
});

pool.on('error', (err: Error) => {
  console.error('Database connection error:', err);
  process.exit(-1);
});

// Helper function to execute queries
export const query = (text: string, params?: any[]) => pool.query(text, params);
