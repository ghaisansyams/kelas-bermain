import type { CertificateRecord, Registration } from "@/lib/repositories/types";

/**
 * Seed rows so the registration, attendance, and certificate flows have
 * something to show on a first visit. A real deployment drops these and reads
 * the participant tables instead.
 */

export const demoRegistrations: Registration[] = [
  {
    id: "KB-REG-2026-H4K2PX",
    eventSlug: "community-gathering-temu-relawan",
    eventTitle: "Community Gathering: Temu Relawan",
    eventDate: "2026-08-09",
    fullName: "Ahmad Fajar",
    email: "ahmad.fajar@contoh.id",
    whatsapp: "081234567890",
    institution: "Universitas Indonesia",
    city: "Depok",
    age: 21,
    registrationType: "FREE",
    amount: 0,
    paymentStatus: "not_required",
    status: "confirmed",
    createdAt: "2026-07-28T09:12:00.000Z",
    attendedAt: "2026-08-09T09:05:00.000Z",
    certificateNumber: "KB-2026-00125",
  },
  {
    id: "KB-REG-2026-M7QZ3D",
    eventSlug: "workshop-desain-poster-sosial",
    eventTitle: "Workshop Desain Poster Kampanye Sosial",
    eventDate: "2026-07-12",
    fullName: "Sekar Ayu Larasati",
    email: "sekar.ayu@contoh.id",
    whatsapp: "082198765432",
    institution: "SMA Negeri 3 Semarang",
    city: "Semarang",
    age: 17,
    registrationType: "PAID",
    amount: 95_000,
    paymentStatus: "paid",
    status: "confirmed",
    createdAt: "2026-06-30T04:40:00.000Z",
    attendedAt: "2026-07-12T02:10:00.000Z",
    certificateNumber: "KB-2026-00124",
  },
  {
    id: "KB-REG-2026-T9BW5N",
    eventSlug: "pekan-kolaborasi-sekolah-2026",
    eventTitle: "Pekan Kolaborasi Sekolah 2026",
    eventDate: "2026-09-22",
    fullName: "Bagas Wicaksono",
    email: "bagas.w@contoh.id",
    whatsapp: "085711223344",
    institution: "SMA Negeri 2 Depok",
    city: "Depok",
    age: 16,
    registrationType: "FREE",
    amount: 0,
    paymentStatus: "not_required",
    status: "confirmed",
    createdAt: "2026-09-10T03:20:00.000Z",
  },
];

export const demoCertificates: CertificateRecord[] = [
  {
    number: "KB-2026-00124",
    registrationId: "KB-REG-2026-M7QZ3D",
    participantName: "Sekar Ayu Larasati",
    eventTitle: "Workshop Desain Poster Kampanye Sosial",
    eventDate: "2026-07-12",
    organizer: "Kelas Bermain",
    template: "classic",
    issuedAt: "2026-07-13T02:00:00.000Z",
    status: "issued",
    signatory: { name: "Putri Anggraini", role: "Program Director, Kelas Bermain" },
  },
  {
    number: "KB-2026-00125",
    registrationId: "KB-REG-2026-H4K2PX",
    participantName: "Ahmad Fajar",
    eventTitle: "Community Gathering: Temu Relawan",
    eventDate: "2026-08-09",
    organizer: "Kelas Bermain",
    template: "playful",
    issuedAt: "2026-08-10T02:00:00.000Z",
    status: "issued",
    signatory: { name: "Putri Anggraini", role: "Program Director, Kelas Bermain" },
  },
];
