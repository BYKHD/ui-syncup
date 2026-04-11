'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import type { OwnedProject, EligibleOwner } from '@/features/teams/api';

interface OwnershipTransferSectionProps {
  ownedProjects: OwnedProject[];
  eligibleOwners: EligibleOwner[];
  isLoading: boolean;
  transfers: Record<string, string>;
  onTransferChange: (projectId: string, newOwnerId: string) => void;
}

export function OwnershipTransferSection({
  ownedProjects,
  eligibleOwners,
  isLoading,
  transfers,
  onTransferChange,
}: OwnershipTransferSectionProps) {
  if (isLoading) {
    return (
      <div className="space-y-3 py-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (ownedProjects.length === 0) return null;

  return (
    <div className="space-y-3 py-2">
      {ownedProjects.map((project) => (
        <div key={project.id} className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{project.name}</p>
            <p className="text-xs text-muted-foreground">{project.key}</p>
          </div>
          <Select
            value={transfers[project.id] ?? ''}
            onValueChange={(value) => onTransferChange(project.id, value)}
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
  );
}
