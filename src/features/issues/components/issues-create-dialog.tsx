"use client";

import { PropsWithChildren, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PrioritySelector } from "./priority-selector";
import { TypeSelector } from "./type-selector";
import { ImageUploadZone } from "./image-upload-zone";
import { UploadedImagePreview } from "./uploaded-image-preview";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import type { IssuePriority, IssueType } from "@/features/issues/types";
import type { AttachmentAnnotation } from "@/features/annotations";
import { X } from "lucide-react";

type IssuePriorityValue = IssuePriority | null;
type IssueTypeValue = IssueType | null;

interface ImageData {
  file: File;
  preview: string;
  width: number;
  height: number;
  annotations: AttachmentAnnotation[];
}

interface IssueFormData {
  title: string;
  description: string;
  type: IssueTypeValue;
  priority: IssuePriorityValue;
  asIsImage: ImageData | null;
  toBeImage: ImageData | null;
}

interface IssuesCreateDialogProps extends PropsWithChildren {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formData: IssueFormData;
  errors?: {
    title?: string;
    description?: string;
    type?: string;
    priority?: string;
    asIsImage?: string;
    toBeImage?: string;
  };
  isSubmitting?: boolean;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onTypeChange: (value: IssueTypeValue) => void;
  onPriorityChange: (value: IssuePriorityValue) => void;
  onAsIsImageChange: (image: ImageData | null) => void;
  onToBeImageChange: (image: ImageData | null) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}

