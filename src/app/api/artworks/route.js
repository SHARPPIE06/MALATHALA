import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getAllArtworks, createArtwork, deleteArtwork, getUserById } from '@/lib/db';
import { saveUploadedFile } from '@/lib/upload';

// GET all artworks
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const artistId = searchParams.get('artistId');
    const search = searchParams.get('search')?.toLowerCase();

    let artworks = getAllArtworks();

    // Filter by artist
    if (artistId) {
      artworks = artworks.filter(art => art.userId === artistId);
    }

    // Filter by category (case-insensitive)
    if (category && category !== 'all' && category !== 'All') {
      artworks = artworks.filter(art => art.category.toLowerCase() === category.toLowerCase());
    }

    // Filter by search query (title or artist name)
    if (search) {
      artworks = artworks.filter(
        art =>
          art.title.toLowerCase().includes(search) ||
          art.artistName.toLowerCase().includes(search) ||
          (art.description && art.description.toLowerCase().includes(search))
      );
    }

    // Sort by newest first
    artworks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return NextResponse.json({ artworks });
  } catch (error) {
    console.error('Get artworks API error:', error);
    return NextResponse.json({ error: 'Failed to fetch artworks' }, { status: 500 });
  }
}

// POST upload new artwork
export async function POST(request) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user exists and is approved (admins can also upload if they want, but usually artists)
    const user = getUserById(session.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    if (user.role !== 'admin' && user.status !== 'approved') {
      return NextResponse.json({ error: 'Your account is not approved to upload artworks.' }, { status: 403 });
    }

    const formData = await request.formData();
    const title = formData.get('title')?.toString().trim();
    const description = formData.get('description')?.toString().trim() || '';
    const category = formData.get('category')?.toString().trim();
    const artworkImageFile = formData.get('image');

    if (!title || !category || !artworkImageFile || artworkImageFile.size === 0) {
      return NextResponse.json({ error: 'Title, category, and artwork image are required' }, { status: 400 });
    }

    // Save artwork image file
    let imagePath = '';
    try {
      imagePath = await saveUploadedFile(artworkImageFile, 'artworks');
    } catch (err) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    const priceRaw = formData.get('price');
    const price = priceRaw ? priceRaw.toString().trim() : '';

    // Create artwork in DB
    const newArtwork = await createArtwork({
      userId: session.userId,
      artistName: user.fullName,
      artistAvatar: user.profilePicture,
      title,
      description,
      category,
      imagePath,
      price: price ? parseFloat(price) : null
    });

    return NextResponse.json(
      { message: 'Artwork uploaded successfully!', artwork: newArtwork },
      { status: 201 }
    );

  } catch (error) {
    console.error('Post artwork API error:', error);
    return NextResponse.json({ error: 'Failed to upload artwork' }, { status: 500 });
  }
}

// DELETE artwork
export async function DELETE(request) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const artworkId = searchParams.get('id');

    if (!artworkId) {
      return NextResponse.json({ error: 'Artwork ID is required' }, { status: 400 });
    }

    const deleted = await deleteArtwork(artworkId, session.userId, session.role);
    if (!deleted) {
      return NextResponse.json(
        { error: 'Artwork not found or you do not have permission to delete it.' },
        { status: 403 }
      );
    }

    return NextResponse.json({ message: 'Artwork deleted successfully!' });
  } catch (error) {
    console.error('Delete artwork API error:', error);
    return NextResponse.json({ error: 'Failed to delete artwork' }, { status: 500 });
  }
}
