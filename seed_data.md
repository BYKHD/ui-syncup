# Seed Data

`bun run db:seed` provisions a deterministic playground for the team system.  
All accounts use the shared password **`password123`**.

## Users

| Email | Name | Primary Role |
| --- | --- | --- |
| `demo@ui-syncup.com` | Demo User | Demo Team owner & Product Design admin |
| `alice@ui-syncup.com` | Alice Smith | Product Design owner, Demo Team admin |
| `bob@ui-syncup.com` | Bob Jones | Demo Team member, QA Guild admin/editor |
| `charlie@ui-syncup.com` | Charlie Brown | Demo Team viewer |
| `diana@ui-syncup.com` | Diana Prince | Product Design member |
| `eve@ui-syncup.com` | Eve Turner | QA Guild owner |

## Teams & Memberships

| Team | Slug | Plan | Owner(s) | Admins | Billable Seats* |
| --- | --- | --- | --- | --- | --- |
| Demo Team | `demo-team` | Free | Demo User | Alice Smith | 2 (Demo, Alice) |
| Product Design | `product-design` | Pro | Alice Smith | Demo User | 2 (Alice, Demo) |
| QA Guild | `qa-guild` | Free | Eve Turner | Bob Jones | 1 (Bob) |

\*Billable seats count members with the `TEAM_EDITOR` operational role.

Additional members:
- Demo Team: Bob (`TEAM_MEMBER`), Charlie (`TEAM_VIEWER`)
- Product Design: Diana (`TEAM_MEMBER`)
- QA Guild: Eve (`TEAM_MEMBER` operational role) + Bob (`TEAM_EDITOR`)

## Invitations

| Team | Email | Role | Status |
| --- | --- | --- | --- |
| Demo Team | `pm.contractor@ui-syncup.com` | Admin + Editor | Pending (token logged in console) |
| Demo Team | `designer.contract@ui-syncup.com` | Member | Accepted |
| Product Design | `qa.lead@ui-syncup.com` | Viewer | Expired |
| QA Guild | `ops.manager@ui-syncup.com` | Admin + Member | Cancelled |

Pending invitations include a unique token printed at the end of the seed script so you can test the acceptance flow.

## Projects

| Name | Owner | Purpose |
| --- | --- | --- |
| Design System Refresh | Alice Smith | Blocks demotion/removal while Alice owns projects |
| Release Regression Suite | Bob Jones | Ensures QA Guild admin is billable |

## Demo Tips

- Use Demo Team to test ownership transfer (owner: Demo → admin: Alice).
- Product Design lives on the Pro plan so billing UI always has data.
- QA Guild has just two members for quick checks of removal safeguards.
