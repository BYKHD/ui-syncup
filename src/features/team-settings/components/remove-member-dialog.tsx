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
import { useOwnedProjects, useRemoveMember } from '@/features/teams/hooks';
import { OwnershipTransferSection } from './ownership-transfer-section';
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

        <OwnershipTransferSection
          ownedProjects={ownedProjects}
          eligibleOwners={eligibleOwners}
          isLoading={isLoading}
          transfers={transfers}
          onTransferChange={(projectId, newOwnerId) =>
            setTransfers((prev) => ({ ...prev, [projectId]: newOwnerId }))
          }
        />

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
