/**
 * Operational data model — the rows an admin manages.
 *
 * Content (events, activities, gallery) lives in `lib/types.ts`; this file
 * covers the transactional side: who registered, what they paid, whether they
 * attended, and what certificate they earned.
 *
 * Shapes deliberately mirror database tables so the move to PostgreSQL is a
 * mapping exercise, not a redesign:
 *
 *   customers.id   -> children.customer_id
 *   customers.id   -> registrations.customer_id
 *   children.id    -> registrations.child_id
 *   events.id      -> registrations.event_id
 *   registrations.id -> payments.registration_id
 *   registrations.id -> attendance.registration_id
 *   registrations.id -> certificates.registration_id
 */

export type RecordStatus = "active" | "inactive";

/** Where a registration came in from — drives the QR source tracking. */
export type RegistrationSource =
  | "qr"
  | "website"
  | "instagram"
  | "poster"
  | "banner"
  | "brosur"
  | "referral"
  | "walk_in";

export const REGISTRATION_SOURCES: RegistrationSource[] = [
  "qr",
  "website",
  "instagram",
  "poster",
  "banner",
  "brosur",
  "referral",
  "walk_in",
];

export const sourceLabel: Record<RegistrationSource, string> = {
  qr: "QR Code",
  website: "Website",
  instagram: "Instagram",
  poster: "Poster",
  banner: "Banner",
  brosur: "Brosur",
  referral: "Referral",
  walk_in: "Walk-in",
};

/** Parent/guardian. One customer record per family contact. */
export interface Customer {
  id: string;
  /** KB-CUS-00001 */
  customerNumber: string;
  fullName: string;
  email: string;
  whatsapp: string;
  address: string;
  city: string;
  occupation: string;
  source: RegistrationSource;
  status: RecordStatus;
  createdAt: string;
  updatedAt: string;
}

export type Gender = "L" | "P";

/** A child belongs to exactly one customer; a customer may have many. */
export interface Child {
  id: string;
  /** KB-CHD-00001 */
  childNumber: string;
  customerId: string;
  fullName: string;
  nickname: string;
  gender: Gender;
  /** ISO date; age is always derived, never stored. */
  dateOfBirth: string;
  school: string;
  grade: string;
  specialNotes?: string;
  emergencyContact: string;
  status: RecordStatus;
  createdAt: string;
}

export type RegistrationStatus =
  | "REGISTERED"
  | "CONFIRMED"
  | "CANCELLED"
  | "COMPLETED";

export type PaymentStatus =
  | "NOT_REQUIRED"
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "EXPIRED"
  | "CANCELLED";

export type AttendanceStatus = "NOT_ATTENDED" | "PRESENT" | "ABSENT";

export type CertificateStatus = "NOT_ELIGIBLE" | "AVAILABLE" | "ISSUED";

/**
 * How money is collected for an event.
 * NONE        — free event
 * WEBSITE     — checkout happens here (mock gateway for now)
 * THIRD_PARTY — customer is handed off to an external platform
 */
export type PaymentMethod = "NONE" | "WEBSITE" | "THIRD_PARTY";

export interface Registration {
  id: string;
  /** KB-REG-2026-00001 */
  registrationNumber: string;
  customerId: string;
  childId: string;
  eventId: string;
  registrationDate: string;
  status: RegistrationStatus;
  paymentStatus: PaymentStatus;
  attendanceStatus: AttendanceStatus;
  certificateStatus: CertificateStatus;
  paymentMethod: PaymentMethod;
  amount: number;
  source: RegistrationSource;
  /** Raw `?source=` value from the scanned QR, kept for attribution. */
  qrSource?: string;
  notes?: string;
}

export interface Payment {
  id: string;
  /** KB-PAY-2026-00001 */
  paymentNumber: string;
  registrationId: string;
  customerId: string;
  eventId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  /** "Mock Gateway" today; the real provider name later. */
  provider: string;
  reference?: string;
  createdAt: string;
  paidAt?: string;
  expiresAt?: string;
}

export interface AttendanceRecord {
  id: string;
  registrationId: string;
  eventId: string;
  childId: string;
  status: AttendanceStatus;
  checkedInAt?: string;
  method: "qr" | "manual" | "form";
  recordedBy?: string;
}

export type CertificateState = "issued" | "revoked";

export interface CertificateRecord {
  /** KB-2026-00001 — also the public verification id. */
  number: string;
  registrationId: string;
  childId: string;
  eventId: string;
  participantName: string;
  eventTitle: string;
  eventDate: string;
  organizer: string;
  template: "classic" | "playful";
  issuedAt: string;
  status: CertificateState;
  signatory: { name: string; role: string };
}

/**
 * Minimal persistence contract. `LocalStorageStore` implements it today;
 * a Supabase or REST adapter can implement the same methods later.
 */
export interface CollectionStore<T> {
  all(): T[];
  save(items: T[]): void;
  add(item: T): T;
}
