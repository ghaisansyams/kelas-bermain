import { certificatesEnabled } from "@/lib/features";
import type { Permission } from "./roles";

export interface AdminNavItem {
  href: string;
  label: string;
  permission: Permission;
  icon: string;
  group: "Ikhtisar" | "Data Pelanggan" | "Operasional" | "Konten" | "Sistem";
}

/** Feature-gated entries are dropped before role filtering. */
const allNavItems: AdminNavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", permission: "dashboard", icon: "gauge", group: "Ikhtisar" },
  { href: "/admin/customers", label: "Orang Tua", permission: "customers", icon: "users", group: "Data Pelanggan" },
  { href: "/admin/children", label: "Anak", permission: "children", icon: "baby", group: "Data Pelanggan" },
  { href: "/admin/events", label: "Event", permission: "events", icon: "calendar", group: "Operasional" },
  { href: "/admin/registrations", label: "Pendaftaran", permission: "registrations", icon: "clipboard", group: "Operasional" },
  { href: "/admin/payments", label: "Pembayaran", permission: "payments", icon: "wallet", group: "Operasional" },
  { href: "/admin/attendance", label: "Kehadiran", permission: "attendance", icon: "check", group: "Operasional" },
  { href: "/admin/certificates", label: "Sertifikat", permission: "certificates", icon: "award", group: "Operasional" },
  { href: "/admin/activities", label: "Kegiatan", permission: "activities", icon: "sparkles", group: "Konten" },
  { href: "/admin/gallery", label: "Galeri", permission: "gallery", icon: "image", group: "Konten" },
  { href: "/admin/reports", label: "Laporan", permission: "reports", icon: "chart", group: "Sistem" },
  { href: "/admin/settings", label: "Pengaturan", permission: "settings", icon: "settings", group: "Sistem" },
];

/**
 * Single source of the ERP navigation; filtered per role at render time.
 * Sertifikat is hidden while `FEATURE_CERTIFICATES` is off (R-06 / K-07).
 */
export const adminNav: AdminNavItem[] = allNavItems.filter(
  (item) => certificatesEnabled || item.permission !== "certificates",
);

export const NAV_GROUPS: AdminNavItem["group"][] = [
  "Ikhtisar",
  "Data Pelanggan",
  "Operasional",
  "Konten",
  "Sistem",
];
