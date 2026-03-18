---
name: contract-driven-ui
description: Use when building any frontend page, component, or user flow before the real API is ready — when you need to scaffold UI from API contract shapes, generate typed fixture data, or wire up a mock service layer using docs/API_CONTRACTS_V1.md as source of truth.
---

# Contract-Driven UI Development

## Overview

Build real frontend UI from API contract shapes using typed fixture data — no backend required. The UI and backend develop in parallel; swap `USE_MOCK=false` when the real API ships.

**Core principle:** The API contract is the source of truth. Fixtures must be strictly typed against contract shapes. Never invent fields.

---

## When to Use

- Building any page/flow before the real API exists
- Scaffolding a new feature from `docs/API_CONTRACTS_V1.md`
- Designing all UI states (loading, empty, error, edge) for a page
- Connecting frontend to a newly reviewed feature spec

**Do NOT use** for: pages that already have a working API endpoint (use the real service instead).

---

## Step-by-Step Process

### Step 1 — Read the Contract

Always start here. Open `docs/API_CONTRACTS_V1.md` and locate:

1. The endpoint(s) for the feature you're building
2. The **request/response shape** (columns: `Request (shape)` and `Response (shape)`)
3. The **error codes** the endpoint can return
4. The **shared conventions** (Section 2) — especially the success/error envelopes and pagination contract

**Key sections by feature:**

| Feature | Section in API_CONTRACTS_V1.md |
|---|---|
| Auth / Session / Roles | §5.1 |
| Ideas (submit, feed, detail) | §5.2 |
| Campaigns | §5.3 |
| Reactions / Boosts / Comments | §5.4 |
| Governance Inbox / Scorecards | §5.5 |
| Admin Config / Themes / Teams | §5.6 |
| Notifications | §5.7 |
| My Hub / Profile | §5.8 |
| Analytics | §5.9 |
| Gamification / XP | §5.10 |

Also cross-reference `docs/developments/MVP_V1.md` for flow details and acceptance criteria.

---

### Step 2 — Define TypeScript Types

Create or update `src/types/<module>.types.ts` using the contract shapes. Match field names exactly.

```ts
// src/types/idea.types.ts
// Source: API_CONTRACTS_V1.md §5.2

export type IdeaIntent = 'Problem' | 'Solution'
export type IdeaStatus =
  | 'Draft' | 'Submitted' | 'Open' | 'Shortlisted'
  | 'Planned' | 'In Progress' | 'Launched' | 'Deferred' | 'Closed' | 'Resolved'

export interface IdeaCard {
  id: string
  intent: IdeaIntent
  title: string
  status: IdeaStatus
  themeId: string
  themeName: string
  authorDisplayName: string       // "Anonymous" when semi-anonymous
  campaignId?: string
  createdAt: string               // UTC ISO-8601
  engagementSummary: {
    viewCount: number
    reactionCounts: Record<string, number>
    boostCount: number
    commentCount: number
    signalScore: number
  }
  isCeoPick: boolean
  reportCardPhase: ReportCardPhase
}

export type ReportCardPhase =
  | 'Needs Signal'
  | 'Awaiting Review Start'
  | 'Under Review'
  | 'Decision Published'
```

---

### Step 3 — Write Realistic Fixture Files

Create fixtures in `src/mocks/fixtures/<module>.fixtures.ts`.

**Rules:**
- Use Thai names, realistic KPC data (departments, ideas, campaigns)
- Cover edge values: very long titles, zero counts, max counts
- Use `null` / `undefined` for optional fields to catch rendering bugs
- Use UTC ISO-8601 for all timestamps

```ts
// src/mocks/fixtures/ideas.fixtures.ts
import type { IdeaCard } from '@/types/idea.types'

export const mockIdeaCards: IdeaCard[] = [
  {
    id: 'idea_001',
    intent: 'Problem',
    title: 'ช่องทางสั่งซื้อ Duty Free สำหรับลูกค้า Transit ยังไม่ชัดเจน',
    status: 'Open',
    themeId: 'theme_cust_exp',
    themeName: 'Customer Experience',
    authorDisplayName: 'Anonymous',        // semi-anonymous
    createdAt: '2026-02-01T08:30:00Z',
    engagementSummary: {
      viewCount: 342,
      reactionCounts: { Like: 28, Love: 14, Insightful: 9 },
      boostCount: 7,
      commentCount: 12,
      signalScore: 75,                     // (28+14+9)×1 + 12×2 + 7×5 = 86 — verify formula
    },
    isCeoPick: false,
    reportCardPhase: 'Under Review',
  },
  // ... more fixtures covering all statuses and phases
]

// Edge case fixtures
export const mockEmptyFeed: IdeaCard[] = []
export const mockSingleIdea: IdeaCard[] = [mockIdeaCards[0]]
```

