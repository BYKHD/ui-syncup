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
      const body = new FormData();
      body.append('file', file);
      body.append('type', type);
      body.append('entityId', entityId);

      const res = await fetch('/api/uploads/media', { method: 'POST', body });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload failed');
      }

      const { key } = await res.json();
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
