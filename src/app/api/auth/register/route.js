import { NextResponse } from 'next/server';
import { createUser, getUserByUsername, getUserByEmail, isIpBanned } from '@/lib/db';
import { saveUploadedFile } from '@/lib/upload';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const username = formData.get('username')?.trim();
    const email = formData.get('email')?.trim();
    const password = formData.get('password');
    const fullName = formData.get('fullName')?.trim();
    const category = formData.get('category');
    const bio = formData.get('bio')?.trim() || '';
    const profilePictureFile = formData.get('profilePicture');

    if (!username || !email || !password || !fullName || !category) {
      return NextResponse.json(
        { error: 'All fields (username, email, password, fullName, category) are required' },
        { status: 400 }
      );
    }

    // Capture and check IP for ban list
    const ip = request.headers.get('x-forwarded-for') || request.ip || '127.0.0.1';
    const isBanned = await isIpBanned(ip);
    if (isBanned) {
      return NextResponse.json(
        { error: 'Registration is not permitted from your location.' },
        { status: 403 }
      );
    }

    // Validation checks
    if (username.length < 3) {
      return NextResponse.json({ error: 'Username must be at least 3 characters long.' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long.' }, { status: 400 });
    }

    // Check if username already exists
    const existingUserByUsername = await getUserByUsername(username);
    if (existingUserByUsername) {
      return NextResponse.json({ error: 'Username is already taken.' }, { status: 400 });
    }

    // Check if email already exists
    const existingUserByEmail = await getUserByEmail(email);
    if (existingUserByEmail) {
      return NextResponse.json({ error: 'Email address is already registered.' }, { status: 400 });
    }

    // Handle profile picture upload
    let profilePictureUrl = '/default-profile.png';
    if (profilePictureFile && profilePictureFile.size > 0) {
      try {
        profilePictureUrl = await saveUploadedFile(profilePictureFile, 'profiles');
      } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
    }

    // Create user with 'pending' status immediately
    const newUser = await createUser({
      username,
      email,
      password,
      fullName,
      category,
      bio,
      profilePicture: profilePictureUrl,
      role: 'artist',
      status: 'pending',
      ip_address: ip
    });

    // Exclude password hash from response
    const { password_hash, ...userResponse } = newUser;

    return NextResponse.json(
      { 
        message: 'Registration successful! Your application is now pending administrator approval.', 
        user: userResponse 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Registration API error:', error);
    return NextResponse.json(
      { error: 'An error occurred during registration. Please try again.' },
      { status: 500 }
    );
  }
}
