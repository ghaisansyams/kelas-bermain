import { getSupabase } from "@/lib/supabase/client";

/**
 * "Cek Tiket" lookup — same verification rule as attendance.ts's check-in
 * (registration number + the contact given at sign-up), but read-only. On a
 * match it hands back the opaque access_token so the caller can route
 * straight to the existing /payment/[accessToken] status page, rather than
 * duplicating that page's display logic here.
 */

export interface TicketLookupInput {
  registrationNumber: string;
  /** Email or WhatsApp used at registration. */
  contact: string;
}

export type TicketLookupResult =
  | { ok: true; accessToken: string }
  | { ok: false; error: string; field?: "registrationNumber" | "contact" };

export async function findTicketAccessToken(
  input: TicketLookupInput,
): Promise<TicketLookupResult> {
  const { data, error } = await getSupabase().rpc("find_access_token", {
    p_registration_number: input.registrationNumber.trim(),
    p_contact: input.contact.trim(),
  });

  if (error) {
    if (error.message?.includes("NOT_FOUND")) {
      return {
        ok: false,
        field: "registrationNumber",
        error: "Nomor pendaftaran tidak ditemukan. Periksa kembali kode yang kamu terima.",
      };
    }
    if (error.message?.includes("CONTACT_MISMATCH")) {
      return {
        ok: false,
        field: "contact",
        error: "Email atau nomor WhatsApp tidak cocok dengan data pendaftaran.",
      };
    }
    return { ok: false, error: "Gagal memeriksa tiket. Coba lagi sebentar lagi." };
  }

  if (!data) {
    return {
      ok: false,
      field: "registrationNumber",
      error: "Nomor pendaftaran tidak ditemukan. Periksa kembali kode yang kamu terima.",
    };
  }

  return { ok: true, accessToken: data as string };
}
