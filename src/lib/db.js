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

// Supabase helpers to get and set the single-object store
async function getFromSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  try {
    const cleanUrl = url.replace(/\/$/, '');
    const res = await fetch(`${cleanUrl}/rest/v1/malathala_store?key=eq.db&select=value`, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      },
      cache: 'no-store'
    });
    if (!res.ok) {
      if (res.status === 404) {
        console.warn('Supabase: "malathala_store" table not found. Please create it in your Supabase SQL editor.');
      }
      return null;
    }
    const data = await res.json();
    return data[0]?.value || null;
  } catch (err) {
    console.error('Supabase read error:', err.message);
    return null;
  }
}

async function setInSupabase(data) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return false;

  try {
    const cleanUrl = url.replace(/\/$/, '');
    const res = await fetch(`${cleanUrl}/rest/v1/malathala_store`, {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({ key: 'db', value: data })
    });
    if (!res.ok) {
      // Attempt upsert fallback
      const upsertRes = await fetch(`${cleanUrl}/rest/v1/malathala_store`, {
        method: 'POST',
        headers: {
          'apikey': key,
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
          'Prefer': 'upsert'
        },
        body: JSON.stringify({ key: 'db', value: data })
      });
      return upsertRes.ok;
    }
    return true;
  } catch (err) {
    console.error('Supabase write error:', err.message);
    return false;
  }
}

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
      profilePicture: '/logo.png',
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
    },
    {
      id: 'art-uuid-sculpture-1',
      userId: 'artist-uuid-regine-santos',
      artistName: 'Regine Santos',
      artistAvatar: '/uploads/profiles/artist-avatar-1.png',
      title: 'Form and Flow',
      description: 'A hand-carved mahogany sculpture capturing fluid abstract human silhouettes, reflecting human connections and family unity.',
      category: 'Sculpture',
      imagePath: '/uploads/artworks/seeding-sculpture-1.png',
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      likes: 3,
      likedBy: ['admin-uuid-0000-0000', 'artist-uuid-karl-mendoza'],
      price: 32000
    },
    {
      id: 'art-uuid-digital-1',
      userId: 'artist-uuid-karl-mendoza',
      artistName: 'Karl Mendoza',
      artistAvatar: '/uploads/profiles/artist-avatar-2.png',
      title: 'Neon Oasis',
      description: 'A futuristic digital painting exploring the intersection of cybernetic structures and bioluminescent nature.',
      category: 'Digital Arts',
      imagePath: '/uploads/artworks/seeding-digital-1.png',
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      likes: 4,
      likedBy: ['admin-uuid-0000-0000', 'artist-uuid-regine-santos'],
      price: 9500
    }
  ]
};

