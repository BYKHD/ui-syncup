import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";
import { authConfig } from "./auth-config";
import * as schema from "@/server/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    // Use exact table names as defined in our schema (not pluralized)
    usePlural: false,
    schema: {
        ...schema,
        user: schema.users,
        session: schema.sessions,
        account: schema.account,
        verification: schema.betterAuthVerifications,
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
      // Prevent unlinking the last authentication method (Requirement 4.4)
      allowUnlinkingAll: false,
    },
  },
  /**
   * Email verification configuration
   * 
   * Sends verification emails using the app's email queue system.
   * OAuth users from trusted providers have verified emails automatically.
   * 
   * Requirements: 1.5, 2.5, 3.5
   */
  emailVerification: {
    sendVerificationEmail: async ({ user, url, token }, request) => {
      // Import enqueueEmail dynamically to avoid circular dependencies
      const { enqueueEmail } = await import('@/server/email/queue');
      
      // Use void to avoid awaiting (prevents timing attacks)
      void enqueueEmail({
        userId: user.id,
        type: 'verification',
        to: user.email,
        template: {
          type: 'verification',
          data: {
            name: user.name || 'User',
            verificationUrl: url,
          },
        },
      });
      
      console.log('[better-auth] Verification email queued:', { 
        userId: user.id, 
        email: user.email 
      });
    },
    sendOnSignUp: true, // Automatically send verification email on sign up
    autoSignInAfterVerification: true, // Auto sign in after email verification
  },
  /**
   * Email and password authentication configuration
   * 
   * Features:
   * - Email verification required before sign in
   * - Password reset via email
   * - Auto sign in disabled after registration (verification required)
   * - Uses Argon2id for password hashing (same as existing users)
   */
  emailAndPassword: {
    enabled: true,
    autoSignIn: false, // Don't auto sign in after registration (require email verification)
    requireEmailVerification: true, // Users must verify email before signing in
    /**
     * Custom password hashing using Argon2id
     * Required to maintain compatibility with existing user passwords
     */
    password: {
      hash: async (password: string) => {
        const { hashPassword } = await import('@/server/auth/password');
        return hashPassword(password);
      },
      verify: async (data: { password: string; hash: string }) => {
        const { verifyPassword } = await import('@/server/auth/password');
        return verifyPassword(data.password, data.hash);
      },
    },
    sendResetPassword: async ({ user, url, token }, request) => {
      // Import enqueueEmail dynamically to avoid circular dependencies
      const { enqueueEmail } = await import('@/server/email/queue');
      
      // Use void to avoid awaiting (prevents timing attacks)
      void enqueueEmail({
        userId: user.id,
        type: 'password_reset',
        to: user.email,
        template: {
          type: 'password_reset',
          data: {
            name: user.name || 'User',
            resetUrl: url,
          },
        },
      });
      
      console.log('[better-auth] Password reset email queued:', { 
        userId: user.id, 
        email: user.email 
      });
    },
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
  /**
   * Database configuration
   * 
   * Generate UUIDs using Node's crypto.randomUUID() to match PostgreSQL's uuid type.
   * This ensures all IDs are valid UUIDs compatible with our schema.
   */
  advanced: {
    database: {
      generateId: () => crypto.randomUUID(),
    },
  },
  /**
   * Database hooks for custom logic during user lifecycle events
   * 
   * Used to log OAuth user creation events and ensure proper data sync
   * between better-auth managed tables and app-specific tables.
   */
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          console.log('[better-auth] User created via OAuth:', {
            id: user.id,
            email: user.email,
            name: user.name,
            emailVerified: user.emailVerified,
          });
        },
      },
    },
    session: {
      create: {
        after: async (session) => {
          console.log('[better-auth] Session created:', {
            sessionId: session.id,
            userId: session.userId,
          });
        },
      },
    },
  },
});


