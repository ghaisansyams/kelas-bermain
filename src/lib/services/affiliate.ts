import { getSupabase } from "@/lib/supabase/client";

/**
 * Affiliate programme.
 *
 * `applyAsAffiliate` and `findAffiliateByCode` are the only two things the
 * public microsite ever calls — both go through SECURITY DEFINER functions
 * in supabase/schema.sql, and both are deliberately narrow about what they
 * return (an application never gets its own bank details echoed back; a
 * code lookup never returns bank details, WhatsApp or domicile at all).
 *
 * There is no admin UI, on purpose (PRD: "fokus di microsite saja"). The
 * team reviews applications and flips PENDING -> ACTIVE directly in the
 * Supabase Table Editor — a Postgres trigger (affiliates_assign_code in
 * schema.sql) mints the code automatically the moment they do, so nobody
 * has to invent one or check it isn't already taken. Once a code exists,
 * every registration that used it becomes visible the same way: open the
 * registrations table in Supabase, filter affiliate_code.
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
  | { ok: true; affiliateNumber: string }
  | { ok: false; error: string; field?: string };

export async function applyAsAffiliate(
  input: AffiliateApplication,
): Promise<AffiliateResult> {
  const { data, error } = await getSupabase().rpc("apply_as_affiliate", {
    p_full_name: input.fullName.trim(),
    p_whatsapp: input.whatsapp.trim(),
    p_email: input.email?.trim().toLowerCase() ?? "",
    p_domicile: input.domicile.trim(),
    p_bank_name: input.bankName.trim(),
    p_bank_account_number: input.bankAccountNumber.replace(/\D/g, ""),
    p_bank_account_name: input.bankAccountName.trim(),
    p_reason: input.reason?.trim() ?? "",
  });

  if (error) {
    if (error.message?.includes("ALREADY_APPLIED")) {
      return {
        ok: false,
        field: "whatsapp",
        error:
          "Nomor WhatsApp ini sudah mendaftar sebagai affiliator. Tim kami akan menghubungi kamu.",
      };
    }
    return { ok: false, error: "Gagal mengirim pendaftaran. Coba lagi sebentar lagi." };
  }

  const row = Array.isArray(data) ? data[0] : data;
  return { ok: true, affiliateNumber: row.affiliate_number };
}

export interface AffiliateLookup {
  code: string;
  fullName: string;
  status: "PENDING" | "ACTIVE" | "INACTIVE" | "REJECTED";
}

/** For the registration form's live "Kode FIKA7QM2 milik ... ✓" hint. */
export async function findAffiliateByCode(code: string): Promise<AffiliateLookup | null> {
  const trimmed = code.trim();
  if (!trimmed) return null;
  const { data, error } = await getSupabase().rpc("find_affiliate_by_code", {
    p_code: trimmed,
  });
  if (error || !data) return null;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return { code: row.code, fullName: row.full_name, status: row.status };
}
