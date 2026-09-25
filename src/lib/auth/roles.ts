/**
 * Role-based access for the ERP.
 *
 * Permissions are checked in one place (`can`) and drive both the sidebar and
 * the per-page guard, so adding a section means adding a permission — not
 * scattering role checks through components.
 */

export type Role = "SUPER_ADMIN" | "ADMIN" | "STAFF";

export type Permission =
  | "dashboard"
  | "customers"
  | "children"
  | "events"
  | "registrations"
  | "payments"
  | "attendance"
  | "certificates"
  | "activities"
  | "gallery"
  | "reports"
  | "settings";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: [
    "dashboard",
    "customers",
    "children",
    "events",
    "registrations",
    "payments",
    "attendance",
    "certificates",
    "activities",
    "gallery",
    "reports",
    "settings",
  ],
  ADMIN: [
    "dashboard",
    "customers",
    "children",
    "events",
    "registrations",
    "payments",
    "attendance",
    "certificates",
    "activities",
    "gallery",
    "reports",
  ],
  STAFF: ["dashboard", "customers", "children", "registrations", "attendance", "reports"],
};

export const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  STAFF: "Staff",
};

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function permissionsOf(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role];
}
