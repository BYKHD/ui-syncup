import { apiClient } from '@/lib/api-client'
import type { MyIssue } from '../types'

export interface MyIssuesResponse {
  issues: MyIssue[]
}

export async function getMyIssues(): Promise<MyIssuesResponse> {
  return apiClient<MyIssuesResponse>('/api/dashboard/my-issues')
}
