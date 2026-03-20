import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * Fetch instance setup status from the API.
 * Called from the Edge runtime via fetch() against the API route.
 *
 * @param request - The incoming request (used to construct the API URL)
 * @returns The setup status or null if the check failed
 */
export async function getSetupStatus(
  request: NextRequest
): Promise<{ isSetupComplete: boolean } | null> {
  try {
    const url = new URL('/api/setup/status', request.nextUrl.origin);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      logger.warn(`Setup status check failed with status ${response.status}`);
      return null;
    }

    const data = await response.json();
    return { isSetupComplete: data.isSetupComplete ?? false };
  } catch (error) {
    logger.error('Failed to check setup status', { error });
    return null;
  }
}
