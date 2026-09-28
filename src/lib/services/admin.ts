import { ageOfChild } from "@/lib/utils/age";
import { certificatesEnabled } from "@/lib/features";
import { activities } from "@/data/activities";
import { events } from "@/data/events";
import { galleryItems } from "@/data/gallery";
import {
  affiliatesRepo,
  attendanceRepo,
  certificatesRepo,
  childrenRepo,
  customersRepo,
  paymentsRepo,
  registrationsRepo,
} from "@/lib/repositories";
import type {
  AttendanceRecord,
  CertificateRecord,
  Child,
  Customer,
  Payment,
  Registration,
} from "@/lib/repositories/types";
import type { EventRecord } from "@/lib/types";
import { resolveLifecycle } from "@/lib/utils/date";

/**
 * Read models for the ERP.
 *
 * The repositories stay normalised; this is where rows are joined into the
 * shapes a table actually renders. Keeping the joins here means a future SQL
 * view or API endpoint can replace them without touching a single screen.
 */

const eventById = (id: string): EventRecord | undefined =>
  events.find((event) => event.id === id);

export interface RegistrationRow {
  registration: Registration;
  customer: Customer | null;
  child: Child | null;
  event: EventRecord | undefined;
  payment: Payment | null;
}

export async function getRegistrationRows(): Promise<RegistrationRow[]> {
  const payments = paymentsRepo.all();
  return registrationsRepo
    .all()
    .map((registration) => ({
      registration,
      customer: customersRepo.find(registration.customerId),
      child: childrenRepo.find(registration.childId),
      event: eventById(registration.eventId),
      payment: payments.find((p) => p.registrationId === registration.id) ?? null,
    }))
    .sort(
      (a, b) =>
        new Date(b.registration.registrationDate).getTime() -
        new Date(a.registration.registrationDate).getTime(),
    );
}

export interface CustomerRow {
  customer: Customer;
  childCount: number;
  registrationCount: number;
  totalPaid: number;
  lastRegistrationAt: string | null;
}

export async function getCustomerRows(): Promise<CustomerRow[]> {
  const allChildren = childrenRepo.all();
  const allRegistrations = registrationsRepo.all();
  const allPayments = paymentsRepo.all();

  return customersRepo
    .all()
    .map((customer) => {
      const regs = allRegistrations.filter((r) => r.customerId === customer.id);
      const last = regs
        .map((r) => r.registrationDate)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
      return {
        customer,
        childCount: allChildren.filter((c) => c.customerId === customer.id).length,
        registrationCount: regs.length,
        totalPaid: allPayments
          .filter((p) => p.customerId === customer.id && p.status === "PAID")
          .reduce((sum, p) => sum + p.amount, 0),
        lastRegistrationAt: last ?? null,
      };
    })
    .sort((a, b) => a.customer.customerNumber.localeCompare(b.customer.customerNumber));
}

export interface ChildRow {
  child: Child;
  parent: Customer | null;
  age: number;
  classCount: number;
  lastActivityAt: string | null;
}

export async function getChildRows(): Promise<ChildRow[]> {
  const allRegistrations = registrationsRepo.all();
  return childrenRepo
    .all()
    .map((child) => {
      const regs = allRegistrations.filter((r) => r.childId === child.id);
      const last = regs
        .map((r) => r.registrationDate)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
      return {
        child,
        parent: customersRepo.find(child.customerId),
        age: ageOfChild(child) ?? 0,
        classCount: regs.length,
        lastActivityAt: last ?? null,
      };
    })
    .sort((a, b) => a.child.childNumber.localeCompare(b.child.childNumber));
}

export interface PaymentRow {
  payment: Payment;
  registration: Registration | null;
  customer: Customer | null;
  event: EventRecord | undefined;
}

export async function getPaymentRows(): Promise<PaymentRow[]> {
  return paymentsRepo
    .all()
    .map((payment) => ({
      payment,
      registration: registrationsRepo.find(payment.registrationId),
      customer: customersRepo.find(payment.customerId),
      event: eventById(payment.eventId),
    }))
    .sort(
      (a, b) =>
        new Date(b.payment.createdAt).getTime() - new Date(a.payment.createdAt).getTime(),
    );
}

