"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/components/ui/dialog";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { useTeam } from "@/src/hooks/use-team";
import { useOptimisticTeamOperations } from "@/src/hooks/use-optimistic-team-operations";
import { teamManagementService } from "@/src/services/team-management";
import { TeamError } from "@/src/lib/errors/team-errors";
import { toast } from "sonner";

const createTeamSchema = z.object({
  name: z
    .string()
    .min(2, "Team name must be at least 2 characters")
    .max(50, "Team name must be less than 50 characters")
    .regex(
      /^[a-zA-Z0-9\s\-_]+$/,
      "Team name can only contain letters, numbers, spaces, hyphens, and underscores"
    ),
  description: z.string().max(200, "Description must be less than 200 characters").optional(),
});

type CreateTeamFormData = z.infer<typeof createTeamSchema>;

interface CreateTeamDialogProps {
  children: React.ReactNode;
  onTeamCreated?: (team: any) => void;
}

export function CreateTeamDialog({ children, onTeamCreated }: CreateTeamDialogProps) {
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { switchTeam } = useTeam();
  const { optimisticCreateTeam } = useOptimisticTeamOperations();
  
  // Note: Users can create unlimited teams - no restrictions apply

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    setError,
    clearErrors,
  } = useForm<CreateTeamFormData>({
    resolver: zodResolver(createTeamSchema),
    mode: "onChange",
  });

  const onSubmit = async (data: CreateTeamFormData) => {
    if (isCreating) return;
    
    setIsCreating(true);
    clearErrors();

    try {
      // Use optimistic team creation for better UX
      const createdTeam = await optimisticCreateTeam({
        name: data.name,
        description: data.description,
      });
      
      toast.success("Team created successfully!");
      
      // Switch to the new team automatically
      await switchTeam(createdTeam.id);
      
      // Call the callback if provided
      if (onTeamCreated) {
        onTeamCreated(createdTeam);
      }
      
      // Close dialog and reset form
      setOpen(false);
      reset();
      
    } catch (error) {
      console.error("Error creating team:", error);
      
      // Handle specific TeamError types for better user feedback
      if (error instanceof TeamError) {
        switch (error.type) {
          case 'TEAM_NAME_TAKEN':
            setError('name', { message: 'A team with this name already exists' });
            break;
          case 'TEAM_NAME_TOO_SHORT':
            setError('name', { message: 'Team name must be at least 2 characters' });
            break;
          case 'TEAM_NAME_TOO_LONG':
            setError('name', { message: 'Team name must be less than 50 characters' });
            break;
          case 'TEAM_NAME_INVALID_CHARACTERS':
            setError('name', { message: 'Team name can only contain letters, numbers, spaces, hyphens, and underscores' });
            break;
          case 'TEAM_NAME_REQUIRED':
            setError('name', { message: 'Team name is required' });
            break;
          default:
            toast.error(error.message);
        }
      } else {
        const errorMessage = error instanceof Error ? error.message : "Failed to create team";
        toast.error(errorMessage);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!isCreating) {
      setOpen(newOpen);
      if (!newOpen) {
        reset();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Team</DialogTitle>
          <DialogDescription>
            Create a new team to organize your projects and collaborate with others.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="team-name">Team Name</Label>
            <Input
              id="team-name"
              {...register("name")}
              placeholder="e.g., Acme Design Team"
              disabled={isCreating}
              autoFocus
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="team-description">Description (Optional)</Label>
            <Input
              id="team-description"
              {...register("description")}
              placeholder="Brief description of your team"
              disabled={isCreating}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating || !isValid}>
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Team
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}