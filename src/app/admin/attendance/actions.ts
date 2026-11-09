"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { asAdmin } from "@/lib/admin/actor";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Check-in menulis attendance_records + registrations + log audit dalam satu panggilan. */
export async function setAttendanceAction(formData: FormData) {
  const session = await requireAdmin();
  const registrationId = String(formData.get("registrationId") ?? "");
  const status = String(formData.get("status") ?? "");
  const eventId = String(formData.get("eventId") ?? "");
  // Pencarian dibawa kembali setelah menandai hadir, supaya admin yang sedang
  // menyaring nama tidak harus mengetik ulang untuk peserta berikutnya.
  const q = String(formData.get("q") ?? "").slice(0, 100);
  const base = `/admin/attendance?event=${encodeURIComponent(eventId)}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
  const failure = `${base}&status=error`;

  if (!UUID.test(registrationId) || !status) redirect(failure);

  // redirect() melempar pengecualian internal; di dalam try/catch ia tertelan
  // dan admin melihat "berhasil" tanpa berpindah halaman.
  let failed = false;
  try {
    await asAdmin(session, (tx) =>
      tx.$executeRaw`select admin_set_attendance(${registrationId}::uuid, ${status}, ${"MANUAL"})`,
    );
  } catch {
    failed = true;
  }
  if (failed) redirect(failure);

  revalidatePath("/admin/attendance");
  revalidatePath("/admin");
  redirect(`${base}&status=saved`);
}
