import { demoRegistrations } from "@/data/demo-records";
import { createStore, STORAGE_KEYS } from "./store";
import type { Registration } from "./types";

const store = createStore<Registration>(STORAGE_KEYS.registrations, () => [
  ...demoRegistrations,
]);

export const registrationsRepository = {
  all(): Registration[] {
    return store.all();
  },
  findById(id: string): Registration | null {
    const needle = id.trim().toUpperCase();
    return store.all().find((item) => item.id.toUpperCase() === needle) ?? null;
  },
  findByEvent(eventSlug: string): Registration[] {
    return store.all().filter((item) => item.eventSlug === eventSlug);
  },
  findByEmailAndEvent(email: string, eventSlug: string): Registration | null {
    const needle = email.trim().toLowerCase();
    return (
      store
        .all()
        .find(
          (item) => item.eventSlug === eventSlug && item.email.toLowerCase() === needle,
        ) ?? null
    );
  },
  create(registration: Registration): Registration {
    return store.add(registration);
  },
  update(id: string, patch: Partial<Registration>): Registration | null {
    const items = store.all();
    const index = items.findIndex((item) => item.id.toUpperCase() === id.toUpperCase());
    if (index === -1) return null;
    const updated = { ...items[index], ...patch };
    items[index] = updated;
    store.save(items);
    return updated;
  },
};
