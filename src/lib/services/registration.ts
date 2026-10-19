"use server";

import { db } from "@/lib/db";
import { getEvents } from "@/lib/services/content";
import { getPricingConfig } from "@/lib/services/pricing-settings";
import { lookupVoucher } from "@/lib/services/voucher";
import type {
  Customer,
  PaymentMethod,
  Registration,
  RegistrationSource,
} from "@/lib/repositories/types";
import type { EventView } from "@/lib/types";
import { calculateRegistrationPrice, type PricingResult } from "@/lib/pricing";
import { upsertChild, upsertCustomer, type ChildInput, type CustomerInput } from "./customer";
import { createPayment, type PaymentInstruction } from "./payment";

/**
 * Layanan pendaftaran — satu-satunya tempat sebuah pendaftaran dibuat.
 *
 * Satu kiriman berisi satu atau lebih kelompok `participants`, masing-masing
 * pendamping pembayar dengan anak-anaknya sendiri. Pendaftaran PERSONAL
 * hanyalah satu kelompok; GROUP adalah beberapa.
 *
 * Ini server action, jadi isi permintaannya adalah masukan dari internet:
 * harga, ketersediaan, dan kuota dihitung ulang dari database di sini, dan
 * apa pun yang dikirim browser soal itu hanya dipakai untuk dibandingkan —
 * tidak pernah dipercaya. Dulu fungsi SQL menerima nominal dari klien apa
 * adanya; sekarang event dengan harga Rp0 yang dikarang di browser tidak
 * bisa menurunkan tagihan.
 */

export interface RegistrationParticipantGroup {
  companion: CustomerInput;
  children: (ChildInput & { ageOverride?: boolean })[];
}

export interface RegistrationRequest {
  event: EventView;
  participants: RegistrationParticipantGroup[];
  source: RegistrationSource;
  /** Raw `?source=` value carried by the scanned QR. */
  qrSource?: string;
  /** What the parent picked under "Mengetahui Kelas Bermain dari". */
  heardFrom?: RegistrationSource;
  /** Affiliate code as typed, already uppercased. Never validated here. */
  affiliateCode?: string;
  notes?: string;
  /**
   * Computed once by `calculateRegistrationPrice` and shown to the parent on
   * the confirmation step — passed in rather than recomputed here so the
   * amount actually charged can never drift from what they agreed to.
   */
  pricing: PricingResult;
}

export interface RegistrationBatch {
  customerId: string;
  customerNumber: string;
  registrations: Registration[];
  /** Absent for free events. */
  payment?: PaymentInstruction;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  pricing: PricingResult;
}

export type RegistrationResult =
  | { ok: true; batch: RegistrationBatch }
  | { ok: false; error: string; field?: string };

function mapRegistration(row: {
  id: string;
  registration_number: string;
  access_token: string;
  customer_id: string;
  child_id: string;
  event_id: string;
  registration_date: Date;
  status: string;
  payment_status: string;
  attendance_status: string;
  certificate_status: string;
  payment_method: string;
  amount: unknown;
  source: string;
  qr_source: string | null;
  affiliate_code: string | null;
  notes: string | null;
}): Registration {
  return {
    id: row.id,
    registrationNumber: row.registration_number,
    accessToken: row.access_token,
    customerId: row.customer_id,
    childId: row.child_id,
    eventId: row.event_id,
    registrationDate: row.registration_date.toISOString(),
    status: row.status as Registration["status"],
    paymentStatus: row.payment_status as Registration["paymentStatus"],
    attendanceStatus: row.attendance_status as Registration["attendanceStatus"],
    certificateStatus: row.certificate_status as Registration["certificateStatus"],
    paymentMethod: row.payment_method as PaymentMethod,
    amount: Number(row.amount),
    source: row.source as RegistrationSource,
    qrSource: row.qr_source ?? undefined,
    affiliateCode: row.affiliate_code ?? undefined,
    notes: row.notes ?? undefined,
  };
}

/** Penolakan yang disengaja di dalam transaksi; membatalkan semuanya. */
class RegistrationRefused extends Error {
  constructor(
    message: string,
    readonly field?: string,
  ) {
    super(message);
  }
}

