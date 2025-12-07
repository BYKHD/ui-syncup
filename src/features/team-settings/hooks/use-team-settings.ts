"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import type { Team } from "@/features/teams/api";
import { useUpdateTeam } from "@/features/teams";
import type { TeamGeneralFormData } from "../types";

type UseTeamSettingsOptions = {
  initialTeam: Team;
  onSuccess?: (updatedTeam: Team) => void;
};

export function useTeamSettings(options: UseTeamSettingsOptions) {
  const { initialTeam, onSuccess } = options;

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [currentTeam, setCurrentTeam] = useState<Team>(initialTeam);

  const { mutate: updateTeam, isPending: isLoading } = useUpdateTeam();

  const form = useForm<TeamGeneralFormData>({
    defaultValues: {
      name: currentTeam.name,
      image: null,
    },
  });

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview(null);
    form.setValue("image", null);
  };

  const handleCancel = () => {
    form.reset({
      name: currentTeam.name,
      image: null,
    });
    setImagePreview(null);
  };

  const handleSubmit = form.handleSubmit((data: TeamGeneralFormData) => {
    updateTeam(
      {
        teamId: currentTeam.id,
        input: {
          name: data.name,
          // TODO: Handle image upload properly. For now we only update name.
          // If imagePreview is set, we might want to upload it first.
          // image: imagePreview, 
        },
      },
      {
        onSuccess: (response) => {
          const updatedTeam = response.team;
          setCurrentTeam(updatedTeam);
          form.reset({ name: updatedTeam.name, image: null });
          setImagePreview(null);
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
    isLoading,
    handleImageChange,
    handleRemoveImage,
    handleCancel,
    handleSubmit,
  };
}
