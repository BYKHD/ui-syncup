/**
 * Media upload presigned URL endpoint
 * 
 * For uploading avatars and team images to the media bucket
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/server/auth/session';
import { generateUploadUrl, getPublicUrl } from '@/lib/storage';
import { v4 as uuidv4 } from 'uuid';

type MediaType = 'avatar' | 'team';

const ALLOWED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Validate body
    const { fileName, contentType, type, entityId } = await request.json() as {
      fileName: string;
      contentType: string;
      type: MediaType;
      entityId: string;
    };

    if (!fileName || !contentType || !type || !entityId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 3. Validate media type
    if (!['avatar', 'team'].includes(type)) {
      return NextResponse.json({ error: 'Invalid media type' }, { status: 400 });
    }

    // 4. Validate content type
    if (!ALLOWED_MEDIA_TYPES.includes(contentType)) {
      return NextResponse.json(
        { error: 'Invalid content type. Allowed: JPEG, PNG, WebP, GIF' },
        { status: 400 }
      );
    }

    // 5. Generate key based on media type
    // Structure: avatars/{userId}/{uuid}.{ext} or teams/{teamId}/{uuid}.{ext}
    const ext = fileName.split('.').pop() || 'jpg';
    const folder = type === 'avatar' ? 'avatars' : 'teams';
    const key = `${folder}/${entityId}/${uuidv4()}.${ext}`;

    // 6. Generate presigned URL
    const uploadUrl = await generateUploadUrl('media', key, contentType);
    const publicUrl = getPublicUrl('media', key);

    return NextResponse.json({ uploadUrl, publicUrl, key, maxFileSize: MAX_FILE_SIZE });
  } catch (error) {
    console.error('Media presigned URL error:', error);
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}
