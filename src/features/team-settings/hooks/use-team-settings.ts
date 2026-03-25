"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import type { Team } from "@/features/teams/api";
import { useUpdateTeam } from "@/features/teams";
import type { TeamGeneralFormData } from "../types";
import { useMediaUpload } from "@/hooks/use-media-upload";

type UseTeamSettingsOptions = {
  initialTeam: Team;
  onSuccess?: (updatedTeam: Team) => void;
};

export function useTeamSettings(options: UseTeamSettingsOptions) {
  const { initialTeam, onSuccess } = options;

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [currentTeam, setCurrentTeam] = useState<Team>(initialTeam);

  const { mutate: updateTeam, isPending: isLoading } = useUpdateTeam();


  const { upload, deleteImage, isUploading: isUploadingImage } = useMediaUpload();
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

  const form = useForm<TeamGeneralFormData>({
    defaultValues: {
      name: currentTeam.name,
      image: null,
    },
  });

  const handleImageChange = async (file: File) => {
    // 1. Show local preview immediately
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // 2. Upload to storage
    const publicUrl = await upload({
      file,
      type: 'team',
      entityId: currentTeam.id,
    });

    if (publicUrl) {
      const absoluteUrl = new URL(publicUrl, window.location.origin).toString();
      setUploadedImageUrl(absoluteUrl);

      // Create a FileList-like object for compatibility if needed,
      // or just set it if the type allows. assuming we stick to FileList for now:
      const dt = new DataTransfer();
      dt.items.add(file);
      form.setValue("image", dt.files, { shouldDirty: true });
    } else {
      // Revert preview on failure
      setImagePreview(currentTeam.image);
      toast.error("Failed to upload image. Please try again.");
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    setUploadedImageUrl(null);
    form.setValue("image", null, { shouldDirty: true });
  };

  const handleCancel = () => {
    form.reset({
      name: currentTeam.name,
      image: null,
    });
    setImagePreview(null);
    setUploadedImageUrl(null);
  };

  const handleSubmit = form.handleSubmit((data: TeamGeneralFormData) => {
    const input: any = { // UpdateTeamInput
      name: data.name,
    };

    // Only include image if it was changed
    if (uploadedImageUrl) {
      input.image = uploadedImageUrl;
    } else if (imagePreview === null && currentTeam.image) {
      input.image = null; // Explicitly remove image
    }

    updateTeam(
      {
        teamId: currentTeam.id,
        input,
      },
      {
        onSuccess: async (response) => {
          const updatedTeam = response.team;
          
          // Image Deletion Logic
          const oldImage = currentTeam.image;
          const newImage = updatedTeam.image;

          // If there was an old image, and it's different from the new one, delete the old one
          // We check if it is part of our storage (contains 'teams/')
          if (oldImage && oldImage !== newImage && oldImage.includes('teams/')) {
            try {
              const url = new URL(oldImage);
              const pathParts = url.pathname.split('/');
              const teamIndex = pathParts.indexOf('teams');
              if (teamIndex !== -1) {
                const key = pathParts.slice(teamIndex).join('/');
                await deleteImage(key, 'team', updatedTeam.id);
              }
            } catch (e) {
              console.error("Failed to parse old image URL for deletion", e);
            }
          }

          setCurrentTeam(updatedTeam);
          form.reset({ name: updatedTeam.name, image: null });
          setImagePreview(null);
          setUploadedImageUrl(null);
          toast.success("Team settings updated successfully");
          onSuccess?.(updatedTeam);
        },
        onError: (error) => {
          toast.error(error.message || "Failed to update team settings");
        },
      }
    );
  });

  return {
    form,
    currentTeam,
    imagePreview,
    isLoading: isLoading || isUploadingImage,
    isUploading: isUploadingImage,
    handleImageChange,
    handleRemoveImage,
    handleCancel,
    handleSubmit,
  };
}

