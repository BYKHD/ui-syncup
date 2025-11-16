"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { RiImageAddLine } from "@remixicon/react";
import { cn } from "@/lib/utils";

interface ImageUploadZoneProps {
  variant: "as-is" | "to-be";
  onImageSelect: (file: File) => void;
  disabled?: boolean;
  error?: string;
  className?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];

export function ImageUploadZone({
  variant,
  onImageSelect,
  disabled = false,
  error,
  className,
}: ImageUploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

  const variantConfig = {
    "as-is": {
      title: "What Does It Look Like Now?",
      description: "Current/buggy UI in production",
      icon: RiImageAddLine,
      helpText: "Upload a screenshot of the current issue",
    },
    "to-be": {
      title: "Expected Result",
      description: "Reference for the corrected UI",
      icon: RiImageAddLine,
      helpText: "Upload a design mockup or expected result",
    },
  };

  const config = variantConfig[variant];

  const validateFile = useCallback((file: File): string | null => {
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      return "Please upload an image file (JPEG, PNG, GIF, or WebP)";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "File size must be less than 10MB";
    }
    return null;
  }, []);

  const handleFileSelect = useCallback(
    (file: File) => {
      if (disabled) return;

      const validationError = validateFile(file);
      if (validationError) {
        // In a real app, show toast notification
        console.error(validationError);
        return;
      }

      onImageSelect(file);
    },
    [disabled, validateFile, onImageSelect]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
      // Reset input to allow selecting the same file again
      e.target.value = "";
    },
    [handleFileSelect]
  );

  const handleClick = useCallback(() => {
    if (disabled) return;
    fileInputRef.current?.click();
  }, [disabled]);

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;

      dragCounterRef.current += 1;
      if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
        setIsDragging(true);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;

      dragCounterRef.current -= 1;
      if (dragCounterRef.current === 0) {
        setIsDragging(false);
      }
    },
    [disabled]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;

      setIsDragging(false);
      dragCounterRef.current = 0;

      const file = e.dataTransfer.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [disabled, handleFileSelect]
  );

  // Clipboard paste support
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (disabled) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            handleFileSelect(file);
            break;
          }
        }
      }
    };

    // Only listen for paste when component is mounted
    document.addEventListener("paste", handlePaste);
    return () => {
      document.removeEventListener("paste", handlePaste);
    };
  }, [disabled, handleFileSelect]);

  const IconComponent = config.icon;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-medium">{config.title}</h4>
          <p className="text-xs text-muted-foreground">{config.description}</p>
        </div>
      </div>

      <div
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors cursor-pointer",
          "hover:border-primary/50 hover:bg-accent/50",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          variant === "as-is" ? "min-h-[200px] p-8" : "min-h-[140px] p-6",
          isDragging && "border-primary bg-accent",
          disabled && "opacity-50 cursor-not-allowed",
          error && "border-destructive"
        )}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleClick();
          }
        }}
        aria-label={`Upload ${config.title}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
        />

        <IconComponent
          className={cn(
            "mb-3 text-muted-foreground",
            variant === "as-is" ? "size-12" : "size-8"
          )}
          aria-hidden="true"
        />

        <div className="text-center space-y-1">
          <p className={cn(
            "font-medium",
            variant === "as-is" ? "text-sm" : "text-xs"
          )}>
            {isDragging
              ? "Drop image here"
              : "Click to upload or drag and drop"}
          </p>
          <p className="text-xs text-muted-foreground">
            {config.helpText}
          </p>
          <p className="text-xs text-muted-foreground">
            JPEG, PNG, GIF, or WebP (max 10MB)
          </p>
          <p className="text-xs text-muted-foreground font-medium mt-2">
            💡 You can also paste (Ctrl/Cmd+V) from clipboard
          </p>
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
