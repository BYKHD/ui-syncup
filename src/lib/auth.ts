import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import { authConfig } from "./auth-config";
import * as schema from "@/server/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
        ...schema,
        user: schema.users,
        session: schema.sessions,
        account: schema.account,
        verification: schema.verificationTokens,
    },
  }),
  socialProviders: {
    google: {
      clientId: authConfig.providers.google.clientId,
      clientSecret: authConfig.providers.google.clientSecret,
    },
    // Microsoft OAuth - only included when configured
    ...(authConfig.providers.microsoft.enabled && {
      microsoft: {
        clientId: authConfig.providers.microsoft.clientId,
        clientSecret: authConfig.providers.microsoft.clientSecret,
        tenantId: authConfig.providers.microsoft.tenantId,
      },
    }),
    // Atlassian OAuth - only included when configured
    ...(authConfig.providers.atlassian.enabled && {
      atlassian: {
        clientId: authConfig.providers.atlassian.clientId,
        clientSecret: authConfig.providers.atlassian.clientSecret,
      },
    }),
  },
  /**
   * Account linking configuration
   * 
   * Enables automatic account linking for users with matching emails.
   * All OAuth providers (Google, Microsoft, Atlassian) are configured as trusted
   * providers since they verify email ownership.
   * 
   * Features:
   * - enabled: Allow account linking when emails match
   * - trustedProviders: Auto-link accounts from these providers without additional verification
   * - updateUserInfoOnLink: Update user profile (name, image) when linking new accounts
   * 
   * Security: Trusted providers verify email ownership, making auto-linking safe.
   * Requirements: 1.3, 1.4, 2.3, 2.4, 3.3, 3.4
   */
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google", "microsoft", "atlassian"],
      // Update user profile when linking additional accounts
      updateUserInfoOnLink: false,
    },
  },
  /**
   * Email verification configuration
   * 
   * OAuth users from trusted providers have verified emails automatically.
   * better-auth sets emailVerified=true when the provider confirms email ownership.
   * 
   * Requirements: 1.5, 2.5, 3.5
   */
  emailAndPassword: {
    enabled: true,
    autoSignIn: false, // Don't auto sign in after registration (require email verification)
  },
  secret: authConfig.session.secret,
  baseURL: authConfig.session.baseUrl,
  user: {
    additionalFields: {
        passwordHash: {
            type: "string",
            required: false,
            input: false // Don't allow user to set this directly via API
        }
    }
  },
  // logger: { level: "debug" } // Commented out to avoid type error if property name mismatch, better to fix one thing at a time
});
