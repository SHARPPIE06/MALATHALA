import fs from 'fs';
import path from 'path';
import { hashPassword } from './auth';

// Detect writeable filesystem via a direct write test, falling back to /tmp if read-only
let DB_PATH = path.join(process.cwd(), 'data', 'db.json');
let isVercel = false;

try {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const testFile = path.join(dir, `.write-test-${Date.now()}`);
  fs.writeFileSync(testFile, 'test');
  fs.unlinkSync(testFile);
} catch (err) {
  isVercel = true;
  DB_PATH = path.join('/tmp', 'db.json');
}

// Memory queue to prevent concurrent write file corruption
let writeQueue = Promise.resolve();

function enqueueWrite(fn) {
  return new Promise((resolve, reject) => {
    writeQueue = writeQueue.then(async () => {
      try {
        const result = await fn();
        resolve(result);
      } catch (err) {
        reject(err);
      }
    });
  });
}

// Initialize database with pre-seeded data
export async function initDb() {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    try {
      const { kv } = require('@vercel/kv');
      const data = await kv.get('malathala_db');
      if (!data) {
        const defaultDb = {
          users: [
            {
              id: 'admin-uuid-0000-0000',
              username: 'admin',
              email: 'admin@malathala.urs.edu.ph',
              password_hash: hashPassword('AdminSecurePassword2026!'),
              role: 'admin',
              status: 'approved',
              fullName: 'Malathala Administrator',
              category: 'Administration',
              bio: 'System Administrator for MALATHALA visual arts portal.',
              profilePicture: '/default-profile.png',
              createdAt: new Date().toISOString()
            },
            {
              id: 'artist-uuid-regine-santos',
              username: 'regine',
              email: 'regine@malathala.urs.edu.ph',
              password_hash: hashPassword('artist123'),
              role: 'artist',
              status: 'approved',
              fullName: 'Regine Santos',
              category: 'Painting',
              bio: 'Fine arts graduate. Specializes in oil paintings depicting Philippine heritage and culture.',
              profilePicture: '/uploads/profiles/artist-avatar-1.png',
              createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
            },
            {
              id: 'artist-uuid-karl-mendoza',
              username: 'karl',
              email: 'karl@malathala.urs.edu.ph',
              password_hash: hashPassword('artist123'),
              role: 'artist',
              status: 'approved',
              fullName: 'Karl Mendoza',
              category: 'Photography',
              bio: 'Visual storyteller capturing the hidden textures and patterns of urban and rural life.',
              profilePicture: '/uploads/profiles/artist-avatar-2.png',
              createdAt: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString()
            }
          ],
          artworks: [
            {
              id: 'art-uuid-painting-1',
              userId: 'artist-uuid-regine-santos',
              artistName: 'Regine Santos',
              artistAvatar: '/uploads/profiles/artist-avatar-1.png',
              title: 'Whispers of the Morong Church',
              description: 'An oil-on-canvas painting depicting the historic St. Jerome Parish Church in Morong, Rizal, highlighted under a golden-hour sky.',
              category: 'Painting',
              imagePath: '/uploads/artworks/seeding-painting-1.png',
              createdAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
              likes: 2,
              likedBy: ['admin-uuid-0000-0000', 'artist-uuid-karl-mendoza'],
              price: 18500
            },
            {
              id: 'art-uuid-photography-1',
              userId: 'artist-uuid-karl-mendoza',
              artistName: 'Karl Mendoza',
              artistAvatar: '/uploads/profiles/artist-avatar-2.png',
              title: 'Echoes of the Sierra Madre',
              description: 'A monochrome landscape photograph capturing the morning fog rolling over the peaks of the Sierra Madre mountain range.',
              category: 'Photography',
              imagePath: '/uploads/artworks/seeding-photo-1.png',
              createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
              likes: 1,
              likedBy: ['admin-uuid-0000-0000'],
              price: null
            }
          ]
        };
        await kv.set('malathala_db', defaultDb);
        console.log('Database initialized in Vercel KV with seed data.');
      }
      return;
    } catch (err) {
      console.error('Failed to initialize KV database:', err.message);
    }
  }

  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const defaultDb = {
    users: [],
    artworks: []
  };

  // Pre-seed admin and test data
  const adminUser = {
    id: 'admin-uuid-0000-0000',
    username: 'admin',
    email: 'admin@malathala.urs.edu.ph',
    password_hash: hashPassword('AdminSecurePassword2026!'),
    role: 'admin',
    status: 'approved',
    fullName: 'Malathala Administrator',
    category: 'Administration',
    bio: 'System Administrator for MALATHALA visual arts portal.',
    profilePicture: '/logo.png',
    createdAt: new Date().toISOString()
  };

  const seedArtist1 = {
    id: 'artist-uuid-regine-santos',
    username: 'regine',
    email: 'regine@malathala.urs.edu.ph',
    password_hash: hashPassword('artist123'),
    role: 'artist',
    status: 'approved',
    fullName: 'Regine Santos',
    category: 'Painting',
    bio: 'Fine arts graduate. Specializes in oil paintings depicting Philippine heritage and culture.',
    profilePicture: '/uploads/profiles/artist-avatar-1.png',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 day ago
  };

  const seedArtist2 = {
    id: 'artist-uuid-karl-mendoza',
    username: 'karl',
    email: 'karl@malathala.urs.edu.ph',
    password_hash: hashPassword('artist123'),
    role: 'artist',
    status: 'approved',
    fullName: 'Karl Mendoza',
    category: 'Photography',
    bio: 'Visual storyteller capturing the hidden textures and patterns of urban and rural life.',
    profilePicture: '/uploads/profiles/artist-avatar-2.png',
    createdAt: new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString() // 23h ago
  };

  const seedArtwork1 = {
    id: 'art-uuid-painting-1',
    userId: 'artist-uuid-regine-santos',
    artistName: 'Regine Santos',
    artistAvatar: '/uploads/profiles/artist-avatar-1.png',
    title: 'Whispers of the Morong Church',
    description: 'An oil-on-canvas painting depicting the historic St. Jerome Parish Church in Morong, Rizal, highlighted under a golden-hour sky.',
    category: 'Painting',
    imagePath: '/uploads/artworks/seeding-painting-1.png',
    createdAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(), // 10h ago
    likes: 2,
    likedBy: ['admin-uuid-0000-0000', 'artist-uuid-karl-mendoza'],
    price: 18500
  };

  const seedArtwork2 = {
    id: 'art-uuid-photography-1',
    userId: 'artist-uuid-karl-mendoza',
    artistName: 'Karl Mendoza',
    artistAvatar: '/uploads/profiles/artist-avatar-2.png',
    title: 'Echoes of the Sierra Madre',
    description: 'A monochrome landscape photograph capturing the morning fog rolling over the peaks of the Sierra Madre mountain range.',
    category: 'Photography',
    imagePath: '/uploads/artworks/seeding-photo-1.png',
    createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(), // 8h ago
    likes: 1,
    likedBy: ['admin-uuid-0000-0000'],
    price: null
  };

  if (!fs.existsSync(DB_PATH)) {
    defaultDb.users.push(adminUser, seedArtist1, seedArtist2);
    defaultDb.artworks.push(seedArtwork1, seedArtwork2);
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultDb, null, 2), 'utf8');
    console.log('Database initialized with admin and seed data.');
  } else {
    // If database exists, verify admin and seed users exist, if not insert them
    const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    let modified = false;

    if (!data.users.find(u => u.username === 'admin')) {
      data.users.push(adminUser);
      modified = true;
    }
    if (!data.users.find(u => u.username === 'regine')) {
      data.users.push(seedArtist1);
      modified = true;
    }
    if (!data.users.find(u => u.username === 'karl')) {
      data.users.push(seedArtist2);
      modified = true;
    }

    if (data.artworks.length === 0) {
      data.artworks.push(seedArtwork1, seedArtwork2);
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
      console.log('Seed users/artworks validated and merged into existing database.');
    }
  }
}

