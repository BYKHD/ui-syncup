"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/server/db/schema";
import { hashPassword } from "@/server/auth/password";
import { eq } from "drizzle-orm";
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

    // Check if user already has a password
    const user = await db.query.users.findFirst({
        where: eq(users.id, session.user.id),
        columns: { passwordHash: true }
    });

    if (user?.passwordHash) {
        return { error: "Password already set. Please use Change Password." };
    }

    const hashedPassword = await hashPassword(password);

    await db.update(users)
      .set({ 
        passwordHash: hashedPassword,
        updatedAt: new Date()
      })
      .where(eq(users.id, session.user.id));

    revalidatePath("/settings/security");
    
    return { success: true };
  } catch (error) {
    console.error("Failed to set password:", error);
    return { error: "Failed to set password. Please try again." };
  }
}
