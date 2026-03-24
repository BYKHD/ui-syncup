"use client";

/**
 * InstanceStatusDisplay Component
 *
 * Read-only status display showing:
 * - Service status (database, email, storage, Redis)
 * - Workspace mode (single/multi)
 * - Email verification status with warning
 *
 * @requirements Requirement 10.3, 10.4, 12.8, 15.3
 */

import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { useServiceHealth } from "@/features/setup/hooks";
import type { InstanceStatusDTO, ServiceHealthDTO } from "@/features/setup/api";

interface InstanceStatusDisplayProps {
  instanceStatus: InstanceStatusDTO;
}

type ServiceKey = keyof ServiceHealthDTO;

const SERVICE_LABELS: Record<ServiceKey, string> = {
  database: "Database",
  email: "Email (Resend)",
  storage: "Storage (R2/S3)",
  redis: "Redis",
};

function ServiceStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "connected":
      return (
        <Badge variant="default" className="bg-green-600 hover:bg-green-700">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Connected
        </Badge>
      );
    case "not_configured":
      return (
        <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
          <AlertTriangle className="mr-1 h-3 w-3" />
          Not Configured
        </Badge>
      );
    case "error":
      return (
        <Badge variant="destructive">
          <XCircle className="mr-1 h-3 w-3" />
          Error
        </Badge>
      );
    default:
      return (
        <Badge variant="outline">
          Unknown
        </Badge>
      );
  }
}

export function InstanceStatusDisplay({ instanceStatus }: InstanceStatusDisplayProps) {
  const { data: health, isLoading } = useServiceHealth();

  return (
    <div className="space-y-6">
      {/* Email Verification Warning */}
      {instanceStatus.skipEmailVerification && (
        <Alert variant="destructive" className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Email Verification Disabled</AlertTitle>
          <AlertDescription>
            Email verification is disabled via <code className="text-xs bg-amber-100 dark:bg-amber-900/50 px-1 py-0.5 rounded">SKIP_EMAIL_VERIFICATION=true</code>. 
            New users can sign up without verifying their email address. This may be a security risk in production environments.
          </AlertDescription>
        </Alert>
      )}

      {/* System Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>System Configuration</CardTitle>
          <CardDescription>
            Read-only system settings configured via environment variables
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Workspace Mode */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Team Mode</span>
            </div>
            <Badge variant="outline">
              {instanceStatus.isMultiWorkspaceMode ? "Multi-Team" : "Single-Team"}
            </Badge>
          </div>

          <p className="text-xs text-muted-foreground ml-6">
            {instanceStatus.isMultiWorkspaceMode
              ? "Users can create and manage multiple teams"
              : "All users share a single default team"}
          </p>

          <Separator />

          {/* Email Verification */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Email Verification</span>
            </div>
            <Badge variant={instanceStatus.skipEmailVerification ? "secondary" : "default"}>
              {instanceStatus.skipEmailVerification ? "Disabled" : "Required"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Service Status */}
      <Card>
        <CardHeader>
          <CardTitle>Service Status</CardTitle>
          <CardDescription>
            Connection status for required and optional services
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading service status...</div>
          ) : health ? (
            <div className="space-y-3">
              {(Object.keys(SERVICE_LABELS) as ServiceKey[]).map((key) => (
                <div key={key} className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{SERVICE_LABELS[key]}</span>
                    <span className="text-xs text-muted-foreground">
                      {health[key].message}
                    </span>
                  </div>
                  <ServiceStatusBadge status={health[key].status} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Unable to fetch service status</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
