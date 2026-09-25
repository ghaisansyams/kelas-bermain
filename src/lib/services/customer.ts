import { childrenRepo, customersRepo, lookups } from "@/lib/repositories";
import type { Child, Customer, Gender, RegistrationSource } from "@/lib/repositories/types";
import { nextChildNumber, nextCustomerNumber, nextId } from "@/lib/utils/numbering";

/**
 * Customer (parent/guardian) and child master data.
 *
 * A family is looked up by email so repeat registrations reuse the same
 * customer row instead of duplicating it — the parent's details are never
 * copied onto each child.
 */

export interface CustomerInput {
  fullName: string;
  email: string;
  whatsapp: string;
  address: string;
  city: string;
  occupation?: string;
  source: RegistrationSource;
}

export interface ChildInput {
  fullName: string;
  nickname?: string;
  gender: Gender;
  dateOfBirth: string;
  school: string;
  grade?: string;
  specialNotes?: string;
}

/** Years old on `reference`, derived — never stored. */
export function ageOf(dateOfBirth: string, reference: Date = new Date()): number {
  const birth = new Date(dateOfBirth);
  let age = reference.getFullYear() - birth.getFullYear();
  const monthDelta = reference.getMonth() - birth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && reference.getDate() < birth.getDate())) {
    age -= 1;
  }
  return Math.max(0, age);
}

/** Reuses an existing customer when the email matches, otherwise creates one. */
export function upsertCustomer(input: CustomerInput): {
  customer: Customer;
  created: boolean;
} {
  const existing = lookups.customerByEmail(input.email);
  const now = new Date().toISOString();

  if (existing) {
    const updated = customersRepo.update(existing.id, {
      fullName: input.fullName.trim(),
      whatsapp: input.whatsapp.trim(),
      address: input.address.trim(),
      city: input.city.trim(),
      occupation: input.occupation?.trim() || existing.occupation,
      updatedAt: now,
    });
    return { customer: updated ?? existing, created: false };
  }

  const all = customersRepo.all();
  const customer: Customer = {
    id: nextId("cus", all.map((c) => c.id)),
    customerNumber: nextCustomerNumber(all.map((c) => c.customerNumber)),
    fullName: input.fullName.trim(),
    email: input.email.trim().toLowerCase(),
    whatsapp: input.whatsapp.trim(),
    address: input.address.trim(),
    city: input.city.trim(),
    occupation: input.occupation?.trim() || "—",
    source: input.source,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
  customersRepo.create(customer);
  return { customer, created: true };
}

/** Matches an existing child of the same family by name before creating one. */
export function upsertChild(customerId: string, input: ChildInput): Child {
  const siblings = childrenRepo.where((c) => c.customerId === customerId);
  const needle = input.fullName.trim().toLowerCase();
  const existing = siblings.find((c) => c.fullName.toLowerCase() === needle);
  if (existing) return existing;

  const all = childrenRepo.all();
  const parent = customersRepo.find(customerId);
  const child: Child = {
    id: nextId("chd", all.map((c) => c.id)),
    childNumber: nextChildNumber(all.map((c) => c.childNumber)),
    customerId,
    fullName: input.fullName.trim(),
    nickname: input.nickname?.trim() || input.fullName.trim().split(" ")[0],
    gender: input.gender,
    dateOfBirth: input.dateOfBirth,
    school: input.school.trim(),
    grade: input.grade?.trim() || "—",
    specialNotes: input.specialNotes?.trim() || undefined,
    emergencyContact: parent?.whatsapp ?? "—",
    status: "active",
    createdAt: new Date().toISOString(),
  };
  childrenRepo.create(child);
  return child;
}

export async function listCustomers(): Promise<Customer[]> {
  return customersRepo.all();
}

export async function getCustomer(id: string): Promise<Customer | null> {
  return customersRepo.find(id);
}

export async function listChildren(): Promise<Child[]> {
  return childrenRepo.all();
}

export async function getChild(id: string): Promise<Child | null> {
  return childrenRepo.find(id);
}

export async function childrenOf(customerId: string): Promise<Child[]> {
  return childrenRepo.where((c) => c.customerId === customerId);
}

export async function updateCustomer(
  id: string,
  patch: Partial<Customer>,
): Promise<Customer | null> {
  return customersRepo.update(id, { ...patch, updatedAt: new Date().toISOString() });
}

export async function updateChild(id: string, patch: Partial<Child>): Promise<Child | null> {
  return childrenRepo.update(id, patch);
}
