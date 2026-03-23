/**
 * Presigned download URL endpoint
 *
 * GET /api/uploads/presigned/download?key=<key>&bucket=<attachments|media>
 *
 * Returns a time-limited presigned GET URL so the browser can fetch a private
 * S3 object without the bucket needing public-read access.
 *
 * This is required when "Block Public Access" is enabled on the bucket
 * (the default for Lightsail and recommended for AWS S3).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/server/auth/session';
import { generateDownloadUrl } from '@/lib/storage';
import type { StorageBucket } from '@/lib/storage';

export async function GET(request: NextRequest) {
  try {
    // Require an authenticated session for all presigned downloads.
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const key = searchParams.get('key');
    const bucketParam = searchParams.get('bucket') ?? 'attachments';

    if (!key) {
      return NextResponse.json({ error: 'Missing required parameter: key' }, { status: 400 });
    }

    if (!['attachments', 'media'].includes(bucketParam)) {
      return NextResponse.json(
        { error: 'Invalid bucket. Must be "attachments" or "media"' },
        { status: 400 }
      );
    }

    const url = await generateDownloadUrl(bucketParam as StorageBucket, key);

    // Cache-Control: private so CDNs don't cache the signed URL, but allow the
    // browser to reuse it within its validity window (1 hour).
    return NextResponse.json({ url }, {
      status: 200,
      headers: { 'Cache-Control': 'private, max-age=3600' },
    });
  } catch (error) {
    console.error('Presigned download URL error:', error);
    return NextResponse.json(
      { error: 'Failed to generate download URL' },
      { status: 500 }
    );
  }
}
