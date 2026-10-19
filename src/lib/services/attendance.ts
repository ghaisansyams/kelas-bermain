"use server";

import { db } from "@/lib/db";

/**
 * Kehadiran.
 *
 * Check-in diverifikasi dengan nomor pendaftaran DITAMBAH kontak yang
 * diberikan keluarga saat mendaftar. Nomor pendaftaran berurutan dan aman
 * disebut keras-keras, tapi tidak pernah cukup sendirian untuk membuktikan
 * Anda keluarga itu.
 *
 * Aturannya dulu ada di dalam fungsi SQL sehingga berlaku untuk siapa pun
 * pemanggilnya. Sekarang ada di sini, dan berkas ini server action — supaya
 * tetap begitu.
 */

export interface CheckInInput {
  registrationNumber: string;
  /** Email or WhatsApp used at registration. */
  contact: string;
  eventId?: string;
  /** "qr" for a scanned check-in, "form" (default) for a typed one. */
  method?: "qr" | "form";
}

export interface CheckInSuccess {
  ok: true;
  registrationNumber: string;
  childName: string;
  eventId: string;
  alreadyRecorded: boolean;
  certificateAvailable: boolean;
}

export interface CheckInFailure {
  ok: false;
  error: string;
  field?: "registrationNumber" | "contact";
}

export type CheckInResult = CheckInSuccess | CheckInFailure;

export async function checkIn(input: CheckInInput): Promise<CheckInResult> {
  try {
    const number = input.registrationNumber.trim().toUpperCase();
    const contact = input.contact.trim().toLowerCase();

    const registration = await db.registrations.findFirst({
      where: { registration_number: { equals: number, mode: "insensitive" } },
      select: {
        id: true,
        event_id: true,
        child_id: true,
        attendance_status: true,
        certificate_status: true,
        customers: { select: { email: true, whatsapp: true } },
        children: { select: { full_name: true } },
      },
    });

    if (!registration) {
      return {
        ok: false,
        field: "registrationNumber",
        error: "Nomor pendaftaran tidak ditemukan. Periksa kembali kode yang kamu terima.",
      };
    }

    const customer = registration.customers;
    const matches =
      (customer?.email ?? "").toLowerCase() === contact ||
      (customer?.whatsapp ?? "").toLowerCase() === contact;

    if (!matches) {
      return {
        ok: false,
        field: "contact",
        error: "Email atau nomor WhatsApp tidak cocok dengan data pendaftaran.",
      };
    }

    // Dibaca sebelum ditulis: setelah baris kehadiran dibuat, semua orang
    // tampak "sudah tercatat" dan pesan datang-dua-kali jadi mustahil.
    const alreadyRecorded = registration.attendance_status === "PRESENT";

    await db.$transaction(async (tx) => {
      await tx.attendance_records.createMany({
        data: [{
          registration_id: registration.id,
          event_id: registration.event_id,
          child_id: registration.child_id,
          status: "PRESENT",
          checked_in_at: new Date(),
          method: input.method ?? "form",
        }],
        // Datang dua kali bukan kesalahan; yang kedua tidak menimpa jam
        // kedatangan yang pertama.
        skipDuplicates: true,
      });

      await tx.registrations.update({
        where: { id: registration.id },
        data: {
          attendance_status: "PRESENT",
          // Sertifikat terbuka begitu kehadiran tercatat, tapi status lain
          // yang sudah berjalan tidak dimundurkan.
          ...(registration.certificate_status === "NOT_ELIGIBLE"
            ? { certificate_status: "AVAILABLE" }
            : {}),
        },
      });
    });

    return {
      ok: true,
      registrationNumber: number,
      childName: registration.children?.full_name ?? "",
      eventId: registration.event_id,
      alreadyRecorded,
      certificateAvailable: true,
    };
  } catch {
    return { ok: false, error: "Gagal mencatat kehadiran. Coba lagi sebentar lagi." };
  }
}
