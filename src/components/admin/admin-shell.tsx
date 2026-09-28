"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  Baby,
  CalendarDays,
  ChartColumn,
  CheckCheck,
  ClipboardList,
  ExternalLink,
  Gauge,
  Image as ImageIcon,
  Megaphone,
  Menu,
  Settings,
  Sparkles,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { GlobalSearch } from "@/components/admin/global-search";
import { UserMenu } from "@/components/admin/user-menu";
import { adminNav, NAV_GROUPS } from "@/lib/auth/nav";
import { can, type Role } from "@/lib/auth/roles";
import { cn } from "@/lib/utils/cn";

const ICONS: Record<string, LucideIcon> = {
  gauge: Gauge,
  users: Users,
  baby: Baby,
  calendar: CalendarDays,
  clipboard: ClipboardList,
  wallet: Wallet,
  check: CheckCheck,
  award: Award,
  megaphone: Megaphone,
  sparkles: Sparkles,
  image: ImageIcon,
  chart: ChartColumn,
  settings: Settings,
};

export function AdminShell({
  children,
  user,
  logoutAction,
}: {
  children: React.ReactNode;
  user: { name: string; role: Role };
  logoutAction: () => Promise<void>;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const visible = adminNav.filter((item) => can(user.role, item.permission));

  const sidebar = (
    <nav aria-label="Navigasi ERP" className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <LogoMark className="size-8" />
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold leading-none text-ink">
            Kelas Bermain
          </p>
          <p className="mt-1 text-[0.625rem] font-bold uppercase tracking-[0.18em] text-brand">
            Management
          </p>
        </div>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto px-3 pb-4">
        {NAV_GROUPS.map((group) => {
          const items = visible.filter((item) => item.group === group);
          if (items.length === 0) return null;
          return (
            <div key={group} className="mb-5">
              <p className="px-2 pb-1.5 text-[0.625rem] font-bold uppercase tracking-[0.14em] text-muted">
                {group}
              </p>
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const Icon = ICONS[item.icon] ?? Gauge;
                  const active =
                    pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex min-h-10 items-center gap-2.5 rounded-lg px-2.5 text-sm font-semibold transition-colors",
                          active
                            ? "bg-brand text-white"
                            : "text-ink-soft hover:bg-canvas-deep hover:text-ink",
                        )}
                      >
                        <Icon className="size-4 shrink-0" aria-hidden />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="border-t border-line px-3 py-3">
        <Link
          href="/"
          className="flex min-h-10 items-center gap-2.5 rounded-lg px-2.5 text-sm font-semibold text-muted transition-colors hover:bg-canvas-deep hover:text-ink"
        >
          <ExternalLink className="size-4 shrink-0" aria-hidden />
          Lihat Situs Publik
        </Link>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-dvh bg-canvas-deep/40">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 self-start overflow-hidden border-r border-line bg-surface lg:block">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Tutup menu"
            onClick={() => setOpen(false)}
            className="absolute inset-0 size-full cursor-default bg-ink/50"
          />
          <div className="absolute inset-y-0 left-0 w-64 bg-surface shadow-lift motion-safe:animate-fade-up">
            {sidebar}
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur-sm">
          <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Buka menu"
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-line text-ink transition-colors hover:bg-canvas-deep lg:hidden"
            >
              {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
            </button>

            <GlobalSearch />

            <div className="ml-auto flex items-center gap-3">
              <UserMenu user={user} logoutAction={logoutAction} />
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
