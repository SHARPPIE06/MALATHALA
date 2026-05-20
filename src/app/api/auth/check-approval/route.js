import { NextResponse } from 'next/server';
import { getUserById } from '@/lib/db';
import { getPendingSession, setSessionCookie, clearPendingSessionCookie } from '@/lib/auth';

export async function GET(request) {
  try {
    const pendingSession = getPendingSession(request);
    if (!pendingSession) {
      return NextResponse.json({ approved: false, error: 'No pending session found' }, { status: 401 });
    }

    const user = await getUserById(pendingSession.userId);
    if (!user) {
      const response = NextResponse.json({ approved: false, error: 'User not found' }, { status: 404 });
      clearPendingSessionCookie(response);
      return response;
    }

    if (user.status === 'approved') {
      const sessionPayload = {
        userId: user.id,
        username: user.username,
        role: user.role,
        fullName: user.fullName,
        profilePicture: user.profilePicture
      };

      const response = NextResponse.json({
        approved: true,
        message: 'Account approved! Upgrading session.',
        user: sessionPayload
      });

      // Clear the pending cookie, set the actual session cookie
      clearPendingSessionCookie(response);
      setSessionCookie(response, sessionPayload);
      return response;
    }

    if (user.status === 'declined') {
      const response = NextResponse.json({
        approved: false,
        status: 'declined',
        error: 'Your application request was declined.'
      });
      clearPendingSessionCookie(response);
      return response;
    }

    // Still pending
    return NextResponse.json({
      approved: false,
      status: 'pending'
    });

  } catch (error) {
    console.error('Check approval API error:', error);
    return NextResponse.json({ approved: false, error: 'An error occurred' }, { status: 500 });
  }
}
