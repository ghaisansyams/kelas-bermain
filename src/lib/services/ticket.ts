"use server";

import { db } from "@/lib/db";

/**
 * Pencarian "Cek Tiket" — aturan yang sama dengan check-in kehadiran (nomor
 * pendaftaran + kontak yang dipakai saat mendaftar), tapi hanya membaca.
 * Kalau cocok, yang dikembalikan access_token supaya pemanggil bisa langsung
 * ke halaman /payment/[accessToken] tanpa menduplikasi tampilannya di sini.
 *
 * Server action: Prisma tidak boleh hidup di browser, dan pemeriksaan kontak
 * di bawah ini dulu dijaga SECURITY DEFINER. Kalau pemeriksaannya berjalan di
 * sisi klien, siapa pun tinggal melewatinya.
 */

export interface TicketLookupInput {
  registrationNumber: string;
  /** Email atau WhatsApp yang dipakai saat mendaftar. */
  contact: string;
}

export type TicketLookupResult =
  | { ok: true; accessToken: string }
  | { ok: false; error: string; field?: "registrationNumber" | "contact" };

const NOT_FOUND: TicketLookupResult = {
  ok: false,
  field: "registrationNumber",
  error: "Nomor pendaftaran tidak ditemukan. Periksa kembali kode yang kamu terima.",
};

export async function findTicketAccessToken(
  input: TicketLookupInput,
): Promise<TicketLookupResult> {
  try {
    const number = input.registrationNumber.trim().toUpperCase();
    const contact = input.contact.trim().toLowerCase();

    const registration = await db.registrations.findFirst({
      where: { registration_number: { equals: number, mode: "insensitive" } },
      select: {
        access_token: true,
        customers: { select: { email: true, whatsapp: true } },
      },
    });

    if (!registration) return NOT_FOUND;

    const customer = registration.customers;
    const matches =
      (customer?.email ?? "").toLowerCase() === contact ||
      (customer?.whatsapp ?? "").toLowerCase() === contact;

    // Nomor pendaftaran berurutan, jadi tanpa pemeriksaan ini siapa pun bisa
    // menghitung naik dan membuka pendaftaran keluarga lain.
    if (!matches) {
      return {
        ok: false,
        field: "contact",
        error: "Email atau nomor WhatsApp tidak cocok dengan data pendaftaran.",
      };
    }

    return { ok: true, accessToken: registration.access_token };
  } catch {
    return { ok: false, error: "Gagal memeriksa tiket. Coba lagi sebentar lagi." };
  }
}
