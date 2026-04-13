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
import { useOwnedProjects, useUpdateMemberRoles } from '@/features/teams/hooks';
import type { TeamMember } from '@/features/teams/api';
import { OwnershipTransferSection } from './ownership-transfer-section';

const ROLE_LABELS: Record<string, string> = {
  TEAM_MEMBER: 'Member',
  TEAM_VIEWER: 'Viewer',
};

interface DemoteMemberDialogProps {
  member: TeamMember;
  teamId: string;
  newRole: 'TEAM_MEMBER' | 'TEAM_VIEWER';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DemoteMemberDialog({
  member,
  teamId,
  newRole,
  open,
  onOpenChange,
  onSuccess,
}: DemoteMemberDialogProps) {
  const [transfers, setTransfers] = useState<Record<string, string>>({});

  const { data, isLoading } = useOwnedProjects(teamId, member.userId, { enabled: open });
  const { mutate: updateRoles, isPending } = useUpdateMemberRoles();

  const ownedProjects = data?.ownedProjects ?? [];
  const eligibleOwners = data?.eligibleOwners ?? [];
  const allAssigned = ownedProjects.every(p => !!transfers[p.id]);

  function handleDemote() {
    const ownershipTransfers = ownedProjects.map(p => ({
      projectId: p.id,
      newOwnerId: transfers[p.id],
    }));

    updateRoles(
      {
        teamId,
        userId: member.userId,
        input: { operationalRole: newRole },
        ownershipTransfers,
      },
      {
        onSuccess: () => {
          toast.success(`${member.user.name} demoted to ${ROLE_LABELS[newRole]}`);
          setTransfers({});
          onOpenChange(false);
          onSuccess();
        },
        onError: (error) => {
          toast.error(error.message || 'Failed to update member role');
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
          <DialogTitle>Transfer ownership before demoting</DialogTitle>
          <DialogDescription>
            {isLoading ? (
              'Checking project ownership\u2026'
            ) : (
              <>
                <span className="font-medium">{member.user.name}</span> owns{' '}
                {ownedProjects.length} project{ownedProjects.length !== 1 ? 's' : ''}.
                Assign a new owner for each before changing their role to{' '}
                {ROLE_LABELS[newRole]}.
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
            onClick={handleDemote}
            disabled={!allAssigned || isPending || isLoading}
          >
            Demote to {ROLE_LABELS[newRole]}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
