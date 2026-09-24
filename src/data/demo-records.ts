import type { CertificateRecord, Registration } from "@/lib/repositories/types";

/**
 * Seed rows so the registration, attendance, and certificate flows have
 * something to show on a first visit. A real deployment drops these and reads
 * the participant tables instead.
 *
 * Every Kelas Bermain class is paid, so these carry a settled payment status.
 */

export const demoRegistrations: Registration[] = [
  {
    id: "KB-REG-2026-H4K2PX",
    eventSlug: "cocoa-maker-perdana-september-2026",
    eventTitle: "Cocoa Maker Perdana",
    eventDate: "2026-09-06",
    fullName: "Ahmad Fajar",
    parentName: "Ibu Ratna Fajar",
    email: "ahmad.fajar@contoh.id",
    whatsapp: "081234567890",
    institution: "SD Islam Al Azhar 3, Depok",
    city: "Depok",
    age: 9,
    registrationType: "PAID",
    amount: 199_000,
    paymentStatus: "paid",
    status: "confirmed",
    createdAt: "2026-08-27T09:12:00.000Z",
    attendedAt: "2026-09-06T02:05:00.000Z",
    certificateNumber: "KB-2026-00125",
  },
  {
    id: "KB-REG-2026-M7QZ3D",
    eventSlug: "hangar-explore-september-2026",
    eventTitle: "Hangar Explore",
    eventDate: "2026-09-13",
    fullName: "Sekar Ayu Larasati",
    parentName: "Bapak Dwi Larasetya",
    email: "sekar.ayu@contoh.id",
    whatsapp: "082198765432",
    institution: "SDN Menteng 03, Jakarta",
    city: "Jakarta",
    age: 11,
    registrationType: "PAID",
    amount: 295_000,
    paymentStatus: "paid",
    status: "confirmed",
    createdAt: "2026-09-01T04:40:00.000Z",
    attendedAt: "2026-09-13T01:10:00.000Z",
    certificateNumber: "KB-2026-00124",
  },
  {
    id: "KB-REG-2026-T9BW5N",
    eventSlug: "pekan-kelas-bermain-september-2026",
    eventTitle: "Pekan Kelas Bermain",
    eventDate: "2026-09-22",
    fullName: "Bagas Wicaksono",
    parentName: "Ibu Sri Wahyuni",
    email: "bagas.w@contoh.id",
    whatsapp: "085711223344",
    institution: "SD Tunas Bangsa, Depok",
    city: "Depok",
    age: 8,
    registrationType: "PAID",
    amount: 950_000,
    paymentStatus: "paid",
    status: "confirmed",
    createdAt: "2026-09-10T03:20:00.000Z",
  },
];

export const demoCertificates: CertificateRecord[] = [
  {
    number: "KB-2026-00124",
    registrationId: "KB-REG-2026-M7QZ3D",
    participantName: "Sekar Ayu Larasati",
    eventTitle: "Hangar Explore",
    eventDate: "2026-09-13",
    organizer: "Kelas Bermain",
    template: "classic",
    issuedAt: "2026-09-14T02:00:00.000Z",
    status: "issued",
    signatory: { name: "Kak Rangga", role: "Lead Facilitator, Kelas Bermain" },
  },
  {
    number: "KB-2026-00125",
    registrationId: "KB-REG-2026-H4K2PX",
    participantName: "Ahmad Fajar",
    eventTitle: "Cocoa Maker Perdana",
    eventDate: "2026-09-06",
    organizer: "Kelas Bermain",
    template: "playful",
    issuedAt: "2026-09-07T02:00:00.000Z",
    status: "issued",
    signatory: { name: "Kak Rangga", role: "Lead Facilitator, Kelas Bermain" },
  },
];
