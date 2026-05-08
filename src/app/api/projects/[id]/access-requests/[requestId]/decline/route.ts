import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/server/auth/session";
import { declineAccessRequest } from "@/server/projects/access-request-service";
import { serializeRequest, mapError } from "../../_helpers";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; requestId: string }> }
) {
  const reqId = crypto.randomUUID();
  const { id: projectId, requestId } = await params;

  const user = await getSession();
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  try {
    const updated = await declineAccessRequest(requestId, user.id);
    return NextResponse.json({ request: serializeRequest(updated) });
  } catch (err) {
    return mapError(err, "api.projects.access_requests.decline.error", {
      reqId,
      projectId,
      requestId,
    });
  }
}