export interface AttendanceRow {
  record: AttendanceRecord;
  registration: Registration | null;
  child: Child | null;
  customer: Customer | null;
  event: EventRecord | undefined;
}

export async function getAttendanceRows(): Promise<AttendanceRow[]> {
  return attendanceRepo.all().map((record) => {
    const registration = registrationsRepo.find(record.registrationId);
    return {
      record,
      registration,
      child: childrenRepo.find(record.childId),
      customer: registration ? customersRepo.find(registration.customerId) : null,
      event: eventById(record.eventId),
    };
  });
}

export interface CertificateRow {
  certificate: CertificateRecord;
  child: Child | null;
  customer: Customer | null;
  event: EventRecord | undefined;
}

export async function getCertificateRows(): Promise<CertificateRow[]> {
  return certificatesRepo
    .all()
    .map((certificate) => {
      const registration = registrationsRepo.find(certificate.registrationId);
      return {
        certificate,
        child: childrenRepo.find(certificate.childId),
        customer: registration ? customersRepo.find(registration.customerId) : null,
        event: eventById(certificate.eventId),
      };
    })
    .sort((a, b) => b.certificate.number.localeCompare(a.certificate.number));
}

export interface EventRow {
  event: EventRecord;
  lifecycle: ReturnType<typeof resolveLifecycle>;
  registrationCount: number;
  paidCount: number;
  attendedCount: number;
  revenue: number;
}

export async function getEventRows(now: Date = new Date()): Promise<EventRow[]> {
  const allRegistrations = registrationsRepo.all();
  const allPayments = paymentsRepo.all();

  return events
    .map((event) => {
      const regs = allRegistrations.filter((r) => r.eventId === event.id);
      return {
        event,
        lifecycle: resolveLifecycle(event.startDate, event.endDate, now),
        registrationCount: regs.length,
        paidCount: regs.filter((r) => r.paymentStatus === "PAID").length,
        attendedCount: regs.filter((r) => r.attendanceStatus === "PRESENT").length,
        revenue: allPayments
          .filter((p) => p.eventId === event.id && p.status === "PAID")
          .reduce((sum, p) => sum + p.amount, 0),
      };
    })
    .sort((a, b) => new Date(b.event.startDate).getTime() - new Date(a.event.startDate).getTime());
}

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

export interface SeriesPoint {
  label: string;
  value: number;
}

export type RangeKey = "7d" | "30d" | "6m" | "custom";

export interface DashboardRange {
  key: RangeKey;
  /** Inclusive ISO dates (yyyy-mm-dd). */
  from: string;
  to: string;
}

export type Granularity = "day" | "week" | "month";

export interface Trend {
  /** Percent change against the previous window of equal length. */
  percent: number;
  direction: "up" | "down" | "flat";
  /** False when the previous window had nothing to compare against. */
  comparable: boolean;
}

/** Attendance split for one event, used by the dashboard breakdown. */
export interface AttendanceEventPoint {
  label: string;
  present: number;
  absent: number;
  pending: number;
  total: number;
}

