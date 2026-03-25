import { apiClient } from '@/lib/api-client';
import type { AttachmentReviewVariant, IssueAttachment } from '../types';
import type { AttachmentAnnotation } from '@/features/annotations';

export interface UploadAttachmentParams {
  issueId: string;
  file: File;
  reviewVariant?: AttachmentReviewVariant;
  width?: number;
  height?: number;
  annotations?: AttachmentAnnotation[];
  onProgress?: (progress: number) => void;
}

interface PresignedResponse {
  uploadUrl: string;
  key: string;
}

interface CreateAttachmentResponse {
  attachment: IssueAttachment;
}

export async function uploadAttachment(params: UploadAttachmentParams): Promise<IssueAttachment> {
  const { issueId, file, reviewVariant = 'as_is', width, height, annotations, onProgress } = params;

  // 1. Get presigned upload URL and storage key from server
  const { uploadUrl, key } = await apiClient<PresignedResponse>('/api/uploads/presigned', {
    method: 'POST',
    body: {
      fileName: file.name,
      contentType: file.type,
      issueId
    }
  });

  // 2. Upload file directly to S3/storage using XHR for progress tracking
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type);

    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          onProgress(percentComplete);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('Upload failed due to network error'));
    xhr.send(file);
  });

  // 3. Create attachment record in database — store the storage key in the url field
  const { attachment } = await apiClient<CreateAttachmentResponse>(`/api/issues/${issueId}/attachments`, {
    method: 'POST',
    body: {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      url: key,
      width,
      height,
      reviewVariant,
      annotations
    }
  });

  return attachment;
}
