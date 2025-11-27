# Seed Data

This file documents the data seeded into the local Supabase database for development purposes.

## Users

| Name | Email | Password | Role |
|------|-------|----------|------|
| Demo User | `demo@ui-syncup.com` | `password123` | Team Owner |

## Teams

| Name | Slug | Plan |
|------|------|------|
| Demo Team | `demo-team` | Free |

## Relationships

- **Demo User** is a member of **Demo Team** with:
  - Management Role: `TEAM_OWNER`
  - Operational Role: `TEAM_EDITOR`
