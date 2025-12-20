"use client";

import { useState, useRef, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { ImageCropperDialog } from "./image-cropper-dialog";

interface AvatarUploadProps {
  value?: string | null;
  fallback: string;
  isUploading?: boolean;
  disabled?: boolean;
  onChange: (file: File) => void;
  className?: string;
}

export function AvatarUpload({
  value,
  fallback,
  isUploading,
  disabled,
  onChange,
  className,
}: AvatarUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle Drag Events
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  // Handle Drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled || isUploading) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, [disabled, isUploading]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    // Basic validation
    if (!file.type.startsWith("image/")) {
       // Ideally show toast error here
       return;
    }
    
    // Create URL for cropper
    const reader = new FileReader();
    reader.onload = () => {
      setCropImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    // Convert blob back to file
    const file = new File([croppedBlob], "avatar.webp", { type: "image/webp" });
    onChange(file);
    setCropImage(null);
  };

  return (
    <>
      <div className={cn("flex items-center gap-6 p-4 border rounded-lg bg-muted/30 border-dashed transition-colors", dragActive ? "border-primary bg-primary/5" : "border-border", className)}
           onDragEnter={handleDrag}
           onDragLeave={handleDrag}
           onDragOver={handleDrag}
           onDrop={handleDrop}
      >
        <div 
            className="group relative h-20 w-20 cursor-pointer overflow-hidden rounded-full ring-2 ring-border transition-all hover:ring-primary"
            onClick={() => !disabled && inputRef.current?.click()}
        >
          <Avatar className="h-full w-full">
            <AvatarImage src={value || undefined} className={cn("object-cover", isUploading && "opacity-50")} />
            <AvatarFallback className="text-lg">{fallback}</AvatarFallback>
          </Avatar>

          {/* Hover Overlay */}
          <div className={cn(
            "absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity", 
            isUploading ? "opacity-0" : "opacity-0 group-hover:opacity-100"
          )}>
            <Camera className="h-6 w-6 text-white" />
          </div>

          {/* Loading Overlay */}
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          )}
        </div>

        <div className="flex-1 space-y-1">
          <h4 className="font-medium text-sm">Team Logo</h4>
          <p className="text-xs text-muted-foreground">
            Click logo to upload or drag & drop.
            <br/>SVG, PNG, JPG or WebP.
          </p>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleChange}
          disabled={disabled || isUploading}
        />
      </div>

      {cropImage && (
        <ImageCropperDialog
            imageSrc={cropImage} 
            isOpen={!!cropImage} 
            onClose={() => setCropImage(null)}
            onCropComplete={handleCropComplete}
        />
      )}
    </>
  );
}