export interface DashboardData {
  range: DashboardRange;
  granularity: Granularity;
  stats: {
    revenue: number;
    revenueTrend: Trend;
    registrations: number;
    registrationsTrend: Trend;
    /** Outstanding payments are never scoped to the range — an overdue one
        from two months ago still needs chasing. */
    pendingCount: number;
    pendingAmount: number;
    attendance: { present: number; absent: number; pending: number; rate: number };
    customersTotal: number;
    customersAdded: number;
    childrenTotal: number;
    childrenAdded: number;
    upcomingEvents: number;
    certificatesTotal: number;
    certificatesIssued: number;
    /** Registrations in range divided by the events that actually drew any. */
    avgPerEvent: number;
    eventsWithRegistrations: number;
    activeRegistrations: number;
  };
  registrationSeries: SeriesPoint[];
  revenueSeries: SeriesPoint[];
  registrationsByEvent: SeriesPoint[];
  attendanceByEvent: AttendanceEventPoint[];
  recentRegistrations: RegistrationRow[];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const DAY_MS = 86_400_000;

const isoDay = (date: Date): string => {
  const copy = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return copy.toISOString().slice(0, 10);
};

export function resolveRange(
  key: RangeKey,
  now: Date = new Date(),
  custom?: { from: string; to: string },
): DashboardRange {
  const to = isoDay(now);
  if (key === "custom" && custom?.from && custom?.to) {
    return custom.from <= custom.to
      ? { key, from: custom.from, to: custom.to }
      : { key, from: custom.to, to: custom.from };
  }
  if (key === "7d") return { key, from: isoDay(new Date(now.getTime() - 6 * DAY_MS)), to };
  if (key === "30d") return { key, from: isoDay(new Date(now.getTime() - 29 * DAY_MS)), to };
  const sixMonthsBack = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  return { key: "6m", from: isoDay(sixMonthsBack), to };
}

function spanDays(range: DashboardRange): number {
  return Math.max(
    1,
    Math.round((Date.parse(range.to) - Date.parse(range.from)) / DAY_MS) + 1,
  );
}

export function granularityFor(range: DashboardRange): Granularity {
  const days = spanDays(range);
  if (days <= 14) return "day";
  if (days <= 92) return "week";
  return "month";
}

/** The window of equal length immediately before `range`. */
function previousWindow(range: DashboardRange): { from: string; to: string } {
  const days = spanDays(range);
  const to = new Date(Date.parse(range.from) - DAY_MS);
  const from = new Date(to.getTime() - (days - 1) * DAY_MS);
  return { from: isoDay(from), to: isoDay(to) };
}

const within = (iso: string | undefined, from: string, to: string): boolean => {
  if (!iso) return false;
  const day = iso.slice(0, 10);
  return day >= from && day <= to;
};

function trendOf(current: number, previous: number): Trend {
  if (previous === 0) {
    return {
      percent: 0,
      direction: current > 0 ? "up" : "flat",
      comparable: false,
    };
  }
  const percent = ((current - previous) / previous) * 100;
  return {
    percent: Math.round(Math.abs(percent)),
    direction: percent > 0.5 ? "up" : percent < -0.5 ? "down" : "flat",
    comparable: true,
  };
}

/** Bucket boundaries for the series, oldest first. */
function buckets(
  range: DashboardRange,
  granularity: Granularity,
): { label: string; from: string; to: string }[] {
  const out: { label: string; from: string; to: string }[] = [];
  const start = new Date(`${range.from}T00:00:00`);
  const end = new Date(`${range.to}T00:00:00`);

  if (granularity === "month") {
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cursor <= end) {
      const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
      out.push({
        label: `${MONTHS[cursor.getMonth()]} ${String(cursor.getFullYear()).slice(2)}`,
        from: isoDay(cursor),
        to: isoDay(last > end ? end : last),
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return out;
  }

  const step = granularity === "week" ? 7 : 1;
  const cursor = new Date(start);
  while (cursor <= end) {
    const last = new Date(cursor.getTime() + (step - 1) * DAY_MS);
    const capped = last > end ? end : last;
    out.push({
      label:
        granularity === "day"
          ? `${cursor.getDate()} ${MONTHS[cursor.getMonth()]}`
          : `${cursor.getDate()} ${MONTHS[cursor.getMonth()]}`,
      from: isoDay(cursor),
      to: isoDay(capped),
    });
    cursor.setTime(cursor.getTime() + step * DAY_MS);
  }
  return out;
}

export async function getDashboard(
  rangeKey: RangeKey = "6m",
  now: Date = new Date(),
  custom?: { from: string; to: string },
): Promise<DashboardData> {
  const range = resolveRange(rangeKey, now, custom);
  const granularity = granularityFor(range);
  const previous = previousWindow(range);

  const allRegistrations = registrationsRepo.all();
  const allPayments = paymentsRepo.all();
  const allCertificates = certificatesRepo.all();

  const inRange = allRegistrations.filter((r) =>
    within(r.registrationDate, range.from, range.to),
  );
  const inPrevious = allRegistrations.filter((r) =>
    within(r.registrationDate, previous.from, previous.to),
  );

  const paidIn = (from: string, to: string) =>
    allPayments
      .filter((p) => p.status === "PAID" && within(p.paidAt ?? p.createdAt, from, to))
      .reduce((sum, p) => sum + p.amount, 0);

  const revenue = paidIn(range.from, range.to);
  const pending = allPayments.filter((p) => p.status === "PENDING");

  const present = inRange.filter((r) => r.attendanceStatus === "PRESENT").length;
  const absent = inRange.filter((r) => r.attendanceStatus === "ABSENT").length;
  const notYet = inRange.filter((r) => r.attendanceStatus === "NOT_ATTENDED").length;
  const settled = present + absent + notYet;

  const series = buckets(range, granularity);
  const registrationSeries = series.map((bucket) => ({
    label: bucket.label,
    value: allRegistrations.filter((r) =>
      within(r.registrationDate, bucket.from, bucket.to),
    ).length,
  }));
  const revenueSeries = series.map((bucket) => ({
    label: bucket.label,
    value: paidIn(bucket.from, bucket.to),
  }));

  const registrationsByEvent = events
    .map((event) => ({
      label: event.title,
      value: inRange.filter((r) => r.eventId === event.id).length,
    }))
    .filter((point) => point.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  // Attendance split per event. The dashboard's attendance card reports one
  // blended rate; this says which event is dragging it, which is the next
  // question an admin asks.
  const attendanceByEvent: AttendanceEventPoint[] = events
    .map((event) => {
      const regs = inRange.filter((r) => r.eventId === event.id);
      return {
        label: event.title,
        present: regs.filter((r) => r.attendanceStatus === "PRESENT").length,
        absent: regs.filter((r) => r.attendanceStatus === "ABSENT").length,
        pending: regs.filter((r) => r.attendanceStatus === "NOT_ATTENDED").length,
        total: regs.length,
      };
    })
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 4);

  const rows = await getRegistrationRows();
  const scopedRows = rows.filter((row) =>
    within(row.registration.registrationDate, range.from, range.to),
  );

  return {
    range,
    granularity,
    stats: {
      revenue,
      revenueTrend: trendOf(revenue, paidIn(previous.from, previous.to)),
      registrations: inRange.length,
      registrationsTrend: trendOf(inRange.length, inPrevious.length),
      pendingCount: pending.length,
      pendingAmount: pending.reduce((sum, p) => sum + p.amount, 0),
      attendance: {
        present,
        absent,
        pending: notYet,
        rate: settled > 0 ? Math.round((present / settled) * 100) : 0,
      },
      customersTotal: customersRepo.all().length,
      customersAdded: customersRepo
        .all()
        .filter((c) => within(c.createdAt, range.from, range.to)).length,
      childrenTotal: childrenRepo.all().length,
      childrenAdded: childrenRepo
        .all()
        .filter((c) => within(c.createdAt, range.from, range.to)).length,
      upcomingEvents: events.filter(
        (e) => e.published && resolveLifecycle(e.startDate, e.endDate, now) === "upcoming",
      ).length,
      certificatesTotal: allCertificates.length,
      certificatesIssued: allCertificates.filter((c) =>
        within(c.issuedAt, range.from, range.to),
      ).length,
      avgPerEvent:
        registrationsByEvent.length > 0
          ? Math.round((inRange.length / registrationsByEvent.length) * 10) / 10
          : 0,
      eventsWithRegistrations: registrationsByEvent.length,
      activeRegistrations: allRegistrations.filter(
        (r) => r.status === "REGISTERED" || r.status === "CONFIRMED",
      ).length,
    },
    registrationSeries,
    revenueSeries,
    registrationsByEvent,
    attendanceByEvent,
    recentRegistrations: (scopedRows.length > 0 ? scopedRows : rows).slice(0, 6),
  };
}

/* ------------------------------------------------------------------ */
/* Global search                                                       */
/* ------------------------------------------------------------------ */

export type SearchKind =
  | "customer"
  | "child"
  | "registration"
  | "event"
  | "payment"
  | "certificate"
  | "affiliate";

export interface SearchHit {
  kind: SearchKind;
  title: string;
  subtitle: string;
  href: string;
}

const KIND_LABEL: Record<SearchKind, string> = {
  customer: "Orang Tua",
  child: "Anak",
  registration: "Pendaftaran",
  event: "Event",
  payment: "Pembayaran",
  certificate: "Sertifikat",
  affiliate: "Affiliate",
};

export function searchKindLabel(kind: SearchKind): string {
  return KIND_LABEL[kind];
}

export async function globalSearch(query: string, limit = 12): Promise<SearchHit[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const has = (...values: (string | undefined)[]) =>
    values.some((v) => v?.toLowerCase().includes(q));
  const hits: SearchHit[] = [];

  for (const c of customersRepo.all()) {
    if (has(c.fullName, c.customerNumber, c.email, c.whatsapp, c.city)) {
      hits.push({
        kind: "customer",
        title: c.fullName,
        subtitle: `${c.customerNumber} · ${c.whatsapp}`,
        href: `/admin/customers/${c.id}`,
      });
    }
  }
  for (const c of childrenRepo.all()) {
    if (has(c.fullName, c.childNumber, c.nickname, c.school)) {
      hits.push({
        kind: "child",
        title: c.fullName,
        subtitle: `${c.childNumber} · ${c.school}`,
        href: `/admin/children/${c.id}`,
      });
    }
  }
  for (const r of registrationsRepo.all()) {
    const child = childrenRepo.find(r.childId);
    if (has(r.registrationNumber, child?.fullName)) {
      hits.push({
        kind: "registration",
        title: r.registrationNumber,
        subtitle: `${child?.fullName ?? "—"} · ${eventById(r.eventId)?.title ?? "—"}`,
        href: `/admin/registrations?q=${encodeURIComponent(r.registrationNumber)}`,
      });
    }
  }
  for (const e of events) {
    if (has(e.title, e.slug, e.location.city)) {
      hits.push({
        kind: "event",
        title: e.title,
        subtitle: `${e.location.city} · ${e.startDate}`,
        href: `/admin/events/${e.id}`,
      });
    }
  }
  for (const p of paymentsRepo.all()) {
    if (has(p.paymentNumber, p.reference)) {
      hits.push({
        kind: "payment",
        title: p.paymentNumber,
        subtitle: `${eventById(p.eventId)?.title ?? "—"} · ${p.status}`,
        href: `/admin/payments?q=${encodeURIComponent(p.paymentNumber)}`,
      });
    }
  }
  // Certificate pages 404 while the feature is off (R-06 / K-07), so they
  // must not appear as search results either.
  for (const c of certificatesEnabled ? certificatesRepo.all() : []) {
    if (has(c.number, c.participantName)) {
      hits.push({
        kind: "certificate",
        title: c.number,
        subtitle: `${c.participantName} · ${c.eventTitle}`,
        href: `/certificate/${c.number}`,
      });
    }
  }
  for (const a of affiliatesRepo.all()) {
    if (has(a.fullName, a.affiliateNumber, a.code, a.whatsapp)) {
      hits.push({
        kind: "affiliate",
        title: a.fullName,
        subtitle: `${a.affiliateNumber}${a.code ? ` · ${a.code}` : ""}`,
        href: `/admin/affiliates?q=${encodeURIComponent(a.fullName)}`,
      });
    }
  }
  return hits.slice(0, limit);
}

/* ------------------------------------------------------------------ */
/* CSV export                                                          */
/* ------------------------------------------------------------------ */

export function toCsv<T>(
  rows: T[],
  columns: { header: string; value: (row: T) => string | number }[],
): string {
  const escape = (value: string | number) => {
    const text = String(value ?? "");
    // Guard against spreadsheet formula injection on export.
    const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
    return /[",\n;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const head = columns.map((c) => escape(c.header)).join(",");
  const body = rows.map((row) => columns.map((c) => escape(c.value(row))).join(","));
  return [head, ...body].join("\n");
}

export function downloadCsv(filename: string, csv: string): void {
  // Byte-order mark keeps Excel from mangling Indonesian characters.
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Counts for the ERP sidebar badges. */
export async function getContentCounts(): Promise<{
  activities: number;
  gallery: number;
  events: number;
}> {
  return {
    activities: activities.length,
    gallery: galleryItems.length,
    events: events.length,
  };
}
