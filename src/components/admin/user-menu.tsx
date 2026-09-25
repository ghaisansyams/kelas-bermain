"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, LogOut, Settings, UserRound } from "lucide-react";
import { can, ROLE_LABEL, type Role } from "@/lib/auth/roles";
import { cn } from "@/lib/utils/cn";

/**
 * Account menu in the top bar.
 *
 * Replaces the loose logout button that used to sit beside the avatar —
 * destructive actions belong behind a deliberate open, not one stray click
 * away from the search field.
 */
export function UserMenu({
  user,
  logoutAction,
}: {
  user: { name: string; role: Role };
  logoutAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const initial = user.name.slice(0, 1).toUpperCase();

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "flex min-h-10 items-center gap-2 rounded-lg border border-transparent pl-1.5 pr-2 transition-colors",
          open ? "border-line bg-canvas-deep" : "hover:bg-canvas-deep",
        )}
      >
        <span
          aria-hidden
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-extrabold text-brand-ink"
        >
          {initial}
        </span>
        <span className="hidden text-left sm:block">
          <span className="block text-xs font-bold leading-none text-ink">{user.name}</span>
          <span className="mt-0.5 block text-[0.6875rem] font-semibold text-muted">
            {ROLE_LABEL[user.role]}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Menu akun"
          className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-surface shadow-lift"
        >
          <div className="border-b border-line px-3.5 py-3">
            <p className="truncate text-sm font-bold text-ink">{user.name}</p>
            <p className="mt-0.5 text-xs text-muted">{ROLE_LABEL[user.role]}</p>
          </div>

          <div className="p-1.5">
            <Link
              href="/admin/settings"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex min-h-10 items-center gap-2.5 rounded-lg px-2.5 text-sm font-semibold text-ink-soft transition-colors hover:bg-canvas-deep hover:text-ink"
            >
              <UserRound className="size-4 shrink-0" aria-hidden />
              Profil
            </Link>
            {can(user.role, "settings") ? (
              <Link
                href="/admin/settings"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex min-h-10 items-center gap-2.5 rounded-lg px-2.5 text-sm font-semibold text-ink-soft transition-colors hover:bg-canvas-deep hover:text-ink"
              >
                <Settings className="size-4 shrink-0" aria-hidden />
                Pengaturan
              </Link>
            ) : null}
          </div>

          <form action={logoutAction} className="border-t border-line p-1.5">
            <button
              type="submit"
              role="menuitem"
              className="flex min-h-10 w-full items-center gap-2.5 rounded-lg px-2.5 text-sm font-semibold text-brand-ink transition-colors hover:bg-brand-soft"
            >
              <LogOut className="size-4 shrink-0" aria-hidden />
              Keluar
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
