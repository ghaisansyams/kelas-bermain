import type { Role } from "./roles";

/**
 * Demo session tokens.
 *
 * NOT production authentication. There is no user database, no password
 * hashing, and no account recovery — this exists so the ERP can be explored
 * behind a gate. The payload is signed with HMAC-SHA256 so a cookie cannot be
 * hand-edited to escalate a role, but the accounts themselves are fixtures.
 *
 * Replace `lib/auth/*` with a real provider (Supabase Auth, Auth.js, Clerk)
 * before this handles anything real.
 */

export const SESSION_COOKIE = "kb_admin_session";
export const SESSION_MAX_AGE = 60 * 60 * 8; // 8 hours

export interface SessionPayload {
  username: string;
  name: string;
  role: Role;
  /** Seconds since epoch. */
  exp: number;
}

function secret(): string {
  return (
    process.env.ADMIN_SESSION_SECRET ??
    // Documented development fallback; set the env var in any real deployment.
    "kelas-bermain-demo-secret-change-me"
  );
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function sign(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(data),
  );
  return toBase64Url(new Uint8Array(signature));
}

export async function createToken(
  payload: Omit<SessionPayload, "exp">,
): Promise<string> {
  const body: SessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
  };
  const encoded = toBase64Url(new TextEncoder().encode(JSON.stringify(body)));
  return `${encoded}.${await sign(encoded)}`;
}

export async function verifyToken(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expected = await sign(encoded);
  // Length-safe comparison; both are fixed-length base64url digests.
  if (expected.length !== signature.length) return null;
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  if (diff !== 0) return null;

  try {
    const payload = JSON.parse(
      new TextDecoder().decode(fromBase64Url(encoded)),
    ) as SessionPayload;
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}
