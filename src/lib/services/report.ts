/**
 * Report aggregation. Lives in the service layer like every other DB read, so
 * the admin pages and the CSV export compute the same numbers from the same
 * query — a report that disagrees with the screen is worse than no report.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

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

interface RegistrationRow {
  id: string;
  event_id: string;
  status: string;
  payment_status: string;
  attendance_status: string;
  certificate_status: string;
  created_at: string;
}

interface PaymentRow {
  event_id: string;
  amount: number;
  status: string;
}

interface TransactionRow {
  amount: number;
  type: string;
}

/** Default range: the current month, which is what the team reports on. */
export function defaultRange(now: Date = new Date()): ReportRange {
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: toIso(from), to: toIso(to) };
}

export function toIso(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

export async function buildReport(
  supabase: SupabaseClient,
  range: ReportRange,
  eventTitles: Map<string, { title: string; startDate: string }>,
): Promise<ReportSummary> {
  // `to` is inclusive for the admin, so the query reaches the end of that day.
  const until = `${range.to}T23:59:59.999Z`;

  const [registrationsRes, paymentsRes, transactionsRes] = await Promise.all([
    supabase
      .from("registrations")
      .select(
        "id, event_id, status, payment_status, attendance_status, certificate_status, created_at",
      )
      .gte("created_at", range.from)
      .lte("created_at", until),
    supabase
      .from("payments")
      .select("event_id, amount, status")
      .gte("created_at", range.from)
      .lte("created_at", until),
    supabase
      .from("financial_transactions")
      .select("amount, type")
      .gte("occurred_at", range.from)
      .lte("occurred_at", until),
  ]);

  const registrations = (registrationsRes.data ?? []) as unknown as RegistrationRow[];
  const payments = (paymentsRes.data ?? []) as unknown as PaymentRow[];
  const transactions = (transactionsRes.data ?? []) as unknown as TransactionRow[];

  const active = registrations.filter((row) => row.status !== "CANCELLED");
  const paidRegistrations = active.filter((row) => row.payment_status === "PAID").length;
  const pendingRegistrations = active.filter((row) =>
    ["UNPAID", "WAITING_VERIFICATION"].includes(row.payment_status),
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
    if (["UNPAID", "WAITING_VERIFICATION"].includes(row.payment_status)) target.pending += 1;
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

/** Minimal RFC-4180 escaping: quote anything containing a comma, quote or newline. */
export function toCsv(rows: (string | number)[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const value = String(cell);
          return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
        })
        .join(","),
    )
    .join("\r\n");
}
