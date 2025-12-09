import { apiClient } from '@/lib/api-client';
import type { IssueDetailData } from '../types';

export interface CreateIssueParams {
  projectId: string;
  title: string;
  description?: string;
  type: string;
  priority: string;
}

export async function createIssue(params: CreateIssueParams): Promise<{ issue: IssueDetailData }> {
  const { projectId, ...body } = params;
  return apiClient<{ issue: IssueDetailData }>(`/api/projects/${projectId}/issues`, {
    method: 'POST',
    body,
  });
}
