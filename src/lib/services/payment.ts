import "server-only";

import type { Prisma } from "@prisma/client";
import type { PaymentMethod } from "@/lib/repositories/types";
import { formatRupiah } from "@/lib/utils/format";

/**
 * Batas pembayaran.
 *
 * Metode WEBSITE adalah transfer bank manual (PRD v2.0, R-04) — tidak ada
 * gateway pembayaran, tidak ada Midtrans. Tetap PENDING sampai admin
 * memverifikasi bukti dan mengubahnya jadi PAID lewat halaman Pembayaran:
 * tidak ada jalur kode di sini yang bisa menandai pembayaran PAID, dan itu
 * disengaja.
 *
 * Bukan server action, dengan sengaja: fungsi ini menulis nominal tanpa
 * memeriksanya, jadi hanya createRegistration yang boleh memanggilnya, dan
 * itu setelah menghitung nominalnya sendiri di server.
 */

export interface PaymentInstruction {
  provider: string;
  method: PaymentMethod;
  reference: string;
  amount: number;
  amountLabel: string;
  steps: string[];
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
}

const PAYMENT_WINDOW_HOURS = 24;

function buildInstruction(input: ChargeInput, method: PaymentMethod): PaymentInstruction {
  const expiresAt = new Date(Date.now() + PAYMENT_WINDOW_HOURS * 60 * 60 * 1000).toISOString();
  return {
    provider: "Manual Transfer",
    method,
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

/** Membuat baris pembayaran yang membayangi sebuah pendaftaran. */
export async function createPayment(
  tx: Prisma.TransactionClient,
  input: ChargeInput,
  method: PaymentMethod,
): Promise<{ instruction: PaymentInstruction } | null> {
  if (method === "NONE") return null;

  const instruction = buildInstruction(input, method);

  await tx.payments.create({
    data: {
      registration_id: input.registrationId,
      customer_id: input.customerId,
      event_id: input.eventId,
      amount: input.amount,
      method,
      provider: instruction.provider,
      expires_at: instruction.expiresAt ? new Date(instruction.expiresAt) : null,
    },
  });

  return { instruction };
}