export async function createRegistration(
  request: RegistrationRequest,
): Promise<RegistrationResult> {
  const { participants, source } = request;

  const totalChildren = participants.reduce((sum, group) => sum + group.children.length, 0);
  if (totalChildren === 0) {
    return { ok: false, error: "Tambahkan minimal satu data anak." };
  }

  // Event dimuat ulang dari database. Yang dikirim browser hanya dipakai
  // sebagai penunjuk id — harga dan ketersediaannya tidak dipercaya.
  const events = await getEvents();
  const event = events.find((item) => item.id === request.event.id);
  if (!event) return { ok: false, error: "Kelas ini tidak ditemukan." };

  if (event.availability !== "open") {
    return {
      ok: false,
      error:
        event.availability === "full"
          ? "Kuota kelas ini sudah penuh."
          : "Pendaftaran kelas ini sudah ditutup.",
    };
  }
  if (totalChildren > event.seatsLeft) {
    return {
      ok: false,
      error: `Sisa kuota tinggal ${event.seatsLeft} anak, sedangkan kamu mendaftarkan ${totalChildren}.`,
    };
  }

  const isFree = event.registration.type === "FREE";
  const method: PaymentMethod = isFree ? "NONE" : event.registration.method;
  const unitPrice = isFree ? 0 : (event.registration.price ?? 0);

  // Harga dihitung ulang dengan aturan dan voucher dari database. Kalau hasilnya
  // beda dari yang disetujui orang tua di layar konfirmasi, pendaftaran
  // ditolak — lebih baik meminta mereka melihat angka baru daripada menagih
  // nominal yang tidak pernah mereka lihat.
  const affiliateCode = request.affiliateCode?.trim() || undefined;
  const affiliate = affiliateCode
    ? await db.affiliates.findFirst({
        where: { code: { equals: affiliateCode, mode: "insensitive" }, status: "ACTIVE" },
        select: { id: true },
      })
    : null;

  const voucherCode = request.pricing.voucher?.code;
  const voucher = voucherCode
    ? await lookupVoucher(voucherCode, totalChildren, event.id)
    : null;

  const pricing = calculateRegistrationPrice({
    eventPrice: unitPrice,
    childrenCount: totalChildren,
    hasActiveAffiliate: Boolean(affiliate),
    affiliateCode,
    voucher: voucher?.ok ? voucher.voucher : null,
    config: await getPricingConfig(),
  });

  if (!isFree && pricing.total !== request.pricing.total) {
    return {
      ok: false,
      error:
        "Total pembayaran berubah sejak kamu membukanya. Muat ulang halaman ini untuk melihat angka terbaru.",
    };
  }

  try {
    return await db.$transaction(async (tx) => {
      // Baris event dikunci selama transaksi. Tanpa kunci, dua keluarga yang
      // mendaftar untuk kursi terakhir pada detik yang sama sama-sama lolos
      // pemeriksaan kuota dan kelas kelebihan peserta.
      const locked = await tx.$queryRaw<{ capacity: number }[]>`
        select capacity from events where id = ${event.id} for update`;
      if (!locked[0]) throw new RegistrationRefused("Kelas ini tidak ditemukan.");

      const taken = await tx.registrations.count({
        where: { event_id: event.id, status: { not: "CANCELLED" } },
      });
      if (taken + totalChildren > locked[0].capacity) {
        throw new RegistrationRefused(
          `Kuota baru saja terisi. Sisa ${Math.max(0, locked[0].capacity - taken)} kursi.`,
        );
      }

      const created: Registration[] = [];
      // Pendamping pertama yang mengisi formulir adalah yang mengoordinasi
      // pembayaran: tagihan satu paket dibebankan ke pendaftarannya.
      let leadCustomer: Customer | null = null;

      for (const group of participants) {
        const { customer } = await upsertCustomer(tx, { ...group.companion, source });
        if (!leadCustomer) leadCustomer = customer;

        for (const child of group.children) {
          const childRow = await upsertChild(tx, customer.id, child);

          const duplicate = await tx.registrations.findFirst({
            where: {
              customer_id: customer.id,
              child_id: childRow.id,
              event_id: event.id,
              status: { not: "CANCELLED" },
            },
            select: { id: true },
          });
          if (duplicate) {
            throw new RegistrationRefused(
              `${childRow.fullName} sudah terdaftar di kelas ini.`,
              "children",
            );
          }

          const row = await tx.registrations.create({
            data: {
              customer_id: customer.id,
              child_id: childRow.id,
              event_id: event.id,
              amount: unitPrice,
              status: isFree ? "CONFIRMED" : "REGISTERED",
              payment_status: isFree ? "NOT_REQUIRED" : "PENDING",
              payment_method: method,
              source,
              qr_source: request.qrSource || null,
              affiliate_code: affiliateCode || null,
              age_override: Boolean(child.ageOverride),
            },
          });
          created.push(mapRegistration(row));
        }
      }

      const totalAmount = isFree ? 0 : pricing.total;
      let payment: PaymentInstruction | undefined;

      if (!isFree && leadCustomer) {
        const lead = created[0];
        const result = await createPayment(
          tx,
          {
            registrationId: lead.id,
            registrationNumber: lead.registrationNumber,
            customerId: leadCustomer.id,
            eventId: event.id,
            eventTitle: event.title,
            amount: totalAmount,
            thirdPartyUrl: event.registration.thirdPartyUrl,
          },
          method,
        );
        payment = result?.instruction;
      }

      return {
        ok: true as const,
        batch: {
          customerId: leadCustomer?.id ?? "",
          customerNumber: leadCustomer?.customerNumber ?? "",
          registrations: created,
          payment,
          totalAmount,
          paymentMethod: method,
          pricing,
        },
      };
    });
  } catch (error) {
    if (error instanceof RegistrationRefused) {
      return { ok: false, error: error.message, field: error.field };
    }
    return { ok: false, error: "Gagal menyimpan pendaftaran. Coba lagi sebentar lagi." };
  }
}

