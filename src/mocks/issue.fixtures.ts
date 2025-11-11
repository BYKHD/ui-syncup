// ============================================================================
// ISSUE MOCK FIXTURES
// ============================================================================

import type { IssuePriority, IssueType, IssueStatus } from '@/features/issues/types';

// Re-export types for convenience
export type { IssuePriority, IssueType, IssueStatus };

// Basic issue type for list view
export interface Issue {
  id: string;
  projectId: string;
  issueKey: string;
  title: string;
  description: string;
  type: IssueType;
  priority: IssuePriority;
  status: IssueStatus;
  coverImageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

// Detailed issue type with all relationships
export interface IssueDetail extends Issue {
  projectKey: string;
  projectName: string;
  assignee: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  } | null;
  reporter: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string | null;
  };
}

export const MOCK_ISSUES: Issue[] = [
  {
    id: 'issue_1',
    projectId: 'proj_1',
    issueKey: 'MKT-101',
    title: 'Button alignment issue on mobile homepage',
    description: 'The CTA button on the homepage hero section is misaligned on mobile devices (iOS Safari)',
    type: 'bug',
    priority: 'high',
    status: 'open',
    coverImageUrl: null,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'issue_2',
    projectId: 'proj_1',
    issueKey: 'MKT-102',
    title: 'Add dark mode toggle to navigation',
    description: 'Users have requested a dark mode option. Add toggle to main navigation.',
    type: 'feature',
    priority: 'medium',
    status: 'in_progress',
    coverImageUrl: null,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: 'issue_3',
    projectId: 'proj_1',
    issueKey: 'MKT-103',
    title: 'Optimize hero image loading performance',
    description: 'Hero images on landing page are loading slowly. Implement lazy loading and WebP format.',
    type: 'improvement',
    priority: 'medium',
    status: 'in_review',
    coverImageUrl: null,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'issue_4',
    projectId: 'proj_1',
    issueKey: 'MKT-104',
    title: 'Footer links broken on pricing page',
    description: 'Several footer links are returning 404 errors on the pricing page.',
    type: 'bug',
    priority: 'high',
    status: 'resolved',
    coverImageUrl: null,
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'issue_5',
    projectId: 'proj_1',
    issueKey: 'MKT-105',
    title: 'Contact form email validation too strict',
    description: 'Contact form rejects valid email addresses with plus signs and subdomains.',
    type: 'bug',
    priority: 'critical',
    status: 'open',
    coverImageUrl: null,
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: 'issue_6',
    projectId: 'proj_1',
    issueKey: 'MKT-106',
    title: 'Add analytics tracking to CTA buttons',
    description: 'Implement Google Analytics event tracking for all CTA button clicks.',
    type: 'feature',
    priority: 'low',
    status: 'open',
    coverImageUrl: null,
    createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
  },
];

// ============================================================================
// DETAILED ISSUE DATA (for detail view with full relationships)
// ============================================================================

