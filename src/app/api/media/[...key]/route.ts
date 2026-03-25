/**
 * Media proxy route
 *
 * GET /api/media/media/avatars/{userId}/{uuid}.jpg
 * GET /api/media/media/teams/{teamId}/{uuid}.jpg
 *
 * Returns a temporary redirect to either:
 *   - A server-cached presigned GET URL (when STORAGE_PUBLIC_ACCESS is unset or false)
 *   - The direct public URL (when STORAGE_PUBLIC_ACCESS=true)
 *
 * The response carries Cache-Control so browsers cache the redirect and avoid
 * hitting this route on every subsequent render of the same avatar/logo.
 *
 * No authentication is required — media objects (avatars, team logos) are
 * semi-public by nature and visible to all authenticated app users anyway.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMediaUrl, getPublicUrl } from '@/lib/storage';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  const { key } = await params;
  const storageKey = key.join('/');

  // Only serve keys under the 'media/' prefix — reject everything else
  if (!storageKey.startsWith('media/')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const isPublic = process.env.STORAGE_PUBLIC_ACCESS === 'true';

    if (isPublic) {
      const url = getPublicUrl(storageKey);
      const response = NextResponse.redirect(url, 307);
      // Public URLs don't expire — cache the redirect for 24h
      response.headers.set('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600');
      return response;
    }

    // Private mode: get a 24h presigned URL (served from server-side cache)
    const url = await getMediaUrl(storageKey);
    const response = NextResponse.redirect(url, 307);
    // Cache the redirect for 22h — matches the presigned URL cache TTL so the
    // browser's cached redirect never points to an expired presigned URL
    response.headers.set('Cache-Control', 'public, max-age=79200, stale-while-revalidate=3600');
    return response;
  } catch (error) {
    console.error('[media-proxy] Failed to resolve media URL:', storageKey, error);
    return NextResponse.json({ error: 'Failed to resolve media URL' }, { status: 500 });
  }
}
