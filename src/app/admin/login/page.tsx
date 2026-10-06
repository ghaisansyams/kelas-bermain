import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/login-form";
import { LogoMark } from "@/components/brand/logo";

export const metadata: Metadata = {
  title: "Masuk Admin",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas-deep/40 p-5">
      <div className="w-full max-w-sm rounded-card border border-line bg-surface p-6 shadow-soft sm:p-8">
        <LogoMark className="size-9" />
        <h1 className="mt-5 text-xl font-extrabold text-ink">Masuk ke Admin</h1>
        <p className="mt-1.5 text-sm text-muted">
          Khusus tim Kelas Bermain. Gunakan akun yang sudah didaftarkan.
        </p>
        <div className="mt-6">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
