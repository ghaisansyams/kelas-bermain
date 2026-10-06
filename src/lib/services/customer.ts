import { getSupabase } from "@/lib/supabase/client";
import type { Child, Customer, Gender, RegistrationSource } from "@/lib/repositories/types";

/**
 * Customer (parent/guardian) and child master data.
 *
 * Every write here goes through a SECURITY DEFINER function in
 * supabase/schema.sql (upsert_customer / upsert_child) — RLS on these tables
 * is default-deny, so there is no direct table access from the browser.
 *
 * A family is looked up by WhatsApp number so repeat registrations reuse the
 * same customer row instead of duplicating it — the parent's details are
 * never copied onto each child.
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
  /** Stated age, as the intake form asks for it. */
  ageYears: number;
  ageMonths?: number;
  gender?: Gender | "";
  dateOfBirth?: string;
  school?: string;
  grade?: string;
  specialNotes?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCustomer(row: any): Customer {
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
    source: row.source,
    status: row.status ?? "active",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapChild(row: any): Child {
  return {
    id: row.id,
    childNumber: row.child_number,
    customerId: row.customer_id,
    fullName: row.full_name,
    nickname: row.nickname,
    gender: (row.gender ?? "") as Gender | "",
    dateOfBirth: row.date_of_birth ?? "",
    ageYears: row.age_years ?? undefined,
    ageMonths: row.age_months ?? undefined,
    ageRecordedAt: row.age_recorded_at ?? undefined,
    school: row.school ?? "",
    grade: row.grade ?? "—",
    specialNotes: row.special_notes ?? undefined,
    emergencyContact: row.emergency_contact ?? "—",
    status: row.status ?? "active",
    createdAt: row.created_at,
  };
}

/** Reuses an existing customer when the WhatsApp number matches, else creates one. */
export async function upsertCustomer(
  input: CustomerInput,
): Promise<{ customer: Customer; created: boolean }> {
  const { data, error } = await getSupabase().rpc("upsert_customer", {
    p_full_name: input.fullName.trim(),
    p_whatsapp: input.whatsapp.trim(),
    p_domicile: input.domicile.trim(),
    p_email: input.email?.trim().toLowerCase() ?? "",
    p_address: input.address?.trim() ?? "",
    p_city: input.city?.trim() ?? "",
    p_occupation: input.occupation?.trim() ?? "",
    p_source: input.source,
  });
  if (error || !data) {
    throw new Error(error?.message ?? "Gagal menyimpan data pendamping.");
  }
  const row = Array.isArray(data) ? data[0] : data;
  return { customer: mapCustomer(row), created: true };
}

/** Matches an existing child of the same family by name before creating one. */
export async function upsertChild(customerId: string, input: ChildInput): Promise<Child> {
  const { data, error } = await getSupabase().rpc("upsert_child", {
    p_customer_id: customerId,
    p_full_name: input.fullName.trim(),
    p_nickname: input.nickname?.trim() || input.fullName.trim().split(" ")[0],
    p_age_years: input.ageYears,
    p_age_months: input.ageMonths ?? 0,
  });
  if (error || !data) {
    throw new Error(error?.message ?? "Gagal menyimpan data anak.");
  }
  const row = Array.isArray(data) ? data[0] : data;
  return mapChild(row);
}
