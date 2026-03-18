// FILE: src/middleware/uploadMiddleware.ts
// PURPOSE: Multer middleware using memory storage (buffer), which we then
//          pipe to Cloudinary's upload_stream. This is the correct pattern
//          for Cloudinary v2 (multer-storage-cloudinary only supports v1).

import multer from 'multer';
import { Request } from 'express';

const storage = multer.memoryStorage();

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
});
