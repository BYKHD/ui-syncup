"use client";

import { Upload, X } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { Button } from "@components/ui/button";
import { Input } from "@components/ui/input";
import { Label } from "@components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@components/ui/avatar";
import { SettingsCard } from "./settings-card";
import { LoadingButton } from "./loading-states";
import type { TeamGeneralFormData, Team } from "../types";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE_BYTES } from "../utils";

export interface TeamInformationFormProps {
  form: UseFormReturn<TeamGeneralFormData>;
  currentTeam: Pick<Team, "name" | "image">;
  imagePreview: string | null;
  isLoading: boolean;
  onImageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveImage: () => void;
  onCancel: () => void;
  onSubmit: () => void;
}

export function TeamInformationForm({
  form,
  currentTeam,
  imagePreview,
  isLoading,
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
              <Avatar className="h-16 w-16">
                <AvatarImage 
                  src={imagePreview || currentTeam.image || undefined} 
                  alt={currentTeam.name} 
                />
                <AvatarFallback className="text-lg">
                  {currentTeam.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col space-y-2">
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById("team-image")?.click()}
                    disabled={isLoading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {watchedImage || imagePreview ? "Change Image" : "Upload Image"}
                  </Button>
                  {(watchedImage || imagePreview) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onRemoveImage}
                      disabled={isLoading}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  JPEG, PNG, or WebP. Max size: {Math.round(MAX_IMAGE_SIZE_BYTES / 1024 / 1024)}MB
                </p>
              </div>
            </div>
            <input
              id="team-image"
              type="file"
              accept={ALLOWED_IMAGE_TYPES.join(",")}
              onChange={onImageChange}
              className="hidden"
              disabled={isLoading}
            />
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
