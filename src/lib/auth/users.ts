import type { Role } from "./roles";

/**
 * Demo accounts.
 *
 * Fixtures, not a user table: the passwords are printed on the login screen on
 * purpose so the ERP can be reviewed. Swap this module for a real user store
 * with hashed credentials before any real use.
 */

export interface DemoUser {
  username: string;
  password: string;
  name: string;
  role: Role;
  email: string;
}

export const demoUsers: DemoUser[] = [
  {
    username: "superadmin",
    password: "kelasbermain",
    name: "Putri Anggraini",
    role: "SUPER_ADMIN",
    email: "putri@kelasbermain.id",
  },
  {
    username: "admin",
    password: "kelasbermain",
    name: "Rangga Mahendra",
    role: "ADMIN",
    email: "rangga@kelasbermain.id",
  },
  {
    username: "staff",
    password: "kelasbermain",
    name: "Dinda Kurniawati",
    role: "STAFF",
    email: "dinda@kelasbermain.id",
  },
];

export function findDemoUser(username: string, password: string): DemoUser | null {
  const needle = username.trim().toLowerCase();
  return (
    demoUsers.find((u) => u.username === needle && u.password === password) ?? null
  );
}
