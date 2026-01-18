# Refactor Onboarding - GPT Report

## Scope
This report reviews the implemented files referenced by `.kiro/specs/refactor-onboarding/tasks.md` and assesses the end-to-end onboarding and setup UX for the self-hosted flow. Focus areas:

- Setup wizard UI, hooks, and API contracts
- Proxy routing and setup gating
- Workspace mode behavior (single vs multi)
- Post-setup admin settings
- Onboarding, self-registration, and invitation flows

## Executive Summary
The refactor introduces a robust setup wizard and new workspace-mode-aware onboarding primitives, but key API contract mismatches and missing endpoints block the primary user journey. The setup flow cannot complete as implemented, and multi-workspace UX is likely hidden on the client due to server-only env checks. Several new onboarding components are not wired to routes, and invitation acceptance is split across multiple, inconsistent endpoints.

## Implementation Map (Key Files)

### Setup Wizard (Frontend)
- `src/app/(public)/setup/page.tsx`
- `src/features/setup/screens/setup-screen.tsx`
- `src/features/setup/components/setup-wizard.tsx`
- `src/features/setup/components/service-health-step.tsx`
- `src/features/setup/components/admin-account-step.tsx`
- `src/features/setup/components/instance-config-step.tsx`
- `src/features/setup/components/first-workspace-step.tsx`
- `src/features/setup/components/sample-data-step.tsx`
- `src/features/setup/hooks/*`
- `src/features/setup/api/*`
- `src/features/setup/types/*`
- `src/features/setup/utils/*`

### Setup Wizard (Backend)
- `src/server/setup/setup-service.ts`
- `src/server/setup/health-check-service.ts`
- `src/server/setup/sample-data-service.ts`
- `src/server/setup/types.ts`
- `src/app/api/setup/status/route.ts`
- `src/app/api/setup/health/route.ts`
- `src/app/api/setup/admin/route.ts`
- `src/app/api/setup/config/route.ts`
- `src/app/api/setup/complete/route.ts`
- `src/app/api/setup/export/route.ts`
- `src/app/api/setup/import/route.ts`

### Workspace Mode and Settings
- `src/config/workspace.ts`
- `src/components/shared/sidebar/app-sidebar.tsx`
- `src/components/shared/sidebar/sidebar-team-switcher.tsx`
- `src/features/instance-settings/components/instance-settings-form.tsx`
- `src/features/instance-settings/components/instance-status-display.tsx`

### Onboarding and Invitations
- `src/app/(protected)/onboarding/page.tsx`
- `src/features/auth/screens/onboarding-screen.tsx`
- `src/features/auth/components/onboarding-form.tsx`
- `src/features/auth/hooks/use-onboarding.ts`
- `src/features/auth/components/self-registration-choice.tsx`
- `src/features/auth/components/invite-code-input.tsx`
- `src/features/auth/components/invited-user-form.tsx`
- `src/features/auth/hooks/use-self-registration.ts`
- `src/features/auth/hooks/use-accept-invitation.ts`
- `src/app/(public)/invite/project/[token]/page.tsx`

### Proxy and Gating
- `src/proxy.ts`

## Current User Flows (As Implemented)

### 1) Setup gating via proxy
- `src/proxy.ts` checks `/api/setup/status` for protected routes.
- If setup is incomplete, it redirects to `/setup`.
- If `FORCE_SETUP=true`, it redirects protected routes to `/setup`.

### 2) Setup wizard (UI)
- Step 1: Health check via `/api/setup/health`
- Step 2: Admin account via `/api/setup/admin` (sets session)
- Step 3: Instance config via `/api/setup/config`
- Step 4: First workspace via `/api/setup/workspace` (missing)
- Step 5: Sample data and completion via `/api/setup/complete`

### 3) Post-auth onboarding (current route)
- `/onboarding` uses `use-onboarding` which still runs mock invitation logic.
- Workspace creation is done by `useCreateTeam` then `/api/teams/:id/switch`.
- Invite acceptance is mocked in `use-onboarding` and does not call any real endpoint.

### 4) Self-registration + invite code (new primitives)
- `use-self-registration` and `self-registration-choice` exist but are not wired into the onboarding page.
- These call endpoints that do not exist in the app (`/api/teams/:id/join`, `/api/invitations/validate`, `/api/invitations/:token`).

### 5) Invitation acceptance (project invites)
- `/invite/project/[token]` is a server-rendered flow using `getInvitationByToken` and `InvitationAcceptanceScreen` from the projects feature.
- This is separate from the new auth invitation hooks and components.

## Mermaid Diagrams

### End-to-end Entry Flow
```mermaid
flowchart TB
  Request[User request] --> Proxy[proxy.ts]
  Proxy -->|setup not complete| Setup[/setup]
  Proxy -->|setup complete| ProtectedRoutes[Protected app routes]
  Proxy -->|FORCE_SETUP=true| Setup

  Setup --> Wizard[Setup wizard]
  Wizard --> Projects[/projects]
```

### Setup Wizard Flow (Current Contract)
```mermaid
flowchart LR
  Health[Health check] --> Admin[Create admin]
  Admin --> Config[Instance config]
  Config --> Workspace[First workspace]
  Workspace --> Complete[Complete setup]
  Complete --> Redirect[/dashboard]
```

