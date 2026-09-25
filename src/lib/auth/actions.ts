"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createToken, SESSION_COOKIE, SESSION_MAX_AGE, verifyToken } from "./session";
import { findDemoUser } from "./users";
import type { SessionPayload } from "./session";

export interface LoginState {
  error?: string;
}

export async function login(
  _previous: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const username = String(formData.get("username") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin/dashboard");

  const user = findDemoUser(username, password);
  if (!user) {
    return { error: "Username atau kata sandi salah." };
  }

  const token = await createToken({
    username: user.username,
    name: user.name,
    role: user.role,
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  // Only allow relative paths back into the ERP.
  redirect(next.startsWith("/admin") ? next : "/admin/dashboard");
}

export async function logout(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/admin/login");
}

/** Reads the current session on the server. Null when signed out. */
export async function currentSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifyToken(store.get(SESSION_COOKIE)?.value);
}
