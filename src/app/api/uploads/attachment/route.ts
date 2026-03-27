/**
 * Attachment upload endpoint
 *
 * For uploading issue attachments to storage.
 * Files are uploaded server-side to S3 — no CORS configuration required.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/server/auth/session';
import { uploadFile, buildKey } from '@/lib/storage';
import { db } from '@/lib/db';
import { issues } from '@/server/db/schema/issues';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

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
    const issueId = formData.get('issueId') as string | null;

    if (!file || !issueId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 3. Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum size is 10MB' }, { status: 400 });
    }

    // 4. Look up issue for teamId and projectId
    const issue = await db.query.issues.findFirst({
      where: eq(issues.id, issueId),
      columns: { teamId: true, projectId: true },
    });

    if (!issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }

    // 5. Build key: attachments/issues/{teamId}/{projectId}/{issueId}/{uuid}.{ext}
    const extension = file.name.includes('.') ? file.name.split('.').pop() : '';
    const relativePath = `issues/${issue.teamId}/${issue.projectId}/${issueId}/${uuidv4()}${extension ? `.${extension}` : ''}`;
    const key = buildKey('attachments', relativePath);

    // 6. Upload to S3 server-side
    const buffer = Buffer.from(await file.arrayBuffer());
    await uploadFile(key, buffer, file.type);

    return NextResponse.json({ key });
  } catch (error) {
    console.error('Attachment upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}
