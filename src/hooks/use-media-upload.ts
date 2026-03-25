import { useState } from 'react';
import { toast } from 'sonner';

type MediaType = 'avatar' | 'team';

interface UploadMediaOptions {
  file: File;
  type: MediaType;
  entityId: string;
}

interface UseMediaUploadResult {
  upload: (options: UploadMediaOptions) => Promise<string | null>;
  deleteImage: (key: string, type: 'avatar' | 'team', entityId: string) => Promise<boolean>;
  isUploading: boolean;
  error: Error | null;
}

export function useMediaUpload(): UseMediaUploadResult {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const upload = async ({ file, type, entityId }: UploadMediaOptions): Promise<string | null> => {
    setIsUploading(true);
    setError(null);

    try {
      // 1. Get presigned upload URL and storage key
      const res = await fetch('/api/uploads/media', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
          type,
          entityId,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to get upload URL');
      }

      const { uploadUrl, key } = await res.json();

      // 2. Upload file directly to storage via presigned URL
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload image to storage');
      }

      // Return the proxy URL — /api/media/[...key] resolves to a presigned or
      // public URL and is safe to use as an <img src> in any component
      return `/api/media/${key}`;
    } catch (err) {
      const e = err instanceof Error ? err : new Error('Unknown upload error');
      console.error('Media upload error:', e);
      setError(e);
      toast.error(e.message);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const deleteImage = async (key: string, type: 'avatar' | 'team', entityId: string) => {
    try {
      const response = await fetch('/api/uploads/media', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, type, entityId }),
      });

      if (!response.ok) {
        throw new Error(`Failed to delete image: ${response.statusText}`);
      }
      return true;
    } catch (err) {
      console.error('Delete image error:', err);
      return false;
    }
  };

  return { upload, deleteImage, isUploading, error };
}
