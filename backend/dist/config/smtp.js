"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmailViaAppScript = void 0;
// FILE: src/config/mailer.ts (Ya jo bhi tera file ka naam hai)
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
// HttpsProxyAgent import kar lo taaki proxy ke through bahar ja sake
const https_proxy_agent_1 = require("https-proxy-agent");
dotenv_1.default.config();
// Tera Google Apps Script ka Web App URL
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbylDCf96lLIK7NPCrK6O8VmES0RnbvUr1NMYgG48cEKj9GlJLlYOcP1QYx2DcYn3_wG/exec";
const sendEmailViaAppScript = async (to, subject, body) => {
    try {
        // 1. IITK Proxy set up (Jo humne Cloudinary ke liye kiya tha wahi yahan kaam aayega)
        const proxyUrl = process.env.IITK_PROXY_URL;
        const axiosConfig = {
            headers: {
                'Content-Type': 'application/json',
            }
        };
        // Agar server pe proxy set hai, toh Agent attach kar do
        if (proxyUrl) {
            axiosConfig.httpsAgent = new https_proxy_agent_1.HttpsProxyAgent(proxyUrl, { rejectUnauthorized: false });
        }
        // 2. Google Script ko payload bhejo
        const payload = {
            to: to,
            subject: subject,
            body: body
        };
        const response = await axios_1.default.post(GOOGLE_SCRIPT_URL, payload, axiosConfig);
        // 3. Response check karo
        if (response.data && response.data.success) {
            console.log(`Email sent successfully to ${to} via AppScript!`);
            return true;
        }
        else {
            console.error('AppScript returned an error:', response.data);
            throw new Error('Failed to send email via AppScript');
        }
    }
    catch (error) {
        console.error('Error sending email through AppScript:', error.message || error);
        throw new Error('Email sending failed');
    }
};
exports.sendEmailViaAppScript = sendEmailViaAppScript;
