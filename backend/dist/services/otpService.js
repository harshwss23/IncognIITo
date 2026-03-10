"use strict";
// FILE: src/services/otpService.ts
// PURPOSE: OTP generation, storage, and verification (like Shopio's EmailOtpService)
// WHAT IT DOES:
// - Generates 6-digit random OTP
// - Validates IITK email domain
// - Stores OTP in database with 5-minute expiry
// - Invalidates old OTPs when new one is requested
// - Verifies OTP and marks user as verified
Object.defineProperty(exports, "__esModule", { value: true });
exports.otpService = exports.OTPService = void 0;
const database_1 = require("../config/database");
const emailService_1 = require("./emailService");
const validation_1 = require("../utils/validation");
class OTPService {
    constructor() {
        this.OTP_EXPIRY_MINUTES = 5;
        this.MAX_RESEND_ATTEMPTS = 20;
    }
    // Generate 6-digit OTP
    generateOTP() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
    // Send OTP to email (like Shopio's generateAndSendOtp method)
    async sendOTP(email) {
        // Sanitize and validate email
        email = validation_1.ValidationUtils.sanitizeEmail(email);
        if (!validation_1.ValidationUtils.isValidEmail(email)) {
            throw new Error('Invalid email format');
        }
        if (!validation_1.ValidationUtils.isIITKEmail(email)) {
            throw new Error('Only IITK email addresses (@iitk.ac.in) are allowed');
        }
        const recentOTPs = await (0, database_1.query)(`SELECT COUNT(*) as count 
       FROM verification_tokens vt
       JOIN users u ON u.id = vt.user_id
       WHERE u.email = $1 
       AND vt.token_type = 'email_verify'
       AND vt.created_at > NOW() - INTERVAL '1 hour'`, [email]);
        if (parseInt(recentOTPs.rows[0].count) >= this.MAX_RESEND_ATTEMPTS) {
            throw new Error('Too many OTP requests. Please try again later.');
        }
        const otp = this.generateOTP();
        const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);
        await (0, database_1.query)(`UPDATE verification_tokens 
       SET used = true 
       WHERE user_id = (SELECT id FROM users WHERE email = $1) 
       AND token_type = 'email_verify'
       AND used = false`, [email]);
        // Find or create user
        let userResult = await (0, database_1.query)('SELECT id, verified FROM users WHERE email = $1', [email]);
        let userId;
        if (userResult.rows.length === 0) {
            // Create new user with temporary password (will be set during first login)
            const newUser = await (0, database_1.query)('INSERT INTO users (email, password_hash, verified) VALUES ($1, $2, $3) RETURNING id', [email, 'TEMP_PASSWORD_TO_BE_SET', false]);
            userId = newUser.rows[0].id;
        }
        else {
            userId = userResult.rows[0].id;
            // If already verified, don't allow new OTP
            if (userResult.rows[0].verified) {
                throw new Error('Email already verified. Please login.');
            }
        }
        // Store new OTP in database
        await (0, database_1.query)(`INSERT INTO verification_tokens (user_id, token, token_type, expires_at) 
       VALUES ($1, $2, $3, $4)`, [userId, otp, 'email_verify', expiresAt]);
        // Send OTP via email
        await emailService_1.emailService.sendOTP(email, otp);
        console.log(`OTP sent to ${email} (User ID: ${userId})`);
    }
    // Verify OTP and activate account (like Shopio's verifyOtp method)
    async verifyOTP(email, otp) {
        email = validation_1.ValidationUtils.sanitizeEmail(email);
        if (!validation_1.ValidationUtils.isValidOTP(otp)) {
            return { success: false, message: 'Invalid OTP format' };
        }
        // Find valid OTP (from Shopio's verification logic)
        const result = await (0, database_1.query)(`SELECT vt.id, vt.user_id, u.email, u.display_name
       FROM verification_tokens vt
       JOIN users u ON u.id = vt.user_id
       WHERE u.email = $1 
       AND vt.token = $2 
       AND vt.token_type = 'email_verify'
       AND vt.expires_at > NOW()
       AND vt.used = false`, [email, otp]);
        if (result.rows.length === 0) {
            return { success: false, message: 'Invalid or expired OTP' };
        }
        const { id: tokenId, user_id: userId, display_name } = result.rows[0];
        // Mark OTP as used (single-use OTP from Shopio)
        await (0, database_1.query)('UPDATE verification_tokens SET used = true WHERE id = $1', [tokenId]);
        // Mark user as verified
        await (0, database_1.query)('UPDATE users SET verified = true WHERE id = $1', [userId]);
        // Send welcome email (non-blocking)
        emailService_1.emailService.sendWelcomeEmail(email, display_name).catch(err => {
            console.error('Failed to send welcome email:', err);
        });
        console.log(`User ${email} verified successfully`);
        return {
            success: true,
            userId,
            message: 'Email verified successfully'
        };
    }
    // Resend OTP (with cooldown check)
    async resendOTP(email) {
        email = validation_1.ValidationUtils.sanitizeEmail(email);
        // Check if last OTP was sent less than 1 minute ago (cooldown from Shopio)
        const lastOTP = await (0, database_1.query)(`SELECT vt.created_at 
       FROM verification_tokens vt
       JOIN users u ON u.id = vt.user_id
       WHERE u.email = $1 
       AND vt.token_type = 'email_verify'
       ORDER BY vt.created_at DESC
       LIMIT 1`, [email]);
        if (lastOTP.rows.length > 0) {
            const lastSent = new Date(lastOTP.rows[0].created_at);
            const now = new Date();
            const diffSeconds = (now.getTime() - lastSent.getTime()) / 1000;
            if (diffSeconds < 60) {
                throw new Error(`Please wait ${Math.ceil(60 - diffSeconds)} seconds before requesting a new OTP`);
            }
        }
        // Send new OTP
        await this.sendOTP(email);
    }
}
exports.OTPService = OTPService;
exports.otpService = new OTPService();
