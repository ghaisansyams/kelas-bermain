import { lookups, paymentsRepo, registrationsRepo } from "@/lib/repositories";
import type { Payment, PaymentMethod, PaymentStatus } from "@/lib/repositories/types";
import { nextId, nextPaymentNumber } from "@/lib/utils/numbering";
import { formatRupiah } from "@/lib/utils/format";

/**
 * Payment boundary.
 *
 * No real gateway is wired up. `mockGateway` settles instantly and
 * `thirdPartyGateway` only records the hand-off — the external platform owns
 * the outcome, so the payment stays PENDING until an admin confirms it.
 *
 * To go live, implement `PaymentGateway` against Midtrans/Xendit/Stripe and
 * swap the entry in `gateways`; nothing else in the app changes.
 */

export interface PaymentInstruction {
  provider: string;
  method: PaymentMethod;
  reference: string;
  amount: number;
  amountLabel: string;
  steps: string[];
  account?: { bank: string; number: string; holder: string };
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

export interface PaymentGateway {
  readonly name: string;
  readonly method: PaymentMethod;
  createCharge(input: ChargeInput): Promise<PaymentInstruction>;
}

const PAYMENT_WINDOW_HOURS = 24;
const MOCK_LATENCY_MS = 600;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const mockGateway: PaymentGateway = {
  name: "Mock Gateway",
  method: "WEBSITE",
  async createCharge({ registrationNumber, amount }) {
    const expiresAt = new Date(
      Date.now() + PAYMENT_WINDOW_HOURS * 60 * 60 * 1000,
    ).toISOString();
    return {
      provider: "Mock Gateway",
      method: "WEBSITE",
      reference: registrationNumber,
      amount,
      amountLabel: formatRupiah(amount),
      steps: [
        `Transfer ${formatRupiah(amount)} ke rekening di bawah ini.`,
        `Cantumkan ${registrationNumber} pada berita transfer.`,
        "Tekan tombol konfirmasi setelah pembayaran selesai.",
      ],
      account: {
        bank: "Bank Contoh Indonesia",
        number: "1234 5678 9012",
        holder: "Kelas Bermain",
      },
      expiresAt,
      note: "Gerbang pembayaran ini masih simulasi. Integrasi penyedia pembayaran sungguhan menyusul.",
    };
  },
};

export const thirdPartyGateway: PaymentGateway = {
  name: "Mitra Pembayaran Eksternal",
  method: "THIRD_PARTY",
  async createCharge({ registrationNumber, amount, eventTitle, thirdPartyUrl }) {
    return {
      provider: "Mitra Pembayaran Eksternal",
      method: "THIRD_PARTY",
      reference: registrationNumber,
      amount,
      amountLabel: formatRupiah(amount),
      steps: [
        `Pendaftaran ${eventTitle} atas nama kamu sudah tercatat dengan nomor ${registrationNumber}.`,
        "Pembayaran diselesaikan di platform mitra, bukan di situs ini.",
        "Simpan nomor pendaftaran untuk dicantumkan saat membayar.",
        "Status berubah menjadi lunas setelah mitra mengonfirmasi ke panitia.",
      ],
      redirectUrl: thirdPartyUrl,
      note: "Kelas Bermain tidak memproses pembayaran untuk kelas ini. Status tetap menunggu sampai mitra mengonfirmasi.",
    };
  },
};

const gateways: Record<Exclude<PaymentMethod, "NONE">, PaymentGateway> = {
  WEBSITE: mockGateway,
  THIRD_PARTY: thirdPartyGateway,
};

export function gatewayFor(method: PaymentMethod): PaymentGateway | null {
  return method === "NONE" ? null : gateways[method];
}

/** Creates the payment row that shadows a registration. */
export async function createPayment(
  input: ChargeInput,
  method: PaymentMethod,
): Promise<{ payment: Payment; instruction: PaymentInstruction } | null> {
  const gateway = gatewayFor(method);
  if (!gateway) return null;

  await delay(MOCK_LATENCY_MS);
  const instruction = await gateway.createCharge(input);
  const existing = paymentsRepo.all();

  const payment: Payment = {
    id: nextId("pay", existing.map((p) => p.id)),
    paymentNumber: nextPaymentNumber(existing.map((p) => p.paymentNumber)),
    registrationId: input.registrationId,
    customerId: input.customerId,
    eventId: input.eventId,
    amount: input.amount,
    method,
    status: "PENDING",
    provider: gateway.name,
    reference: instruction.reference,
    createdAt: new Date().toISOString(),
    expiresAt: instruction.expiresAt,
  };

  paymentsRepo.create(payment);
  return { payment, instruction };
}

export type SettleResult =
  | { ok: true; payment: Payment }
  | { ok: false; error: string };

/**
 * Settles a WEBSITE payment through the mock gateway.
 * `outcome` lets the demo exercise the failure path too.
 */
export async function settlePayment(
  registrationId: string,
  outcome: "PAID" | "FAILED" = "PAID",
): Promise<SettleResult> {
  await delay(900);

  const payment = lookups.paymentByRegistration(registrationId);
  if (!payment) return { ok: false, error: "Data pembayaran tidak ditemukan." };
  if (payment.status === "PAID") return { ok: true, payment };
  if (payment.method === "THIRD_PARTY") {
    return {
      ok: false,
      error:
        "Pembayaran kelas ini diselesaikan di platform mitra dan tidak bisa dikonfirmasi dari situs ini.",
    };
  }

  const updated = paymentsRepo.update(payment.id, {
    status: outcome,
    paidAt: outcome === "PAID" ? new Date().toISOString() : undefined,
  });
  if (!updated) return { ok: false, error: "Gagal memperbarui pembayaran." };

  registrationsRepo.update(registrationId, {
    paymentStatus: outcome,
    status: outcome === "PAID" ? "CONFIRMED" : "REGISTERED",
  });

  return outcome === "PAID"
    ? { ok: true, payment: updated }
    : { ok: false, error: "Pembayaran gagal diproses. Silakan coba lagi." };
}

/** Admin-side override, used when a third party confirms out of band. */
export async function setPaymentStatus(
  paymentId: string,
  status: PaymentStatus,
): Promise<Payment | null> {
  const payment = paymentsRepo.update(paymentId, {
    status,
    paidAt: status === "PAID" ? new Date().toISOString() : undefined,
  });
  if (!payment) return null;
  registrationsRepo.update(payment.registrationId, {
    paymentStatus: status,
    ...(status === "PAID" ? { status: "CONFIRMED" as const } : {}),
  });
  return payment;
}

export async function getPaymentByRegistration(
  registrationId: string,
): Promise<Payment | null> {
  return lookups.paymentByRegistration(registrationId);
}

export async function listPayments(): Promise<Payment[]> {
  return paymentsRepo.all();
}