// Initialize database with pre-seeded data
export async function initDb() {
  // 1. Try Supabase Init
  if (process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)) {
    try {
      const data = await getFromSupabase();
      if (!data || !data.users || !Array.isArray(data.users) || !data.artworks || !Array.isArray(data.artworks)) {
        await setInSupabase(defaultDb);
        console.log('Database initialized in Supabase with seed data.');
      } else {
        // Enforce presence of admin & seed data
        let modified = false;
        if (!data.users.find(u => u.username === 'admin')) {
          data.users.push(defaultDb.users[0]);
          modified = true;
        }
        if (!data.users.find(u => u.username === 'regine')) {
          data.users.push(defaultDb.users[1]);
          modified = true;
        }
        if (!data.users.find(u => u.username === 'karl')) {
          data.users.push(defaultDb.users[2]);
          modified = true;
        }
        
        defaultDb.artworks.forEach(seedArt => {
          if (!data.artworks.some(art => art.id === seedArt.id)) {
            data.artworks.push(seedArt);
            modified = true;
          }
        });

        if (modified) {
          await setInSupabase(data);
          console.log('Seed users/artworks validated and merged into existing Supabase.');
        }
      }
      return;
    } catch (err) {
      console.error('Failed to initialize database on Supabase:', err.message);
    }
  }

  // 2. Try Vercel KV Init
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    try {
      const { kv } = require('@vercel/kv');
      const data = await kv.get('malathala_db');
      if (!data || !data.users || !Array.isArray(data.users) || !data.artworks || !Array.isArray(data.artworks)) {
        await kv.set('malathala_db', defaultDb);
        console.log('Database initialized in Vercel KV with seed data.');
      } else {
        let modified = false;
        if (!data.users.find(u => u.username === 'admin')) {
          data.users.push(defaultDb.users[0]);
          modified = true;
        }
        if (!data.users.find(u => u.username === 'regine')) {
          data.users.push(defaultDb.users[1]);
          modified = true;
        }
        if (!data.users.find(u => u.username === 'karl')) {
          data.users.push(defaultDb.users[2]);
          modified = true;
        }
        
        defaultDb.artworks.forEach(seedArt => {
          if (!data.artworks.some(art => art.id === seedArt.id)) {
            data.artworks.push(seedArt);
            modified = true;
          }
        });

        if (modified) {
          await kv.set('malathala_db', data);
        }
      }
      return;
    } catch (err) {
      console.error('Failed to initialize KV database:', err.message);
    }
  }

  // 3. Fallback to Local Files Init
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  let data;
  try {
    if (!fs.existsSync(DB_PATH)) {
      fs.writeFileSync(DB_PATH, JSON.stringify(defaultDb, null, 2), 'utf8');
      data = defaultDb;
      console.log('Database initialized with local files and seed data.');
    } else {
      const content = fs.readFileSync(DB_PATH, 'utf8');
      data = JSON.parse(content);
      if (!data || !data.users || !Array.isArray(data.users) || !data.artworks || !Array.isArray(data.artworks)) {
        fs.writeFileSync(DB_PATH, JSON.stringify(defaultDb, null, 2), 'utf8');
        data = defaultDb;
      }
    }
  } catch (err) {
    fs.writeFileSync(DB_PATH, JSON.stringify(defaultDb, null, 2), 'utf8');
    data = defaultDb;
  }

  let modified = false;
  if (!data.users.find(u => u.username === 'admin')) {
    data.users.push(defaultDb.users[0]);
    modified = true;
  }
  if (!data.users.find(u => u.username === 'regine')) {
    data.users.push(defaultDb.users[1]);
    modified = true;
  }
  if (!data.users.find(u => u.username === 'karl')) {
    data.users.push(defaultDb.users[2]);
    modified = true;
  }
  
  defaultDb.artworks.forEach(seedArt => {
    if (!data.artworks.some(art => art.id === seedArt.id)) {
      data.artworks.push(seedArt);
      modified = true;
    }
  });

  if (modified) {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    console.log('Seed users/artworks validated and merged into existing local database.');
  }
}

// Read database
async function readDb() {
  await initDb();

  // 1. Try Supabase
  if (process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)) {
    const data = await getFromSupabase();
    if (data && data.users && Array.isArray(data.users) && data.artworks && Array.isArray(data.artworks)) {
      return data;
    }
  }

  // 2. Try Vercel KV
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    try {
      const { kv } = require('@vercel/kv');
      const data = await kv.get('malathala_db');
      if (data && data.users && Array.isArray(data.users) && data.artworks && Array.isArray(data.artworks)) {
        return data;
      }
    } catch (err) {
      console.error('Failed to read from KV:', err.message);
    }
  }

  // 3. Fallback to Local Files
  try {
    const content = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    console.error('Error reading database file, returning empty schema:', err.message);
    return { users: [], artworks: [] };
  }
}

// Write database safely via queue / remote sync
async function writeDb(data) {
  // 1. Try Supabase
  if (process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)) {
    const success = await setInSupabase(data);
    if (success) return;
  }

  // 2. Try Vercel KV
  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    try {
      const { kv } = require('@vercel/kv');
      await kv.set('malathala_db', data);
      return;
    } catch (err) {
      console.error('Failed to write to KV:', err.message);
    }
  }

  // 3. Fallback to Local Files
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

export async function updateUserRole(userId, role) {
  const db = await readDb();
  const user = db.users.find(u => u.id === userId);
  if (!user) return false;
  user.role = role; // 'admin' | 'artist'
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
