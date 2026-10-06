import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Single Supabase client for the public microsite.
 *
 * Uses the anon key only — safe to ship in the browser bundle by design.
 * Every table has Row Level Security enabled with zero policies (default
 * deny), so this client can do nothing except call the SECURITY DEFINER
 * functions in supabase/schema.sql, each scoped to exactly what one page
 * needs. There is no service-role key anywhere in this app.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

/**
 * Lazily created so a missing env var fails at the point of use (a page
 * that actually needs the database) rather than crashing every route,
 * including ones that don't touch it.
 */
export function getSupabase(): SupabaseClient {
  if (client) return client;
  if (!url || !anonKey) {
    throw new Error(
      "Supabase belum dikonfigurasi. Isi NEXT_PUBLIC_SUPABASE_URL dan " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY di .env.local (lihat .env.example).",
    );
  }
  client = createClient(url, anonKey, {
    auth: { persistSession: false },
  });
  return client;
}
