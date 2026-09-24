import { demoCertificates } from "@/data/demo-records";
import { createStore, STORAGE_KEYS } from "./store";
import type { CertificateRecord } from "./types";

const store = createStore<CertificateRecord>(STORAGE_KEYS.certificates, () => [
  ...demoCertificates,
]);

export const certificatesRepository = {
  all(): CertificateRecord[] {
    return store.all();
  },
  numbers(): string[] {
    return store.all().map((item) => item.number);
  },
  findByNumber(value: string): CertificateRecord | null {
    const needle = value.trim().toUpperCase();
    return store.all().find((item) => item.number.toUpperCase() === needle) ?? null;
  },
  findByRegistrationId(value: string): CertificateRecord | null {
    const needle = value.trim().toUpperCase();
    return (
      store.all().find((item) => item.registrationId.toUpperCase() === needle) ?? null
    );
  },
  create(record: CertificateRecord): CertificateRecord {
    return store.add(record);
  },
};
