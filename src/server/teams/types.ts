// Team service types
export interface CreateTeamInput {
  name: string;
  description?: string;
  image?: string;
  creatorId: string;
}

export interface UpdateTeamInput {
  name?: string;
  description?: string;
  image?: string;
}

export interface Team {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  planId: string;
  billableSeats: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface TeamWithMemberInfo extends Team {
  memberCount: number;
  myManagementRole: string | null;
  myOperationalRole: string;
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  managementRole: string | null;
  operationalRole: string;
  joinedAt: Date;
  invitedBy: string | null;
}

export interface AddMemberInput {
  teamId: string;
  userId: string;
  managementRole?: string | null;
  operationalRole: string;
  invitedBy?: string;
}

export interface UpdateMemberRolesInput {
  managementRole?: string | null;
  operationalRole?: string;
}

export interface CreateInvitationInput {
  teamId: string;
  email: string;
  managementRole?: string | null;
  operationalRole: string;
  invitedBy: string;
}

export interface Invitation {
  id: string;
  teamId: string;
  email: string;
  tokenHash: string;
  managementRole: string | null;
  operationalRole: string;
  invitedBy: string;
  expiresAt: Date;
  usedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
}
