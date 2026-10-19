/**
 * Agregasi laporan. Ada di lapisan layanan seperti pembacaan database lain,
 * supaya halaman admin dan ekspor CSV menghitung angka yang sama dari kueri
 * yang sama — laporan yang berbeda dari layar lebih buruk daripada tidak ada.
 */

import "server-only";

import { db } from "@/lib/db";

export interface ReportRange {
  from: string;
  to: string;
}

export interface EventReportRow {
  eventId: string;
  eventTitle: string;
  startDate: string;
  registrations: number;
  cancelled: number;
  paid: number;
  pending: number;
  present: number;
  certificates: number;
  revenue: number;
}

export interface ReportSummary {
  range: ReportRange;
  /** False when a source table could not be read, so zeros are not mistaken for "no activity". */
  complete: boolean;
  missing: string[];
  registrations: number;
  paidRegistrations: number;
  pendingRegistrations: number;
  revenue: number;
  refunds: number;
  net: number;
  present: number;
  attendanceRate: number;
  certificates: number;
  conversionRate: number;
  events: EventReportRow[];
}

/** Default range: the current month, which is what the team reports on. */
export function defaultRange(now: Date = new Date()): ReportRange {
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: toIso(from), to: toIso(to) };
}

/**
 * Rentang dari URL bukan masukan tepercaya. Tanggal yang tidak berbentuk
 * YYYY-MM-DD menghasilkan Invalid Date, yang membuat kueri database melempar
 * galat — ekspor CSV berakhir dengan halaman 500, bukan laporan bulan ini.
 */
export function sanitiseRange(
  input: { from?: string | null; to?: string | null },
  fallback: ReportRange = defaultRange(),
): ReportRange {
  const valid = (value?: string | null) =>
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(new Date(`${value}T00:00:00+07:00`).getTime());
  return {
    from: valid(input.from) ? (input.from as string) : fallback.from,
    to: valid(input.to) ? (input.to as string) : fallback.to,
  };
}

export function toIso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

export async function buildReport(
  range: ReportRange,
  eventTitles: Map<string, { title: string; startDate: string }>,
): Promise<ReportSummary> {
  // Rentang dibaca menurut Jakarta. `to` inklusif untuk admin, jadi kueri
  // mencapai akhir hari itu. Dulu batasnya UTC, yang jatuh pukul 07.00 WIB:
  // pendaftaran pukul 02.00 pagi tanggal 1 terhitung bulan sebelumnya.
  const from = new Date(`${range.from}T00:00:00+07:00`);
  const until = new Date(`${range.to}T23:59:59.999+07:00`);

  const missing: string[] = [];

  // Setiap sumber dibaca sendiri-sendiri: satu tabel yang gagal dibaca harus
  // tercatat di `missing`, bukan membuat seluruh laporan gagal — dan nol dari
  // tabel yang gagal tidak boleh dikira "tidak ada aktivitas".
  const [registrations, payments, transactions] = await Promise.all([
    db.registrations
      .findMany({
        where: { registration_date: { gte: from, lte: until } },
        select: {
          event_id: true,
          status: true,
          payment_status: true,
          attendance_status: true,
          certificate_status: true,
        },
      })
      .catch(() => {
        missing.push("registrations");
        return [];
      }),
    db.payments
      .findMany({
        where: { created_at: { gte: from, lte: until } },
        select: { event_id: true, amount: true, status: true },
      })
      .catch(() => {
        missing.push("payments");
        return [];
      }),
    db.financial_transactions
      .findMany({
        // Kolom ini transaction_date. Kode lama menanyakan `occurred_at`, yang
        // tidak pernah ada, jadi pemasukan dan refund selalu terbaca nol.
        where: { transaction_date: { gte: from, lte: until } },
        select: { amount: true, type: true },
      })
      .catch(() => {
        missing.push("financial_transactions");
        return [];
      }),
  ]);

  // Belum lunas = belum dibayar atau sedang menunggu dicek. Kode lama menghitung
  // status "UNPAID", yang bukan status sungguhan, sehingga angkanya selalu nol.
  const UNSETTLED = ["PENDING", "WAITING_VERIFICATION"];

  const active = registrations.filter((row) => row.status !== "CANCELLED");
  const paidRegistrations = active.filter((row) => row.payment_status === "PAID").length;
  const pendingRegistrations = active.filter((row) =>
    UNSETTLED.includes(row.payment_status),
  ).length;
  const present = active.filter((row) => row.attendance_status === "PRESENT").length;
  const certificates = active.filter((row) => row.certificate_status === "ISSUED").length;

  const revenue = transactions
    .filter((row) => row.type === "INCOME")
    .reduce((total, row) => total + Number(row.amount), 0);
  const refunds = Math.abs(
    transactions
      .filter((row) => row.type === "REFUND")
      .reduce((total, row) => total + Number(row.amount), 0),
  );

  const byEvent = new Map<string, EventReportRow>();
  const ensure = (eventId: string): EventReportRow => {
    const existing = byEvent.get(eventId);
    if (existing) return existing;
    const meta = eventTitles.get(eventId);
    const row: EventReportRow = {
      eventId,
      eventTitle: meta?.title ?? eventId,
      startDate: meta?.startDate ?? "",
      registrations: 0,
      cancelled: 0,
      paid: 0,
      pending: 0,
      present: 0,
      certificates: 0,
      revenue: 0,
    };
    byEvent.set(eventId, row);
    return row;
  };

  for (const row of registrations) {
    const target = ensure(row.event_id);
    if (row.status === "CANCELLED") {
      target.cancelled += 1;
      continue;
    }
    target.registrations += 1;
    if (row.payment_status === "PAID") target.paid += 1;
    if (UNSETTLED.includes(row.payment_status)) target.pending += 1;
    if (row.attendance_status === "PRESENT") target.present += 1;
    if (row.certificate_status === "ISSUED") target.certificates += 1;
  }

  for (const payment of payments) {
    if (payment.status !== "PAID") continue;
    ensure(payment.event_id).revenue += Number(payment.amount);
  }

  const events = [...byEvent.values()].sort((a, b) => b.startDate.localeCompare(a.startDate));

  return {
    range,
    complete: missing.length === 0,
    missing,
    registrations: active.length,
    paidRegistrations,
    pendingRegistrations,
    revenue,
    refunds,
    net: revenue - refunds,
    present,
    attendanceRate: active.length > 0 ? Math.round((present / active.length) * 100) : 0,
    certificates,
    conversionRate:
      active.length > 0 ? Math.round((paidRegistrations / active.length) * 100) : 0,
    events,
  };
}

/**
 * Spreadsheet app membaca sel yang diawali = + - @ sebagai rumus. Nama
 * pendamping dan anak diketik bebas oleh publik, lalu diekspor ke berkas yang
 * dibuka admin di Excel: nama seperti `=HYPERLINK("http://...")` akan jalan
 * sebagai rumus di komputer admin. Sel teks yang diawali karakter itu diberi
 * tanda petik di depan supaya dibaca sebagai teks. Angka tidak disentuh —
 * refund memang bernilai negatif, dan itu angka sah, bukan rumus.
 */
function neutralise(cell: string | number): string {
  if (typeof cell === "number") return String(cell);
  return /^[=+\-@\t\r]/.test(cell) ? `'${cell}` : cell;
}

/** Pelolosan RFC-4180 minimal: kutip apa pun yang berisi koma, kutip, atau baris baru. */
export function toCsv(rows: (string | number)[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const value = neutralise(cell);
          return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
        })
        .join(","),
    )
    .join("\r\n");
}
