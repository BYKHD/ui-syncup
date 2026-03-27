/**
 * Media upload endpoint
 *
 * For uploading avatars and team images to storage.
 * Files are uploaded server-side to S3 — no CORS configuration required.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/server/auth/session';
import { uploadFile, buildKey, deleteFile, invalidateMediaUrl } from '@/lib/storage';
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

    // 2. Parse FormData
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as MediaType | null;
    const entityId = formData.get('entityId') as string | null;

    if (!file || !type || !entityId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 3. Validate media type
    if (!['avatar', 'team'].includes(type)) {
      return NextResponse.json({ error: 'Invalid media type' }, { status: 400 });
    }

    // 4. Validate content type
    if (!ALLOWED_MEDIA_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid content type. Allowed: JPEG, PNG, WebP, GIF' },
        { status: 400 }
      );
    }

    // 5. Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum size is 2MB' }, { status: 400 });
    }

    // 6. Build key: media/avatars/{userId}/{uuid}.{ext} or media/teams/{teamId}/{uuid}.{ext}
    const ext = file.name.split('.').pop() || 'jpg';
    const folder = type === 'avatar' ? 'avatars' : 'teams';
    const key = buildKey('media', `${folder}/${entityId}/${uuidv4()}.${ext}`);

    // 7. Upload to S3 server-side
    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadFile(key, buffer, file.type);

    return NextResponse.json({ key });
  } catch (error) {
    console.error('Media upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { key, type, entityId } = body;

    if (!key || typeof key !== 'string') {
      return NextResponse.json({ error: "Missing or invalid 'key'" }, { status: 400 });
    }

    // Security check: ensure user has access to the entity they are modifying
    if (type === 'team') {
      if (!key.includes(`teams/${entityId}`)) {
        return NextResponse.json({ error: 'Invalid key for this entity' }, { status: 403 });
      }
    } else if (type === 'avatar') {
      if (entityId !== session.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
    }

    await deleteFile(key);
    invalidateMediaUrl(key);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting media:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
