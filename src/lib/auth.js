import crypto from 'crypto';

// Get or generate a persistent session secret
let SESSION_SECRET;
try {
  const fs = require('fs');
  const path = require('path');
  const configDir = path.join(process.cwd(), 'data');
  const configPath = path.join(configDir, 'config.json');
  
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    SESSION_SECRET = config.sessionSecret;
  } else {
    SESSION_SECRET = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(configPath, JSON.stringify({ sessionSecret: SESSION_SECRET }), 'utf8');
  }
} catch (e) {
  // Fallback in case of serverless execution or read/write error
  SESSION_SECRET = process.env.SESSION_SECRET || 'fallback-secure-session-secret-32-chars-long!';
}

// Ensure the secret is a Buffer of correct length (32 bytes for AES-256)
const ENCRYPTION_KEY = crypto.scryptSync(SESSION_SECRET, 'malathala-salt', 32);
const IV_LENGTH = 12; // For GCM

// Hash password with PBKDF2
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

// Verify password
export function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, originalHash] = storedHash.split(':');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return hash === originalHash;
}

// Encrypt session payload using AES-256-GCM
export function encryptSession(payload) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(JSON.stringify(payload), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const tag = cipher.getAuthTag().toString('hex');
  
  // Return IV + Encrypted Data + Auth Tag as a single string
  return `${iv.toString('hex')}:${encrypted}:${tag}`;
}

// Decrypt session payload
export function decryptSession(token) {
  try {
    if (!token || !token.includes(':')) return null;
    const [ivHex, encryptedHex, tagHex] = token.split(':');
    if (!ivHex || !encryptedHex || !tagHex) return null;
    
    const iv = Buffer.from(ivHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  } catch (err) {
    console.error('Session decryption failed:', err.message);
    return null;
  }
}

// Retrieve session from Next.js request headers (cookie)
export function getSession(request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const parts = c.trim().split('=');
      return [parts[0], parts.slice(1).join('=')];
    })
  );
  
  const token = cookies['malathala_session'];
  if (!token) return null;
  
  const session = decryptSession(token);
  // Check if session has expired (e.g., 7 days validity)
  if (!session || !session.expiresAt || Date.now() > session.expiresAt) {
    return null;
  }
  
  return session;
}

// Add cookie response header for session
export function setSessionCookie(response, payload) {
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const sessionData = { ...payload, expiresAt };
  const token = encryptSession(sessionData);
  
  response.headers.append(
    'Set-Cookie',
    `malathala_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}; Secure=${process.env.NODE_ENV === 'production'}`
  );
  return response;
}

// Clear cookie response header
export function clearSessionCookie(response) {
  response.headers.append(
    'Set-Cookie',
    `malathala_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
  );
  return response;
}

// Retrieve pending session from request cookie
export function getPendingSession(request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const parts = c.trim().split('=');
      return [parts[0], parts.slice(1).join('=')];
    })
  );
  
  const token = cookies['malathala_pending_session'];
  if (!token) return null;
  
  return decryptSession(token);
}

// Add pending session cookie
export function setPendingSessionCookie(response, payload) {
  const expiresAt = Date.now() + 1 * 24 * 60 * 60 * 1000; // 1 day
  const sessionData = { ...payload, expiresAt };
  const token = encryptSession(sessionData);
  
  response.headers.append(
    'Set-Cookie',
    `malathala_pending_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${1 * 24 * 60 * 60}; Secure=${process.env.NODE_ENV === 'production'}`
  );
  return response;
}

// Clear pending session cookie
export function clearPendingSessionCookie(response) {
  response.headers.append(
    'Set-Cookie',
    `malathala_pending_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
  );
  return response;
}
