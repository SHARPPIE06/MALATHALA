import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserById, updateUserProfile } from '@/lib/db';
import { saveUploadedFile } from '@/lib/upload';
import fs from 'fs';
import path from 'path';

// Get profile details
export async function GET(request) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = getUserById(session.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 444 });
    }

    const { password_hash, ...userResponse } = user;
    return NextResponse.json({ user: userResponse });
  } catch (error) {
    console.error('Get profile API error:', error);
    return NextResponse.json({ error: 'Failed to retrieve profile data' }, { status: 500 });
  }
}

// Update profile details
export async function POST(request) {
  try {
    const session = getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = getUserById(session.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 444 });
    }

    const formData = await request.formData();
    const fullName = formData.get('fullName')?.toString().trim();
    const category = formData.get('category')?.toString().trim();
    const bio = formData.get('bio')?.toString().trim();
    const profilePictureFile = formData.get('profilePicture');

    const updateData = {};
    if (fullName !== undefined && fullName !== '') updateData.fullName = fullName;
    if (category !== undefined && category !== '') updateData.category = category;
    if (bio !== undefined) updateData.bio = bio;

    // Handle profile picture file upload
    if (profilePictureFile && profilePictureFile.size > 0) {
      try {
        const profilePictureUrl = await saveUploadedFile(profilePictureFile, 'profiles');
        updateData.profilePicture = profilePictureUrl;

        // Delete old profile picture if it exists and is not the default logo/placeholder
        if (
          user.profilePicture &&
          user.profilePicture.startsWith('/uploads/') &&
          user.profilePicture !== profilePictureUrl
        ) {
          try {
            const oldPath = path.join(process.cwd(), 'public', user.profilePicture);
            if (fs.existsSync(oldPath)) {
              fs.unlinkSync(oldPath);
            }
          } catch (e) {
            console.error('Error deleting old profile picture file:', e.message);
          }
        }
      } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
    }

    const updatedUser = await updateUserProfile(session.userId, updateData);
    const { password_hash, ...userResponse } = updatedUser;

    return NextResponse.json({
      message: 'Profile updated successfully!',
      user: userResponse
    });

  } catch (error) {
    console.error('Update profile API error:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
