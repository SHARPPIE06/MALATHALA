import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { toggleLikeArtwork } from '@/lib/db';

export async function POST(request) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'You must be logged in to like artworks.' }, { status: 401 });
    }

    const { artworkId } = await request.json();
    if (!artworkId) {
      return NextResponse.json({ error: 'Artwork ID is required' }, { status: 400 });
    }

    const result = await toggleLikeArtwork(artworkId, session.userId);
    if (!result) {
      return NextResponse.json({ error: 'Artwork not found' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Like artwork API error:', error);
    return NextResponse.json({ error: 'Failed to update like status' }, { status: 500 });
  }
}
