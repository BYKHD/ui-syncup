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
