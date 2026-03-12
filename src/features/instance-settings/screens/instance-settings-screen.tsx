"use client";

/**
 * InstanceSettingsScreen
 *
 * Main screen for instance settings admin section.
 * Composes form and status display components.
 *
 * @requirements Requirement 10.1, 10.2, 10.3, 10.4, 10.5
 */

import { useInstanceStatus } from "@/features/setup/hooks";
import { InstanceSettingsForm } from "../components/instance-settings-form";
import { InstanceStatusDisplay } from "../components/instance-status-display";
import { Skeleton } from "@/components/ui/skeleton";

export default function InstanceSettingsScreen() {
  const { data: instanceStatus, isLoading, error } = useInstanceStatus();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !instanceStatus) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <p className="text-sm text-destructive">
          Failed to load instance settings. Please try again later.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Instance Settings</h2>
        <p className="text-muted-foreground">
          Configure instance-level settings for your self-hosted deployment
        </p>
      </div>

      {/* Editable Configuration */}
      <InstanceSettingsForm instanceStatus={instanceStatus} />

      {/* Read-only Status */}
      <InstanceStatusDisplay instanceStatus={instanceStatus} />
    </div>
  );
}
