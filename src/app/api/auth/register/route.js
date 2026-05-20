import { NextResponse } from 'next/server';
import { getUserByUsername, getUserByEmail, createUser } from '@/lib/db';
import { saveUploadedFile } from '@/lib/upload';
import { sendVerificationEmail } from '@/lib/email';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const username = formData.get('username')?.toString().trim();
    const email = formData.get('email')?.toString().trim();
    const password = formData.get('password')?.toString();
    const fullName = formData.get('fullName')?.toString().trim();
    const category = formData.get('category')?.toString().trim();
    const bio = formData.get('bio')?.toString().trim() || '';
    const profilePictureFile = formData.get('profilePicture');

    // Validation
    if (!username || !email || !password || !fullName || !category) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (username.length < 3 || username.length > 20) {
      return NextResponse.json(
        { error: 'Username must be between 3 and 20 characters' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Check availability
    const existingUser = await getUserByUsername(username);
    if (existingUser) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 409 }
      );
    }

    const existingEmail = await getUserByEmail(email);
    if (existingEmail) {
      return NextResponse.json(
        { error: 'Email is already registered' },
        { status: 409 }
      );
    }

    // Save profile picture
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
      status: 'pending'
    });

    // Exclude password hash from response
    const { password_hash, ...userResponse } = newUser;

    const responsePayload = { 
      message: 'Registration successful! Your application is now pending administrator approval.', 
      user: userResponse 
    };

    const response = NextResponse.json(responsePayload, { status: 201 });

    // Set pending session cookie immediately so they can poll for approval
    const { setPendingSessionCookie } = require('@/lib/auth');
    setPendingSessionCookie(response, {
      userId: newUser.id,
      username: newUser.username,
      role: newUser.role,
      fullName: newUser.fullName,
      profilePicture: newUser.profilePicture
    });

    return response;

  } catch (error) {
    console.error('Registration API error:', error);
    return NextResponse.json(
      { error: 'An error occurred during registration. Please try again.' },
      { status: 500 }
    );
  }
}
