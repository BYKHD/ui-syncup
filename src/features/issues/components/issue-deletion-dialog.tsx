/**
 * IssueDeleteDialog Component
 * 
 * A confirmation dialog for issue deletion with clear warnings and feedback.
 * 
 * Features:
 * - Clear warning about the destructive action
 * - Loading state during deletion
 * - Error handling with retry option
 * - Accessible dialog with proper ARIA labels
 * 
 * @example
 * ```tsx
 * import { IssueDeleteDialog } from '@/features/issues/components/issue-deletion-dialog';
 * 
 * function IssueActions() {
 *   const [showDeleteDialog, setShowDeleteDialog] = useState(false);
 * 
 *   const handleDelete = async () => {
 *     // Perform deletion logic
 *     await deleteIssue();
 *   };
 * 
 *   return (
 *     <>
 *       <Button onClick={() => setShowDeleteDialog(true)}>Delete Issue</Button>
 *       <IssueDeleteDialog
 *         open={showDeleteDialog}
 *         onOpenChange={setShowDeleteDialog}
 *         issueKey="PROJ-123"
 *         onConfirm={handleDelete}
 *       />
 *     </>
 *   );
 * }
 * ```
 */

'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { RiLoader4Line, RiDeleteBinLine, RiAlertLine } from '@remixicon/react';
import { toast } from 'sonner';

interface IssueDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  issueKey: string;
  onConfirm: () => Promise<void>;
}

export function IssueDeleteDialog({
  open,
  onOpenChange,
  issueKey,
  onConfirm
}: IssueDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);

    try {
      await onConfirm();
      
      // Success feedback is handled by the parent component
      // since it typically involves navigation
      onOpenChange(false);
    } catch (error) {
      // Error handling
      toast.error('Failed to delete issue', {
        description: error instanceof Error ? error.message : 'Please try again.',
        action: {
          label: 'Retry',
          onClick: () => handleConfirm()
        }
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    if (!isDeleting) {
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <RiAlertLine className="h-5 w-5 text-destructive" />
            Are you sure?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
              You are going to delete <strong>{issueKey}</strong>. 
              This action cannot be undone. The issue will be permanently removed
              along with all its attachments, comments, and activity history.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel 
            onClick={handleCancel}
            disabled={isDeleting}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <div className="flex items-center gap-2 text-destructive-foreground">
                <RiLoader4Line className="h-4 w-4 animate-spin" />
                Deleting...
              </div>
            ) : (
              <div className="flex items-center gap-2 text-destructive-foreground">
                <RiDeleteBinLine className="h-4 w-4" />
                Delete Issue
              </div>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}