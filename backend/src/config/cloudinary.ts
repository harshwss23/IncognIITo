// FILE: src/config/cloudinary.ts
// PURPOSE: Initialize and export the Cloudinary v2 SDK with credentials from .env

import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import path from 'path';

// Load env from backend/.env first, then project root .env as fallback.
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME?.trim() || process.env.CLOUDINARY_CLOUD_NAME?.trim(),
  api_key: process.env.CLOUD_API_KEY?.trim() || process.env.CLOUDINARY_API_KEY?.trim(),
  api_secret: process.env.CLOUD_SECRET_KEY?.trim() || process.env.CLOUDINARY_API_SECRET?.trim(),
});

export default cloudinary;
