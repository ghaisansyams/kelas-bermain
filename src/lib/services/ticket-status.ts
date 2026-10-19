"use server";

import { db } from "@/lib/db";

/**
 * Registration status by number, with the detail level set by the contact.
 *
 * Registration numbers run in sequence, so anyone could count up through
 * them. Without the contact used at sign-up the function gives back only a
 * first name, a count and a status — never the invoice number or the full
 * name of whoever registered.
 */

export interface TicketStatusView {
  registrationNumber: string;
  eventTitle: string;
  companionName: string;
  contactVerified: boolean;
  childrenCount: number;
  registrationStatus: string;
  paymentStatus: string;
  amount: number | null;
  invoiceNumber: string | null;
  rejectionReason: string | null;
}

export type TicketStatusResult =
  | { ok: true; status: TicketStatusView }
  | { ok: false; error: string };

export async function checkTicketStatus(
  registrationNumber: string,
  contact?: string,
): Promise<TicketStatusResult> {
  try {
    const number = registrationNumber.trim().toUpperCase();
    const given = (contact ?? "").trim().toLowerCase();

    const registration = await db.registrations.findFirst({
      where: { registration_number: { equals: number, mode: "insensitive" } },
      select: {
        registration_number: true,
        status: true,
        payment_status: true,
        customer_id: true,
        event_id: true,
        customers: { select: { full_name: true, email: true, whatsapp: true } },
        // events tidak punya foreign key ke registrations, jadi judulnya
        // diambil terpisah lewat event_id.
        payments: {
          select: { status: true, amount: true, invoice_number: true, rejection_reason: true },
          take: 1,
        },
      },
    });

    if (!registration) {
      return { ok: false, error: "Nomor pendaftaran tidak ditemukan. Periksa kembali." };
    }

    const customer = registration.customers;
    const verified =
      given !== "" &&
      ((customer?.email ?? "").toLowerCase() === given ||
        (customer?.whatsapp ?? "").toLowerCase() === given);

    // Satu pendamping bisa mendaftarkan beberapa anak lewat nomor berbeda,
    // jadi hitungannya per pendamping dan event yang sama.
    const childrenCount = await db.registrations.count({
      where: {
        customer_id: registration.customer_id,
        event_id: registration.event_id,
        status: { not: "CANCELLED" },
      },
    });

    const payment = registration.payments[0] ?? null;

    const event = await db.events.findUnique({
      where: { id: registration.event_id },
      select: { title: true },
    });

    const fullName = customer?.full_name ?? "";

    return {
      ok: true,
      status: {
        registrationNumber: registration.registration_number,
        eventTitle: event?.title ?? registration.event_id,
        // Tanpa kontak yang cocok, hanya nama depan. Nomor pendaftaran
        // berurutan; nama lengkap orang lain tidak boleh jatuh ke penebak.
        companionName: verified ? fullName : fullName.split(" ")[0],
        contactVerified: verified,
        childrenCount,
        registrationStatus: registration.status,
        paymentStatus: payment?.status ?? registration.payment_status,
        amount: payment?.amount == null ? null : Number(payment.amount),
        invoiceNumber: verified ? (payment?.invoice_number ?? null) : null,
        rejectionReason: payment?.rejection_reason ?? null,
      },
    };
  } catch {
    return { ok: false, error: "Status belum bisa dicek. Coba lagi sebentar." };
  }
}
