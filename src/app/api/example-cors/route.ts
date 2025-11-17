/**
 * Example API Route with CORS Support
 * 
 * Demonstrates how to use the CORS utilities in API routes.
 * 
 * IMPORTANT: This is an example file for reference only.
 * You can safely delete this file once you understand how to use CORS utilities.
 * 
 * For production API routes, import and use:
 * - `withCors()` to apply CORS headers to responses
 * - `getCorsHeaders()` to get CORS headers for manual application
 * - `isOriginAllowed()` to check if an origin is allowed
 * 
 * See docs/SECURITY.md for detailed documentation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withCors } from '@/lib/cors';

export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  
  const response = NextResponse.json({
    message: 'CORS-enabled API route',
    timestamp: new Date().toISOString(),
  });

  // Apply CORS headers
  return withCors(response, origin);
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  
  try {
    const body = await request.json();
    
    const response = NextResponse.json({
      message: 'Data received',
      data: body,
    });

    return withCors(response, origin);
  } catch (error) {
    const response = NextResponse.json(
      { error: 'Invalid JSON' },
      { status: 400 }
    );

    return withCors(response, origin);
  }
}

// OPTIONS is handled by the proxy, but you can also handle it here
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  
  const response = new NextResponse(null, { status: 204 });
  
  return withCors(response, origin);
}
