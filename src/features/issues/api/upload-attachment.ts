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

interface CreateAttachmentResponse {
  attachment: IssueAttachment;
}

function xhrUpload(
  url: string,
  body: FormData,
  onProgress?: (progress: number) => void
): Promise<{ key: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);

    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress((event.loaded / event.total) * 100);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error('Upload failed due to network error'));
    xhr.send(body);
  });
}

export async function uploadAttachment(params: UploadAttachmentParams): Promise<IssueAttachment> {
  const { issueId, file, reviewVariant = 'as_is', width, height, annotations, onProgress } = params;

  // 1. Upload file to server (server uploads to S3)
  const formData = new FormData();
  formData.append('file', file);
  formData.append('issueId', issueId);

  const { key } = await xhrUpload('/api/uploads/attachment', formData, onProgress);

  // 2. Create attachment record in database
  const { attachment } = await apiClient<CreateAttachmentResponse>(
    `/api/issues/${issueId}/attachments`,
    {
      method: 'POST',
      body: {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        url: key,
        width,
        height,
        reviewVariant,
        annotations,
      },
    }
  );

  return attachment;
}
