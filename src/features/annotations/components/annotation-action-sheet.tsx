'use client';

import { Edit3, Trash2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

export interface AnnotationActionSheetProps {
  /**
   * Whether the sheet is open
   */
  open: boolean;

  /**
   * Callback when open state changes
   */
  onOpenChange: (open: boolean) => void;

  /**
   * Annotation label to display in header
   */
  annotationLabel: string;

  /**
   * Callback when edit is selected
   */
  onEdit: () => void;

  /**
   * Callback when delete is selected
   */
  onDelete: () => void;

  /**
   * Optional: Disable edit action
   */
  disableEdit?: boolean;

  /**
   * Optional: Disable delete action
   */
  disableDelete?: boolean;
}

/**
 * Mobile action sheet for annotation edit/delete actions.
 *
 * Designed for mobile long-press interactions. On desktop, use
 * AnnotationContextMenu instead.
 *
 * Features:
 * - Edit annotation description
 * - Delete annotation
 * - Large touch targets (min 44px)
 * - Swipe down to dismiss
 * - Backdrop tap to close
 *
 * @example
 * ```tsx
 * const [sheetOpen, setSheetOpen] = useState(false);
 *
 * const longPress = useLongPress({
 *   onLongPress: () => setSheetOpen(true),
 * });
 *
 * <AnnotationActionSheet
 *   open={sheetOpen}
 *   onOpenChange={setSheetOpen}
 *   annotationLabel="1"
 *   onEdit={() => showEditDialog()}
 *   onDelete={() => deleteAnnotation()}
 * />
 * ```
 */
export function AnnotationActionSheet({
  open,
  onOpenChange,
  annotationLabel,
  onEdit,
  onDelete,
  disableEdit = false,
  disableDelete = false,
}: AnnotationActionSheetProps) {
  const handleEdit = () => {
    onEdit();
    onOpenChange(false);
  };

  const handleDelete = () => {
    onDelete();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="px-4 pb-6">
        <SheetHeader>
          <SheetTitle className="text-left">
            Annotation {annotationLabel}
          </SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-2 pt-4">
          {/* Edit Button */}
          <Button
            variant="outline"
            size="lg"
            onClick={handleEdit}
            disabled={disableEdit}
            className="h-14 w-full justify-start gap-3 text-base"
          >
            <Edit3 className="h-5 w-5" />
            <span>Edit annotation</span>
          </Button>

          {/* Delete Button */}
          <Button
            variant="destructive"
            size="lg"
            onClick={handleDelete}
            disabled={disableDelete}
            className="h-14 w-full justify-start gap-3 text-base"
          >
            <Trash2 className="h-5 w-5" />
            <span>Delete annotation</span>
          </Button>
        </div>

        {/* Hint */}
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Swipe down or tap outside to dismiss
        </p>
      </SheetContent>
    </Sheet>
  );
}
