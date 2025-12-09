import { apiClient } from '@/lib/api-client';
import type { AttachmentReviewVariant, IssueAttachment } from '../types';

export interface UploadAttachmentParams {
  issueId: string;
  file: File;
  reviewVariant?: AttachmentReviewVariant;
  width?: number;
  height?: number;
}

interface PresignedResponse {
  uploadUrl: string;
  key: string;
  publicUrl: string;
}

interface CreateAttachmentResponse {
  attachment: IssueAttachment;
}

export async function uploadAttachment(params: UploadAttachmentParams): Promise<IssueAttachment> {
  const { issueId, file, reviewVariant = 'as_is', width, height } = params;

  // 1. Get presigned URL from server
  const { uploadUrl, publicUrl } = await apiClient<PresignedResponse>('/api/uploads/presigned', {
    method: 'POST',
    body: { 
      fileName: file.name, 
      contentType: file.type,
      issueId 
    }
  });

  // 2. Upload file directly to S3/R2
  await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 
      'Content-Type': file.type 
    }
  });

  // 3. Create attachment record in database
  const { attachment } = await apiClient<CreateAttachmentResponse>(`/api/issues/${issueId}/attachments`, {
    method: 'POST',
    body: {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      url: publicUrl,
      width,
      height,
      reviewVariant
    }
  });

  return attachment;
}
