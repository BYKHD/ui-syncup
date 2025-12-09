import { apiClient } from '@/lib/api-client';
import type { IssueSummary } from '../types';

export interface GetProjectIssuesParams {
  projectId: string;
  status?: string;
  type?: string;
  priority?: string;
  page?: number;
  limit?: number;
}

export interface ProjectIssuesResponse {
  issues: IssueSummary[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export async function getProjectIssues(params: GetProjectIssuesParams): Promise<ProjectIssuesResponse> {
  const { projectId, ...query } = params;
  return apiClient<ProjectIssuesResponse>(`/api/projects/${projectId}/issues`, { query });
}