export interface RegistrationStatusView {
  registrationNumber: string;
  eventId: string;
  status: string;
  paymentStatus: string;
  paymentMethod: PaymentMethod;
  amount: number;
  childFullName: string;
  customerFullName: string;
  customerWhatsapp: string;
  paymentId: string | null;
  paymentExpiresAt: string | null;
  /** Issued when an admin confirms the payment; null until then. */
  invoiceNumber: string | null;
  paidAt: string | null;
}

/** Dicari lewat access_token acak dari URL — tidak pernah lewat nomor berurutan. */
export async function getRegistrationByToken(
  token: string,
): Promise<RegistrationStatusView | null> {
  // Token bukan uuid sah akan membuat Postgres melempar error; itu "tidak
  // ditemukan", bukan kegagalan server.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) return null;

  try {
    const row = await db.registrations.findFirst({
      where: { access_token: token },
      select: {
        registration_number: true,
        event_id: true,
        status: true,
        payment_status: true,
        payment_method: true,
        amount: true,
        children: { select: { full_name: true } },
        customers: { select: { full_name: true, whatsapp: true } },
        payments: {
          select: { id: true, amount: true, expires_at: true, invoice_number: true, paid_at: true },
          take: 1,
        },
      },
    });
    if (!row) return null;

    const payment = row.payments[0] ?? null;
    return {
      registrationNumber: row.registration_number,
      eventId: row.event_id,
      status: row.status,
      paymentStatus: row.payment_status,
      paymentMethod: row.payment_method as PaymentMethod,
      // Tagihan sebenarnya, bukan harga satuan. Untuk keluarga dengan tiga
      // anak, kolom amount di pendaftaran hanyalah harga satu anak — dan
      // halaman ini menyuruh orang tua mentransfer angka yang tertulis di sini.
      amount: Number(payment?.amount ?? row.amount),
      childFullName: row.children.full_name,
      customerFullName: row.customers.full_name,
      customerWhatsapp: row.customers.whatsapp,
      paymentId: payment?.id ?? null,
      paymentExpiresAt: payment?.expires_at ? payment.expires_at.toISOString() : null,
      invoiceNumber: payment?.invoice_number ?? null,
      paidAt: payment?.paid_at ? payment.paid_at.toISOString() : null,
    };
  } catch {
    return null;
  }
}
