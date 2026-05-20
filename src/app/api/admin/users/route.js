import { NextResponse } from 'next/server';
import { getSession, setSessionCookie } from '@/lib/auth';
import { getAllUsers, updateUserStatus, getUserById } from '@/lib/db';

// GET all users (admin only)
export async function GET(request) {
  try {
    const session = getSession(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const users = await getAllUsers();
    // Exclude password hashes
    const sanitizedUsers = users.map(({ password_hash, ...user }) => user);

    return NextResponse.json({ users: sanitizedUsers });
  } catch (error) {
    console.error('Admin GET users error:', error);
    return NextResponse.json({ error: 'Failed to retrieve users' }, { status: 500 });
  }
}

// POST update user status (admin only)
export async function POST(request) {
  try {
    const session = getSession(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const { userId, status } = await request.json();
    if (!userId || !status) {
      return NextResponse.json({ error: 'Missing userId or status' }, { status: 400 });
    }

    if (!['approved', 'declined', 'pending'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
    }

    // Admins cannot change their own status to decline or pending
    if (userId === session.userId && status !== 'approved') {
      return NextResponse.json({ error: 'Admins cannot change their own status' }, { status: 400 });
    }

    const updated = await updateUserStatus(userId, status);
    if (!updated) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const responsePayload = { message: `User account status updated to ${status} successfully!` };

    // If status is approved, automatically log in as this user on the browser session
    if (status === 'approved') {
      const user = await getUserById(userId);
      if (user) {
        const sessionPayload = {
          userId: user.id,
          username: user.username,
          role: user.role,
          fullName: user.fullName,
          profilePicture: user.profilePicture
        };
        responsePayload.autoLogin = true;
        responsePayload.user = sessionPayload;
        
        const response = NextResponse.json(responsePayload);
        setSessionCookie(response, sessionPayload);
        return response;
      }
    }

    return NextResponse.json(responsePayload);
  } catch (error) {
    console.error('Admin POST user status error:', error);
    return NextResponse.json({ error: 'Failed to update user status' }, { status: 500 });
  }
}
