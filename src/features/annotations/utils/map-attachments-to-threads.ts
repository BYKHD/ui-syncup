import type { AnnotationAuthor, AnnotationThread, AttachmentAnnotation } from '../types';

export interface AnnotatedAttachment<Author extends AnnotationAuthor = AnnotationAuthor> {
  id: string;
  fileName: string;
  reviewVariant?: string | null;
  thumbnailUrl?: string | null;
  url: string;
  annotations?: AttachmentAnnotation<Author>[];
}

/**
 * Normalizes attachments that contain annotations into annotation threads enriched
 * with metadata about the originating attachment. This keeps screens/pages agnostic
 * of the attachment shape as long as they implement this lightweight contract.
 */
export function mapAttachmentsToAnnotationThreads<Author extends AnnotationAuthor = AnnotationAuthor>(
  attachments: AnnotatedAttachment<Author>[],
): AnnotationThread<Author>[] {
  return attachments.flatMap((attachment) =>
    (attachment.annotations ?? []).map((annotation) => ({
      ...annotation,
      attachmentName: attachment.fileName,
      attachmentVariant: attachment.reviewVariant ?? null,
      attachmentPreview: attachment.thumbnailUrl ?? attachment.url ?? null,
    })),
  );
}
