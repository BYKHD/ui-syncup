"use client";

import { AvatarUpload } from "@/components/ui/avatar-upload";
import { UseFormReturn } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SettingsCard } from "./settings-card";
import { LoadingButton } from "./loading-states";
import type { TeamGeneralFormData } from "../types";
import type { Team } from "@/features/teams/api";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE_BYTES } from "../utils";

export interface TeamInformationFormProps {
  form: UseFormReturn<TeamGeneralFormData>;
  currentTeam: Pick<Team, "name" | "image">;
  imagePreview: string | null;
  isLoading: boolean;
  isUploading?: boolean;
  onImageChange: (file: File) => void;
  onRemoveImage: () => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export function TeamInformationForm({
  form,
  currentTeam,
  imagePreview,
  isLoading,
  isUploading,
  onImageChange,
  onRemoveImage,
  onCancel,
  onSubmit,
}: TeamInformationFormProps) {
  const {
    register,
    formState: { errors, isDirty },
    watch,
  } = form;

  const watchedImage = watch("image");

  return (
    <form onSubmit={onSubmit}>
      <SettingsCard
        title="Team Information"
        description="Update your team's name and profile image"
      >
        <div className="space-y-6">
          {/* Team Image Upload */}
          <div className="space-y-2">
            <Label htmlFor="team-image">Team Image</Label>
            <div className="flex items-center space-x-4">
              <AvatarUpload 
                 value={imagePreview || currentTeam.image}
                 fallback={currentTeam.name.charAt(0).toUpperCase()}
                 isUploading={isUploading}
                 disabled={isLoading}
                 onChange={onImageChange}
              />
            </div>
            {errors.image && (
              <p className="text-sm text-destructive">{errors.image.message}</p>
            )}
          </div>

          {/* Team Name */}
          <div className="space-y-2">
            <Label htmlFor="team-name">Team Name</Label>
            <Input
              id="team-name"
              {...register("name", {
                onChange: (e) => {
                  // Trigger validation on change for real-time feedback
                  form.trigger("name");
                }
              })}
              placeholder="Enter team name"
              disabled={isLoading}
              className={errors.name ? "border-destructive" : ""}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
            {!errors.name && watch("name") && watch("name") !== currentTeam.name && (
              <p className="text-sm text-muted-foreground">
                Team name will be updated
              </p>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading || !isDirty}
            >
              Cancel
            </Button>
            <LoadingButton
              type="submit"
              isLoading={isLoading}
              disabled={!isDirty}
            >
              Save Changes
            </LoadingButton>
          </div>
        </div>
      </SettingsCard>
    </form>
  );
}
