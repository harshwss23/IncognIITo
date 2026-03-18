// FILE: src/config/cloudinary.ts
// PURPOSE: Initialize and export the Cloudinary v2 SDK with credentials from .env

import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME?.trim(),
  api_key: process.env.CLOUD_API_KEY?.trim(),
  api_secret: process.env.CLOUD_SECRET_KEY?.trim(),
});

export default cloudinary;
