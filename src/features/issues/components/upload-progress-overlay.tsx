import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface UploadProgressOverlayProps {
  progress: number;
  isVisible: boolean;
  className?: string;
  label?: string;
}

export function UploadProgressOverlay({
  progress,
  isVisible,
  className,
  label = "Uploading...",
}: UploadProgressOverlayProps) {
  if (!isVisible) return null;

  return (
    <div
      className={cn(
        "absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm transition-all duration-200 p-6",
        className
      )}
    >
      <div className="w-full max-w-[200px] space-y-2">
        <div className="flex justify-between text-xs font-medium text-muted-foreground">
          <span>{label}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>
    </div>
  );
}
