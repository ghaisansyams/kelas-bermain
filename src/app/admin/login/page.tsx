import type { Metadata } from "next";
import { Suspense } from "react";
import { LogoMark } from "@/components/brand/logo";
import { LoginForm } from "@/components/admin/login-form";
import { Skeleton } from "@/components/ui/skeleton";
import { demoUsers } from "@/lib/auth/users";
import { ROLE_LABEL } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "Masuk — Kelas Bermain Management",
  description: "Halaman masuk sistem internal Kelas Bermain.",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas-deep/60 px-5 py-12">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2.5">
          <LogoMark className="size-10" />
          <div>
            <p className="text-lg font-extrabold leading-none tracking-tight text-ink">
              Kelas Bermain
            </p>
            <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-brand">
              Management
            </p>
          </div>
        </div>

        <div className="mt-8 rounded-card border border-line bg-surface p-6 shadow-lift sm:p-8">
          <h1 className="text-xl font-extrabold text-ink">Masuk ke sistem internal</h1>
          <p className="mt-1.5 text-sm text-muted">
            Halaman ini hanya untuk staf Kelas Bermain.
          </p>

          <Suspense fallback={<Skeleton className="mt-6 h-64 w-full rounded-xl" />}>
            <LoginForm />
          </Suspense>
        </div>

        <div className="mt-6 rounded-card border border-sun/30 bg-sun-soft/60 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-sun-dark">
            Akun demo
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
            Autentikasi ini masih simulasi untuk keperluan peninjauan. Kata sandi sengaja
            ditampilkan dan harus diganti dengan penyedia autentikasi sungguhan sebelum
            dipakai betulan.
          </p>
          <ul className="mt-3 space-y-1.5">
            {demoUsers.map((user) => (
              <li
                key={user.username}
                className="flex items-center justify-between gap-3 rounded-lg bg-surface px-3 py-2 text-xs"
              >
                <span className="font-mono font-bold text-ink">{user.username}</span>
                <span className="font-mono text-muted">{user.password}</span>
                <span className="shrink-0 font-semibold text-sun-dark">
                  {ROLE_LABEL[user.role]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
