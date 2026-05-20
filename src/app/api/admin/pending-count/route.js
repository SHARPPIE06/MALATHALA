import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAllUsers } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const session = getSession(request);
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 });
    }

    const users = await getAllUsers();
    const pendingCount = users.filter(u => u.status === 'pending' && u.role === 'artist').length;

    return NextResponse.json({ count: pendingCount });
  } catch (error) {
    console.error('Pending count API error:', error);
    return NextResponse.json({ count: 0 }, { status: 500 });
  }
}
