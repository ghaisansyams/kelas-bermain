import { affiliatesRepo, registrationsRepo } from "@/lib/repositories";
import type { Affiliate, AffiliateStatus } from "@/lib/repositories/types";
import { nextAffiliateNumber, nextId } from "@/lib/utils/numbering";

/**
 * Affiliate programme.
 *
 * Someone applies from the public site (`applyAsAffiliate`), and the form
 * looks up a typed code (`findAffiliateByCode`) — both stay wired to the
 * public microsite.
 *
 * Everything else here — `listAffiliates`, `approveAffiliate`,
 * `rejectAffiliate`, `setAffiliateStatus`, `statsForAffiliate`,
 * `generateAffiliateCode` — was the ERP's job: verifying an applicant and
 * minting their code. The ERP was removed to keep this project to the public
 * microsite, so **no code is ever issued right now**: applications land as
 * PENDING and sit there, and a code typed at sign-up will never match one.
 * These functions are kept, unused, as the seam to wire up next — a thin
 * approval screen, a spreadsheet-driven script, or a revived ERP — rather
 * than deleted and rewritten from scratch later.
 *
 * Commission accounting itself (Rp10.000 per paid participant, paid out the
 * day before the class) was never built — several of its rules are still
 * open with the client. See PRD v2.0 §8, A-01…A-06.
 */

export const COMMISSION_PER_PARTICIPANT = 10_000;

export interface AffiliateApplication {
  fullName: string;
  whatsapp: string;
  email?: string;
  domicile: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  reason?: string;
}

export type AffiliateResult =
  | { ok: true; affiliate: Affiliate }
  | { ok: false; error: string; field?: string };

const MOCK_LATENCY_MS = 600;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 0812…, +62812… and 62812… are the same person. */
function normalizeWhatsapp(value: string): string {
  const digits = (value ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  return digits;
}

/**
 * A code that is readable on a poster but not guessable from another one.
 *
 * Four letters of the person's name make it feel personal and easy to dictate
 * over the phone; four random characters stop anyone from walking the list and
 * reading a colleague's earnings. Ambiguous characters (O/0, I/1) are left out
 * because these get typed from memory.
 */
const CODE_ALPHABET = "ACDEFGHJKLMNPQRTUVWXY2346789";

function randomChunk(length: number): string {
  const values = new Uint32Array(length);
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    crypto.getRandomValues(values);
  } else {
    for (let i = 0; i < length; i += 1) values[i] = Math.floor(Math.random() * 0xffffffff);
  }
  return Array.from(values, (v) => CODE_ALPHABET[v % CODE_ALPHABET.length]).join("");
}

export function generateAffiliateCode(fullName: string): string {
  const letters = fullName.toUpperCase().replace(/[^A-Z]/g, "");
  const stem = (letters.slice(0, 4) || "KLBM").padEnd(4, "X");
  const taken = new Set(
    affiliatesRepo.all().map((a) => a.code.toUpperCase()).filter(Boolean),
  );
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = `${stem}${randomChunk(4)}`;
    if (!taken.has(candidate)) return candidate;
  }
  // Practically unreachable; better a longer code than a duplicate one.
  return `${stem}${randomChunk(8)}`;
}

export async function applyAsAffiliate(
  input: AffiliateApplication,
): Promise<AffiliateResult> {
  await delay(MOCK_LATENCY_MS);

  const whatsapp = normalizeWhatsapp(input.whatsapp);
  const existing = affiliatesRepo
    .all()
    .find((a) => normalizeWhatsapp(a.whatsapp) === whatsapp);

  if (existing) {
    if (existing.status === "PENDING") {
      return {
        ok: false,
        error:
          "Nomor WhatsApp ini sudah mendaftar dan sedang menunggu verifikasi. Tim kami akan menghubungi kamu.",
        field: "whatsapp",
      };
    }
    if (existing.status === "ACTIVE") {
      return {
        ok: false,
        error: "Nomor WhatsApp ini sudah terdaftar sebagai affiliator aktif.",
        field: "whatsapp",
      };
    }
  }

  const all = affiliatesRepo.all();
  const affiliate: Affiliate = {
    id: nextId("aff", all.map((a) => a.id)),
    affiliateNumber: nextAffiliateNumber(all.map((a) => a.affiliateNumber)),
    // No code until a human approves the application.
    code: "",
    fullName: input.fullName.trim(),
    whatsapp: input.whatsapp.trim(),
    email: input.email?.trim().toLowerCase() || undefined,
    domicile: input.domicile.trim(),
    bankName: input.bankName.trim(),
    bankAccountNumber: input.bankAccountNumber.replace(/\D/g, ""),
    bankAccountName: input.bankAccountName.trim(),
    reason: input.reason?.trim() || undefined,
    status: "PENDING",
    appliedAt: new Date().toISOString(),
  };

  affiliatesRepo.create(affiliate);
  return { ok: true, affiliate };
}

export async function listAffiliates(): Promise<Affiliate[]> {
  return affiliatesRepo
    .all()
    .slice()
    .sort((a, b) => b.appliedAt.localeCompare(a.appliedAt));
}

export async function getAffiliate(id: string): Promise<Affiliate | null> {
  return affiliatesRepo.find(id);
}

export function findAffiliateByCode(code: string): Affiliate | null {
  const needle = code.trim().toUpperCase();
  if (!needle) return null;
  return (
    affiliatesRepo.all().find((a) => a.code.toUpperCase() === needle) ?? null
  );
}

/** Approving an application is what mints the code. */
export async function approveAffiliate(
  id: string,
  verifiedBy: string,
): Promise<Affiliate | null> {
  const affiliate = affiliatesRepo.find(id);
  if (!affiliate) return null;
  return affiliatesRepo.update(id, {
    status: "ACTIVE",
    code: affiliate.code || generateAffiliateCode(affiliate.fullName),
    verifiedAt: new Date().toISOString(),
    verifiedBy,
  });
}

export async function rejectAffiliate(
  id: string,
  verifiedBy: string,
  reason: string,
): Promise<Affiliate | null> {
  return affiliatesRepo.update(id, {
    status: "REJECTED",
    verifiedAt: new Date().toISOString(),
    verifiedBy,
    notes: reason.trim() || undefined,
  });
}

export async function setAffiliateStatus(
  id: string,
  status: AffiliateStatus,
): Promise<Affiliate | null> {
  return affiliatesRepo.update(id, { status });
}

export interface AffiliateStats {
  /** Sign-ups carrying this code, whatever their payment status. */
  referrals: number;
  /** Those whose payment has settled — the ones a commission is owed on. */
  paidReferrals: number;
  /** Indicative only until the commission rules are agreed. */
  estimatedCommission: number;
}

export function statsForAffiliate(code: string): AffiliateStats {
  const needle = code.trim().toUpperCase();
  if (!needle) return { referrals: 0, paidReferrals: 0, estimatedCommission: 0 };

  const referred = registrationsRepo.where(
    (r) => (r.affiliateCode ?? "").toUpperCase() === needle && r.status !== "CANCELLED",
  );
  const paidReferrals = referred.filter((r) => r.paymentStatus === "PAID").length;

  return {
    referrals: referred.length,
    paidReferrals,
    estimatedCommission: paidReferrals * COMMISSION_PER_PARTICIPANT,
  };
}
