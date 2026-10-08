import Link from "next/link";
import {
  Award,
  BookOpen,
  Baby,
  BarChart3,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  Handshake,
  History,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  PanelsTopLeft,
  Receipt,
  Settings,
  Ticket,
  UserCog,
  Users,
  Wallet,
} from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import type { AdminSession } from "@/lib/admin/auth";
import { signOutAction } from "@/app/admin/actions";

const NAV_GROUPS: { title: string; items: { href: string; label: string; icon: typeof LayoutDashboard }[] }[] = [
  {
    title: "Ringkasan",
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "Operasional",
    items: [
      { href: "/admin/customers", label: "Pendamping", icon: Users },
      { href: "/admin/children", label: "Anak", icon: Baby },
      { href: "/admin/events", label: "Event", icon: CalendarDays },
      { href: "/admin/registrations", label: "Registrasi", icon: ClipboardList },
      { href: "/admin/attendance", label: "Kehadiran", icon: CalendarCheck },
      { href: "/admin/payments", label: "Pembayaran", icon: Receipt },
      { href: "/admin/finance", label: "Keuangan", icon: Wallet },
      { href: "/admin/vouchers", label: "Voucher", icon: Ticket },
      { href: "/admin/affiliates", label: "Affiliate", icon: Handshake },
    ],
  },
  {
    title: "Website",
    items: [
      { href: "/admin/cms", label: "CMS Website", icon: PanelsTopLeft },
      { href: "/admin/media", label: "Media Library", icon: ImageIcon },
    ],
  },
  {
    title: "Laporan",
    items: [
      { href: "/admin/certificates", label: "Sertifikat", icon: Award },
      { href: "/admin/reports", label: "Laporan", icon: BarChart3 },
    ],
  },
  {
    title: "Sistem",
    items: [
      { href: "/admin/panduan", label: "Panduan", icon: BookOpen },
      { href: "/admin/users", label: "Pengguna", icon: UserCog },
      { href: "/admin/settings", label: "Pengaturan Diskon", icon: Settings },
      { href: "/admin/activity-log", label: "Activity Log", icon: History },
    ],
  },
];

/** Admin chrome. Only modules that actually work are listed — no dead links. */
export function AdminShell({
  session,
  children,
}: {
  session: AdminSession;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-canvas-deep/40">
      <aside className="hidden w-64 shrink-0 border-r border-line bg-surface lg:block">
        <div className="flex h-16 items-center gap-2.5 border-b border-line px-5">
          <LogoMark className="size-7" />
          <span className="text-sm font-extrabold text-ink">Admin Kelas Bermain</span>
        </div>
        <nav className="space-y-6 p-4" aria-label="Navigasi admin">
          {NAV_GROUPS.map((group) => (
            <div key={group.title}>
              <p className="px-3 text-[0.6875rem] font-bold uppercase tracking-wider text-muted">
                {group.title}
              </p>
              <ul className="mt-2 space-y-1">
                {group.items.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold text-ink-soft transition-colors hover:bg-canvas-deep hover:text-ink"
                    >
                      <item.icon className="size-4" aria-hidden />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between gap-4 border-b border-line bg-surface px-5">
          <nav className="flex gap-3 lg:hidden" aria-label="Navigasi admin (ringkas)">
            {NAV_GROUPS.flatMap((group) => group.items).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-semibold text-ink-soft hover:text-brand"
              >
                {item.label.replace("CMS — ", "")}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-right sm:block">
              <span className="block text-sm font-bold text-ink">{session.fullName}</span>
              <span className="block text-xs text-muted">{session.role}</span>
            </span>
            <form action={signOutAction}>
              <button
                type="submit"
                className="inline-flex min-h-10 items-center gap-1.5 rounded-pill border border-line px-3.5 text-sm font-semibold text-ink-soft transition-colors hover:border-brand/40 hover:text-brand"
              >
                <LogOut className="size-4" aria-hidden />
                Keluar
              </button>
            </form>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-5 sm:p-8">{children}</main>
      </div>
    </div>
  );
}
