"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { account } from "@/server/db/schema";
import { hashPassword } from "@/server/auth/password";
import { eq, and } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

type SetPasswordState = {
  success?: boolean;
  error?: string;
};

export async function setPassword(prevState: SetPasswordState, formData: FormData): Promise<SetPasswordState> {
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || password.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match" };
  }

  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return { error: "Unauthorized" };
    }

    // Check if a credential account already exists for this user
    const existingAccount = await db.query.account.findFirst({
      where: and(
        eq(account.userId, session.user.id),
        eq(account.providerId, "credential")
      ),
      columns: { id: true, password: true },
    });

    if (existingAccount?.password) {
      return { error: "Password already set. Please use Change Password." };
    }

    const hashedPassword = await hashPassword(password);

    if (existingAccount) {
      // Credential row exists but has no password — update it
      await db
        .update(account)
        .set({ password: hashedPassword, updatedAt: new Date() })
        .where(and(eq(account.userId, session.user.id), eq(account.providerId, "credential")));
    } else {
      // No credential row yet (OAuth-only user) — create one
      await db.insert(account).values({
        accountId: session.user.id,
        providerId: "credential",
        userId: session.user.id,
        password: hashedPassword,
      });
    }

    revalidatePath("/settings/security");
    
    return { success: true };
  } catch (error) {
    console.error("Failed to set password:", error);
    return { error: "Failed to set password. Please try again." };
  }
}
