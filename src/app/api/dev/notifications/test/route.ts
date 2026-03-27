/**
 * DEV ONLY — POST /api/dev/notifications/test
 *
 * Inserts a fake notification for the current user to test the SSE push pipeline.
 * Returns 404 in production.
 */
import { NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { getSession } from "@/server/auth/session"
import { createNotification } from "@/server/notifications"

export async function POST(): Promise<Response> {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 })
  }

  const user = await getSession()
  if (!user) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    )
  }

  // No actorId → bypasses actor-exclusion check so the user receives their own test notification.
  // Random entityId → bypasses 5-minute deduplication window.
  const notification = await createNotification({
    recipientId: user.id,
    type: "mention",
    entityType: "issue",
    entityId: randomUUID(),
    metadata: {
      target_url: "/dev/auth",
      issue_title: "Test notification",
      issue_key: "DEV-0",
      actor_name: "Dev Tool",
    },
  })

  return NextResponse.json({ ok: true, notification })
}
