import { ageFromBirthDate, birthDateError } from "@/lib/utils/age";

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** Indonesian mobile numbers: 08xx / +628xx / 628xx. */
const PHONE = /^(\+?62|0)8[1-9][0-9]{6,11}$/;

export function normalizePhone(value: string): string {
  return value.replace(/[\s\-().]/g, "");
}

/** 0812…, +62812…, 62812… dan 0812-345 semuanya menjadi 812… — untuk membandingkan nomor. */
export function phoneKey(value: string): string {
  return value.replace(/\D/g, "").replace(/^(62|0)/, "");
}

export function isEmail(value: string): boolean {
  return EMAIL.test(value.trim());
}

export function isPhone(value: string): boolean {
  return PHONE.test(normalizePhone(value));
}

/* ------------------------------------------------------------------ */
/* Pendamping / orang tua                                              */
/* ------------------------------------------------------------------ */

/** Berapa pendamping tambahan yang bisa diisi dalam satu kelompok. */
export const MAX_EXTRA_COMPANIONS = 10;

/**
 * Mirrors the intake form the team actually uses in WhatsApp. Email,
 * pekerjaan and the split alamat/kota fields were dropped because that form
 * never asked for them.
 */
export interface ParentFormValues {
  fullName: string;
  whatsapp: string;
  domicile: string;
  /** Pendamping lain yang ikut datang, hanya jumlahnya. Bisa dikenai biaya per event. */
  extraCompanions: number;
}

export const emptyParent: ParentFormValues = {
  fullName: "",
  whatsapp: "",
  domicile: "",
  extraCompanions: 0,
};

export function validateParent(values: ParentFormValues): FieldErrors<ParentFormValues> {
  const errors: FieldErrors<ParentFormValues> = {};
  // "ANNISA/ADAM" is a normal answer here — two guardians, one line.
  if (values.fullName.trim().length < 3) {
    errors.fullName = "Nama pendamping minimal 3 karakter.";
  }
  if (!isPhone(values.whatsapp)) {
    errors.whatsapp = "Gunakan format nomor Indonesia, contoh 08123456789.";
  }
  if (values.domicile.trim().length < 3) {
    errors.domicile = "Isi domisili, contoh: Pekayon, Jakarta Timur.";
  }
  if (
    !Number.isInteger(values.extraCompanions) ||
    values.extraCompanions < 0 ||
    values.extraCompanions > MAX_EXTRA_COMPANIONS
  ) {
    errors.extraCompanions = `Jumlah pendamping tambahan antara 0 dan ${MAX_EXTRA_COMPANIONS}.`;
  }
  return errors;
}

/* ------------------------------------------------------------------ */
/* Anak                                                                */
/* ------------------------------------------------------------------ */

export interface ChildFormValues {
  fullName: string;
  nickname: string;
  /** "YYYY-MM-DD", dari pemilih tanggal. Usia dihitung darinya, tidak pernah diketik. */
  dateOfBirth: string;
}

export const emptyChild: ChildFormValues = {
  fullName: "",
  nickname: "",
  dateOfBirth: "",
};

export function validateChild(values: ChildFormValues): FieldErrors<ChildFormValues> {
  const errors: FieldErrors<ChildFormValues> = {};

  if (values.fullName.trim().length < 3) {
    errors.fullName = "Nama anak minimal 3 karakter.";
  }
  if (values.nickname.trim().length < 2) {
    errors.nickname = "Isi nama panggilan anak.";
  }

  const dobError = birthDateError(values.dateOfBirth);
  if (dobError) errors.dateOfBirth = dobError;
  return errors;
}

/**
 * Whether a stated age sits outside the class's range.
 *
 * Deliberately NOT part of `validateChild`: the team does admit children just
 * outside the bracket (their own intake sheet records a 3 y 8 m child in a
 * 4+ class), so this drives a warning the parent can accept, not a rejection.
 * See PRD v2.0, KONF-02.
 */
