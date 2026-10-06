"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Check-in writes attendance_records + registrations + audit in one call. */
export async function setAttendanceAction(formData: FormData) {
  await requireAdmin();
  const registrationId = String(formData.get("registrationId") ?? "");
  const status = String(formData.get("status") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  if (!registrationId || !status) redirect(`/admin/attendance?event=${eventId}&status=error`);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_set_attendance", {
    p_registration_id: registrationId,
    p_status: status,
    p_method: "MANUAL",
  });

  if (error) redirect(`/admin/attendance?event=${eventId}&status=error`);

  revalidatePath("/admin/attendance");
  revalidatePath("/admin");
  redirect(`/admin/attendance?event=${eventId}&status=saved`);
}
