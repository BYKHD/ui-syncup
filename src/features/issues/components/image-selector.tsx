"use client";

import React from "react";
import type { IssueAttachment, ImageSelectorProps } from "@/features/issues/types";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Image, Video, File } from "lucide-react";
import { cn } from "@/lib/utils";

export function ImageSelector({
  attachments,
  selectedAttachmentId,
  onSelect,
  layout
}: ImageSelectorProps) {
  const selectedAttachment = attachments.find(attachment => attachment.id === selectedAttachmentId);

  const getAttachmentIcon = (attachment: IssueAttachment) => {
    if (attachment.fileType.startsWith('image/')) {
      return <Image className="h-4 w-4" />;
    } else if (attachment.fileType.startsWith('video/')) {
      return <Video className="h-4 w-4" />;
    } else {
      return <File className="h-4 w-4" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (layout === 'dropdown') {
    return (
      <div className="p-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <div className="flex items-center gap-2">
                {selectedAttachment && getAttachmentIcon(selectedAttachment)}
                <span className="truncate">
                  {selectedAttachment?.fileName || 'Select attachment'}
                </span>
              </div>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-80">
            {attachments.map((attachment) => (
              <DropdownMenuItem
                key={attachment.id}
                onClick={() => onSelect(attachment.id)}
                className={cn(
                  "flex items-center gap-3 p-3",
                  selectedAttachmentId === attachment.id && "bg-accent"
                )}
              >
                {getAttachmentIcon(attachment)}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{attachment.fileName}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatFileSize(attachment.fileSize)}
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        
        {attachments.length > 1 && (
          <div className="text-xs text-muted-foreground text-center mt-2">
            {attachments.findIndex(a => a.id === selectedAttachmentId) + 1} of {attachments.length} attachments
          </div>
        )}
      </div>
    );
  }

  // Thumbnail layout for desktop
  return (
    <div className="p-4">
      <div className="flex items-center gap-2 overflow-x-auto">
        <div className="text-sm text-muted-foreground whitespace-nowrap mr-3">
          {attachments.length} attachment{attachments.length !== 1 ? 's' : ''}:
        </div>
        
        <div className="flex gap-2">
          {attachments.map((attachment) => (
            <button
              key={attachment.id}
              onClick={() => onSelect(attachment.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md border transition-colors",
                "hover:bg-accent hover:text-accent-foreground",
                selectedAttachmentId === attachment.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border"
              )}
            >
              {getAttachmentIcon(attachment)}
              <div className="text-left min-w-0">
                <div className="text-sm font-medium truncate max-w-32">
                  {attachment.fileName}
                </div>
                <div className="text-xs opacity-70">
                  {formatFileSize(attachment.fileSize)}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}