### Onboarding and Self-Registration Flow (Implemented vs Intended)
```mermaid
flowchart TB
  Signup[Sign up] --> OnboardingPage[/onboarding]

  subgraph Current
    OnboardingPage --> MockFlow[use-onboarding (mock)]
    MockFlow --> CreateTeam[POST /api/teams]
    CreateTeam --> SwitchTeam[POST /api/teams/:id/switch]
    SwitchTeam --> Projects[/projects]
  end

  subgraph NewPrimitives
    Choice[SelfRegistrationChoice]
    InviteCode[InviteCodeInput]
    AcceptInvite[InvitedUserForm]
  end

  Note1[New primitives exist but are not wired] --- NewPrimitives
```

### Invitation Acceptance (Project Invite)
```mermaid
flowchart TB
  InviteLink[/invite/project/:token] --> AuthCheck{Signed in?}
  AuthCheck -->|No| SignIn[/sign-in]
  AuthCheck -->|Yes| Validate[Server validate token]
  Validate -->|Pending| AcceptUI[InvitationAcceptanceScreen]
  Validate -->|Invalid or expired| ErrorUI[Error state]
```

## UX Issues and Mismatches (Ordered by Severity)

| Severity | Issue | UX Impact | Evidence |
| --- | --- | --- | --- |
| Critical | Setup wizard cannot complete due to missing endpoint and payload mismatch | Users are blocked on Step 4 or Step 5 and never reach the app | `src/features/setup/api/create-first-workspace.ts` calls `/api/setup/workspace` (missing). `src/features/setup/components/sample-data-step.tsx` sends `workspaceId` but `src/app/api/setup/complete/route.ts` expects `workspaceName`. |
| High | Post-setup redirect goes to `/dashboard` which is not routed | Users hit 404 immediately after setup | `src/features/setup/components/sample-data-step.tsx` redirects to `/dashboard`; core app uses `/projects`. |
| High | Workspace mode UI likely renders as single-workspace in the client | Multi-workspace users cannot access workspace switcher or creation paths | `isSingleWorkspaceMode()` reads server env in client code: `src/components/shared/sidebar/app-sidebar.tsx`, `src/components/shared/sidebar/sidebar-team-switcher.tsx`, `src/features/auth/components/self-registration-choice.tsx`. |
| High | New self-registration and invite flows are not wired and call non-existent endpoints | Users cannot join via invite code or auto-join in single mode | `src/features/auth/screens/onboarding-screen.tsx` still uses mock `use-onboarding`. `src/features/auth/hooks/use-self-registration.ts` calls `/api/teams/:id/join` and `/api/invitations/validate` which do not exist. |
| Medium | Instance settings exposes "Default Member Role" but never persists it | User thinks role changed; backend remains unchanged | `src/features/instance-settings/components/instance-settings-form.tsx` does not send `defaultMemberRole`. `src/app/api/setup/config/route.ts` expects it. |
| Medium | Onboarding invitation acceptance is still mocked | Invited users see success copy but are not actually added | `src/features/auth/hooks/use-onboarding.ts` uses setTimeout mock. |
| Low | Setup health step lacks "Configure Services" guidance and workspace mode indicator | Admins do not get clear next steps for missing services | `src/features/setup/components/service-health-step.tsx`. |
| Low | First workspace step does not show slug preview | Users cannot confirm workspace URL before creation | `src/features/setup/components/first-workspace-step.tsx` does not render slug preview. |
| Low | Sample data copy does not match actual data creation | Users expect users/annotations but only project + issues are created | `src/features/setup/components/sample-data-step.tsx` copy vs `src/server/setup/sample-data-service.ts`. |

## Contract Gaps and Missing Endpoints

Missing or inconsistent endpoints referenced in the new flow:
- `/api/setup/workspace` (called by setup wizard Step 4)
- `/api/teams/:id/join` (single-workspace auto-join)
- `/api/invitations/validate` (invite code submission)
- `/api/invitations/:token` and `/api/invitations/:token/accept` (used by `use-accept-invitation`)

Existing invitation paths are different:
- `/invite/project/:token` (public route)
- `/api/teams/invitations/:token/accept` (team invite accept)
- Project invitation routes under `/app/api/invite/project/[token]` and server services

## Recommendations (Fix Order)

1) Align setup wizard contracts and endpoints
   - Add `/api/setup/workspace` or move workspace creation into `/api/setup/complete`.
   - Ensure the frontend payload matches backend schema.
   - Redirect to `/projects` on completion.

2) Fix client-side workspace mode detection
   - Use `useWorkspaceMode` or expose `NEXT_PUBLIC_MULTI_WORKSPACE_MODE`.
   - Remove direct `isSingleWorkspaceMode()` calls in client UI.

3) Wire self-registration to a real route
   - Replace the mock onboarding flow with `use-self-registration` and `self-registration-choice`.
   - Update endpoints or align existing team/project invitation routes.

4) Persist default member role from instance settings
   - Include `defaultMemberRole` in the API payload and DTOs.

5) Polish setup wizard UX content
   - Add service configuration guidance.
   - Add workspace slug preview.
   - Align sample data copy with actual content.

## Open Questions
- Should invite code validation target team invitations or project invitations?
- Should the onboarding route be public or remain protected after sign-up?
- Is `/projects` the canonical post-login landing (dashboard) for all flows?

