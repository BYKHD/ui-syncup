# Mock Data Directory

This directory contains all mock/fixture data for UI development and testing, following the project scaffolding guidelines from `AGENTS.md`.

## Structure

```
src/mocks/
├── index.ts                    # Barrel exports for all fixtures
├── notification.fixtures.ts    # Notification domain mocks
├── team.fixtures.ts           # Team domain mocks
├── user.fixtures.ts           # User domain mocks
└── settings.fixtures.ts       # Settings domain mocks
```

## Usage

Import mock data from the centralized location:

```typescript
// Import specific fixtures
import { MOCK_NOTIFICATIONS, MOCK_TEAM_ID } from '@/mocks'

// Import types
import type { Notification, Team } from '@/mocks'
```

## Guidelines

- **Domain-based organization**: Each fixture file represents a domain (notifications, teams, users, etc.)
- **Type co-location**: Types are defined alongside their mock data
- **Barrel exports**: All fixtures are re-exported through `index.ts`
- **Clear boundary**: Mock data is separate from real backend logic (`server/`) and feature logic (`features/`)
- **Aligned to real types**: Mock data structure matches the real domain types from features

## Migration Notes

Mock data was previously scattered in:
- `src/components/shared/notifications/mock-data.ts` → moved to `notification.fixtures.ts` and `team.fixtures.ts`
- `src/features/setting/utils/mock-data.ts` → moved to `team.fixtures.ts`, `user.fixtures.ts`, and `settings.fixtures.ts`

The settings feature still re-exports mocks for backward compatibility but now imports from this centralized location.
