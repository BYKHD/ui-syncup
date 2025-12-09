import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createIssue, type CreateIssueParams } from '../api/create-issue';
import type { IssueDetailData } from '../types';

export interface UseCreateIssueOptions {
  onSuccess?: (data: { issue: IssueDetailData }) => void;
  onError?: (error: Error) => void;
}

export function useCreateIssue(options?: UseCreateIssueOptions) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: createIssue,
    onSuccess: (data, variables) => {
      // Invalidate project issues list
      queryClient.invalidateQueries({ queryKey: ['projects', variables.projectId, 'issues'] });
      
      toast.success('Issue created');
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      toast.error(`Failed to create issue: ${error.message}`);
      options?.onError?.(error);
    }
  });
}
