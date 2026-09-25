import { lookups, registrationsRepo } from "@/lib/repositories";
import type {
  PaymentMethod,
  Registration,
  RegistrationSource,
} from "@/lib/repositories/types";
import type { EventView } from "@/lib/types";
import { nextId, nextRegistrationNumber } from "@/lib/utils/numbering";
import {
  upsertChild,
  upsertCustomer,
  type ChildInput,
  type CustomerInput,
} from "./customer";
import { createPayment, type PaymentInstruction } from "./payment";

/**
 * Registration service — the one place a sign-up is created.
 *
 * A single submission can enrol several children of the same family. It
 * produces: one customer (reused when the email is already known), one child
 * row per child, one registration per child, and one payment per registration
 * when the event is not free.
 *
 * Everything runs against the repository layer, which is localStorage-backed
 * for now. Point these functions at an API route or Supabase client and the
 * screens keep working unchanged.
 */

export interface RegistrationRequest {
  event: EventView;
  parent: CustomerInput;
  children: ChildInput[];
  source: RegistrationSource;
  /** Raw `?source=` value carried by the scanned QR. */
  qrSource?: string;
  notes?: string;
}

export interface RegistrationBatch {
  customerId: string;
  customerNumber: string;
  registrations: Registration[];
  /** Absent for free events. */
  payment?: PaymentInstruction;
  totalAmount: number;
  paymentMethod: PaymentMethod;
}

export type RegistrationResult =
  | { ok: true; batch: RegistrationBatch }
  | { ok: false; error: string; field?: string };

const MOCK_LATENCY_MS = 700;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function createRegistration(
  request: RegistrationRequest,
): Promise<RegistrationResult> {
  const { event, parent, children, source } = request;

  if (children.length === 0) {
    return { ok: false, error: "Tambahkan minimal satu data anak." };
  }
  if (event.availability !== "open") {
    return {
      ok: false,
      error:
        event.availability === "full"
          ? "Kuota kelas ini sudah penuh."
          : "Pendaftaran kelas ini sudah ditutup.",
    };
  }
  if (children.length > event.seatsLeft) {
    return {
      ok: false,
      error: `Sisa kuota tinggal ${event.seatsLeft} anak, sedangkan kamu mendaftarkan ${children.length}.`,
    };
  }

  await delay(MOCK_LATENCY_MS);

  const { customer } = upsertCustomer({ ...parent, source });

  // One child may only hold one active registration per event.
  const existingForEvent = registrationsRepo.where(
    (r) => r.eventId === event.id && r.customerId === customer.id && r.status !== "CANCELLED",
  );
  const childRows = children.map((child) => upsertChild(customer.id, child));
  const duplicate = childRows.find((child) =>
    existingForEvent.some((r) => r.childId === child.id),
  );
  if (duplicate) {
    return {
      ok: false,
      error: `${duplicate.fullName} sudah terdaftar di kelas ini.`,
      field: "children",
    };
  }

  const isFree = event.registration.type === "FREE";
  const method: PaymentMethod = isFree ? "NONE" : event.registration.method;
  const unitPrice = isFree ? 0 : (event.registration.price ?? 0);

  const created: Registration[] = childRows.map((child) => {
    const all = registrationsRepo.all();
    const registration: Registration = {
      id: nextId("reg", all.map((r) => r.id)),
      registrationNumber: nextRegistrationNumber(all.map((r) => r.registrationNumber)),
      customerId: customer.id,
      childId: child.id,
      eventId: event.id,
      registrationDate: new Date().toISOString(),
      status: isFree ? "CONFIRMED" : "REGISTERED",
      paymentStatus: isFree ? "NOT_REQUIRED" : "PENDING",
      attendanceStatus: "NOT_ATTENDED",
      certificateStatus: "NOT_ELIGIBLE",
      paymentMethod: method,
      amount: unitPrice,
      source,
      qrSource: request.qrSource,
      notes: request.notes,
    };
    registrationsRepo.create(registration);
    return registration;
  });

  const totalAmount = unitPrice * created.length;
  let payment: PaymentInstruction | undefined;

  if (!isFree) {
    // The batch is charged against the first registration; the rest reference it.
    const lead = created[0];
    const result = await createPayment(
      {
        registrationId: lead.id,
        registrationNumber: lead.registrationNumber,
        customerId: customer.id,
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
    ok: true,
    batch: {
      customerId: customer.id,
      customerNumber: customer.customerNumber,
      registrations: created,
      payment,
      totalAmount,
      paymentMethod: method,
    },
  };
}

export async function getRegistration(id: string): Promise<Registration | null> {
  return registrationsRepo.find(id) ?? lookups.registrationByNumber(id);
}

export async function listRegistrations(eventId?: string): Promise<Registration[]> {
  return eventId
    ? registrationsRepo.where((r) => r.eventId === eventId)
    : registrationsRepo.all();
}

export async function updateRegistration(
  id: string,
  patch: Partial<Registration>,
): Promise<Registration | null> {
  return registrationsRepo.update(id, patch);
}

export async function cancelRegistration(id: string): Promise<Registration | null> {
  return registrationsRepo.update(id, { status: "CANCELLED", paymentStatus: "CANCELLED" });
}
