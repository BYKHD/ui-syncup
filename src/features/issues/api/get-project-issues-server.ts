/**
 * Server-side API functions for data prefetching
 * 
 * These functions are designed to be called from Server Components
 * to prefetch data that will be hydrated on the client.
 */

import type { ProjectIssuesResponse } from './get-project-issues';

export interface ServerFetchOptions {
  cookieHeader: string;
}

/**
 * Server-side fetch for project issues
 * Used to prefetch issues data in server components
 */
export async function getProjectIssuesServer(
  projectId: string,
  options: ServerFetchOptions
): Promise<ProjectIssuesResponse | null> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/projects/${projectId}/issues`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Cookie': options.cookieHeader,
        },
        cache: 'no-store',
      }
    );

    if (!response.ok) {
      console.warn(`Failed to prefetch issues for project ${projectId}:`, response.status);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.warn(`Error prefetching issues for project ${projectId}:`, error);
    return null;
  }
}
