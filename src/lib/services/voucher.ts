/**
 * Voucher validation. The catalogue never leaves the database — the browser
 * can only ask "is this one code usable for this cart?", which is answered by
 * the `find_voucher` SECURITY DEFINER function.
 */

import type { VoucherDefinition } from "@/lib/pricing";
import { getSupabase } from "@/lib/supabase/client";

export type VoucherLookup =
  | { ok: true; voucher: VoucherDefinition }
  | { ok: false; error: string };

const REASON_MESSAGE: Record<string, string> = {
  INVALID: "Kode voucher tidak valid.",
  NOT_STARTED: "Voucher ini belum berlaku.",
  EXPIRED: "Voucher ini sudah kedaluwarsa.",
  EXHAUSTED: "Kuota voucher ini sudah habis.",
  OTHER_EVENT: "Voucher ini tidak berlaku untuk event ini.",
};

export async function lookupVoucher(
  code: string,
  childrenCount: number,
  eventId: string,
): Promise<VoucherLookup> {
  const trimmed = code.trim().toUpperCase();
  if (!trimmed) return { ok: false, error: "Masukkan kode voucher." };

  try {
    const { data, error } = await getSupabase().rpc("find_voucher", {
      p_code: trimmed,
      p_children_count: childrenCount,
      p_event_id: eventId,
    });

    if (error || !data || typeof data !== "object") {
      return { ok: false, error: REASON_MESSAGE.INVALID };
    }

    const result = data as Record<string, unknown>;
    if (result.ok !== true) {
      const reason = String(result.reason ?? "INVALID");
      if (reason === "MIN_CHILDREN") {
        return {
          ok: false,
          error: `Voucher ini butuh minimal ${result.minChildren} anak dalam satu pendaftaran.`,
        };
      }
      return { ok: false, error: REASON_MESSAGE[reason] ?? REASON_MESSAGE.INVALID };
    }

    return {
      ok: true,
      voucher: {
        code: String(result.code),
        type: result.type === "PERCENTAGE" ? "PERCENTAGE" : "FIXED",
        value: Number(result.value),
        maxDiscount: result.maxDiscount == null ? null : Number(result.maxDiscount),
        description: String(result.description ?? ""),
      },
    };
  } catch {
    return { ok: false, error: REASON_MESSAGE.INVALID };
  }
}

/** Records the use once the registration row exists. Best-effort by design. */
export async function redeemVoucher(
  code: string,
  registrationId: string,
  amount: number,
): Promise<void> {
  try {
    await getSupabase().rpc("redeem_voucher", {
      p_code: code,
      p_registration_id: registrationId,
      p_amount: amount,
    });
  } catch {
    // A failed redemption must never block a registration that already exists.
  }
}
