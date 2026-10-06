import { getSupabase } from "@/lib/supabase/client";

/**
 * Attendance service.
 *
 * Check-in is verified against the registration number plus a contact the
 * family gave at sign-up — enforced inside `check_in_registration` in
 * supabase/schema.sql, not here, so the same rule holds no matter who calls
 * it. Registration numbers are sequential and safe to say out loud, but they
 * are never sufficient on their own to prove you are that family.
 */

export interface CheckInInput {
  registrationNumber: string;
  /** Email or WhatsApp used at registration. */
  contact: string;
  eventId?: string;
  /** "qr" for a scanned check-in, "form" (default) for a typed one. */
  method?: "qr" | "form";
}

export interface CheckInSuccess {
  ok: true;
  registrationNumber: string;
  childName: string;
  eventId: string;
  alreadyRecorded: boolean;
  certificateAvailable: boolean;
}

export interface CheckInFailure {
  ok: false;
  error: string;
  field?: "registrationNumber" | "contact";
}

export type CheckInResult = CheckInSuccess | CheckInFailure;

export async function checkIn(input: CheckInInput): Promise<CheckInResult> {
  const { data, error } = await getSupabase().rpc("check_in_registration", {
    p_registration_number: input.registrationNumber.trim(),
    p_contact: input.contact.trim(),
    p_method: input.method ?? "form",
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
    return { ok: false, error: "Gagal memproses check-in. Coba lagi sebentar lagi." };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (input.eventId && row.event_id !== input.eventId) {
    return {
      ok: false,
      field: "registrationNumber",
      error: "Nomor ini terdaftar untuk kelas lain.",
    };
  }

  return {
    ok: true,
    registrationNumber: input.registrationNumber.trim().toUpperCase(),
    childName: row.child_full_name ?? "Peserta",
    eventId: row.event_id,
    alreadyRecorded: Boolean(row.already_recorded),
    certificateAvailable: Boolean(row.certificate_available),
  };
}
