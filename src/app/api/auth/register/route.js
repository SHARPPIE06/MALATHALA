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

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Create user with 'email_unverified' status
    const newUser = await createUser({
      username,
      email,
      password,
      fullName,
      category,
      bio,
      profilePicture: profilePictureUrl,
      role: 'artist',
      status: 'email_unverified',
      verificationCode
    });

    // Send verification email
    const emailSent = await sendVerificationEmail(email, verificationCode, fullName);

    // Exclude password hash and verification code from response
    const { password_hash, verificationCode: _, ...userResponse } = newUser;

    const responseData = { 
      message: 'Registration initiated! Please verify your email with the 6-digit code sent to you.', 
      user: userResponse 
    };

    if (!emailSent) {
      responseData.debugCode = verificationCode;
    }

    return NextResponse.json(responseData, { status: 201 });

  } catch (error) {
    console.error('Registration API error:', error);
    return NextResponse.json(
      { error: 'An error occurred during registration. Please try again.' },
      { status: 500 }
    );
  }
}
