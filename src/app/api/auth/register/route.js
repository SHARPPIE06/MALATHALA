import { NextResponse } from 'next/server';
import { getUserByUsername, getUserByEmail, createUser } from '@/lib/db';
import { saveUploadedFile } from '@/lib/upload';

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

    // Create user with 'pending' status
    const newUser = await createUser({
      username,
      email,
      password,
      fullName,
      category,
      bio,
      profilePicture: profilePictureUrl,
      role: 'artist',
      status: 'pending' // Artist accounts must be approved by admin
    });

    // Exclude password hash from response
    const { password_hash, ...userResponse } = newUser;

    return NextResponse.json(
      { 
        message: 'Registration successful! Your account is pending administrator approval.', 
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
