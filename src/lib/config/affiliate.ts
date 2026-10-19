/**
 * Komisi affiliate per peserta, dalam rupiah.
 *
 * Terpisah dari services/affiliate.ts karena berkas itu server action, dan
 * berkas server action hanya boleh mengekspor fungsi async — sebuah konstanta
 * di sana menggagalkan build.
 */
export const COMMISSION_PER_PARTICIPANT = 10_000;
