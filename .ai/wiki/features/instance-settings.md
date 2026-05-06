---
title: Feature — instance-settings
type: feature
tags: [feature, instance, admin, self-host]
last_updated: 2026-05-01
sources: [sources/feature-arch-resource-limits, sources/steering-product]
---

# Feature: `instance-settings`

Instance-level configuration screen for self-hosted deployments. Surfaces the env-var-controlled quotas defined in [[concepts/quotas-and-plans]].

## Code map

- **screens/** — `instance-settings-screen.tsx`
- **components/** — instance settings widgets

No `api/` or `hooks/` subfolder — most data comes from `src/config/quotas.ts` and runtime env vars; updates require redeploy.

## Related

- Features: [[features/setup]], [[features/team-settings]]
- Concepts: [[concepts/quotas-and-plans]], [[concepts/deployment]]
