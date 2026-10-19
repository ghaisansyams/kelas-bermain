import "server-only";

import type { Prisma } from "@prisma/client";
import type { Child, Customer, Gender, RegistrationSource } from "@/lib/repositories/types";

/**
 * Data induk pendamping (orang tua/wali) dan anak.
 *
 * Sengaja BUKAN server action. Berkas yang ditandai "use server" menjadi
 * titik masuk yang bisa dipanggil siapa pun dari internet; fungsi-fungsi ini
 * menulis ke tabel tanpa pemeriksaan apa pun, jadi hanya boleh dipanggil dari
 * createRegistration, yang memeriksa semuanya lebih dulu. Karena itu semuanya
 * menerima transaksi dari pemanggil: pendamping, anak, pendaftaran dan tagihan
 * tersimpan bersama atau tidak sama sekali.
 *
 * Satu keluarga dicari lewat nomor WhatsApp supaya pendaftaran berulang memakai
 * baris pelanggan yang sama — data orang tua tidak pernah disalin ke tiap anak.
 */

export interface CustomerInput {
  fullName: string;
  whatsapp: string;
  domicile: string;
  email?: string;
  address?: string;
  city?: string;
  occupation?: string;
  source: RegistrationSource;
}

export interface ChildInput {
  fullName: string;
  nickname?: string;
  /** Usia yang disebut orang tua di formulir. */
  ageYears: number;
  ageMonths?: number;
  gender?: Gender | "";
  dateOfBirth?: string;
  school?: string;
  grade?: string;
  specialNotes?: string;
}

type Tx = Prisma.TransactionClient;

const iso = (value: Date | null | undefined) => (value ? value.toISOString() : "");

function mapCustomer(row: {
  id: string;
  customer_number: string;
  full_name: string;
  email: string;
  whatsapp: string;
  domicile: string;
  address: string;
  city: string;
  occupation: string;
  source: string;
  status: string;
  created_at: Date;
  updated_at: Date;
}): Customer {
  return {
    id: row.id,
    customerNumber: row.customer_number,
    fullName: row.full_name,
    email: row.email ?? "",
    whatsapp: row.whatsapp,
    domicile: row.domicile ?? "",
    address: row.address ?? "",
    city: row.city ?? "",
    occupation: row.occupation ?? "—",
    source: row.source as RegistrationSource,
    status: (row.status ?? "active") as Customer["status"],
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

function mapChild(row: {
  id: string;
  child_number: string;
  customer_id: string;
  full_name: string;
  nickname: string;
  gender: string;
  date_of_birth: Date | null;
  age_years: number | null;
  age_months: number | null;
  age_recorded_at: Date | null;
  school: string;
  grade: string;
  special_notes: string | null;
  emergency_contact: string;
  status: string;
  created_at: Date;
}): Child {
  return {
    id: row.id,
    childNumber: row.child_number,
    customerId: row.customer_id,
    fullName: row.full_name,
    nickname: row.nickname,
    gender: (row.gender ?? "") as Gender | "",
    dateOfBirth: row.date_of_birth ? row.date_of_birth.toISOString().slice(0, 10) : "",
    ageYears: row.age_years ?? undefined,
    ageMonths: row.age_months ?? undefined,
    ageRecordedAt: row.age_recorded_at ? row.age_recorded_at.toISOString() : undefined,
    school: row.school ?? "",
    grade: row.grade ?? "—",
    specialNotes: row.special_notes ?? undefined,
    emergencyContact: row.emergency_contact ?? "—",
    status: (row.status ?? "active") as Child["status"],
    createdAt: iso(row.created_at),
  };
}

/** Memakai pelanggan yang nomor WhatsApp-nya sama, kalau tidak ada baru dibuat. */
export async function upsertCustomer(
  tx: Tx,
  input: CustomerInput,
): Promise<{ customer: Customer; created: boolean }> {
  const whatsapp = input.whatsapp.trim();
  const email = input.email?.trim().toLowerCase() ?? "";
  const domicile = input.domicile.trim();
  const occupation = input.occupation?.trim() ?? "";

  const existing = await tx.customers.findFirst({ where: { whatsapp } });

  if (existing) {
    // Nama selalu diperbarui; kolom lain hanya kalau formulir kali ini
    // mengisinya — pendaftaran kedua tanpa email tidak boleh menghapus email
    // yang sudah tercatat dari pendaftaran pertama.
    const updated = await tx.customers.update({
      where: { id: existing.id },
      data: {
        full_name: input.fullName.trim(),
        ...(domicile ? { domicile } : {}),
        ...(email ? { email } : {}),
        ...(occupation ? { occupation } : {}),
      },
    });
    return { customer: mapCustomer(updated), created: false };
  }

  const city = input.city?.trim() || domicile;
  const created = await tx.customers.create({
    data: {
      full_name: input.fullName.trim(),
      whatsapp,
      domicile,
      email,
      address: input.address?.trim() ?? "",
      city,
      occupation: occupation || "—",
      source: input.source,
    },
  });
  return { customer: mapCustomer(created), created: true };
}

/** Mencocokkan anak dari keluarga yang sama lewat nama sebelum membuat baru. */
export async function upsertChild(
  tx: Tx,
  customerId: string,
  input: ChildInput,
): Promise<Child> {
  const fullName = input.fullName.trim();

  const existing = await tx.children.findFirst({
    where: { customer_id: customerId, full_name: { equals: fullName, mode: "insensitive" } },
  });
  if (existing) return mapChild(existing);

  const customer = await tx.customers.findUnique({
    where: { id: customerId },
    select: { whatsapp: true },
  });

  const created = await tx.children.create({
    data: {
      customer_id: customerId,
      full_name: fullName,
      nickname: input.nickname?.trim() || fullName.split(" ")[0],
      age_years: input.ageYears,
      age_months: input.ageMonths ?? 0,
      age_recorded_at: new Date(),
      emergency_contact: customer?.whatsapp ?? "—",
    },
  });
  return mapChild(created);
}
