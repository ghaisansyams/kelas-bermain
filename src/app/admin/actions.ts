"use server";

import { redirect } from "next/navigation";
import { signIn, signOut } from "@/lib/auth/session";

export async function signOutAction() {
  await signOut();
  redirect("/admin/login");
}

/**
 * Masuk sebagai admin.
 *
 * Ini server action, bukan panggilan dari browser seperti dulu: password
 * tidak boleh melewati kode yang dikirim ke klien, dan cookie sesi harus
 * dipasang httpOnly dari sisi server supaya JavaScript halaman tidak bisa
 * membacanya.
 */
export async function signInAction(
  _previous: { error?: string } | null,
  formData: FormData,
): Promise<{ error?: string }> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");

  if (!email.trim() || !password) {
    return { error: "Email dan kata sandi wajib diisi." };
  }

  const result = await signIn(email, password);
  if (!result.ok) return { error: result.error };

  // Hanya menerima tujuan di dalam /admin: parameter ?next= datang dari URL,
  // dan tanpa batas ini bisa dipakai memantulkan orang ke situs lain.
  redirect(next.startsWith("/admin") ? next : "/admin");
}