export function IssuesCreateDialog({
  open,
  onOpenChange,
  formData,
  errors = {},
  isSubmitting = false,
  onTitleChange,
  onDescriptionChange,
  onTypeChange,
  onPriorityChange,
  onAsIsImageChange,
  onToBeImageChange,
  onSubmit,
  onCancel,
  children,
}: IssuesCreateDialogProps) {
  const isMobile = useIsMobile();
  const [isLoadingAsIs, setIsLoadingAsIs] = useState(false);
  const [isLoadingToBe, setIsLoadingToBe] = useState(false);

  // Extract image dimensions using Image API
  const extractImageMetadata = async (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const preview = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(preview);
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };

      img.onerror = () => {
        URL.revokeObjectURL(preview);
        reject(new Error("Failed to load image"));
      };

      img.src = preview;
    });
  };

  const handleAsIsImageSelect = async (file: File) => {
    setIsLoadingAsIs(true);
    try {
      const { width, height } = await extractImageMetadata(file);
      const preview = URL.createObjectURL(file);

      onAsIsImageChange({
        file,
        preview,
        width,
        height,
        annotations: [],
      });
    } catch (error) {
      console.error("Failed to process as-is image:", error);
    } finally {
      setIsLoadingAsIs(false);
    }
  };

  const handleToBeImageSelect = async (file: File) => {
    setIsLoadingToBe(true);
    try {
      const { width, height } = await extractImageMetadata(file);
      const preview = URL.createObjectURL(file);

      onToBeImageChange({
        file,
        preview,
        width,
        height,
        annotations: [],
      });
    } catch (error) {
      console.error("Failed to process to-be image:", error);
    } finally {
      setIsLoadingToBe(false);
    }
  };

  const handleAsIsImageRemove = () => {
    if (formData.asIsImage?.preview) {
      URL.revokeObjectURL(formData.asIsImage.preview);
    }
    onAsIsImageChange(null);
  };

  const handleToBeImageRemove = () => {
    if (formData.toBeImage?.preview) {
      URL.revokeObjectURL(formData.toBeImage.preview);
    }
    onToBeImageChange(null);
  };

  const handleAsIsAnnotationsChange = (annotations: AttachmentAnnotation[]) => {
    if (formData.asIsImage) {
      onAsIsImageChange({
        ...formData.asIsImage,
        annotations,
      });
    }
  };

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      if (formData.asIsImage?.preview) {
        URL.revokeObjectURL(formData.asIsImage.preview);
      }
      if (formData.toBeImage?.preview) {
        URL.revokeObjectURL(formData.toBeImage.preview);
      }
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        className={cn(
          "flex flex-col gap-0 p-0",
          isMobile
            ? "w-[95vw] max-h-[95vh]"
            : "w-[95vw] sm:max-w-6xl max-h-[90vh]"
        )}
      >
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 border-b">
          <DialogTitle>Create Issue</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Report a UI issue with before/after images and annotations
          </p>
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate className="flex flex-col flex-1 min-h-0">
          {/* Two-Panel Layout: Desktop Horizontal, Mobile Vertical */}
          <div className={cn(
            "flex flex-1 min-h-0",
            isMobile ? "flex-col" : "flex-row"
          )}>
            {/* LEFT PANEL: As-Is Image Canvas */}
            <div className={cn(
              "flex flex-col bg-muted/30",
              isMobile ? "min-h-[400px] border-b" : "flex-1 border-r"
            )}>
              {formData.asIsImage ? (
                <div className="relative h-full">
                  <UploadedImagePreview
                    variant="as-is"
                    image={formData.asIsImage}
                    annotations={formData.asIsImage.annotations}
                    onAnnotationsChange={handleAsIsAnnotationsChange}
                    onRemove={handleAsIsImageRemove}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center h-full p-6">
                  <div className="w-full max-w-md">
                    <ImageUploadZone
                      variant="as-is"
                      onImageSelect={handleAsIsImageSelect}
                      disabled={isLoadingAsIs}
                      error={errors.asIsImage}
                    />
                    {errors.asIsImage && (
                      <p className="mt-2 text-sm text-destructive text-center">
                        {errors.asIsImage}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT PANEL: Form Fields */}
            <div className={cn(
              "flex flex-col bg-background",
              isMobile ? "flex-1" : "w-[380px]"
            )}>
              <ScrollArea className="flex-1">
                <div className="space-y-6 p-4 sm:p-6">
                  {/* Title & Description */}
                  <div className="space-y-4">
                    <Field>
                      <FieldLabel className="text-sm font-semibold">
                        Title <span className="text-destructive">*</span>
                      </FieldLabel>
                      <FieldContent>
                        <Input
                          type="text"
                          placeholder="Enter issue title"
                          value={formData.title}
                          onChange={(e) => onTitleChange(e.target.value)}
                          aria-invalid={!!errors.title}
                          maxLength={80}
                          autoFocus
                          className="font-medium"
                        />
                      </FieldContent>
                      {errors.title && (
                        <FieldDescription className="text-destructive">
                          {errors.title}
                        </FieldDescription>
                      )}
                    </Field>

                    <Field>
                      <FieldLabel className="text-sm font-semibold">
                        Description <span className="text-destructive">*</span>
                      </FieldLabel>
                      <Textarea
                        placeholder="Describe the issue and expected behavior"
                        className="resize-none min-h-24"
                        value={formData.description}
                        onChange={(e) => onDescriptionChange(e.target.value)}
                        aria-invalid={!!errors.description}
                        maxLength={5000}
                      />
                      {errors.description && (
                        <FieldDescription className="text-destructive">
                          {errors.description}
                        </FieldDescription>
                      )}
                    </Field>
                  </div>

                  {/* Divider */}
                  <div className="border-t" />

                  {/* Issue Classification */}
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-sm font-semibold mb-1">Issue Classification</h3>
                      <p className="text-xs text-muted-foreground">
                        Categorize and prioritize this issue
                      </p>
                    </div>

                    <div className="flex items-start gap-3 flex-wrap">
                      <Field className="w-fit">
                        <FieldLabel className="sr-only">Type</FieldLabel>
                        <FieldContent>
                          <TypeSelector value={formData.type} onChange={onTypeChange} />
                        </FieldContent>
                        {errors.type && (
                          <FieldDescription className="text-destructive">
                            {errors.type}
                          </FieldDescription>
                        )}
                      </Field>

                      <Field className="w-fit">
                        <FieldLabel className="sr-only">Priority</FieldLabel>
                        <FieldContent>
                          <PrioritySelector
                            value={formData.priority}
                            onChange={onPriorityChange}
                          />
                        </FieldContent>
                        {errors.priority && (
                          <FieldDescription className="text-destructive">
                            {errors.priority}
                          </FieldDescription>
                        )}
                      </Field>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t" />

                  {/* Expected Result (To-Be Image) */}
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-sm font-semibold mb-1">Expected Result</h3>
                      <p className="text-xs text-muted-foreground">
                        Upload a reference showing the expected UI
                      </p>
                    </div>

                    <Field>
                      <FieldLabel className="sr-only">To-Be Image</FieldLabel>
                      <FieldContent>
                        {formData.toBeImage ? (
                          <CompactImagePreview
                            image={formData.toBeImage}
                            onRemove={handleToBeImageRemove}
                          />
                        ) : (
                          <ImageUploadZone
                            variant="to-be"
                            onImageSelect={handleToBeImageSelect}
                            disabled={isLoadingToBe}
                            error={errors.toBeImage}
                            className="min-h-[120px]"
                          />
                        )}
                      </FieldContent>
                      {errors.toBeImage && !formData.toBeImage && (
                        <FieldDescription className="text-destructive">
                          {errors.toBeImage}
                        </FieldDescription>
                      )}
                    </Field>
                  </div>
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* Footer */}
          <DialogFooter className="px-4 sm:px-6 py-3 sm:py-4 border-t bg-background">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Issue"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Compact Image Preview Component
 * Simplified preview for to-be image without annotation capabilities
 */
interface CompactImagePreviewProps {
  image: ImageData;
  onRemove: () => void;
}

function CompactImagePreview({ image, onRemove }: CompactImagePreviewProps) {
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="relative group rounded-lg border border-border bg-card overflow-hidden">
      {/* Image Preview */}
      <div className="relative aspect-video bg-muted/50">
        <img
          src={image.preview}
          alt="To-be reference"
          className="w-full h-full object-contain"
        />

        {/* Remove Button */}
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onRemove}
          aria-label="Remove image"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Metadata */}
      <div className="p-3 border-t bg-background/95">
        <p className="text-xs font-medium truncate mb-1">
          {image.file.name}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatFileSize(image.file.size)}</span>
          <span>•</span>
          <span>{image.width} × {image.height}</span>
        </div>
      </div>
    </div>
  );
}

export type { IssueFormData, ImageData };
