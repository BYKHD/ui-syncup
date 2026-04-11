'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useOwnedProjects, useRemoveMember } from '@/features/teams/hooks';
import type { TeamMember } from '@/features/teams/api';

interface RemoveMemberDialogProps {
  member: TeamMember;
  teamId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function RemoveMemberDialog({
  member,
  teamId,
  open,
  onOpenChange,
  onSuccess,
}: RemoveMemberDialogProps) {
  const [transfers, setTransfers] = useState<Record<string, string>>({});

  const { data, isLoading } = useOwnedProjects(teamId, member.userId, { enabled: open });
  const { mutate: removeMember, isPending } = useRemoveMember();

  const ownedProjects = data?.ownedProjects ?? [];
  const eligibleOwners = data?.eligibleOwners ?? [];
  const hasProjects = ownedProjects.length > 0;
  const allAssigned = !hasProjects || ownedProjects.every(p => !!transfers[p.id]);

  function handleRemove() {
    const ownershipTransfers = ownedProjects.map(p => ({
      projectId: p.id,
      newOwnerId: transfers[p.id],
    }));

    removeMember(
      { teamId, userId: member.userId, ownershipTransfers },
      {
        onSuccess: () => {
          toast.success(`${member.user.name} removed from the team`);
          setTransfers({});
          onOpenChange(false);
          onSuccess();
        },
        onError: (error) => {
          toast.error(error.message || 'Failed to remove member');
        },
      }
    );
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setTransfers({});
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {hasProjects ? 'Transfer ownership before removing' : 'Remove team member?'}
          </DialogTitle>
          <DialogDescription>
            {isLoading ? (
              'Checking project ownership\u2026'
            ) : hasProjects ? (
              <>
                <span className="font-medium">{member.user.name}</span> owns{' '}
                {ownedProjects.length} project{ownedProjects.length !== 1 ? 's' : ''}.
                Assign a new owner for each before removing them from the team.
              </>
            ) : (
              <>
                Are you sure you want to remove{' '}
                <span className="font-medium">{member.user.name}</span> from the team?
                They will lose access to all team resources.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div className="space-y-3 py-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {!isLoading && hasProjects && (
          <div className="space-y-3 py-2">
            {ownedProjects.map((project) => (
              <div key={project.id} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{project.name}</p>
                  <p className="text-xs text-muted-foreground">{project.key}</p>
                </div>
                <Select
                  value={transfers[project.id] ?? ''}
                  onValueChange={(value) =>
                    setTransfers((prev) => ({ ...prev, [project.id]: value }))
                  }
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select new owner" />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleOwners.map((owner) => (
                      <SelectItem key={owner.userId} value={owner.userId}>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={owner.image ?? undefined} alt={owner.name} />
                            <AvatarFallback className="text-[10px]">
                              {owner.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span>{owner.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleRemove}
            disabled={!allAssigned || isPending || isLoading}
          >
            {hasProjects ? 'Remove Member' : 'Remove'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
