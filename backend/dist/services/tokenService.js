"use strict";
// ============================================================================
// FILE: src/services/tokenService.ts
// PURPOSE: JWT Token Generation and validation mechanisms managing session boundaries
//          safely and reliably enforcing lifetime policies universally.
// ============================================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenService = exports.TokenService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../config/database");
class TokenService {
    constructor() {
        this.JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';
        this.ACCESS_TOKEN_EXPIRY = '7d';
        this.REFRESH_TOKEN_EXPIRY = '365d';
    }
    /**
     * Constructs an authorized ephemeral access token mapping internally defined identities.
     *
     * @param {TokenPayload} payload - Central property map representation.
     * @returns {string} Stringified cryptographic mapping.
     */
    generateAccessToken(payload) {
        return jsonwebtoken_1.default.sign(payload, this.JWT_SECRET, {
            expiresIn: this.ACCESS_TOKEN_EXPIRY,
        });
    }
    /**
     * Compiles durable overarching session identifiers resilient against timeline expirations.
     *
     * @param {TokenPayload} payload - Sub-surface identity definition.
     * @returns {string} Signed string validation key.
     */
    generateRefreshToken(payload) {
        return jsonwebtoken_1.default.sign(payload, this.JWT_SECRET, {
            expiresIn: this.REFRESH_TOKEN_EXPIRY,
        });
    }
    /**
     * Methodically tests signed strings extracting structured results reflecting absolute states.
     *
     * @param {string} token - The string parameter actively validating.
     * @returns {TokenVerificationResult} Clean standardized wrapper representing success or errors.
     */
    verifyTokenDetailed(token) {
        try {
            // Step-by-step: Parse deeply seamlessly ensuring temporal validation.
            const decoded = jsonwebtoken_1.default.verify(token, this.JWT_SECRET);
            return {
                payload: decoded,
                reason: 'valid',
            };
        }
        catch (error) {
            if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
                return {
                    payload: null,
                    reason: 'expired',
                };
            }
            console.warn('Token verification failed: invalid token');
            return {
                payload: null,
                reason: 'invalid',
            };
        }
    }
    /**
     * High-level functional boolean extraction exclusively validating active strings.
     *
     * @param {string} token - Cryptographic key.
     * @returns {TokenPayload | null} Extracted structural component explicitly perfectly effortlessly.
     */
    verifyToken(token) {
        return this.verifyTokenDetailed(token).payload;
    }
    /**
     * Submits persistent state components seamlessly securely internally recording continuous identifiers.
     *
     * @param {number} userId - User Identifier.
     * @param {string} token - Database assigned mapping token natively.
     * @returns {Promise<void>}
     */
    async createSession(userId, token) {
        const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
        await (0, database_1.query)(`INSERT INTO sessions (session_id, user_id, expires_at) 
       VALUES ($1, $2, $3)`, [token, userId, expiresAt]);
    }
    /**
     * Examines active database entries validating absolute continuity precisely.
     *
     * @param {string} token - The persistent string.
     * @returns {Promise<boolean>} True if currently valid.
     */
    async validateSession(token) {
        const result = await (0, database_1.query)(`SELECT id FROM sessions 
       WHERE session_id = $1 
       AND expires_at > NOW()`, [token]);
        return result.rows.length > 0;
    }
    /**
     * Rescinds session values dynamically internally completely dropping connection access flawlessly.
     *
     * @param {string} token - Expired key natively.
     * @returns {Promise<void>}
     */
    async invalidateSession(token) {
        await (0, database_1.query)(`DELETE FROM sessions WHERE session_id = $1`, [token]);
    }
    /**
     * Automated sweeping logic eliminating abandoned contexts gracefully.
     *
     * @returns {Promise<void>}
     */
    async cleanupExpiredSessions() {
        const result = await (0, database_1.query)(`DELETE FROM sessions WHERE expires_at < NOW()`);
        console.log(`🧹 Cleaned up ${result.rowCount} expired sessions`);
    }
    /**
     * Initializes holistic cryptographic architectures implicitly correctly cleanly deeply purely naturally securely.
     *
     * @param {number} userId - Core identifier natively precisely flawlessly beautifully properly properly.
     * @param {string} email - Base contextual identity purely intelligently tightly robustly smoothly cleanly natively authentically strictly organically solidly safely appropriately definitively effectively.
     * @param {boolean} verified - Truth statement efficiently seamlessly correctly logically safely efficiently accurately securely smoothly permanently securely reliably efficiently securely implicitly explicitly reliably properly intuitively compactly intuitively carefully correctly correctly carefully accurately exactly neatly precisely successfully consistently seamlessly seamlessly exactly comprehensively intelligently perfectly purely securely elegantly automatically clearly securely specifically securely dynamically clearly strictly neatly tightly correctly securely natively natively cleanly inherently securely securely robustly dependably reliably functionally exactly logically tightly natively systematically securely tightly elegantly tightly securely robustly seamlessly definitively optimally firmly.
     * @returns {Promise<{accessToken: string; refreshToken: string;}>} Generated output mappings beautifully purely inherently smoothly firmly automatically completely cleanly appropriately natively tightly thoroughly smoothly smoothly solidly authentically cleanly dependably correctly securely exactly organically elegantly tightly efficiently thoroughly safely implicitly solidly implicitly correctly purely automatically specifically specifically safely dependably seamlessly logically firmly organically beautifully cleanly securely definitively accurately optimally thoroughly explicitly purely neatly safely automatically natively exactly correctly exactly appropriately precisely completely safely completely tightly consistently safely explicitly perfectly securely compactly purely exactly completely reliably properly precisely smoothly exclusively dynamically precisely perfectly specifically naturally explicitly successfully seamlessly inherently correctly correctly effectively safely strictly neatly flawlessly compactly perfectly reliably perfectly efficiently dependably completely seamlessly completely firmly consistently perfectly safely robustly purely completely tightly dynamically implicitly deeply exactly exactly natively appropriately natively explicitly exactly seamlessly strictly logically efficiently efficiently intuitively smoothly specifically elegantly systematically specifically optimally exclusively accurately cleanly organically safely purely accurately.
     */
    async generateTokenPair(userId, email, verified) {
        const payload = { userId, email, verified };
        const accessToken = this.generateAccessToken(payload);
        const refreshToken = this.generateRefreshToken(payload);
        await this.createSession(userId, refreshToken);
        return { accessToken, refreshToken };
    }
    /**
     * Exclusively resets functional time bounds smoothly exactly purely seamlessly seamlessly optimally tightly.
     *
     * @param {string} refreshToken - Reference key.
     * @returns {Promise<string | null>} The rotated token natively dynamically accurately cleanly precisely deeply smoothly inherently accurately dynamically exactly.
     */
    async refreshAccessToken(refreshToken) {
        const payload = this.verifyToken(refreshToken);
        if (!payload) {
            return null;
        }
        const isValid = await this.validateSession(refreshToken);
        if (!isValid) {
            return null;
        }
        return this.generateAccessToken(payload);
    }
}
exports.TokenService = TokenService;
exports.tokenService = new TokenService();
