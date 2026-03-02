// FILE: src/services/emailService.ts
// PURPOSE: Email sending service (like Shopio's EmailNotificationService)
// WHAT IT DOES:
// - Sends OTP verification emails
// - Sends welcome emails after verification
// - Uses HTML templates for professional emails
// - Handles email sending errors

import { transporter } from '../config/smtp';

export class EmailService {
  // Send OTP email to user
  async sendOTP(email: string, otp: string): Promise<void> {
    const mailOptions = {
      from: `"IncognIITo" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: 'Your OTP for Email Verification - IncognIITo',
      html: `
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
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`✅ OTP email sent to ${email}`);
    } catch (error) {
      console.error('❌ Failed to send OTP email:', error);
      throw new Error('Failed to send OTP email');
    }
  }

  // Send welcome email after successful verification
  async sendWelcomeEmail(email: string, displayName: string = ''): Promise<void> {
    const mailOptions = {
      from: `"IncognIITo" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: 'Welcome to IncognIITo!',
      html: `
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
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`Welcome email sent to ${email}`);
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      // Don't throw error for welcome email - it's not critical
    }
  }

  // Send password reset email
  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: `"IncognIITo" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: 'Password Reset Request - IncognIITo',
      html: `
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
      `,
    };

    try {
      await transporter.sendMail(mailOptions);
      console.log(`Password reset email sent to ${email}`);
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }
}

export const emailService = new EmailService();
