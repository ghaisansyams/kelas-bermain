import { getSupabase } from "@/lib/supabase/client";
import type { PaymentMethod } from "@/lib/repositories/types";
import { formatRupiah } from "@/lib/utils/format";

/**
 * Payment boundary.
 *
 * The WEBSITE method is manual bank transfer (PRD v2.0, R-04), not a real
 * gateway. THIRD_PARTY only records the hand-off — the external platform
 * owns the outcome. Either way, the payment stays PENDING until an admin
 * verifies the WhatsApp proof and flips it to PAID by hand in the Supabase
 * Table Editor: no code path here can mark a payment PAID, on purpose — see
 * the note on set_payment_status in supabase/schema.sql.
 */

export interface PaymentInstruction {
  provider: string;
  method: PaymentMethod;
  reference: string;
  amount: number;
  amountLabel: string;
  steps: string[];
  /** Where a THIRD_PARTY customer continues. */
  redirectUrl?: string;
  expiresAt?: string;
  note: string;
}

export interface ChargeInput {
  registrationId: string;
  registrationNumber: string;
  customerId: string;
  eventId: string;
  eventTitle: string;
  amount: number;
  thirdPartyUrl?: string;
}

const PAYMENT_WINDOW_HOURS = 24;

function buildInstruction(input: ChargeInput, method: PaymentMethod): PaymentInstruction {
  if (method === "THIRD_PARTY") {
    return {
      provider: "Mitra Pembayaran Eksternal",
      method,
      reference: input.registrationNumber,
      amount: input.amount,
      amountLabel: formatRupiah(input.amount),
      steps: [
        `Pendaftaran ${input.eventTitle} atas nama kamu sudah tercatat dengan nomor ${input.registrationNumber}.`,
        "Pembayaran diselesaikan di platform mitra, bukan di situs ini.",
        "Simpan nomor pendaftaran untuk dicantumkan saat membayar.",
        "Status berubah menjadi lunas setelah mitra mengonfirmasi ke panitia.",
      ],
      redirectUrl: input.thirdPartyUrl,
      note: "Kelas Bermain tidak memproses pembayaran untuk kelas ini. Status tetap menunggu sampai mitra mengonfirmasi.",
    };
  }
  const expiresAt = new Date(Date.now() + PAYMENT_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
  return {
    provider: "Manual Transfer",
    method: "WEBSITE",
    reference: input.registrationNumber,
    amount: input.amount,
    amountLabel: formatRupiah(input.amount),
    steps: [
      `Transfer ${formatRupiah(input.amount)} ke rekening yang tertera.`,
      `Cantumkan ${input.registrationNumber} pada berita transfer.`,
      "Kirim bukti transfer lewat WhatsApp untuk verifikasi.",
    ],
    expiresAt,
    note: "Kuota terkunci setelah tim memverifikasi bukti transfer.",
  };
}

/** Creates the payment row that shadows a registration. */
export async function createPayment(
  input: ChargeInput,
  method: PaymentMethod,
): Promise<{ instruction: PaymentInstruction } | null> {
  if (method === "NONE") return null;

  const instruction = buildInstruction(input, method);
  const { error } = await getSupabase().rpc("create_payment", {
    p_registration_id: input.registrationId,
    p_customer_id: input.customerId,
    p_event_id: input.eventId,
    p_amount: input.amount,
    p_method: method,
    p_provider: instruction.provider,
    p_expires_at: instruction.expiresAt ?? null,
  });
  if (error) {
    throw new Error("Gagal menyiapkan instruksi pembayaran. Coba lagi sebentar lagi.");
  }
  return { instruction };
}
