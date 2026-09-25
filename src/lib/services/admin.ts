import { activities } from "@/data/activities";
import { events } from "@/data/events";
import { galleryItems } from "@/data/gallery";
import {
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
import { ageOf } from "./customer";

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
        age: ageOf(child.dateOfBirth),
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

export interface DashboardData {
  stats: {
    customers: number;
    children: number;
    upcomingEvents: number;
    activeRegistrations: number;
    pendingPayments: number;
    paidRegistrations: number;
    attendanceToday: number;
    certificatesIssued: number;
    revenue: number;
  };
  registrationsByMonth: SeriesPoint[];
  revenueByMonth: SeriesPoint[];
  registrationsByEvent: SeriesPoint[];
  attendanceRate: { present: number; absent: number; pending: number };
  recentRegistrations: RegistrationRow[];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

function monthKey(iso: string): string {
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
}

/** Last `count` months ending with the current one, oldest first. */
function recentMonths(count: number, now: Date): string[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1);
    return `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`;
  });
}

export async function getDashboard(now: Date = new Date()): Promise<DashboardData> {
  const allRegistrations = registrationsRepo.all();
  const allPayments = paymentsRepo.all();
  const allAttendance = attendanceRepo.all();
  const today = now.toISOString().slice(0, 10);

  const months = recentMonths(6, now);
  const registrationsByMonth = months.map((label) => ({
    label,
    value: allRegistrations.filter((r) => monthKey(r.registrationDate) === label).length,
  }));
  const revenueByMonth = months.map((label) => ({
    label,
    value: allPayments
      .filter((p) => p.status === "PAID" && monthKey(p.paidAt ?? p.createdAt) === label)
      .reduce((sum, p) => sum + p.amount, 0),
  }));

  const registrationsByEvent = events
    .map((event) => ({
      label: event.title,
      value: allRegistrations.filter((r) => r.eventId === event.id).length,
    }))
    .filter((point) => point.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const rows = await getRegistrationRows();

  return {
    stats: {
      customers: customersRepo.all().length,
      children: childrenRepo.all().length,
      upcomingEvents: events.filter(
        (e) => e.published && resolveLifecycle(e.startDate, e.endDate, now) === "upcoming",
      ).length,
      activeRegistrations: allRegistrations.filter(
        (r) => r.status === "REGISTERED" || r.status === "CONFIRMED",
      ).length,
      pendingPayments: allPayments.filter((p) => p.status === "PENDING").length,
      paidRegistrations: allRegistrations.filter((r) => r.paymentStatus === "PAID").length,
      attendanceToday: allAttendance.filter((a) => a.checkedInAt?.startsWith(today)).length,
      certificatesIssued: certificatesRepo.all().length,
      revenue: allPayments
        .filter((p) => p.status === "PAID")
        .reduce((sum, p) => sum + p.amount, 0),
    },
    registrationsByMonth,
    revenueByMonth,
    registrationsByEvent,
    attendanceRate: {
      present: allRegistrations.filter((r) => r.attendanceStatus === "PRESENT").length,
      absent: allRegistrations.filter((r) => r.attendanceStatus === "ABSENT").length,
      pending: allRegistrations.filter((r) => r.attendanceStatus === "NOT_ATTENDED").length,
    },
    recentRegistrations: rows.slice(0, 6),
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
  | "certificate";

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
  for (const c of certificatesRepo.all()) {
    if (has(c.number, c.participantName)) {
      hits.push({
        kind: "certificate",
        title: c.number,
        subtitle: `${c.participantName} · ${c.eventTitle}`,
        href: `/certificate/${c.number}`,
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
