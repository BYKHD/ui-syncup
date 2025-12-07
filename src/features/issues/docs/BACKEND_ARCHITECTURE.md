# Issues Feature Backend Architecture

Backend implementation plan for wiring the ready-to-wire UI in `src/features/issues` to a real database and API layer.

## Design Decisions

| Decision | Choice |
|----------|--------|
| Issue Key Format | `{PROJECT_KEY}-{NUMBER}` (e.g., `MKT-101`) |
| Deletion Strategy | **Hard delete** with cascade (no soft delete) |
| Attachment Limits | 10MB per file, 50MB total per issue |
| Activity Retention | 2 years (then archive to cold storage) |
| Annotations Storage | **JSONB** column in `issue_attachments` |

---

## Database Schema

Issues belong to projects: **Team → Project → Issue → (Attachments, Activities)**

### Issues Table

```sql
CREATE TABLE issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  issue_key VARCHAR(20) NOT NULL,       -- "{PROJECT_KEY}-{NUMBER}" e.g., "MKT-101"
  issue_number INTEGER NOT NULL,         -- Auto-incremented per project
  title VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(20) NOT NULL DEFAULT 'bug',
  priority VARCHAR(20) NOT NULL DEFAULT 'medium',
  status VARCHAR(20) NOT NULL DEFAULT 'open',
  assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reporter_id UUID NOT NULL REFERENCES users(id),
  cover_image_url TEXT,
  page VARCHAR(255),
  figma_link TEXT,
  jira_link TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  UNIQUE(project_id, issue_number),
  UNIQUE(project_id, issue_key)
);

CREATE INDEX issues_project_id_idx ON issues(project_id);
CREATE INDEX issues_status_idx ON issues(status);
CREATE INDEX issues_assignee_id_idx ON issues(assignee_id);
```

### Issue Attachments Table (with JSONB Annotations)

```sql
CREATE TABLE issue_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_size INTEGER NOT NULL,            -- Max 10MB (10485760 bytes)
  file_type VARCHAR(50) NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  width INTEGER,
  height INTEGER,
  review_variant VARCHAR(20),            -- 'as_is', 'to_be', 'reference'
  annotations JSONB DEFAULT '[]',        -- Array of AttachmentAnnotation objects
  uploaded_by_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  CONSTRAINT max_file_size CHECK (file_size <= 10485760)
);

CREATE INDEX issue_attachments_issue_id_idx ON issue_attachments(issue_id);
```

**Annotations JSONB Structure** (matches `src/features/annotations/types`):

```typescript
// Each annotation in the JSONB array
interface AttachmentAnnotation {
  id: string;
  attachmentId: string;
  label: string;
  description?: string;
  x: number;
  y: number;
  author: {
    id: string;
    name: string;
    email?: string;
    avatarUrl?: string | null;
  };
  createdAt: string;
  shape?: 
    | { type: 'pin'; position: { x: number; y: number } }
    | { type: 'box'; start: { x: number; y: number }; end: { x: number; y: number } };
  comments?: Array<{
    id: string;
    annotationId: string;
    author: { id: string; name: string; };
    message: string;
    createdAt: string;
  }>;
}
```

### Issue Activities Table

```sql
CREATE TABLE issue_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES users(id),
  type VARCHAR(30) NOT NULL,
  changes JSONB,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX issue_activities_issue_id_idx ON issue_activities(issue_id);
CREATE INDEX issue_activities_created_at_idx ON issue_activities(created_at DESC);
```

---

## API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/projects/:projectId/issues` | List issues | PROJECT_VIEWER+ |
| POST | `/api/projects/:projectId/issues` | Create issue | PROJECT_EDITOR+ |
| GET | `/api/issues/:issueId` | Get issue | PROJECT_VIEWER+ |
| PATCH | `/api/issues/:issueId` | Update issue | PROJECT_DEVELOPER+ |
| DELETE | `/api/issues/:issueId` | Delete issue | PROJECT_EDITOR+ |
| GET | `/api/issues/:issueId/activities` | Get activities | PROJECT_VIEWER+ |
| POST | `/api/issues/:issueId/attachments` | Upload attachment | PROJECT_EDITOR+ |
| DELETE | `/api/issues/:issueId/attachments/:id` | Delete attachment | PROJECT_EDITOR+ |
| PATCH | `/api/issues/:issueId/attachments/:id/annotations` | Update annotations | PROJECT_EDITOR+ |

---

## RBAC Permissions

| Role | View | Create | Edit Status | Edit Assignee | Edit All | Delete | Comment |
|------|------|--------|-------------|---------------|----------|--------|---------|
| PROJECT_OWNER | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| PROJECT_EDITOR | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| PROJECT_DEVELOPER | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ✅ |
| PROJECT_VIEWER | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

> PROJECT_DEVELOPER can update status and assignee (including assigning to themselves or others).

---

## File Storage (R2)

```
r2://ui-syncup/issues/{issue_id}/attachments/{uuid}-{filename}
```

**Limits enforced:**
- Max file size: 10MB per file
- Max total per issue: 50MB

---

## New Files

### Database Schema
- `src/server/db/schema/issues.ts`
- `src/server/db/schema/issue-attachments.ts`
- `src/server/db/schema/issue-activities.ts`

### Server Services
- `src/server/issues/issue-service.ts`
- `src/server/issues/attachment-service.ts`
- `src/server/issues/activity-service.ts`

### API Routes
- `src/app/api/projects/[projectId]/issues/route.ts`
- `src/app/api/issues/[issueId]/route.ts`
- `src/app/api/issues/[issueId]/activities/route.ts`
- `src/app/api/issues/[issueId]/attachments/route.ts`

---

## Implementation Phases

1. **Database Schema** - Create Drizzle schemas, generate migration
2. **Server Services** - CRUD operations, activity logging
3. **API Routes** - REST handlers with RBAC guards
4. **Wire UI** - Replace mock API calls with real endpoints
5. **Attachments** - R2 integration with presigned URLs
6. **Annotations** - PATCH endpoint for updating attachment annotations
