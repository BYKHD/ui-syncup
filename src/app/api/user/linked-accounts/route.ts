import { db } from "@/lib/db";
import { account } from "@/server/db/schema";
import { getSession } from "@/server/auth/session";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getSession();

    if (!session?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const accounts = await db
      .select({
        id: account.id,
        providerId: account.providerId,
        accountId: account.accountId,
        createdAt: account.createdAt,
      })
      .from(account)
      .where(eq(account.userId, session.id));

    return NextResponse.json(accounts);
  } catch (error) {
    console.error("Failed to list linked accounts:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
