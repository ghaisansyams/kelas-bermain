"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { findTemplateNameForEvent } from "@/lib/services/certificate";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const ERROR_CODE: Record<string, string> = {
  NOT_ATTENDED: "not-attended",
  REGISTRATION_NOT_FOUND: "missing",
  FORBIDDEN: "forbidden",
};

function back(eventId: string, status: string): never {
  redirect(`/admin/certificates?event=${eventId}&status=${status}`);
}

/** Issue one certificate. The RPC mints the number and logs the change. */
export async function issueCertificateAction(formData: FormData) {
  await requireAdmin();
  const registrationId = String(formData.get("registrationId") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  if (!registrationId) back(eventId, "error");

  const [supabase, templateName] = await Promise.all([
    createSupabaseServerClient(),
    findTemplateNameForEvent(eventId),
  ]);
  const { error } = await supabase.rpc("admin_issue_certificate", {
    p_registration_id: registrationId,
    // The template name is stored on the certificate, so a later design
    // change never alters a document already handed out.
    p_template: templateName,
    p_signatory_name: "",
    p_signatory_role: "",
  });

  if (error) {
    const key = Object.keys(ERROR_CODE).find((code) => error.message.includes(code));
    back(eventId, key ? ERROR_CODE[key] : "error");
  }

  revalidatePath("/admin/certificates");
  back(eventId, "issued");
}

/** Issues for every PRESENT participant that does not have one yet. */
export async function issueAllCertificatesAction(formData: FormData) {
  await requireAdmin();
  const eventId = String(formData.get("eventId") ?? "");
  if (!eventId) back(eventId, "error");

  const [supabase, templateName] = await Promise.all([
    createSupabaseServerClient(),
    findTemplateNameForEvent(eventId),
  ]);
  const { data } = await supabase
    .from("registrations")
    .select("id")
    .eq("event_id", eventId)
    .eq("attendance_status", "PRESENT")
    .neq("certificate_status", "ISSUED");

  const ids = ((data ?? []) as { id: string }[]).map((row) => row.id);
  let issued = 0;
  for (const id of ids) {
    const { error } = await supabase.rpc("admin_issue_certificate", {
      p_registration_id: id,
      p_template: templateName,
      p_signatory_name: "",
      p_signatory_role: "",
    });
    if (!error) issued += 1;
  }

  revalidatePath("/admin/certificates");
  back(eventId, issued > 0 ? `bulk-${issued}` : "none");
}

export async function revokeCertificateAction(formData: FormData) {
  await requireAdmin();
  const number = String(formData.get("number") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!number || !reason) back(eventId, "error");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_revoke_certificate", {
    p_number: number,
    p_reason: reason,
  });

  if (error) back(eventId, "error");

  revalidatePath("/admin/certificates");
  back(eventId, "revoked");
}