// Read database
async function readDb() {
  await initDb();
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    try {
      const { kv } = require('@vercel/kv');
      const data = await kv.get('malathala_db');
      return data || { users: [], artworks: [] };
    } catch (err) {
      console.error('Failed to read from KV:', err.message);
    }
  }
  try {
    const content = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    console.error('Error reading database file, returning empty schema:', err.message);
    return { users: [], artworks: [] };
  }
}

// Write database safely via queue
function writeDb(data) {
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    try {
      const { kv } = require('@vercel/kv');
      return kv.set('malathala_db', data);
    } catch (err) {
      console.error('Failed to write to KV:', err.message);
    }
  }
  return enqueueWrite(() => {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  });
}

// --- USER OPERATIONS ---

export async function getAllUsers() {
  const db = await readDb();
  return db.users;
}

export async function getUserById(id) {
  const users = await getAllUsers();
  return users.find(u => u.id === id) || null;
}

export async function getUserByUsername(username) {
  const users = await getAllUsers();
  return users.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
}

export async function getUserByEmail(email) {
  const users = await getAllUsers();
  return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}

export async function createUser(userData) {
  const db = await readDb();
  const newUser = {
    id: crypto.randomUUID ? crypto.randomUUID() : `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    username: userData.username,
    email: userData.email,
    password_hash: hashPassword(userData.password),
    role: userData.role || 'artist',
    status: userData.status || 'pending', // Pending admin approval
    fullName: userData.fullName,
    category: userData.category || 'Drawing',
    bio: userData.bio || '',
    profilePicture: userData.profilePicture || '/default-profile.png',
    verificationCode: userData.verificationCode || null,
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  await writeDb(db);
  return newUser;
}

export async function verifyUserEmail(email, code) {
  const db = await readDb();
  const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) return { success: false, error: 'User not found' };
  
  if (user.status !== 'email_unverified') {
    return { success: false, error: 'Email is already verified' };
  }
  
  if (user.verificationCode !== code) {
    return { success: false, error: 'Invalid verification code' };
  }
  
  user.status = 'pending'; // Awaiting admin approval
  user.verificationCode = null; // Clear verification code
  await writeDb(db);
  return { success: true };
}

export async function updateUserStatus(userId, status) {
  const db = await readDb();
  const user = db.users.find(u => u.id === userId);
  if (!user) return false;
  user.status = status; // 'approved' | 'declined' | 'pending'
  await writeDb(db);
  return true;
}

export async function updateUserProfile(userId, profileData) {
  const db = await readDb();
  const user = db.users.find(u => u.id === userId);
  if (!user) return false;

  if (profileData.fullName !== undefined) {
    user.fullName = profileData.fullName;
    db.artworks.forEach(art => {
      if (art.userId === userId) art.artistName = profileData.fullName;
    });
  }
  if (profileData.category !== undefined) user.category = profileData.category;
  if (profileData.bio !== undefined) user.bio = profileData.bio;
  
  if (profileData.profilePicture !== undefined) {
    user.profilePicture = profileData.profilePicture;
    db.artworks.forEach(art => {
      if (art.userId === userId) art.artistAvatar = profileData.profilePicture;
    });
  }

  await writeDb(db);
  return user;
}

// --- ARTWORK OPERATIONS ---

export async function getAllArtworks() {
  const db = await readDb();
  return db.artworks;
}

export async function getArtworkById(id) {
  const artworks = await getAllArtworks();
  return artworks.find(art => art.id === id) || null;
}

export async function createArtwork(artworkData) {
  const db = await readDb();
  const newArtwork = {
    id: crypto.randomUUID ? crypto.randomUUID() : `art-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    userId: artworkData.userId,
    artistName: artworkData.artistName,
    artistAvatar: artworkData.artistAvatar || '/default-profile.png',
    title: artworkData.title,
    description: artworkData.description || '',
    category: artworkData.category || 'Painting',
    imagePath: artworkData.imagePath,
    price: artworkData.price ? Number(artworkData.price) : null,
    createdAt: new Date().toISOString(),
    likes: 0,
    likedBy: [] // Array of userIds who liked this artwork
  };

  db.artworks.push(newArtwork);
  await writeDb(db);
  return newArtwork;
}

