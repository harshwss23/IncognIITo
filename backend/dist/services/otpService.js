"use strict";
// FILE: src/services/otpService.ts
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
    // Send OTP to email
    async sendOTP(email, isPasswordReset = false) {
        email = validation_1.ValidationUtils.sanitizeEmail(email);
        if (!validation_1.ValidationUtils.isValidEmail(email)) {
            throw new Error('Invalid email format');
        }
        if (!validation_1.ValidationUtils.isIITKEmail(email)) {
            throw new Error('Only IITK email addresses (@iitk.ac.in) are allowed');
        }
        // Dynamic token type based on flow
        const tokenType = isPasswordReset ? 'password_reset' : 'email_verify';
        const recentOTPs = await (0, database_1.query)(`SELECT COUNT(*) as count 
       FROM verification_tokens vt
       JOIN users u ON u.id = vt.user_id
       WHERE u.email = $1 
       AND vt.token_type = $2
       AND vt.created_at > NOW() - INTERVAL '1 hour'`, [email, tokenType]);
        if (parseInt(recentOTPs.rows[0].count) >= this.MAX_RESEND_ATTEMPTS) {
            throw new Error('Too many OTP requests. Please try again later.');
        }
        const otp = this.generateOTP();
        const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);
        await (0, database_1.query)(`UPDATE verification_tokens 
       SET used = true 
       WHERE user_id = (SELECT id FROM users WHERE email = $1) 
       AND token_type = $2
       AND used = false`, [email, tokenType]);
        // Find or create user
        let userResult = await (0, database_1.query)('SELECT id, verified FROM users WHERE email = $1', [email]);
        let userId;
        if (userResult.rows.length === 0) {
            // Don't create a new account if they are just trying to reset password
            if (isPasswordReset) {
                throw new Error('No account found with this email.');
            }
            // Generate random default display name
            const adjectives = ['Wild', 'Silent', 'Hidden', 'Phantom', 'Shadow', 'Mystic', 'Neon', 'Cosmic', 'Stealth'];
            const nouns = ['Tiger', 'Wolf', 'Dragon', 'Ninja', 'Phoenix', 'Rider', 'Ghost', 'Stalker', 'Lion'];
            const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
            const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
            const randomNumber = Math.floor(1000 + Math.random() * 9000); // 4-digit number
            const defaultDisplayName = `${randomAdjective}${randomNoun}_${randomNumber}`;
            // Create new user with temporary password and default display name
            const newUser = await (0, database_1.query)('INSERT INTO users (email, password_hash, verified, display_name) VALUES ($1, $2, $3, $4) RETURNING id', [email, 'TEMP_PASSWORD_TO_BE_SET', false, defaultDisplayName]);
            userId = newUser.rows[0].id;
        }
        else {
            userId = userResult.rows[0].id;
            // Bypass the "already verified" check ONLY IF it's a password reset
            if (userResult.rows[0].verified && !isPasswordReset) {
                throw new Error('Email already verified. Please login.');
            }
        }
        // Store new OTP in database
        await (0, database_1.query)(`INSERT INTO verification_tokens (user_id, token, token_type, expires_at) 
       VALUES ($1, $2, $3, $4)`, [userId, otp, tokenType, expiresAt]);
        // Send OTP via email
        await emailService_1.emailService.sendOTP(email, otp);
        console.log(`OTP sent to ${email} (User ID: ${userId}, Type: ${tokenType})`);
    }
    // Verify OTP and activate account
    async verifyOTP(email, otp, isPasswordReset = false) {
        email = validation_1.ValidationUtils.sanitizeEmail(email);
        if (!validation_1.ValidationUtils.isValidOTP(otp)) {
            return { success: false, message: 'Invalid OTP format' };
        }
        // Dynamic token type based on flow
        const tokenType = isPasswordReset ? 'password_reset' : 'email_verify';
        // Find valid OTP
        const result = await (0, database_1.query)(`SELECT vt.id, vt.user_id, u.email, u.display_name
       FROM verification_tokens vt
       JOIN users u ON u.id = vt.user_id
       WHERE u.email = $1 
       AND vt.token = $2 
       AND vt.token_type = $3
       AND vt.expires_at > NOW()
       AND vt.used = false`, [email, otp, tokenType]);
        if (result.rows.length === 0) {
            return { success: false, message: 'Invalid or expired OTP' };
        }
        const { id: tokenId, user_id: userId, display_name } = result.rows[0];
        // Mark OTP as used
        await (0, database_1.query)('UPDATE verification_tokens SET used = true WHERE id = $1', [tokenId]);
        // Only mark user verified and send welcome email if it's a normal signup
        if (!isPasswordReset) {
            // Mark user as verified
            await (0, database_1.query)('UPDATE users SET verified = true WHERE id = $1', [userId]);
            // Send welcome email (non-blocking)
            emailService_1.emailService.sendWelcomeEmail(email, display_name).catch(err => {
                console.error('Failed to send welcome email:', err);
            });
            console.log(`User ${email} verified successfully`);
        }
        return {
            success: true,
            userId,
            message: isPasswordReset ? 'OTP verified for password reset' : 'Email verified successfully'
        };
    }
    // Resend OTP
    async resendOTP(email, isPasswordReset = false) {
        email = validation_1.ValidationUtils.sanitizeEmail(email);
        // Dynamic token type
        const tokenType = isPasswordReset ? 'password_reset' : 'email_verify';
        // Check cooldown
        const lastOTP = await (0, database_1.query)(`SELECT vt.created_at 
       FROM verification_tokens vt
       JOIN users u ON u.id = vt.user_id
       WHERE u.email = $1 
       AND vt.token_type = $2
       ORDER BY vt.created_at DESC
       LIMIT 1`, [email, tokenType]);
        if (lastOTP.rows.length > 0) {
            const lastSent = new Date(lastOTP.rows[0].created_at);
            const now = new Date();
            const diffSeconds = (now.getTime() - lastSent.getTime()) / 1000;
            if (diffSeconds < 60) {
                throw new Error(`Please wait ${Math.ceil(60 - diffSeconds)} seconds before requesting a new OTP`);
            }
        }
        // Send new OTP
        await this.sendOTP(email, isPasswordReset);
    }
}
exports.OTPService = OTPService;
exports.otpService = new OTPService();
