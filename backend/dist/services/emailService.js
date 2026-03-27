"use strict";
// FILE: src/services/emailService.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailService = exports.EmailService = void 0;
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
const url_1 = __importDefault(require("url"));
// @ts-ignore - Using require for ESM/CJS compatibility with v5
const HttpsProxyAgent = require('https-proxy-agent');
dotenv_1.default.config();
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbylDCf96lLIK7NPCrK6O8VmES0RnbvUr1NMYgG48cEKj9GlJLlYOcP1QYx2DcYn3_wG/exec";
class EmailService {
    // Helper method to send email via AppScript
    async sendViaAppScript(to, subject, htmlBody) {
        try {
            const proxyUrl = process.env.IITK_PROXY_URL;
            const axiosConfig = {
                headers: {
                    'Content-Type': 'application/json',
                },
                // 🔥 CRITICAL FIX: Yeh Axios ko force karega ki apni aukaat mein rahe 
                // aur default proxy use na kare, balki humara niche banaya hua custom HttpsAgent use kare.
                proxy: false
            };
            // Add proxy agent with V5 syntax
            if (proxyUrl) {
                const proxyOptions = url_1.default.parse(proxyUrl);
                proxyOptions.rejectUnauthorized = false; // Bypass strict SSL checks
                axiosConfig.httpsAgent = new HttpsProxyAgent(proxyOptions);
            }
            const payload = {
                to: to,
                subject: subject,
                body: htmlBody
            };
            const response = await axios_1.default.post(GOOGLE_SCRIPT_URL, payload, axiosConfig);
            if (response.data && response.data.success) {
                console.log(`✅ Email successfully sent to ${to} via AppScript!`);
            }
            else {
                console.error('❌ AppScript returned an error:', response.data);
                throw new Error('AppScript failed to send email');
            }
        }
        catch (error) {
            console.error('❌ Failed to send email via AppScript:', error.message || error);
            throw new Error('Failed to send email');
        }
    }
    // Send OTP email to user
    async sendOTP(email, otp) {
        const subject = 'Your OTP for Email Verification - IncognIITo';
        const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .otp-box { background: #f0f0f0; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; }
          .otp-code { font-size: 32px; letter-spacing: 8px; color: #333; font-weight: bold; }
          .footer { color: #666; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Email Verification for IncognIITo</h2>
          <p>Hello!</p>
          <p>Your One-Time Password (OTP) for email verification is:</p>
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
          </div>
          <p><strong>This code will expire in 5 minutes.</strong></p>
          <p>If you didn't request this verification, please ignore this email.</p>
          <div class="footer">
            <p>This is an automated email from IncognIITo. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;
        await this.sendViaAppScript(email, subject, html);
    }
    // Send welcome email after successful verification
    async sendWelcomeEmail(email, displayName = '') {
        const subject = 'Welcome to IncognIITo!';
        const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px; text-align: center; }
          .content { padding: 20px 0; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to IncognIITo!</h1>
          </div>
          <div class="content">
            <p>Hello ${displayName || 'there'}!</p>
            <p>Your email has been successfully verified and your account is now active.</p>
            <p>You can now start connecting with people anonymously on IncognIITo.</p>
            <a href="${process.env.FRONTEND_URL}/login" class="button">Go to Dashboard</a>
            <p>Enjoy your anonymous conversations!</p>
          </div>
        </div>
      </body>
      </html>
    `;
        try {
            await this.sendViaAppScript(email, subject, html);
        }
        catch (error) {
            console.error('Failed to send welcome email:', error);
        }
    }
    // Send password reset email
    async sendPasswordResetEmail(email, resetToken) {
        const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
        const subject = 'Password Reset Request - IncognIITo';
        const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <h2>Password Reset Request</h2>
          <p>You requested to reset your password for IncognIITo.</p>
          <p>Click the button below to reset your password:</p>
          <a href="${resetLink}" class="button">Reset Password</a>
          <p>This link will expire in 15 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      </body>
      </html>
    `;
        await this.sendViaAppScript(email, subject, html);
    }
}
exports.EmailService = EmailService;
exports.emailService = new EmailService();
