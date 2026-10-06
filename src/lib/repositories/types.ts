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
  | "tiktok"
  | "threads"
  | "facebook"
  | "poster"
  | "banner"
  | "brosur"
  | "teman"
  | "affiliator"
  | "referral"
  | "walk_in"
  | "lainnya";

export const REGISTRATION_SOURCES: RegistrationSource[] = [
  "qr",
  "website",
  "instagram",
  "tiktok",
  "threads",
  "facebook",
  "poster",
  "banner",
  "brosur",
  "teman",
  "affiliator",
  "referral",
  "walk_in",
  "lainnya",
];

export const sourceLabel: Record<RegistrationSource, string> = {
  qr: "QR Code",
  website: "Website",
  instagram: "Instagram",
  tiktok: "TikTok",
  threads: "Threads",
  facebook: "Facebook",
  poster: "Poster",
  banner: "Banner",
  brosur: "Brosur",
  teman: "Teman",
  affiliator: "Affiliator",
  referral: "Referral",
  walk_in: "Walk-in",
  lainnya: "Lainnya",
};

/**
 * What the public form offers under "Mengetahui Kelas Bermain dari".
 * `qr`, `website` and `walk_in` are recorded by the system rather than picked.
 */
export const SELECTABLE_SOURCES: RegistrationSource[] = [
  "teman",
  "instagram",
  "tiktok",
  "threads",
  "facebook",
  "affiliator",
  "poster",
  "banner",
  "brosur",
  "lainnya",
];

/** Parent/guardian. One customer record per family contact. */
export interface Customer {
  id: string;
  /** KB-CUS-00001 */
  customerNumber: string;
  fullName: string;
  /** Optional since v2.0 — the real intake form does not ask for it. */
  email: string;
  whatsapp: string;
  /** Free-text "Domisili", e.g. "Pekayon, Jakarta Timur". */
  domicile: string;
  /** Legacy split kept for seeded rows; new sign-ups only fill `domicile`. */
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
  gender: Gender | "";
  /**
   * ISO date. Optional since v2.0: the intake form asks for an age
   * ("3 THN 8 BULAN"), not a birthday. Seeded rows still carry one, and it
   * remains the better source when present because it never goes stale.
   */
  dateOfBirth: string;
  /**
   * Age as the parent stated it, with the date it was stated. Together these
   * let the real age be recomputed later instead of silently ageing out.
   */
  ageYears?: number;
  ageMonths?: number;
  ageRecordedAt?: string;
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
  /** KB-REG-2026-00001 — human-readable, sequential, safe to say out loud. */
  registrationNumber: string;
  /**
   * Opaque, unguessable id for public URLs (the payment/status page). Never
   * derived from `registrationNumber`, which is sequential and must not be
   * the only thing gating a page that shows a child's name or a parent's
   * WhatsApp number once this data lives in a shared database. Optional only
   * because the legacy localStorage seed data (src/data/registrations.ts,
   * kept solely for the disabled certificate feature) predates this field —
   * every Supabase-backed registration always has one.
   */
  accessToken?: string;
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
  /**
   * Affiliate code as typed by the parent, uppercased. Stored unvalidated
   * for now — the affiliate programme itself lands later (PRD F13), and a
   * typo must never block a sign-up.
   */
  affiliateCode?: string;
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

/* ------------------------------------------------------------------ */
/* Affiliate programme                                                 */
/* ------------------------------------------------------------------ */

export type AffiliateStatus = "PENDING" | "ACTIVE" | "INACTIVE" | "REJECTED";

export const affiliateStatusLabel: Record<AffiliateStatus, string> = {
  PENDING: "Menunggu Verifikasi",
  ACTIVE: "Aktif",
  INACTIVE: "Nonaktif",
  REJECTED: "Ditolak",
};

/**
 * Someone who promotes classes with a personal code and earns a commission
 * per paid participant.
 *
 * Bank details sit here because payouts are transferred by hand. They are
 * third-party financial data: only SUPER_ADMIN should ever see them, and they
 * must never reach the public side.
 */
export interface Affiliate {
  id: string;
  /** KB-AFF-00001 */
  affiliateNumber: string;
  /**
   * Public code the parent types at sign-up. Empty until an admin approves
   * the application — an unverified applicant must not be able to earn.
   */
  code: string;
  fullName: string;
  whatsapp: string;
  email?: string;
  domicile: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  /** Free text: why they want to join. */
  reason?: string;
  status: AffiliateStatus;
  appliedAt: string;
  verifiedAt?: string;
  verifiedBy?: string;
  /** Reason shown to the team when an application is rejected. */
  notes?: string;
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
