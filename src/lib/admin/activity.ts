"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Writes one audit row. Every admin action that changes data calls this, so
 * "who changed what, and what did it look like before" is answerable without
 * reading the application code.
 */
export async function logActivity(
  action: string,
  entity: string,
  entityId: string,
  oldValue: unknown,
  newValue: unknown,
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await supabase.from("activity_logs").insert({
    user_id: user?.id ?? null,
    action,
    entity,
    entity_id: entityId,
    old_value: (oldValue ?? null) as never,
    new_value: (newValue ?? null) as never,
  });
}
