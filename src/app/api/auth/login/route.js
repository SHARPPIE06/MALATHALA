import { NextResponse } from 'next/server';
import { getUserByUsername } from '@/lib/db';
import { verifyPassword, setSessionCookie, setPendingSessionCookie } from '@/lib/auth';

export async function POST(request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const user = await getUserByUsername(username);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Verify Password
    const isValid = verifyPassword(password, user.password_hash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Check account status
    if (user.role !== 'admin') {
      if (user.status === 'pending') {
        const sessionPayload = {
          userId: user.id,
          username: user.username,
          role: user.role,
          fullName: user.fullName,
          profilePicture: user.profilePicture
        };
        const response = NextResponse.json(
          { 
            error: 'Your account is pending administrator approval. Please wait for administrator review.',
            status: 'pending',
            username: user.username
          },
          { status: 403 }
        );
        setPendingSessionCookie(response, sessionPayload);
        return response;
      }
      
      if (user.status === 'declined') {
        return NextResponse.json(
          { error: 'Your registration request has been declined by the administrator. Contact support if you believe this is an error.' },
          { status: 403 }
        );
      }
    }

    // Setup session payload
    const sessionPayload = {
      userId: user.id,
      username: user.username,
      role: user.role,
      fullName: user.fullName,
      profilePicture: user.profilePicture
    };

    // Create response and set cookie
    const response = NextResponse.json({
      message: 'Login successful!',
      user: sessionPayload
    });

    setSessionCookie(response, sessionPayload);

    return response;

  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json(
      { error: 'An error occurred during login.' },
      { status: 500 }
    );
  }
}
