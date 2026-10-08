"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, Ticket, TicketCheck, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import type { NavItem } from "@/lib/services/cms";
import { cn } from "@/lib/utils/cn";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader({
  navItems,
  identity,
}: {
  navItems: NavItem[];
  /** Name and logo from the CMS; absent means the built-in mark is used. */
  identity?: { name: string; logoUrl: string };
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Close the sheet whenever navigation happens.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock the page behind the open sheet and restore focus on close.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-[background-color,border-color,box-shadow] duration-300",
        // Opaque by default so content never shows through; the glassy
        // treatment only kicks in where backdrop-filter is actually supported.
        scrolled || open
          ? "border-b border-line bg-canvas/97 supports-[backdrop-filter]:bg-canvas/80 supports-[backdrop-filter]:backdrop-blur-xl"
          : "border-b border-transparent bg-canvas/95 supports-[backdrop-filter]:bg-canvas/55 supports-[backdrop-filter]:backdrop-blur-md",
      )}
    >
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-pill focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-canvas"
      >
        Lompat ke konten
      </a>

      <Container className="flex h-16 items-center justify-between gap-4 lg:h-[4.5rem]">
        <Link href="/" aria-label="Kelas Bermain — beranda" className="shrink-0">
          <Logo imageUrl={identity?.logoUrl} name={identity?.name} />
        </Link>

        <nav aria-label="Navigasi utama" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {navItems.map((link) => {
              const active = isActive(pathname, link.href);
              if (link.openInNewTab) {
                return (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-pill px-3.5 py-2 text-[0.9375rem] font-semibold text-ink-soft transition-colors hover:text-ink"
                    >
                      {link.label}
                    </a>
                  </li>
                );
              }
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative rounded-pill px-3.5 py-2 text-[0.9375rem] font-semibold transition-colors",
                      active ? "text-brand" : "text-ink-soft hover:text-ink",
                    )}
                  >
                    {link.label}
                    <span
                      aria-hidden
                      className={cn(
                        "absolute inset-x-3.5 -bottom-0.5 h-0.5 rounded-full bg-brand transition-transform duration-300",
                        active ? "scale-x-100" : "scale-x-0",
                      )}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/tiket"
            aria-label="Cek Tiket"
            className={buttonStyles({
              variant: "secondary",
              size: "sm",
              className: "hidden whitespace-nowrap md:inline-flex",
            })}
          >
            <TicketCheck className="size-4" aria-hidden />
            <span className="hidden lg:inline">Cek Tiket</span>
          </Link>
          <Link
            href="/event"
            className={buttonStyles({
              size: "sm",
              className: "hidden whitespace-nowrap md:inline-flex",
            })}
          >
            <Ticket className="size-4" aria-hidden />
            Daftar Kelas
          </Link>

          <button
            ref={toggleRef}
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="menu-mobile"
            aria-label={open ? "Tutup menu" : "Buka menu"}
            className="inline-flex size-11 items-center justify-center rounded-xl border border-line bg-surface text-ink transition-colors hover:bg-canvas-deep md:hidden"
          >
            {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </div>
      </Container>

      {/* Mobile sheet */}
      <div
        id="menu-mobile"
        hidden={!open}
        className="border-t border-line bg-canvas md:hidden"
      >
        <Container className="flex flex-col gap-2 py-5">
          <nav aria-label="Navigasi utama (seluler)">
            <ul className="flex flex-col gap-1">
              {navItems.map((link, index) => {
                const active = isActive(pathname, link.href);
                if (link.openInNewTab) {
                  return (
                    <li
                      key={link.href}
                      className="motion-safe:animate-fade-up"
                      style={{ animationDelay: `${index * 45}ms` }}
                    >
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex min-h-13 items-center rounded-xl px-4 text-base font-semibold text-ink transition-colors hover:bg-canvas-deep"
                      >
                        {link.label}
                      </a>
                    </li>
                  );
                }
                return (
                  <li
                    key={link.href}
                    className="motion-safe:animate-fade-up"
                    style={{ animationDelay: `${index * 45}ms` }}
                  >
                    <Link
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-13 items-center justify-between rounded-xl px-4 text-base font-semibold transition-colors",
                        active
                          ? "bg-brand-soft text-brand-ink"
                          : "text-ink hover:bg-canvas-deep",
                      )}
                    >
                      {link.label}
                      {active ? (
                        <span aria-hidden className="size-2 rounded-full bg-brand" />
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="mt-2 flex flex-col gap-2">
            <Link href="/event" className={buttonStyles({ size: "lg", className: "w-full" })}>
              <Ticket className="size-4" aria-hidden />
              Daftar Kelas
            </Link>
            <Link
              href="/tiket"
              className={buttonStyles({ variant: "secondary", size: "lg", className: "w-full" })}
            >
              <TicketCheck className="size-4" aria-hidden />
              Cek Tiket
            </Link>
          </div>
        </Container>
      </div>
    </header>
  );
}
