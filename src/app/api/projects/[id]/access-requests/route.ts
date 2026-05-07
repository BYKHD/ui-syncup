import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/server/auth/session";
import {
  createAccessRequest,
  listAccessRequests,
} from "@/server/projects/access-request-service";
import { logger } from "@/lib/logger";
import type { AccessRequest } from "@/server/projects/types";

const CreateBody = z.object({
  message: z.string().trim().max(500).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();
  const { id: projectId } = await params;

  const user = await getSession();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  let body: z.infer<typeof CreateBody>;
  try {
    body = CreateBody.parse(await request.json().catch(() => ({})));
  } catch {
    return NextResponse.json(
      { error: { code: "INVALID_BODY", message: "message must be ≤500 chars" } },
      { status: 400 }
    );
  }

  try {
    const created = await createAccessRequest({
      projectId,
      userId: user.id,
      message: body.message ?? null,
    });
    return NextResponse.json(
      { request: serializeRequest(created) },
      { status: 201 }
    );
  } catch (err) {
    return mapServiceError(err, requestId, projectId);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();
  const { id: projectId } = await params;

  const user = await getSession();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  try {
    const list = await listAccessRequests(projectId, user.id);
    return NextResponse.json({
      requests: list.map((r) => ({
        ...serializeRequest(r),
        requester: r.requester,
        decidedByUser: r.decidedByUser,
      })),
    });
  } catch (err) {
    return mapServiceError(err, requestId, projectId);
  }
}

function serializeRequest(r: AccessRequest) {
  return {
    ...r,
    createdAt: r.createdAt.toISOString(),
    decidedAt: r.decidedAt?.toISOString() ?? null,
    declineCooldownUntil: r.declineCooldownUntil?.toISOString() ?? null,
  };
}

function mapServiceError(err: unknown, requestId: string, projectId: string): NextResponse {
  const msg = err instanceof Error ? err.message : "";
  const map: Record<string, [number, string, string]> = {
    PROJECT_NOT_FOUND: [404, "NOT_FOUND", "Project not found"],
    ALREADY_MEMBER: [409, "ALREADY_MEMBER", "You are already a member of this project"],
    REQUEST_PENDING: [409, "REQUEST_PENDING", "You already have a pending request for this project"],
    COOLDOWN_ACTIVE: [409, "COOLDOWN_ACTIVE", "Please wait before requesting access again"],
    FORBIDDEN: [403, "FORBIDDEN", "You do not have permission to perform this action"],
  };
  const entry = map[msg];
  if (entry) {
    const [status, code, message] = entry;
    return NextResponse.json({ error: { code, message } }, { status });
  }
  logger.error("api.projects.access_requests.error", {
    requestId,
    projectId,
    error: msg,
    stack: err instanceof Error ? err.stack : undefined,
  });
  return NextResponse.json(
    { error: { code: "INTERNAL_SERVER_ERROR", message: "Unexpected error" } },
    { status: 500 }
  );
}
