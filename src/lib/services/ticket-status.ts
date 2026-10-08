import { getSupabase } from "@/lib/supabase/client";

/**
 * Registration status by number, with the detail level set by the contact.
 *
 * Registration numbers run in sequence, so anyone could count up through
 * them. Without the contact used at sign-up the function gives back only a
 * first name, a count and a status — never the invoice number or the full
 * name of whoever registered.
 */

export interface TicketStatusView {
  registrationNumber: string;
  eventTitle: string;
  companionName: string;
  contactVerified: boolean;
  childrenCount: number;
  registrationStatus: string;
  paymentStatus: string;
  amount: number | null;
  invoiceNumber: string | null;
  rejectionReason: string | null;
}

export type TicketStatusResult =
  | { ok: true; status: TicketStatusView }
  | { ok: false; error: string };

export async function checkTicketStatus(
  registrationNumber: string,
  contact?: string,
): Promise<TicketStatusResult> {
  try {
    const { data, error } = await getSupabase().rpc("check_ticket_status", {
      p_registration_number: registrationNumber.trim(),
      p_contact: contact?.trim() || null,
    });

    if (error || !data || typeof data !== "object") {
      return { ok: false, error: "Nomor pendaftaran tidak ditemukan." };
    }

    const row = data as Record<string, unknown>;
    if (row.ok !== true) {
      return { ok: false, error: "Nomor pendaftaran tidak ditemukan. Periksa kembali." };
    }

    return {
      ok: true,
      status: {
        registrationNumber: String(row.registrationNumber),
        eventTitle: String(row.eventTitle),
        companionName: String(row.companionName ?? ""),
        contactVerified: row.contactVerified === true,
        childrenCount: Number(row.childrenCount ?? 0),
        registrationStatus: String(row.registrationStatus),
        paymentStatus: String(row.paymentStatus),
        amount: row.amount == null ? null : Number(row.amount),
        invoiceNumber: row.invoiceNumber == null ? null : String(row.invoiceNumber),
        rejectionReason: row.rejectionReason == null ? null : String(row.rejectionReason),
      },
    };
  } catch {
    return { ok: false, error: "Status belum bisa dicek. Coba lagi sebentar." };
  }
}
