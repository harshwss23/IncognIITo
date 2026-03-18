"use strict";
// FILE: src/config/cloudinary.ts
// PURPOSE: Initialize and export the Cloudinary v2 SDK with credentials from .env
Object.defineProperty(exports, "__esModule", { value: true });
const cloudinary_1 = require("cloudinary");
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUD_NAME?.trim(),
    api_key: process.env.CLOUD_API_KEY?.trim(),
    api_secret: process.env.CLOUD_SECRET_KEY?.trim(),
});
exports.default = cloudinary_1.v2;