---

### Step 4 — Create the Mock Service Layer

Abstract all data fetching so the mock/real switch is one environment variable.

```ts
// src/services/ideas.service.ts
import { mockIdeaCards } from '@/mocks/fixtures/ideas.fixtures'
import type { IdeaCard } from '@/types/idea.types'

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true'

export async function getIdeas(params?: {
  surface?: 'feed' | 'explore' | 'roadmap'
  status?: string[]
  page?: number
  pageSize?: number
}): Promise<{ items: IdeaCard[]; meta: PaginationMeta }> {
  if (USE_MOCK) {
    return {
      items: mockIdeaCards,
      meta: { page: 1, pageSize: 20, total: mockIdeaCards.length, hasNext: false },
    }
  }
  const res = await fetch(`/api/v1/ideas?${new URLSearchParams(params as any)}`)
  if (!res.ok) throw new Error(await res.text())
  return res.json().then(r => r.data)
}
```

---

### Step 5 — Build All UI States

For every page or component, implement **all states** before marking it done:

| State | What to build |
|---|---|
| **Loading** | Skeleton / shimmer placeholders (match real layout) |
| **Empty** | Zero-item state with helpful message, no blank white box |
| **Error** | Error boundary or inline error with retry action |
| **Partial data** | Optional fields missing (avatar, campaignId, etc.) |
| **Full / Edge** | 50+ items, very long Thai text, max attachment count |
| **Forbidden (403)** | Role-gated pages show correct "no access" state |

---

### Step 6 — Verify Against Contract Rules

Before calling a page done, check these mandatory contract rules from `API_CONTRACTS_V1.md §2`:

- [ ] **Success envelope**: unwrap `data` from `{ data: {}, meta: {} }`
- [ ] **Error envelope**: handle `error.code`, show `error.message` (localized), use `error.details[].field` for form errors
- [ ] **Pagination**: respect `hasNext` for infinite scroll / load more
- [ ] **Timestamps**: display in user timezone (default `Asia/Bangkok` / `th-TH` locale per §2.10)
- [ ] **Semi-anonymous**: show `"Anonymous"` wherever `authorDisplayName` is `"Anonymous"` — never reveal real name
- [ ] **RBAC-gated UI**: hide/disable actions based on user role (see `docs/feature-definitions/AUTH_MODULE.md`)
- [ ] **Attachment states**: only render `clean`-state attachments; show placeholder for `pending_scan`/`quarantined`

---

## File Structure

```
src/
├── types/
│   ├── idea.types.ts
│   ├── governance.types.ts
│   ├── engagement.types.ts
│   └── shared.types.ts          ← PaginationMeta, ApiError, etc.
├── mocks/
│   └── fixtures/
│       ├── ideas.fixtures.ts
│       ├── users.fixtures.ts
│       ├── governance.fixtures.ts
│       └── notifications.fixtures.ts
└── services/
    ├── ideas.service.ts
    ├── governance.service.ts
    └── notifications.service.ts
```

---

## Shared Types to Always Define

These come from `API_CONTRACTS_V1.md §2` and are used everywhere:

```ts
// src/types/shared.types.ts

export interface ApiMeta {
  requestId: string
  timestamp: string
}

export interface PaginationMeta extends ApiMeta {
  page: number
  pageSize: number
  total: number
  hasNext: boolean
  sort?: string
  order?: 'asc' | 'desc'
  appliedFilters?: Record<string, unknown>
  appliedSearch?: string | null
}

export interface ApiError {
  code: string
  message: string
  details?: { field?: string; reason: string }[]
  requestId: string
}
```

---

## Common Mistakes

| Mistake | Fix |
|---|---|
| Inventing fixture fields not in contract | Only use fields from the API contract shape tables |
| `authorDisplayName` showing real name | Always check visibility: show `"Anonymous"` per §F3 rules |
| Hardcoding `page=1` without pagination meta | Always wire up `PaginationMeta` even in mock |
| Missing error states | Build 400/403/404/409/429 UI states for every mutation |
| Timestamps in local format | Format all dates with user locale; default `th-TH`, `Asia/Bangkok` |
| Skipping loading skeleton | Every async component needs a skeleton that matches its real layout |
| Using boolean for attachment visibility | Check `attachment.scanStatus === 'clean'` per §2.6 |
