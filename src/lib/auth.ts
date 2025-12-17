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
