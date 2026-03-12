"use strict";
// FILE: src/config/database.ts
// PURPOSE: PostgreSQL database connection pool configuration
// WHAT IT DOES: 
// - Creates a connection pool to PostgreSQL database
// - Reads DB credentials from .env file
// - Provides a query function for executing SQL queries
// - Handles connection errors
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.query = exports.pool = void 0;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.pool = new pg_1.Pool({
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
exports.pool.on('connect', () => {
    console.log('Database connected successfully');
});
exports.pool.on('error', (err) => {
    console.error('Database connection error:', err);
    process.exit(-1);
});
// Helper function to execute queries
const query = (text, params) => exports.pool.query(text, params);
exports.query = query;
