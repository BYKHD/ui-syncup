"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";

import type { Team, TeamGeneralFormData } from "../types";
import { simulateApiDelay } from "../utils";

type UseTeamSettingsOptions = {
  initialTeam: Team;
  onSuccess?: (updatedTeam: Team) => void;
};

export function useTeamSettings(options: UseTeamSettingsOptions) {
  const { initialTeam, onSuccess } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [currentTeam, setCurrentTeam] = useState<Team>(initialTeam);

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
    form.reset();
    setImagePreview(null);
  };

  const handleSubmit = form.handleSubmit(async (data: TeamGeneralFormData) => {
    setIsLoading(true);

    // Simulate API call with realistic delay
    await simulateApiDelay();

    // Update mock team data
    const updatedTeam: Team = {
      ...currentTeam,
      name: data.name,
      image: imagePreview || currentTeam.image,
    };

    setCurrentTeam(updatedTeam);
    setIsLoading(false);
    setImagePreview(null);
    form.reset({ name: data.name, image: null });

    onSuccess?.(updatedTeam);
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
