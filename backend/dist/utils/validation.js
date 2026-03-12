"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationUtils = void 0;
class ValidationUtils {
    // Check if email is valid
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    // Check if email is from IITK domain
    static isIITKEmail(email) {
        return email.toLowerCase().endsWith('@iitk.ac.in');
    }
    // Validate password strength (min 8 chars, at least 1 letter and 1 number)
    static isValidPassword(password) {
        if (password.length < 8)
            return false;
        const hasLetter = /[a-zA-Z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        return hasLetter && hasNumber;
    }
    // Validate OTP (must be 6 digits)
    static isValidOTP(otp) {
        return /^\d{6}$/.test(otp);
    }
    // Sanitize email (lowercase and trim)
    static sanitizeEmail(email) {
        return email.toLowerCase().trim();
    }
}
exports.ValidationUtils = ValidationUtils;
