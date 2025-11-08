'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  SettingsCard,
  TeamInformationForm,
  TeamInformationReadOnly,
  SettingsSection,
  type TeamGeneralFormData,
  type Team,
  MOCK_DEFAULT_TEAM,
  MOCK_DEFAULT_USER_ROLE,
  simulateApiDelay,
} from '@features/setting';

export default function TeamSettingsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [currentTeam, setCurrentTeam] = useState<Team>(MOCK_DEFAULT_TEAM);

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
    form.setValue('image', null);
  };

  const handleCancel = () => {
    form.reset();
    setImagePreview(null);
  };

  const handleSubmit = async (data: TeamGeneralFormData) => {
    setIsLoading(true);

    // Simulate API call with realistic delay
    await simulateApiDelay();

    // Update mock team data
    setCurrentTeam(prev => ({
      ...prev,
      name: data.name,
      image: imagePreview || prev.image,
    }));

    setIsLoading(false);
    setImagePreview(null);
    form.reset({ name: data.name, image: null });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Team Settings</h1>
        <p className="text-muted-foreground">
          Manage your team information and preferences
        </p>
      </div>

      <SettingsSection
        title="General"
        description="Basic team information and branding"
      >
        {MOCK_DEFAULT_USER_ROLE === 'owner' ? (
          <TeamInformationForm
            form={form}
            currentTeam={currentTeam}
            imagePreview={imagePreview}
            isLoading={isLoading}
            onImageChange={handleImageChange}
            onRemoveImage={handleRemoveImage}
            onCancel={handleCancel}
            onSubmit={handleSubmit}
          />
        ) : (
          <TeamInformationReadOnly team={currentTeam} />
        )}
      </SettingsSection>

      <SettingsSection
        title="Advanced"
        description="Advanced team configuration"
      >
        <SettingsCard
          title="Team ID"
          description="Your team unique identifier"
        >
          <div className="space-y-2">
            <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm">
              {currentTeam.id}
            </code>
            <p className="text-sm text-muted-foreground">
              Use this ID when integrating with external services or APIs.
            </p>
          </div>
        </SettingsCard>
      </SettingsSection>
    </div>
  );
}
