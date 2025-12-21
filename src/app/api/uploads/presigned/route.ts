import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/server/auth/session';
import { generateUploadUrl, getPublicUrl } from '@/lib/storage';
import { db } from '@/lib/db';
import { issues } from '@/server/db/schema/issues';
import { eq } from 'drizzle-orm';
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

    // 3. Look up issue to get teamId and projectId for path structure
    const issue = await db.query.issues.findFirst({
      where: eq(issues.id, issueId),
      columns: { teamId: true, projectId: true },
    });

    if (!issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
    }

    // 4. Generate key with hierarchical path structure
    // Structure: issues/{teamId}/{projectId}/{issueId}/{uuid}.{ext}
    // Benefits: Easy to query/delete by team or project, supports storage quotas
    const extension = fileName.includes('.') ? fileName.split('.').pop() : '';
    const key = `issues/${issue.teamId}/${issue.projectId}/${issueId}/${uuidv4()}${extension ? `.${extension}` : ''}`;
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
