import { attendanceRecords } from "@/data/attendance";
import { certificates } from "@/data/certificates";
import { children } from "@/data/children";
import { customers } from "@/data/customers";
import { payments } from "@/data/payments";
import { registrations } from "@/data/registrations";
import { createStore, STORAGE_KEYS } from "./store";
import type {
  AttendanceRecord,
  CertificateRecord,
  Child,
  Customer,
  Payment,
  Registration,
} from "./types";

/**
 * Repository layer.
 *
 * Each collection is seeded from `src/data` and, in the browser, overlaid with
 * anything written since (registrations made on the public site show up in the
 * ERP straight away). Swapping to a database means reimplementing this one file
 * against a client — no service or component changes.
 */

export interface Repository<T> {
  all(): T[];
  find(id: string): T | null;
  where(predicate: (item: T) => boolean): T[];
  create(item: T): T;
  update(id: string, patch: Partial<T>): T | null;
  remove(id: string): boolean;
  save(items: T[]): void;
}

function createRepository<T>(
  key: string,
  seed: () => T[],
  idOf: (item: T) => string,
): Repository<T> {
  const store = createStore<T>(key, seed);
  const matches = (item: T, id: string) =>
    idOf(item).toUpperCase() === id.trim().toUpperCase();

  return {
    all: () => store.all(),
    find: (id) => store.all().find((item) => matches(item, id)) ?? null,
    where: (predicate) => store.all().filter(predicate),
    create: (item) => store.add(item),
    update(id, patch) {
      const items = store.all();
      const index = items.findIndex((item) => matches(item, id));
      if (index === -1) return null;
      const updated = { ...items[index], ...patch };
      items[index] = updated;
      store.save(items);
      return updated;
    },
    remove(id) {
      const items = store.all();
      const next = items.filter((item) => !matches(item, id));
      if (next.length === items.length) return false;
      store.save(next);
      return true;
    },
    save: (items) => store.save(items),
  };
}

export const customersRepo = createRepository<Customer>(
  STORAGE_KEYS.customers,
  () => [...customers],
  (c) => c.id,
);

export const childrenRepo = createRepository<Child>(
  STORAGE_KEYS.children,
  () => [...children],
  (c) => c.id,
);

export const registrationsRepo = createRepository<Registration>(
  STORAGE_KEYS.registrations,
  () => [...registrations],
  (r) => r.id,
);

export const paymentsRepo = createRepository<Payment>(
  STORAGE_KEYS.payments,
  () => [...payments],
  (p) => p.id,
);

export const attendanceRepo = createRepository<AttendanceRecord>(
  STORAGE_KEYS.attendance,
  () => [...attendanceRecords],
  (a) => a.id,
);

/** Certificates are keyed by their public number, not a separate id. */
export const certificatesRepo = createRepository<CertificateRecord>(
  STORAGE_KEYS.certificates,
  () => [...certificates],
  (c) => c.number,
);

/** Look-ups that span repositories but stay too small to deserve a service. */
export const lookups = {
  customerByEmail(email: string): Customer | null {
    const needle = email.trim().toLowerCase();
    return customersRepo.all().find((c) => c.email.toLowerCase() === needle) ?? null;
  },
  registrationByNumber(value: string): Registration | null {
    const needle = value.trim().toUpperCase();
    return (
      registrationsRepo
        .all()
        .find((r) => r.registrationNumber.toUpperCase() === needle) ?? null
    );
  },
  paymentByRegistration(registrationId: string): Payment | null {
    return paymentsRepo.all().find((p) => p.registrationId === registrationId) ?? null;
  },
  attendanceByRegistration(registrationId: string): AttendanceRecord | null {
    return attendanceRepo.all().find((a) => a.registrationId === registrationId) ?? null;
  },
  certificateByRegistration(registrationId: string): CertificateRecord | null {
    return certificatesRepo.all().find((c) => c.registrationId === registrationId) ?? null;
  },
};
