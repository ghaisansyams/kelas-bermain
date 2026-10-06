import { getSupabase } from "@/lib/supabase/client";
import type {
  Customer,
  PaymentMethod,
  Registration,
  RegistrationSource,
} from "@/lib/repositories/types";
import type { EventView } from "@/lib/types";
import type { PricingResult } from "@/lib/pricing";
import { upsertChild, upsertCustomer, type ChildInput, type CustomerInput } from "./customer";
import { createPayment, type PaymentInstruction } from "./payment";

/**
 * Registration service — the one place a sign-up is created.
 *
 * A submission is one or more `participants` groups, each its own paying
 * guardian with its own children — a PERSONAL registration is simply one
 * group; a GROUP registration (multiple escorts registering together, each
 * with the child/children they're bringing) is several. Everything here
 * calls the SECURITY DEFINER functions in supabase/schema.sql — the tables
 * themselves have no anon access at all.
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRegistration(row: any): Registration {
  return {
    id: row.id,
    registrationNumber: row.registration_number,
    accessToken: row.access_token,
    customerId: row.customer_id,
    childId: row.child_id,
    eventId: row.event_id,
    registrationDate: row.registration_date,
    status: row.status,
    paymentStatus: row.payment_status,
    attendanceStatus: row.attendance_status,
    certificateStatus: row.certificate_status,
    paymentMethod: row.payment_method,
    amount: Number(row.amount),
    source: row.source,
    qrSource: row.qr_source ?? undefined,
    affiliateCode: row.affiliate_code ?? undefined,
    notes: row.notes ?? undefined,
  };
}

export async function createRegistration(
  request: RegistrationRequest,
): Promise<RegistrationResult> {
  const { event, participants, source } = request;
  const supabase = getSupabase();

  const totalChildren = participants.reduce((sum, group) => sum + group.children.length, 0);
  if (totalChildren === 0) {
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
  if (totalChildren > event.seatsLeft) {
    return {
      ok: false,
      error: `Sisa kuota tinggal ${event.seatsLeft} anak, sedangkan kamu mendaftarkan ${totalChildren}.`,
    };
  }

  const isFree = event.registration.type === "FREE";
  const method: PaymentMethod = isFree ? "NONE" : event.registration.method;
  const unitPrice = isFree ? 0 : (event.registration.price ?? 0);

  const created: Registration[] = [];
  // Lead customer/registration — the one the aggregate payment is charged
  // against — is whichever comes from the first participant group. For a
  // PERSONAL registration that's the only group; for a GROUP one, the first
  // companion to fill the form is the one coordinating payment.
  let leadCustomer: Customer | null = null;

  for (const group of participants) {
    let customer;
    try {
      ({ customer } = await upsertCustomer({ ...group.companion, source }));
    } catch (cause) {
      return {
        ok: false,
        error: cause instanceof Error ? cause.message : "Gagal menyimpan data pendamping.",
      };
    }
    if (!leadCustomer) leadCustomer = customer;

    for (const child of group.children) {
      let childRow;
      try {
        childRow = await upsertChild(customer.id, child);
      } catch (cause) {
        return {
          ok: false,
          error: cause instanceof Error ? cause.message : "Gagal menyimpan data anak.",
          field: "children",
        };
      }

      const { data, error } = await supabase.rpc("create_registration", {
        p_customer_id: customer.id,
        p_child_id: childRow.id,
        p_event_id: event.id,
        p_amount: unitPrice,
        p_status: isFree ? "CONFIRMED" : "REGISTERED",
        p_payment_status: isFree ? "NOT_REQUIRED" : "PENDING",
        p_payment_method: method,
        p_source: source,
        p_qr_source: request.qrSource ?? "",
        p_affiliate_code: request.affiliateCode ?? "",
        p_age_override: Boolean(child.ageOverride),
      });

      if (error) {
        if (error.message?.includes("DUPLICATE_REGISTRATION")) {
          return {
            ok: false,
            error: `${childRow.fullName} sudah terdaftar di kelas ini.`,
            field: "children",
          };
        }
        return { ok: false, error: "Gagal menyimpan pendaftaran. Coba lagi sebentar lagi." };
      }

      const row = Array.isArray(data) ? data[0] : data;
      created.push(mapRegistration(row));
    }
  }

  const totalAmount = isFree ? 0 : request.pricing.total;
  let payment: PaymentInstruction | undefined;

  if (!isFree && leadCustomer) {
    // The batch is charged against the first registration; the rest reference it.
    const lead = created[0];
    const result = await createPayment(
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
    ok: true,
    batch: {
      customerId: leadCustomer?.id ?? "",
      customerNumber: leadCustomer?.customerNumber ?? "",
      registrations: created,
      payment,
      totalAmount,
      paymentMethod: method,
      pricing: request.pricing,
    },
  };
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
}

/** Looked up by the opaque access_token from the URL — never by the sequential number. */
export async function getRegistrationByToken(
  token: string,
): Promise<RegistrationStatusView | null> {
  const { data, error } = await getSupabase().rpc("get_registration_by_token", {
    p_token: token,
  });
  if (error || !data || (Array.isArray(data) && data.length === 0)) return null;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return {
    registrationNumber: row.registration_number,
    eventId: row.event_id,
    status: row.status,
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method,
    amount: Number(row.amount),
    childFullName: row.child_full_name,
    customerFullName: row.customer_full_name,
    customerWhatsapp: row.customer_whatsapp,
    paymentId: row.payment_id,
    paymentExpiresAt: row.payment_expires_at,
  };
}
