import { registrationsRepository } from "@/lib/repositories/registrations";
import type { PaymentStatus, Registration } from "@/lib/repositories/types";
import type { RegistrationType } from "@/lib/types";
import { generateRegistrationId } from "@/lib/utils/certificate";
import { normalizePhone } from "@/lib/utils/validation";
import { paymentProvider, type PaymentInstruction } from "./payment";

/**
 * Mock registration service.
 *
 * Runs entirely in the browser against `localStorage` — nothing is sent
 * anywhere and no production database is involved. The exported functions are
 * the seam: point them at a `POST /api/registrations` route or a Supabase
 * client and every screen keeps working unchanged.
 */

/** The bits of an event the service needs, without coupling it to content. */
export interface RegistrationEventContext {
  slug: string;
  title: string;
  date: string;
  registrationType: RegistrationType;
  price?: number;
}

export interface RegistrationInput {
  fullName: string;
  email: string;
  whatsapp: string;
  institution: string;
  city: string;
  age: number;
  notes?: string;
}

export interface RegistrationSuccess {
  ok: true;
  registration: Registration;
  payment?: PaymentInstruction;
}

export interface RegistrationFailure {
  ok: false;
  error: string;
  field?: keyof RegistrationInput;
}

export type RegistrationResult = RegistrationSuccess | RegistrationFailure;

/** Artificial latency so loading states are exercised, not decorative. */
const MOCK_LATENCY_MS = 700;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function registerForEvent(
  event: RegistrationEventContext,
  input: RegistrationInput,
): Promise<RegistrationResult> {
  await delay(MOCK_LATENCY_MS);

  const existing = registrationsRepository.findByEmailAndEvent(input.email, event.slug);
  if (existing) {
    return {
      ok: false,
      field: "email",
      error: `Email ini sudah terdaftar di event tersebut dengan ID ${existing.id}.`,
    };
  }

  const isPaid = event.registrationType === "PAID";
  const amount = isPaid ? (event.price ?? 0) : 0;
  const paymentStatus: PaymentStatus = isPaid ? "pending" : "not_required";

  const registration: Registration = {
    id: generateRegistrationId(new Date(event.date).getFullYear()),
    eventSlug: event.slug,
    eventTitle: event.title,
    eventDate: event.date,
    fullName: input.fullName.trim(),
    email: input.email.trim().toLowerCase(),
    whatsapp: normalizePhone(input.whatsapp),
    institution: input.institution.trim(),
    city: input.city.trim(),
    age: input.age,
    notes: input.notes?.trim() || undefined,
    registrationType: event.registrationType,
    amount,
    paymentStatus,
    status: isPaid ? "waiting_payment" : "confirmed",
    createdAt: new Date().toISOString(),
  };

  registrationsRepository.create(registration);

  if (!isPaid) return { ok: true, registration };

  const payment = await paymentProvider.createCharge({
    registrationId: registration.id,
    eventTitle: event.title,
    amount,
  });
  return { ok: true, registration, payment };
}

export async function findRegistration(id: string): Promise<Registration | null> {
  await delay(250);
  return registrationsRepository.findById(id);
}

/** Admin-facing read, ready for a participants table / CSV export. */
export async function listRegistrations(eventSlug?: string): Promise<Registration[]> {
  await delay(120);
  return eventSlug
    ? registrationsRepository.findByEvent(eventSlug)
    : registrationsRepository.all();
}
