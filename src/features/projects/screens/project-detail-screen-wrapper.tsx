"use client";

import dynamic from "next/dynamic";
import type { ProjectRole } from "../types";
import type { IssueSummary } from "@/features/issues/types";

interface ProjectStats {
  memberCount: number;
  totalTickets: number;
  completedTickets: number;
  progressPercent: number;
}

interface ProjectDetailScreenWrapperProps {
  project: {
    id: string;
    teamId: string;
    name: string;
    description: string | null;
    visibility: "private" | "public";
    stats: ProjectStats;
    createdAt: string;
    updatedAt: string;
    slug: string;
    icon: string | null;
  };
  userRole: ProjectRole | null;
  isLoading?: boolean;
  /** Server-prefetched issues for instant display */
  initialIssues?: IssueSummary[];
}

const ProjectDetailScreen = dynamic(
  () => import("./project-detail-screen"),
  { ssr: false }
);

/**
 * Client wrapper for ProjectDetailScreen that uses dynamic import with ssr: false.
 * This prevents Radix UI hydration mismatches by only rendering on the client.
 * 
 * Supports initialIssues for server-side prefetching to eliminate loading states.
 */
export function ProjectDetailScreenWrapper(props: ProjectDetailScreenWrapperProps) {
  return <ProjectDetailScreen {...props} />;
}

