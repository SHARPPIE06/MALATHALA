import fs from 'fs';
import path from 'path';

// Valid file mime-types
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export async function saveUploadedFile(file, subfolder) {
  if (!file) return null;

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Invalid file type. Only JPEG, PNG, GIF, and WEBP images are allowed.');
  }

  // Validate file size
  if (file.size > MAX_SIZE) {
    throw new Error('File size exceeds the 5MB limit.');
  }

  // If Vercel Blob Storage token is provided, upload directly to the cloud CDN
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { put } = require('@vercel/blob');
      const ext = path.extname(file.name) || '.png';
      const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${ext}`;
      const blob = await put(`uploads/${subfolder}/${uniqueName}`, file, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN
      });
      return blob.url;
    } catch (err) {
      console.error('Failed to upload to Vercel Blob, falling back to filesystem:', err.message);
    }
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Define upload directories and test write permissions to auto-detect read-only environments
  let uploadDir = path.join(process.cwd(), 'public', 'uploads', subfolder);
  let isVercel = false;

  try {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    const testFile = path.join(uploadDir, `.write-test-${Date.now()}`);
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
  } catch (err) {
    // Read-only filesystem detected, fallback to /tmp
    isVercel = true;
    uploadDir = path.join('/tmp', 'uploads', subfolder);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
  }

  // Generate unique filename
  const ext = path.extname(file.name) || '.png';
  const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${ext}`;
  const filePath = path.join(uploadDir, uniqueName);

  // Write file
  fs.writeFileSync(filePath, buffer);

  // Return public path
  return isVercel
    ? `/api/uploads/${subfolder}/${uniqueName}`
    : `/uploads/${subfolder}/${uniqueName}`;
}
