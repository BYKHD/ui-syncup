/**
 * Supabase Browser Client
 *
 * Provides a singleton Supabase client for browser-side operations,
 * primarily used for Realtime subscriptions.
 *
 * Note: This uses the anon key which respects RLS policies.
 * Server-side operations should use the service role key via server/db.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let supabaseClient: SupabaseClient | null = null;

/**
 * Get or create the Supabase browser client singleton
 *
 * Uses environment variables (accessible in browser via Next.js):
 * - SUPABASE_URL
 * - SUPABASE_ANON_KEY
 */
export function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables. " +
        "Set SUPABASE_URL and SUPABASE_ANON_KEY in your .env.local file."
    );
  }

  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });

  return supabaseClient;
}

/**
 * Check if Supabase client is configured
 * Useful for conditional rendering of realtime features
 */
export function isSupabaseConfigured(): boolean {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  return Boolean(supabaseUrl && supabaseAnonKey);
}
