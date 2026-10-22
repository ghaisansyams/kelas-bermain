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

/* ------------------------------------------------------------------ */
/* Lupa nomor pendaftaran                                              */
/* ------------------------------------------------------------------ */

export interface ForgottenLookupInput {
  whatsapp: string;
  /** Nama anak atau nama pendamping, persis seperti saat mendaftar. */
  name: string;
}

export type ForgottenLookupResult =
  | {
      ok: true;
      registrations: { registrationNumber: string; eventTitle: string; accessToken: string }[];
    }
  | { ok: false; error: string };

/** 0812…, +62812…, 62812… dan 0812-345 semuanya menjadi 812… */
function phoneKey(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.replace(/^(62|0)/, "");
}

// Pembatas sederhana per proses: nomor WhatsApp mudah ditebak, jadi pencarian
// ini dibatasi supaya tidak bisa dipakai menebak data keluarga lain.
const attempts: number[] = [];
const WINDOW_MS = 60_000;
const MAX_ATTEMPTS = 10;

/**
 * Menemukan pendaftaran lewat dua hal yang hanya diketahui pendaftarnya:
 * nomor WhatsApp DAN nama (anak atau pendamping). Satu saja tidak cukup —
 * nomor telepon bukan rahasia. Pesan gagalnya sama untuk semua sebab, supaya
 * tidak bisa dipakai memeriksa apakah suatu nomor pernah mendaftar.
 */
export async function findRegistrationsByContact(
  input: ForgottenLookupInput,
): Promise<ForgottenLookupResult> {
  const now = Date.now();
  while (attempts.length && now - attempts[0] > WINDOW_MS) attempts.shift();
  if (attempts.length >= MAX_ATTEMPTS) {
    return { ok: false, error: "Terlalu banyak percobaan. Tunggu satu menit lalu coba lagi." };
  }
  attempts.push(now);

  const key = phoneKey(String(input.whatsapp ?? ""));
  const name = String(input.name ?? "").trim().toLowerCase();
  const NOT_FOUND = {
    ok: false as const,
    error:
      "Data tidak ditemukan. Pastikan nomor WhatsApp dan nama sama seperti saat mendaftar, atau hubungi tim lewat WhatsApp.",
  };
  if (key.length < 8 || name.length < 2) return NOT_FOUND;

  try {
    const customers = await db.customers.findMany({
      where: { whatsapp: { contains: key.slice(-8) } },
      select: { id: true, full_name: true, whatsapp: true },
      take: 20,
    });
    const owners = customers.filter((c) => phoneKey(c.whatsapp) === key);
    if (owners.length === 0) return NOT_FOUND;

    const rows = await db.registrations.findMany({
      where: { customer_id: { in: owners.map((c) => c.id) } },
      orderBy: { registration_date: "desc" },
      take: 20,
      select: {
        registration_number: true,
        access_token: true,
        event_id: true,
        customer_id: true,
        children: { select: { full_name: true } },
      },
    });

    const ownerName = new Map(owners.map((c) => [c.id, c.full_name.trim().toLowerCase()]));
    const matched = rows.filter(
      (r) =>
        ownerName.get(r.customer_id) === name ||
        r.children.full_name.trim().toLowerCase() === name,
    );
    if (matched.length === 0) return NOT_FOUND;

    const events = await db.events.findMany({
      where: { id: { in: [...new Set(matched.map((r) => r.event_id))] } },
      select: { id: true, title: true },
    });
    const title = new Map(events.map((e) => [e.id, e.title]));

    return {
      ok: true,
      registrations: matched.map((r) => ({
        registrationNumber: r.registration_number,
        eventTitle: title.get(r.event_id) ?? "",
        accessToken: r.access_token,
      })),
    };
  } catch {
    return { ok: false, error: "Gagal mencari data. Coba lagi sebentar lagi." };
  }
}
