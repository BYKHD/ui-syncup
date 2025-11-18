'use client';

import { useEffect } from 'react';
import { Edit3, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export interface AnnotationContextMenuProps {
  /**
   * Whether the menu is open
   */
  open: boolean;

  /**
   * Callback when open state changes
   */
  onOpenChange: (open: boolean) => void;

  /**
   * Position where the menu should appear (e.g., cursor position)
   */
  position: { x: number; y: number };

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
 * Context menu for annotation edit/delete actions.
 *
 * Designed for desktop right-click interactions. On mobile, use
 * AnnotationActionSheet instead.
 *
 * Features:
 * - Edit annotation description
 * - Delete annotation
 * - Keyboard shortcuts displayed
 * - Click outside to close
 * - ESC to close
 *
 * @example
 * ```tsx
 * const [menuOpen, setMenuOpen] = useState(false);
 * const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
 *
 * const handleContextMenu = (e: React.MouseEvent) => {
 *   e.preventDefault();
 *   setMenuPos({ x: e.clientX, y: e.clientY });
 *   setMenuOpen(true);
 * };
 *
 * <AnnotationContextMenu
 *   open={menuOpen}
 *   onOpenChange={setMenuOpen}
 *   position={menuPos}
 *   onEdit={() => showEditDialog()}
 *   onDelete={() => deleteAnnotation()}
 * />
 * ```
 */
export function AnnotationContextMenu({
  open,
  onOpenChange,
  position,
  onEdit,
  onDelete,
  disableEdit = false,
  disableDelete = false,
}: AnnotationContextMenuProps) {
  // Close menu on ESC key
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  const handleEdit = () => {
    onEdit();
    onOpenChange(false);
  };

  const handleDelete = () => {
    onDelete();
    onOpenChange(false);
  };

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      {/* Hidden trigger - menu is controlled via open prop */}
      <div style={{ position: 'absolute', left: position.x, top: position.y, pointerEvents: 'none' }} />

      <DropdownMenuContent
        className="w-48"
        side="bottom"
        align="start"
        // Position menu at cursor
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
        onCloseAutoFocus={(e) => {
          // Prevent focus from jumping when menu closes
          e.preventDefault();
        }}
      >
        <DropdownMenuItem
          onClick={handleEdit}
          disabled={disableEdit}
          className="gap-2"
        >
          <Edit3 className="h-4 w-4" />
          <span>Edit</span>
          <span className="ml-auto text-xs text-muted-foreground">
            Enter
          </span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleDelete}
          disabled={disableDelete}
          variant="destructive"
          className="gap-2"
        >
          <Trash2 className="h-4 w-4" />
          <span>Delete</span>
          <span className="ml-auto text-xs text-muted-foreground">
            ⌫
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
