import { NextResponse } from 'next/server';
import { getSession, setSessionCookie } from '@/lib/auth';
import { getAllUsers, updateUserStatus, getUserById, updateUserRole } from '@/lib/db';

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

// POST update user status or role (admin only)
export async function POST(request) {
  try {
    const session = getSession(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 403 });
    }

    const { userId, status, role } = await request.json();
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    if (!status && !role) {
      return NextResponse.json({ error: 'Missing status or role to update' }, { status: 400 });
    }

    // Handle Role Update
    if (role) {
      if (!['admin', 'artist'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role value' }, { status: 400 });
      }
      // Admins cannot change their own role to non-admin
      if (userId === session.userId && role !== 'admin') {
        return NextResponse.json({ error: 'Admins cannot change their own role' }, { status: 400 });
      }
      const roleUpdated = await updateUserRole(userId, role);
      if (!roleUpdated) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
    }

    // Handle Status Update
    if (status) {
      if (!['approved', 'declined', 'pending'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status value' }, { status: 400 });
      }
      // Admins cannot change their own status to decline or pending
      if (userId === session.userId && status !== 'approved') {
        return NextResponse.json({ error: 'Admins cannot change their own status' }, { status: 400 });
      }
      const statusUpdated = await updateUserStatus(userId, status);
      if (!statusUpdated) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const responsePayload = { message: `User account status updated successfully!` };

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

      return responsePayload;
    }

    return NextResponse.json({ message: `User account updated successfully!` });
  } catch (error) {
    console.error('Admin POST user status/role error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
