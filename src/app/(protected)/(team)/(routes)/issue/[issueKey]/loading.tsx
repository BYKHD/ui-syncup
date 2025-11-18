// ============================================================================
// ISSUE LOADING STATE
// Displayed while the issue page is loading
// ============================================================================

import { EnhancedResponsiveIssueLayoutSkeleton } from '@/features/issues';

export default function IssueLoading() {
  return (
    <div className="h-screen">
      <EnhancedResponsiveIssueLayoutSkeleton />
    </div>
  );
}
