import type { Affiliate } from "@/lib/repositories/types";

/**
 * Affiliate programme seed data.
 *
 * Covers every state the ERP has to render: an approved affiliate with a live
 * code, one awaiting verification, one switched off, and one rejected.
 */

export const affiliates: Affiliate[] = [
  {
    id: "aff-001",
    affiliateNumber: "KB-AFF-00001",
    code: "FIKA7QM2",
    fullName: "Yufika Agustyani",
    whatsapp: "081774918611",
    email: "kelasbermain.id@gmail.com",
    domicile: "Beji, Depok",
    bankName: "Bank BSI",
    bankAccountNumber: "5676283270",
    bankAccountName: "Yufika Agustyani",
    reason: "Mengelola komunitas orang tua di Depok.",
    status: "ACTIVE",
    appliedAt: "2026-08-02T02:15:00.000Z",
    verifiedAt: "2026-08-02T08:40:00.000Z",
    verifiedBy: "Putri Anggraini",
  },
  {
    id: "aff-002",
    affiliateNumber: "KB-AFF-00002",
    code: "RANI4KDP",
    fullName: "Rani Puspita",
    whatsapp: "081298765432",
    domicile: "Cibubur, Jakarta Timur",
    bankName: "Bank BCA",
    bankAccountNumber: "7360991244",
    bankAccountName: "Rani Puspita",
    reason: "Aktif di grup arisan perumahan, sering ditanya kegiatan anak.",
    status: "ACTIVE",
    appliedAt: "2026-08-19T04:05:00.000Z",
    verifiedAt: "2026-08-19T10:12:00.000Z",
    verifiedBy: "Rangga Mahendra",
  },
  {
    id: "aff-003",
    affiliateNumber: "KB-AFF-00003",
    code: "",
    fullName: "Dewi Lestari",
    whatsapp: "081355512340",
    email: "dewi.lestari@contoh.id",
    domicile: "Bintaro, Tangerang Selatan",
    bankName: "Bank Mandiri",
    bankAccountNumber: "1370008812345",
    bankAccountName: "Dewi Lestari",
    reason: "Guru PAUD, ingin merekomendasikan ke wali murid.",
    status: "PENDING",
    appliedAt: "2026-09-24T01:30:00.000Z",
  },
  {
    id: "aff-004",
    affiliateNumber: "KB-AFF-00004",
    code: "BAYU2WLX",
    fullName: "Bayu Kurniawan",
    whatsapp: "081744420011",
    domicile: "Bekasi Barat, Bekasi",
    bankName: "Bank BNI",
    bankAccountNumber: "0881234567",
    bankAccountName: "Bayu Kurniawan",
    status: "INACTIVE",
    appliedAt: "2026-06-11T03:00:00.000Z",
    verifiedAt: "2026-06-12T02:20:00.000Z",
    verifiedBy: "Putri Anggraini",
    notes: "Dinonaktifkan sementara atas permintaan sendiri.",
  },
];
