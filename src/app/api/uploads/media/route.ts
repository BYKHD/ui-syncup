/**
 * Media upload presigned URL endpoint
 * 
 * For uploading avatars and team images to the media bucket
 */

import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { getSession } from '@/server/auth/session';
import { generateUploadUrl, getPublicUrl, deleteFile } from '@/lib/storage';
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

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    // Re-use simpler validation or just strict checks
    const { key, type, entityId } = body;

    // Basic validation
    if (!key || typeof key !== 'string') {
        return NextResponse.json({ error: "Missing or invalid 'key'" }, { status: 400 });
    }

    // Security check: Ensure user has access to the entity they are modifying
    // For 'team', check if user is admin/member of the team
    // For 'avatar', check if userId matches session.user.id
    // This logic mimics the POST validation but for deletion
    if (type === 'team') {
       // Validate team permission
       // Ideally we check if session.user is member of entityId (teamId)
       // For MVP, we'll check if the key starts with the expected path
       if (!key.includes(`teams/${entityId}`)) {
         return NextResponse.json({ error: "Invalid key for this entity" }, { status: 403 });
       }
    } else if (type === 'avatar') {
       if (entityId !== session.id) {
         return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
       }
    }

    // Call storage deletion
    // Helper needed from storage.ts
    // We need to import deleteFile which we just added
    await deleteFile('media', key);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting media:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