export function ageOutsideRange(
  values: ChildFormValues,
  ageRange?: [number, number],
  /** Hari kelas ("YYYY-MM-DD"); usia dihitung pada hari itu. Kosong = hari ini. */
  onDate?: string,
): string | null {
  if (!ageRange) return null;
  const age = ageFromBirthDate(values.dateOfBirth, onDate);
  if (!age) return null;
  if (age.years >= ageRange[0] && age.years <= ageRange[1]) return null;
  return `Kelas ini untuk usia ${ageRange[0]}–${ageRange[1]} tahun, sedangkan usia anak ${age.years} tahun. Pendaftaran tetap bisa dilanjutkan dan akan ditinjau tim kami.`;
}

/* ------------------------------------------------------------------ */
/* Affiliate application                                               */
/* ------------------------------------------------------------------ */

export interface AffiliateFormValues {
  fullName: string;
  whatsapp: string;
  email: string;
  domicile: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  reason: string;
}

export const emptyAffiliate: AffiliateFormValues = {
  fullName: "",
  whatsapp: "",
  email: "",
  domicile: "",
  bankName: "",
  bankAccountNumber: "",
  bankAccountName: "",
  reason: "",
};

export function validateAffiliate(
  values: AffiliateFormValues,
): FieldErrors<AffiliateFormValues> {
  const errors: FieldErrors<AffiliateFormValues> = {};

  if (values.fullName.trim().length < 3) {
    errors.fullName = "Nama lengkap minimal 3 karakter.";
  }
  if (!isPhone(values.whatsapp)) {
    errors.whatsapp = "Gunakan format nomor Indonesia, contoh 08123456789.";
  }
  if (values.email.trim() !== "" && !isEmail(values.email)) {
    errors.email = "Masukkan alamat email yang valid, atau kosongkan.";
  }
  if (values.domicile.trim().length < 3) {
    errors.domicile = "Isi domisili, contoh: Pekayon, Jakarta Timur.";
  }
  if (values.bankName.trim().length < 2) {
    errors.bankName = "Isi nama bank, contoh: BCA.";
  }
  const digits = values.bankAccountNumber.replace(/\D/g, "");
  if (digits.length < 6) {
    errors.bankAccountNumber = "Nomor rekening minimal 6 digit.";
  }
  if (values.bankAccountName.trim().length < 3) {
    errors.bankAccountName = "Isi nama pemilik rekening sesuai buku tabungan.";
  }
  return errors;
}

/* ------------------------------------------------------------------ */
/* Attendance check-in                                                 */
/* ------------------------------------------------------------------ */

export interface CheckInFormValues {
  registrationNumber: string;
  contact: string;
  confirmed: boolean;
}

export function validateCheckIn(
  values: CheckInFormValues,
): FieldErrors<CheckInFormValues> {
  const errors: FieldErrors<CheckInFormValues> = {};
  if (values.registrationNumber.trim().length < 6) {
    errors.registrationNumber = "Masukkan nomor pendaftaran, contoh KB-REG-2026-00001.";
  }
  // Contact is optional. Without it the lookup returns payment status only,
  // never a name — registration numbers are sequential, so anyone could walk
  // them and read other families' details otherwise.
  const contact = values.contact.trim();
  if (contact && !isPhone(contact)) {
    errors.contact = "Kalau diisi, gunakan nomor WhatsApp yang valid, contoh 08123456789.";
  }
  if (!values.confirmed) {
    errors.confirmed = "Konfirmasi kehadiran terlebih dahulu.";
  }
  return errors;
}

/* ------------------------------------------------------------------ */
/* Cek Tiket                                                           */
/* ------------------------------------------------------------------ */

export interface TicketLookupFormValues {
  registrationNumber: string;
  contact: string;
}

export function validateTicketLookup(
  values: TicketLookupFormValues,
): FieldErrors<TicketLookupFormValues> {
  const errors: FieldErrors<TicketLookupFormValues> = {};
  if (values.registrationNumber.trim().length < 6) {
    errors.registrationNumber = "Masukkan nomor pendaftaran, contoh KB-REG-2026-00001.";
  }
  // Contact is optional. Without it the lookup returns payment status only,
  // never a name — registration numbers are sequential, so anyone could walk
  // them and read other families' details otherwise.
  const contact = values.contact.trim();
  if (contact && !isPhone(contact)) {
    errors.contact = "Kalau diisi, gunakan nomor WhatsApp yang valid, contoh 08123456789.";
  }
  return errors;
}

export function hasErrors<T>(errors: FieldErrors<T>): boolean {
  return Object.values(errors).some(Boolean);
}
