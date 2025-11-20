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
    },
  }),
  socialProviders: {
    google: {
      clientId: authConfig.providers.google.clientId,
      clientSecret: authConfig.providers.google.clientSecret,
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
  }
});
