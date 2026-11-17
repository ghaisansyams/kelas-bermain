"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface MenuGroup {
  title: string;
  items: { href: string; label: string }[];
}

/**
 * Menu admin untuk layar sempit (di bawah lg), saat sidebar disembunyikan.
 * Dulu berupa satu baris tautan yang lebarnya lebih dari 1.300 px, dan itu
 * melebarkan seluruh halaman di tablet dan HP. Sekarang satu tombol yang
 * membuka daftar bertingkat; tertutup sendiri begitu pindah halaman.
 */
export function MobileAdminMenu({ groups }: { groups: MenuGroup[] }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Pindah halaman menutup menu, jadi tidak perlu menutupnya per tautan.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Buka menu admin"
        aria-expanded={open}
        className="inline-flex size-11 items-center justify-center rounded-xl border border-line text-ink transition-colors hover:border-brand/40 hover:text-brand"
      >
        <Menu className="size-5" aria-hidden />
      </button>

      {open
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Menu admin"
              className="fixed inset-0 z-[100] bg-ink/60"
              onClick={() => setOpen(false)}
            >
              <nav
                onClick={(event) => event.stopPropagation()}
                className="h-full w-[min(20rem,86vw)] overflow-y-auto bg-surface p-4 shadow-lift"
              >
                <div className="flex items-center justify-between pb-2">
                  <span className="text-sm font-extrabold text-ink">Admin Kelas Bermain</span>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    aria-label="Tutup menu"
                    className="inline-flex size-10 items-center justify-center rounded-full border border-line text-ink-soft hover:text-ink"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </div>

                {groups.map((group) => (
                  <div key={group.title} className="mt-4">
                    <p className="px-3 text-[0.6875rem] font-bold uppercase tracking-wider text-muted">
                      {group.title}
                    </p>
                    <ul className="mt-1.5 space-y-0.5">
                      {group.items.map((item) => {
                        const active =
                          item.href === "/admin"
                            ? pathname === "/admin"
                            : pathname === item.href || pathname.startsWith(`${item.href}/`);
                        return (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              className={cn(
                                "flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold transition-colors",
                                active
                                  ? "bg-brand-soft text-brand-ink"
                                  : "text-ink-soft hover:bg-canvas-deep hover:text-ink",
                              )}
                            >
                              {item.label.replace("CMS — ", "")}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </nav>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
