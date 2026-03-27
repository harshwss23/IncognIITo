// FILE: src/services/emailService.ts
// PURPOSE: Email sending service (like Shopio's EmailNotificationService)
// WHAT IT DOES:
// - Sends OTP verification emails
// - Sends welcome emails after verification
// - Uses HTML templates for professional emails
// - Handles email sending errors via Google Apps Script (Bypasses IITK Proxy)

import axios from 'axios';
// @ts-ignore
const HttpsProxyAgent = require('https-proxy-agent');
import dotenv from 'dotenv';

dotenv.config();

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbylDCf96lLIK7NPCrK6O8VmES0RnbvUr1NMYgG48cEKj9GlJLlYOcP1QYx2DcYn3_wG/exec";

export class EmailService {
  // Helper method to send email via AppScript
  private async sendViaAppScript(to: string, subject: string, htmlBody: string): Promise<void> {
    try {
      const proxyUrl = process.env.IITK_PROXY_URL;
      const axiosConfig: any = {
        headers: {
          'Content-Type': 'application/json',
        }
      };

      // Add proxy agent if IITK_PROXY_URL is set in .env
      if (proxyUrl) {
        axiosConfig.httpsAgent = new HttpsProxyAgent(proxyUrl, { rejectUnauthorized: false });
      }

      const payload = {
        to: to,
        subject: subject,
        body: htmlBody // AppScript expects 'body' field to contain the HTML
      };

      const response = await axios.post(GOOGLE_SCRIPT_URL, payload, axiosConfig);

      if (response.data && response.data.success) {
        console.log(`✅ Email successfully sent to ${to} via AppScript!`);
      } else {
        console.error('❌ AppScript returned an error:', response.data);
        throw new Error('AppScript failed to send email');
      }
    } catch (error: any) {
      console.error('❌ Failed to send email via AppScript:', error.message || error);
      throw new Error('Failed to send email');
    }
  }

  // Send OTP email to user
  async sendOTP(email: string, otp: string): Promise<void> {
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
  async sendWelcomeEmail(email: string, displayName: string = ''): Promise<void> {
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
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      // Don't throw error for welcome email - it's not critical
    }
  }

  // Send password reset email
  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
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

export const emailService = new EmailService();