"use client";

import { useState } from "react";
import { Loader2, Trash2, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { SettingsCard } from "./settings-card";
import { TransferOwnershipModal } from "./transfer-ownership-modal";
import type { TeamRole } from "../types";

export interface TeamDangerZoneProps {
  teamId: string;
  teamName: string;
  userRole: TeamRole | null;
  isLastTeam?: boolean;
  onDelete?: (teamId: string) => void | Promise<void>;
}

export function TeamDangerZone({
  teamId,
  teamName,
  userRole,
  isLastTeam = false,
  onDelete,
}: TeamDangerZoneProps) {
  const [isDeletingTeam, setIsDeletingTeam] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [exportBeforeDelete, setExportBeforeDelete] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const response = await fetch(`/api/teams/${teamId}/export`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || "Failed to export team data");
      }

      const data = await response.json();
      toast.success(
        "Export queued successfully. You will receive an email with the download link.",
        { duration: 5000 }
      );
      
      return true;
    } catch (error) {
      console.error("Error exporting team data:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to export team data";
      toast.error(errorMessage);
      return false;
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteTeam = async () => {
    if (userRole !== "owner") {
      toast.error("Only team owners can delete this team");
      return;
    }

    setIsDeletingTeam(true);

    try {
      // Export data if requested
      if (exportBeforeDelete) {
        const exportSuccess = await handleExportData();
        if (!exportSuccess) {
          // If export fails, ask user if they want to proceed anyway
          const proceed = window.confirm(
            "Export failed. Do you still want to delete the team?"
          );
          if (!proceed) {
            setIsDeletingTeam(false);
            return;
          }
        }
        // Wait a moment for the export to be queued
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      setDeleteDialogOpen(false);

      // UI-only mock: simulate deletion delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Call optional onDelete callback if provided
      if (onDelete) {
        await onDelete(teamId);
      }

      // Show appropriate success message
      if (isLastTeam) {
        toast.success(
          "Team deleted successfully. You will be redirected to create a new team.",
          { duration: 3000 }
        );
      } else {
        toast.success("Team deleted successfully");
      }

      // UI-only mock: log deletion instead of actual redirect
      console.log(`[MOCK] Team "${teamName}" (${teamId}) deleted`);
      console.log(`[MOCK] Would redirect to: ${isLastTeam ? "/onboarding" : "/projects"}`);
    } catch (error) {
      // Reset states on error so user can try again
      setIsDeletingTeam(false);
      setDeleteDialogOpen(false);

      console.error("Error deleting team:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to delete team";
      toast.error(errorMessage);
    } finally {
      // Reset loading state after mock operation
      setTimeout(() => setIsDeletingTeam(false), 2000);
    }
  };

  return (
    <SettingsCard
      title="Danger Zone"
      description="Irreversible and destructive actions"
    >
      <div className="space-y-6">
        {userRole === "owner" && (
          <>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium">Transfer Ownership</h4>
                <p className="text-sm text-muted-foreground">
                  Transfer this team to another administrator.
                </p>
              </div>
              <TransferOwnershipModal teamId={teamId} teamName={teamName} />
            </div>
            <Separator />
          </>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium">Delete Team</h4>
            <p className="text-sm text-muted-foreground">
              Once you delete a team, there is no going back. Please be certain.
            </p>
            {isLastTeam && (
              <p className="mt-2 text-sm font-medium text-destructive">
                This is your last team. Deleting it will redirect you to create a new team.
              </p>
            )}
            {userRole !== "owner" && (
              <p className="mt-2 text-sm text-muted-foreground">
                Only team owners can delete a team. Contact the owner if you need this removed.
              </p>
            )}
          </div>

          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive" 
                size="sm"
                disabled={isDeletingTeam || userRole !== "owner"}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Team
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {isLastTeam ? "Delete Your Last Team?" : "Are you absolutely sure?"}
                </AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div>
                    {isLastTeam ? (
                      <>
                        <p className="mb-2">
                          This is your last team. Deleting it will remove all your data and 
                          redirect you to create a new team.
                        </p>
                        <p className="font-medium text-destructive">
                          This action cannot be undone.
                        </p>
                      </>
                    ) : (
                      <>
                        This action cannot be undone. This will permanently delete the{" "}
                        <strong>{teamName}</strong> team and remove all associated data including:
                      </>
                    )}
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>All projects and issues</li>
                      <li>All team members and invitations</li>
                      <li>All uploaded files and attachments</li>
                      <li>All team settings and preferences</li>
                    </ul>
                    
                    {/* Export option */}
                    <div className="mt-4 p-3 border rounded-md bg-muted/50">
                      <div className="flex items-start space-x-2">
                        <Checkbox
                          id="export-before-delete"
                          checked={exportBeforeDelete}
                          onCheckedChange={(checked) => setExportBeforeDelete(checked === true)}
                          disabled={isDeletingTeam || isExporting}
                        />
                        <div className="grid gap-1.5 leading-none">
                          <label
                            htmlFor="export-before-delete"
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            Export team data before deletion
                          </label>
                          <p className="text-sm text-muted-foreground">
                            Receive an email with a complete export of your team data (members, projects, invitations)
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isDeletingTeam || isExporting}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteTeam}
                  disabled={isDeletingTeam || isExporting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeletingTeam || isExporting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {isExporting ? "Exporting..." : "Deleting..."}
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      {isLastTeam ? "Delete Last Team" : "Delete Team"}
                    </>
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </SettingsCard>
  );
}
