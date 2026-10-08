export type FieldErrors<T> = Partial<Record<keyof T, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** Indonesian mobile numbers: 08xx / +628xx / 628xx. */
const PHONE = /^(\+?62|0)8[1-9][0-9]{6,11}$/;

export function normalizePhone(value: string): string {
  return value.replace(/[\s\-().]/g, "");
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

/**
 * Mirrors the intake form the team actually uses in WhatsApp. Email,
 * pekerjaan and the split alamat/kota fields were dropped in PRD v2.0 (R-02)
 * because that form never asked for them.
 */
export interface ParentFormValues {
  fullName: string;
  whatsapp: string;
  /** Optional — kept off the required list per the team's intake sheet. */
  email: string;
  domicile: string;
}

export const emptyParent: ParentFormValues = {
  fullName: "",
  whatsapp: "",
  email: "",
  domicile: "",
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
  if (values.email.trim() !== "" && !isEmail(values.email)) {
    errors.email = "Masukkan alamat email yang valid, atau kosongkan.";
  }
  if (values.domicile.trim().length < 3) {
    errors.domicile = "Isi domisili, contoh: Pekayon, Jakarta Timur.";
  }
  return errors;
}

/* ------------------------------------------------------------------ */
/* Anak                                                                */
/* ------------------------------------------------------------------ */

export interface ChildFormValues {
  fullName: string;
  nickname: string;
  /** Stated in years + months, the way the intake form asks for it. */
  ageYears: string;
  ageMonths: string;
}

export const emptyChild: ChildFormValues = {
  fullName: "",
  nickname: "",
  ageYears: "",
  ageMonths: "",
};

export const MAX_AGE_YEARS = 17;

export function validateChild(values: ChildFormValues): FieldErrors<ChildFormValues> {
  const errors: FieldErrors<ChildFormValues> = {};

  if (values.fullName.trim().length < 3) {
    errors.fullName = "Nama anak minimal 3 karakter.";
  }
  if (values.nickname.trim().length < 2) {
    errors.nickname = "Isi nama panggilan anak.";
  }

  const years = Number(values.ageYears);
  if (values.ageYears.trim() === "") {
    errors.ageYears = "Usia anak wajib diisi.";
  } else if (!Number.isInteger(years) || years < 0 || years > MAX_AGE_YEARS) {
    errors.ageYears = `Usia dalam tahun, antara 0 dan ${MAX_AGE_YEARS}.`;
  }

  if (values.ageMonths.trim() !== "") {
    const months = Number(values.ageMonths);
    if (!Number.isInteger(months) || months < 0 || months > 11) {
      errors.ageMonths = "Bulan antara 0 dan 11.";
    }
  }
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
): string | null {
  if (!ageRange || values.ageYears.trim() === "") return null;
  const years = Number(values.ageYears);
  if (!Number.isFinite(years)) return null;
  if (years >= ageRange[0] && years <= ageRange[1]) return null;
  return `Kelas ini untuk usia ${ageRange[0]}–${ageRange[1]} tahun, sedangkan usia yang diisi ${years} tahun. Pendaftaran tetap bisa dilanjutkan dan akan ditinjau tim kami.`;
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
  if (contact && !isEmail(contact) && !isPhone(contact)) {
    errors.contact = "Kalau diisi, gunakan email atau nomor WhatsApp yang valid.";
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
  if (contact && !isEmail(contact) && !isPhone(contact)) {
    errors.contact = "Kalau diisi, gunakan email atau nomor WhatsApp yang valid.";
  }
  return errors;
}

export function hasErrors<T>(errors: FieldErrors<T>): boolean {
  return Object.values(errors).some(Boolean);
}
