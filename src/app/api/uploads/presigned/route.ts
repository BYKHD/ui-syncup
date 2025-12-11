import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/server/auth/session';
import { generateUploadUrl, getPublicUrl } from '@/lib/storage';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Validate body
    const { fileName, contentType, issueId } = await request.json();
    if (!fileName || !contentType || !issueId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 3. Generate key and URL
    // Structure: {issueId}/attachments/{uuid}.{extension}
    // Note: Only UUID + extension in key for security/privacy. Original filename is stored in DB.
    const extension = fileName.includes('.') ? fileName.split('.').pop() : '';
    const key = `${issueId}/attachments/${uuidv4()}${extension ? `.${extension}` : ''}`;
    const uploadUrl = await generateUploadUrl('attachments', key, contentType);
    const publicUrl = getPublicUrl('attachments', key);

    return NextResponse.json({ uploadUrl, publicUrl, key });
  } catch (error) {
    console.error('Presigned URL error:', error);
    return NextResponse.json(
      { error: 'Failed to generate upload URL' },
      { status: 500 }
    );
  }
}
