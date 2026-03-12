"use strict";
// FILE: src/middleware/errorHandler.ts
// PURPOSE: Centralized error handling middleware
// WHAT IT DOES:
// - Catches all errors in the application
// - Formats error responses consistently
// - Logs errors for debugging
// - Hides sensitive error details in production
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.ErrorHandler = void 0;
class ErrorHandler {
    // Global error handler
    handle(err, req, res, next) {
        console.error('Error:', err);
        const statusCode = err.statusCode || 500;
        const message = err.message || 'Internal server error';
        // In production, hide detailed error messages
        const response = {
            success: false,
            message: process.env.NODE_ENV === 'production'
                ? 'An error occurred'
                : message,
        };
        // Include stack trace in development
        if (process.env.NODE_ENV === 'development') {
            response.error = err.stack;
        }
        res.status(statusCode).json(response);
    }
    // 404 Not Found handler
    notFound(req, res, next) {
        res.status(404).json({
            success: false,
            message: `Route ${req.originalUrl} not found`,
        });
    }
}
exports.ErrorHandler = ErrorHandler;
exports.errorHandler = new ErrorHandler();
