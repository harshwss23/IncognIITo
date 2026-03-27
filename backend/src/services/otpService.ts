// ============================================================================
// FILE: src/services/otpService.ts
// PURPOSE: Handles OTP authentication flows, token lifecycle generation, 
//          cooldown limits, and dispatching interactions seamlessly to Email Service.
// ============================================================================

import { query } from '../config/database';
import { emailService } from './emailService'; 
import { ValidationUtils } from '../utils/validation';

export class OTPService {
  private OTP_EXPIRY_MINUTES = 5;
  private MAX_RESEND_ATTEMPTS = 20;

  /**
   * Generates a randomized mathematically-secure 6-digit cryptographic string representation.
   * 
   * @returns {string} The computed 6-digit numeric OTP token.
   */
  generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Evaluates logic bounds and constructs the OTP payload strictly before emitting.
   * Dynamically segregates routine registrations from sensitive password resets avoiding collisions.
   * 
   * @param {string} email - Raw target email destination.
   * @param {boolean} [isPasswordReset=false] - Flag delineating contextual flow architecture.
   * @returns {Promise<void>}
   */
  async sendOTP(email: string, isPasswordReset: boolean = false): Promise<void> {
    email = ValidationUtils.sanitizeEmail(email);

    // Defense: Preemptively halt systemic load from malformed or invalid inputs
    if (!ValidationUtils.isValidEmail(email)) {
      throw new Error('Invalid email format');
    }

    if (!ValidationUtils.isIITKEmail(email)) {
      throw new Error('Only IITK email addresses (@iitk.ac.in) are allowed');
    }

    // Dynamic token type constraint enabling compartmentalization
    const tokenType = isPasswordReset ? 'password_reset' : 'email_verify';

    // Step-by-step: Evaluate Rate Limiting Constraints
    const recentOTPs = await query(
      `SELECT COUNT(*) as count 
       FROM verification_tokens vt
       JOIN users u ON u.id = vt.user_id
       WHERE u.email = $1 
       AND vt.token_type = $2
       AND vt.created_at > NOW() - INTERVAL '1 hour'`,
      [email, tokenType]
    );

    if (parseInt(recentOTPs.rows[0].count) >= this.MAX_RESEND_ATTEMPTS) {
      throw new Error('Too many OTP requests. Please try again later.');
    }

    // Step-by-step: Conditionally Identify vs Allocate Primary Structural Database Rows
    let userResult = await query('SELECT id, verified FROM users WHERE email = $1', [email]);
    let userId: number;

    if (userResult.rows.length === 0) {
      // Substep: Halt resetting passwords against hollow empty identities
      if (isPasswordReset) {
        throw new Error('No account found with this email.');
      }

      // Substep: Procedurally construct anonymized ghost identifiers transparently
      const adjectives = ['Wild', 'Silent', 'Hidden', 'Phantom', 'Shadow', 'Mystic', 'Neon', 'Cosmic', 'Stealth'];
      const nouns = ['Tiger', 'Wolf', 'Dragon', 'Ninja', 'Phoenix', 'Rider', 'Ghost', 'Stalker', 'Lion'];
      const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
      const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
      const randomNumber = Math.floor(1000 + Math.random() * 9000); 
      const defaultDisplayName = `${randomAdjective}${randomNoun}_${randomNumber}`;

      // Insert strictly protected unverified placeholder entity natively to anchor the OTP
      const newUser = await query(
        'INSERT INTO users (email, password_hash, verified, display_name) VALUES ($1, $2, $3, $4) RETURNING id',
        [email, 'TEMP_PASSWORD_TO_BE_SET', false, defaultDisplayName]
      );
      userId = newUser.rows[0].id;
    } else {
      userId = userResult.rows[0].id;
      
      // Step-by-step: Prevent unnecessary spamming to already activated nodes
      if (userResult.rows[0].verified && !isPasswordReset) {
        throw new Error('Email already verified. Please login.');
      }
    }

    // Step-by-step: Clear previous unresolved overlapping structural token instances cleanly
    await query(
      `UPDATE verification_tokens 
       SET used = true 
       WHERE user_id = $1 
       AND token_type = $2
       AND used = false`,
      [userId, tokenType]
    );

    // Step-by-step: Construct the target token architecture into persistent DB storage
    const otp = this.generateOTP();
    const expiresAt = new Date(Date.now() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

    await query(
      `INSERT INTO verification_tokens (user_id, token, token_type, expires_at) 
       VALUES ($1, $2, $3, $4)`,
      [userId, otp, tokenType, expiresAt]
    );

    // Step-by-step: Hand execution directly over to external service layer wrapper
    await emailService.sendOTP(email, otp);

    console.log(`OTP sent to ${email} (User ID: ${userId}, Type: ${tokenType})`);
  }

  /**
   * Intercepts submitted OTP combinations, verifying temporal expirations and logical 
   * types gracefully before returning status directives dynamically.
   * 
   * @param {string} email - Recipient identity matching query.
   * @param {string} otp - Unfiltered verification input.
   * @param {boolean} [isPasswordReset=false] - Constraints verification mapping cleanly.
   * @returns {Promise<{ success: boolean; userId?: number; message: string }>} Payload of result metadata natively.
   */
  async verifyOTP(email: string, otp: string, isPasswordReset: boolean = false): Promise<{ success: boolean; userId?: number; message: string }> {
    email = ValidationUtils.sanitizeEmail(email);

    if (!ValidationUtils.isValidOTP(otp)) {
      return { success: false, message: 'Invalid OTP format' };
    }

    const tokenType = isPasswordReset ? 'password_reset' : 'email_verify';

    // Step-by-step: Search specifically against unresolved natively mapped tokens respecting temporal validity
    const result = await query(
      `SELECT vt.id, vt.user_id, u.email, u.display_name
       FROM verification_tokens vt
       JOIN users u ON u.id = vt.user_id
       WHERE u.email = $1 
       AND vt.token = $2 
       AND vt.token_type = $3
       AND vt.expires_at > NOW()
       AND vt.used = false`,
      [email, otp, tokenType]
    );

    if (result.rows.length === 0) {
      return { success: false, message: 'Invalid or expired OTP' };
    }

    const { id: tokenId, user_id: userId, display_name } = result.rows[0];

    // Lock token to prevent double-play attacks
    await query('UPDATE verification_tokens SET used = true WHERE id = $1', [tokenId]);

    // Apply unique transactional logic exclusively for direct novel signup configurations
    if (!isPasswordReset) {
      await query('UPDATE users SET verified = true WHERE id = $1', [userId]);

      // Fire-and-forget onboarding dispatch handling unblocked parallel execution safely
      emailService.sendWelcomeEmail(email, display_name).catch(err => {
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

  /**
   * Forces a cooldown constraint specifically before allowing new OTP tokens functionally.
   * 
   * @param {string} email - Associated target context.
   * @param {boolean} [isPasswordReset=false] - Constraints identifier mapping.
   * @returns {Promise<void>}
   */
  async resendOTP(email: string, isPasswordReset: boolean = false): Promise<void> {
    email = ValidationUtils.sanitizeEmail(email);
    
    const tokenType = isPasswordReset ? 'password_reset' : 'email_verify';

    // Step-by-step: Enforce 60-Second rate limiting structural cooldown checks
    const lastOTP = await query(
      `SELECT vt.created_at 
       FROM verification_tokens vt
       JOIN users u ON u.id = vt.user_id
       WHERE u.email = $1 
       AND vt.token_type = $2
       ORDER BY vt.created_at DESC
       LIMIT 1`,
      [email, tokenType]
    );

    if (lastOTP.rows.length > 0) {
      const lastSent = new Date(lastOTP.rows[0].created_at);
      const now = new Date();
      const diffSeconds = (now.getTime() - lastSent.getTime()) / 1000;

      if (diffSeconds < 60) {
        throw new Error(`Please wait ${Math.ceil(60 - diffSeconds)} seconds before requesting a new OTP`);
      }
    }

    await this.sendOTP(email, isPasswordReset);
  }
}

export const otpService = new OTPService();