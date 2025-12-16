'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const SHORTCUTS = [
  { section: 'Tool Selection', items: [
    { keys: ['1', 'C'], description: 'Select cursor tool' },
    { keys: ['2', 'P'], description: 'Select pin tool' },
    { keys: ['3', 'B'], description: 'Select box tool' },
  ]},
  { section: 'Actions', items: [
    { keys: ['E'], description: 'Toggle edit mode' },
    { keys: ['Enter'], description: 'Edit selected annotation' },
    { keys: ['Delete', '⌫'], description: 'Delete selected annotation' },
  ]},
  { section: 'History', items: [
    { keys: ['⌘ Z', 'Ctrl Z'], description: 'Undo' },
    { keys: ['⌘ ⇧ Z', 'Ctrl Y'], description: 'Redo' },
  ]},
  { section: 'Navigation', items: [
    { keys: ['Space'], description: 'Hold to pan (in edit mode)' },
  ]},
];

export interface KeyboardShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KeyboardShortcutsModal({ open, onOpenChange }: KeyboardShortcutsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {SHORTCUTS.map((section) => (
            <div key={section.section}>
              <h3 className="mb-2 text-sm font-medium text-muted-foreground">
                {section.section}
              </h3>
              <div className="space-y-2">
                {section.items.map((item) => (
                  <div
                    key={item.description}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>{item.description}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((key, index) => (
                        <span key={key}>
                          {index > 0 && (
                            <span className="mx-1 text-muted-foreground">/</span>
                          )}
                          <kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs font-medium">
                            {key}
                          </kbd>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 text-center text-xs text-muted-foreground">
          Press <kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs font-medium">?</kbd> to toggle this dialog
        </div>
      </DialogContent>
    </Dialog>
  );
}
