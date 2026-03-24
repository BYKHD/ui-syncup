"use client";

/**
 * InstanceSettingsForm Component
 *
 * Editable form for instance configuration including:
 * - Instance Name
 * - Public URL
 * - Default Member Role
 *
 * @requirements Requirement 10.1, 10.2, 10.5, 12.8
 */

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { useSaveInstanceConfig } from "@/features/setup/hooks";
import type { InstanceStatusDTO } from "@/features/setup/api";

/**
 * Form validation schema
 */
const instanceSettingsSchema = z.object({
  instanceName: z
    .string()
    .min(2, "Instance name must be at least 2 characters")
    .max(100, "Instance name must be at most 100 characters"),
  defaultMemberRole: z.enum([
    "WORKSPACE_VIEWER",
    "WORKSPACE_MEMBER",
    "WORKSPACE_EDITOR",
  ]),
});

type InstanceSettingsFormValues = z.infer<typeof instanceSettingsSchema>;

interface InstanceSettingsFormProps {
  instanceStatus: InstanceStatusDTO;
}

const ROLE_OPTIONS = [
  { value: "WORKSPACE_VIEWER", label: "Viewer (read-only access)" },
  { value: "WORKSPACE_MEMBER", label: "Member (view and comment)" },
  { value: "WORKSPACE_EDITOR", label: "Editor (create and manage content)" },
] as const;

export function InstanceSettingsForm({ instanceStatus }: InstanceSettingsFormProps) {
  const { mutate: saveConfig, isPending, error } = useSaveInstanceConfig();

  const form = useForm<InstanceSettingsFormValues>({
    resolver: zodResolver(instanceSettingsSchema),
    defaultValues: {
      instanceName: instanceStatus.instanceName || "UI SyncUp",
      defaultMemberRole: instanceStatus.defaultMemberRole,
    },
  });

  const onSubmit = (values: InstanceSettingsFormValues) => {
    saveConfig(
      {
        instanceName: values.instanceName,
      },
      {
        onSuccess: () => {
          toast.success("Instance settings saved successfully");
          form.reset(values);
        },
        onError: (err) => {
          toast.error(err.message || "Failed to save instance settings");
        },
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Instance Configuration</CardTitle>
        <CardDescription>
          Configure your instance name and default member role. These settings are
          visible to all users.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>
              {error.message || "Failed to save configuration"}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="instanceName">Instance Name</Label>
            <Input
              id="instanceName"
              placeholder="My UI SyncUp"
              {...form.register("instanceName")}
            />
            <p className="text-sm text-muted-foreground">
              The display name for your instance
            </p>
            {form.formState.errors.instanceName && (
              <p className="text-sm font-medium text-destructive">
                {form.formState.errors.instanceName.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultMemberRole">Default Member Role</Label>
            <Select
              value={form.watch("defaultMemberRole")}
              onValueChange={(value) =>
                form.setValue(
                  "defaultMemberRole",
                  value as InstanceSettingsFormValues["defaultMemberRole"],
                  { shouldDirty: true }
                )
              }
            >
              <SelectTrigger id="defaultMemberRole">
                <SelectValue placeholder="Select default role" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Default role assigned to new users in single-team mode
            </p>
            {form.formState.errors.defaultMemberRole && (
              <p className="text-sm font-medium text-destructive">
                {form.formState.errors.defaultMemberRole.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={isPending || !form.formState.isDirty}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
