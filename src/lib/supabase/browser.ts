"use client";

import { createBrowserClient } from "@supabase/ssr";

/** Browser client for the admin login form — persists the session in cookies. */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
