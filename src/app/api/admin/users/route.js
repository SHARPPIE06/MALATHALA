import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAllUsers, updateUserStatus } from '@/lib/db';

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

    return NextResponse.json({ message: `User account status updated to ${status} successfully!` });
  } catch (error) {
    console.error('Admin POST user status error:', error);
    return NextResponse.json({ error: 'Failed to update user status' }, { status: 500 });
  }
}