export async function deleteArtwork(artworkId, userId, userRole) {
  const db = await readDb();
  const artworkIndex = db.artworks.findIndex(art => art.id === artworkId);
  if (artworkIndex === -1) return false;

  const artwork = db.artworks[artworkIndex];
  // Verify ownership or admin privileges
  if (artwork.userId !== userId && userRole !== 'admin') {
    return false;
  }

  // Delete local file if it exists and is stored in upload folder
  if (artwork.imagePath && artwork.imagePath.startsWith('/uploads/')) {
    try {
      const fs = require('fs');
      const path = require('path');
      const absolutePath = path.join(process.cwd(), 'public', artwork.imagePath);
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
      }
    } catch (e) {
      console.error('Failed to delete artwork file:', e.message);
    }
  }

  db.artworks.splice(artworkIndex, 1);
  await writeDb(db);
  return true;
}

export async function toggleLikeArtwork(artworkId, userId) {
  const db = await readDb();
  const artwork = db.artworks.find(art => art.id === artworkId);
  if (!artwork) return null;

  if (!artwork.likedBy) {
    artwork.likedBy = [];
  }

  const likedIndex = artwork.likedBy.indexOf(userId);
  if (likedIndex === -1) {
    artwork.likedBy.push(userId);
  } else {
    artwork.likedBy.splice(likedIndex, 1);
  }

  artwork.likes = artwork.likedBy.length;
  await writeDb(db);
  return { likes: artwork.likes, isLiked: likedIndex === -1 };
}
