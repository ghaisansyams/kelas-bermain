import type { RegistrationType } from "@/lib/types";

export type PaymentStatus = "not_required" | "pending" | "paid" | "failed";

export type ParticipantStatus = "confirmed" | "waiting_payment" | "cancelled";

/** One row of the future `registrations` table. */
export interface Registration {
  id: string;
  eventSlug: string;
  eventTitle: string;
  eventDate: string;
  fullName: string;
  email: string;
  whatsapp: string;
  institution: string;
  city: string;
  age: number;
  notes?: string;
  registrationType: RegistrationType;
  /** Rupiah. 0 for free events. */
  amount: number;
  paymentStatus: PaymentStatus;
  status: ParticipantStatus;
  createdAt: string;
  /** Set once the participant submits attendance. */
  attendedAt?: string;
  /** Set once a certificate has been issued for this registration. */
  certificateNumber?: string;
}

export type CertificateStatus = "issued" | "revoked";

/** One row of the future `certificates` table. */
export interface CertificateRecord {
  number: string;
  registrationId: string;
  participantName: string;
  eventTitle: string;
  eventDate: string;
  organizer: string;
  template: "classic" | "playful";
  issuedAt: string;
  status: CertificateStatus;
  signatory: { name: string; role: string };
}

/**
 * Minimal persistence contract. `LocalStorageStore` implements it today;
 * a Supabase or REST adapter can implement the same three methods later.
 */
export interface CollectionStore<T> {
  all(): T[];
  save(items: T[]): void;
  add(item: T): T;
}
