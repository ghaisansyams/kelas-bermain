import { formatRupiah } from "@/lib/utils/format";

/**
 * Payment boundary — deliberately a placeholder.
 *
 * No real gateway is wired up. `MockPaymentProvider` returns manual transfer
 * instructions so the paid-event journey can be demonstrated end to end. To go
 * live, implement `PaymentProvider` against Midtrans/Xendit/Stripe and swap the
 * export below; nothing else in the app needs to change.
 */

export interface PaymentInstruction {
  provider: string;
  method: "manual_transfer";
  reference: string;
  amount: number;
  amountLabel: string;
  /** Shown as a step list on the registration success screen. */
  steps: string[];
  account: { bank: string; number: string; holder: string };
  /** ISO timestamp after which the instruction expires. */
  expiresAt: string;
  note: string;
}

export interface ChargeInput {
  registrationId: string;
  eventTitle: string;
  amount: number;
}

export interface PaymentProvider {
  readonly name: string;
  createCharge(input: ChargeInput): Promise<PaymentInstruction>;
}

const PAYMENT_WINDOW_HOURS = 24;

export const mockPaymentProvider: PaymentProvider = {
  name: "Transfer Manual (Placeholder)",
  async createCharge({ registrationId, eventTitle, amount }) {
    const expiresAt = new Date(
      Date.now() + PAYMENT_WINDOW_HOURS * 60 * 60 * 1000,
    ).toISOString();
    return {
      provider: "Transfer Manual (Placeholder)",
      method: "manual_transfer",
      reference: registrationId,
      amount,
      amountLabel: formatRupiah(amount),
      steps: [
        `Transfer sebesar ${formatRupiah(amount)} ke rekening di bawah ini.`,
        `Cantumkan ID pendaftaran ${registrationId} pada berita transfer.`,
        `Kirim bukti transfer melalui Instagram @kelasbermain paling lambat ${PAYMENT_WINDOW_HOURS} jam setelah mendaftar.`,
        "Status pendaftaran berubah menjadi terkonfirmasi setelah pembayaran diverifikasi panitia.",
      ],
      account: {
        bank: "Bank Contoh Indonesia",
        number: "1234 5678 9012",
        holder: `Yayasan Kelas Bermain — ${eventTitle}`.slice(0, 60),
      },
      expiresAt,
      note: "Data pembayaran di atas masih contoh. Integrasi payment gateway akan ditambahkan pada tahap berikutnya.",
    };
  },
};

export const paymentProvider: PaymentProvider = mockPaymentProvider;
