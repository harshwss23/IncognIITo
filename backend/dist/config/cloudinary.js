"use strict";
// FILE: src/config/cloudinary.ts
// PURPOSE: Initialize and export the Cloudinary v2 SDK with credentials from .env
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cloudinary_1 = require("cloudinary");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load env from backend/.env first, then project root .env as fallback.
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '.env') });
dotenv_1.default.config({ path: path_1.default.resolve(process.cwd(), '../.env') });
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUD_NAME?.trim() || process.env.CLOUDINARY_CLOUD_NAME?.trim(),
    api_key: process.env.CLOUD_API_KEY?.trim() || process.env.CLOUDINARY_API_KEY?.trim(),
    api_secret: process.env.CLOUD_SECRET_KEY?.trim() || process.env.CLOUDINARY_API_SECRET?.trim(),
});
exports.default = cloudinary_1.v2;