export const MOCK_DETAILED_ISSUES: IssueDetail[] = [
  {
    id: 'issue_1',
    projectId: 'proj_1',
    projectKey: 'MKT',
    projectName: 'Marketing Site',
    issueKey: 'MKT-101',
    title: 'Button alignment issue on mobile homepage',
    description: `The CTA button on the homepage hero section is misaligned on mobile devices (iOS Safari).

## Steps to Reproduce
1. Open the homepage on iOS Safari (tested on iPhone 13 Pro, iOS 16.3)
2. Scroll to the hero section
3. Observe the "Get Started" button position

## Expected Behavior
The button should be centered horizontally in the hero section.

## Actual Behavior
The button appears shifted 20px to the left, creating an asymmetric layout.

## Additional Context
This issue does not occur on Android Chrome or desktop browsers.`,
    type: 'bug',
    priority: 'high',
    status: 'open',
    assignee: {
      id: 'user_1',
      name: 'Sarah Chen',
      email: 'sarah@example.com',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    },
    reporter: {
      id: 'user_2',
      name: 'Mike Johnson',
      email: 'mike@example.com',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike',
    },
    coverImageUrl: '/playground/TEST-1/LinkedIn-skeleton-screen.png',
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'issue_2',
    projectId: 'proj_1',
    projectKey: 'MKT',
    projectName: 'Marketing Site',
    issueKey: 'MKT-102',
    title: 'Add dark mode toggle to navigation',
    description: `Users have requested a dark mode option. Add toggle to main navigation.

## Requirements
- Add a toggle switch in the main navigation bar
- Implement theme context provider for app-wide theme management
- Save user preference to localStorage
- Support system preference detection (prefers-color-scheme)
- Ensure all components respect the theme setting

## Design Notes
Follow the existing design system color tokens for dark mode variants.`,
    type: 'feature',
    priority: 'medium',
    status: 'in_progress',
    assignee: {
      id: 'user_1',
      name: 'Sarah Chen',
      email: 'sarah@example.com',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    },
    reporter: {
      id: 'user_2',
      name: 'Mike Johnson',
      email: 'mike@example.com',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike',
    },
    coverImageUrl: null,
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'issue_3',
    projectId: 'proj_1',
    projectKey: 'MKT',
    projectName: 'Marketing Site',
    issueKey: 'MKT-103',
    title: 'Optimize hero image loading performance',
    description: `Hero images on landing page are loading slowly. Implement lazy loading and WebP format.

## Current Performance Metrics
- LCP: 3.2s (needs improvement)
- Hero image size: 450KB
- Format: JPEG

## Proposed Solution
1. Convert images to WebP format (60-70% size reduction)
2. Implement Intersection Observer for lazy loading
3. Add progressive image loading with blur placeholder
4. Serve different sizes based on viewport

## Target Metrics
- LCP: < 2.0s
- Hero image size: < 150KB`,
    type: 'improvement',
    priority: 'medium',
    status: 'in_review',
    assignee: {
      id: 'user_4',
      name: 'Alex Rodriguez',
      email: 'alex@example.com',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
    },
    reporter: {
      id: 'user_3',
      name: 'Emma Williams',
      email: 'emma@example.com',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma',
    },
    coverImageUrl: null,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'issue_4',
    projectId: 'proj_1',
    projectKey: 'MKT',
    projectName: 'Marketing Site',
    issueKey: 'MKT-104',
    title: 'Footer links broken on pricing page',
    description: `Several footer links are returning 404 errors on the pricing page.

## Broken Links
- Privacy Policy: /legal/privacy (404)
- Terms of Service: /legal/terms (404)
- Cookie Policy: /legal/cookies (404)

## Root Cause
The /legal directory was moved to /policies during the recent restructure, but footer links were not updated.`,
    type: 'bug',
    priority: 'high',
    status: 'resolved',
    assignee: {
      id: 'user_1',
      name: 'Sarah Chen',
      email: 'sarah@example.com',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    },
    reporter: {
      id: 'user_4',
      name: 'Alex Rodriguez',
      email: 'alex@example.com',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
    },
    coverImageUrl: null,
    createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'issue_5',
    projectId: 'proj_1',
    projectKey: 'MKT',
    projectName: 'Marketing Site',
    issueKey: 'MKT-105',
    title: 'Contact form email validation too strict',
    description: `Contact form rejects valid email addresses with plus signs and subdomains.

## Examples of Rejected Valid Emails
- user+tag@example.com
- user@subdomain.example.com
- user.name+filter@company.co.uk

## Current Validation
Uses a basic regex that doesn't follow RFC 5322 standard.

## Impact
Users are unable to submit contact forms with these valid email formats, resulting in support complaints and lost leads.`,
    type: 'bug',
    priority: 'critical',
    status: 'open',
    assignee: null,
    reporter: {
      id: 'user_2',
      name: 'Mike Johnson',
      email: 'mike@example.com',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike',
    },
    coverImageUrl: null,
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: 'issue_6',
    projectId: 'proj_1',
    projectKey: 'MKT',
    projectName: 'Marketing Site',
    issueKey: 'MKT-106',
    title: 'Add analytics tracking to CTA buttons',
    description: `Implement Google Analytics event tracking for all CTA button clicks.

## Buttons to Track
- Hero "Get Started" button
- Pricing "Start Free Trial" buttons
- Footer "Contact Us" button

## Event Structure
\`\`\`
{
  event: 'cta_click',
  cta_location: 'hero' | 'pricing' | 'footer',
  cta_text: string,
  page_path: string
}
\`\`\``,
    type: 'feature',
    priority: 'low',
    status: 'open',
    assignee: null,
    reporter: {
      id: 'user_3',
      name: 'Emma Williams',
      email: 'emma@example.com',
      avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma',
    },
    coverImageUrl: null,
    createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
  },
];

// Helper function to get detailed issue by ID
export function getDetailedIssueById(issueId: string): IssueDetail | undefined {
  return MOCK_DETAILED_ISSUES.find((issue) => issue.id === issueId);
}

// Helper function to get detailed issue by key
export function getDetailedIssueByKey(issueKey: string): IssueDetail | undefined {
  return MOCK_DETAILED_ISSUES.find((issue) => issue.issueKey === issueKey);
}
