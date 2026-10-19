import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { getAdminSession } from "@/lib/auth/session";
import { LogoMark } from "@/components/brand/logo";

export const metadata: Metadata = {
  title: "Masuk Admin",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  // Yang sudah masuk dengan sesi SAH tidak perlu melihat formulir lagi. Yang
  // membawa cookie basi tetap melihatnya, dan berhasil masuk menimpa cookie itu.
  if (await getAdminSession()) {
    redirect(next && next.startsWith("/admin") ? next : "/admin");
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas-deep/40 p-5">
      <div className="w-full max-w-sm rounded-card border border-line bg-surface p-6 shadow-soft sm:p-8">
        <LogoMark className="size-9" />
        <h1 className="mt-5 text-xl font-extrabold text-ink">Masuk ke Admin</h1>
        <p className="mt-1.5 text-sm text-muted">
          Khusus tim Kelas Bermain. Gunakan akun yang sudah didaftarkan.
        </p>
        <div className="mt-6">
          <LoginForm next={next} />
        </div>
      </div>
    </div>
  );
}
