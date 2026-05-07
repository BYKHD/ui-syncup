import type { AccessRequest } from "@/server/projects/types";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export function serializeRequest(r: AccessRequest) {
  return {
    ...r,
    createdAt: r.createdAt.toISOString(),
    decidedAt: r.decidedAt?.toISOString() ?? null,
    declineCooldownUntil: r.declineCooldownUntil?.toISOString() ?? null,
  };
}

export function mapError(
  err: unknown,
  eventName: string,
  logContext: Record<string, unknown>
): NextResponse {
  const msg = err instanceof Error ? err.message : "";
  if (msg === "FORBIDDEN")
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Not allowed" } },
      { status: 403 }
    );
  if (msg === "REQUEST_NOT_FOUND")
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Request not found" } },
      { status: 404 }
    );
  if (msg === "INVALID_STATE" || msg.startsWith("INVALID_STATE:"))
    return NextResponse.json(
      { error: { code: "INVALID_STATE", message: "Request is not pending" } },
      { status: 409 }
    );
  logger.error(eventName, {
    ...logContext,
    error: msg,
    stack: err instanceof Error ? err.stack : undefined,
  });
  return NextResponse.json(
    { error: { code: "INTERNAL_SERVER_ERROR", message: "Unexpected error" } },
    { status: 500 }
  );
}
