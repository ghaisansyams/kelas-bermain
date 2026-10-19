"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { asAdmin } from "@/lib/admin/actor";
import { db } from "@/lib/db";
import { findTemplateNameForEvent } from "@/lib/services/certificate";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ERROR_CODE: Record<string, string> = {
  NOT_ATTENDED: "not-attended",
  REGISTRATION_NOT_FOUND: "missing",
  FORBIDDEN: "forbidden",
};

function back(eventId: string, status: string): never {
  redirect(`/admin/certificates?event=${encodeURIComponent(eventId)}&status=${status}`);
}

/** Menerbitkan satu sertifikat. Fungsi database yang membuat nomornya dan mencatat perubahannya. */
export async function issueCertificateAction(formData: FormData) {
  const session = await requireAdmin();
  const registrationId = String(formData.get("registrationId") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  if (!UUID.test(registrationId)) back(eventId, "error");

  const templateName = await findTemplateNameForEvent(eventId);

  // Hasilnya disimpan dulu: redirect() tidak boleh dipanggil di dalam try.
  let outcome = "issued";
  try {
    await asAdmin(
      session,
      // Nama template disimpan pada sertifikat, jadi perubahan desain nanti
      // tidak mengubah dokumen yang sudah dibagikan.
      (tx) =>
        tx.$executeRaw`select admin_issue_certificate(${registrationId}::uuid, ${templateName}, ${""}, ${""})`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const key = Object.keys(ERROR_CODE).find((code) => message.includes(code));
    outcome = key ? ERROR_CODE[key] : "error";
  }

  revalidatePath("/admin/certificates");
  back(eventId, outcome);
}

/** Menerbitkan untuk setiap peserta HADIR yang belum punya sertifikat. */
export async function issueAllCertificatesAction(formData: FormData) {
  const session = await requireAdmin();
  const eventId = String(formData.get("eventId") ?? "");
  if (!eventId) back(eventId, "error");

  const templateName = await findTemplateNameForEvent(eventId);

  const pending = await db.registrations.findMany({
    where: {
      event_id: eventId,
      attendance_status: "PRESENT",
      certificate_status: { not: "ISSUED" },
    },
    select: { id: true },
  });

  // Satu transaksi per sertifikat, bukan satu untuk semuanya: satu peserta yang
  // bermasalah tidak boleh membatalkan puluhan sertifikat lain yang sah.
  let issued = 0;
  for (const { id } of pending) {
    try {
      await asAdmin(
        session,
        (tx) =>
          tx.$executeRaw`select admin_issue_certificate(${id}::uuid, ${templateName}, ${""}, ${""})`,
      );
      issued += 1;
    } catch {
      // dilewati; jumlah yang berhasil dilaporkan di bawah
    }
  }

  revalidatePath("/admin/certificates");
  back(eventId, issued > 0 ? `bulk-${issued}` : "none");
}

export async function revokeCertificateAction(formData: FormData) {
  const session = await requireAdmin();
  const number = String(formData.get("number") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!number || !reason) back(eventId, "error");

  let failed = false;
  try {
    await asAdmin(
      session,
      (tx) => tx.$executeRaw`select admin_revoke_certificate(${number}, ${reason})`,
    );
  } catch {
    failed = true;
  }
  if (failed) back(eventId, "error");

  revalidatePath("/admin/certificates");
  back(eventId, "revoked");
}
