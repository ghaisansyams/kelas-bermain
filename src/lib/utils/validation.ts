export type FieldErrors<T> = Partial<Record<keyof T, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** Indonesian mobile numbers: 08xx / +628xx / 628xx, 9–15 digits total. */
const PHONE = /^(\+?62|0)8[1-9][0-9]{6,11}$/;

export function normalizePhone(value: string): string {
  return value.replace(/[\s\-().]/g, "");
}

export interface RegistrationFormValues {
  fullName: string;
  email: string;
  whatsapp: string;
  institution: string;
  city: string;
  age: string;
  notes: string;
  consent: boolean;
}

export function validateRegistration(
  values: RegistrationFormValues,
): FieldErrors<RegistrationFormValues> {
  const errors: FieldErrors<RegistrationFormValues> = {};

  if (values.fullName.trim().length < 3) {
    errors.fullName = "Nama lengkap minimal 3 karakter.";
  }
  if (!EMAIL.test(values.email.trim())) {
    errors.email = "Masukkan alamat email yang valid.";
  }
  if (!PHONE.test(normalizePhone(values.whatsapp))) {
    errors.whatsapp = "Gunakan format nomor Indonesia, contoh 08123456789.";
  }
  if (values.institution.trim().length < 2) {
    errors.institution = "Isi asal sekolah, kampus, atau komunitas.";
  }
  if (values.city.trim().length < 2) {
    errors.city = "Isi kota domisili kamu.";
  }
  const age = Number(values.age);
  if (!values.age.trim()) {
    errors.age = "Usia wajib diisi.";
  } else if (!Number.isFinite(age) || age < 10 || age > 80) {
    errors.age = "Usia harus antara 10 sampai 80 tahun.";
  }
  if (values.notes.trim().length > 500) {
    errors.notes = "Maksimal 500 karakter.";
  }
  if (!values.consent) {
    errors.consent = "Centang persetujuan untuk melanjutkan.";
  }

  return errors;
}

export interface AttendanceFormValues {
  registrationId: string;
  fullName: string;
  contact: string;
  confirmed: boolean;
}

export function validateAttendance(
  values: AttendanceFormValues,
): FieldErrors<AttendanceFormValues> {
  const errors: FieldErrors<AttendanceFormValues> = {};

  if (values.registrationId.trim().length < 6) {
    errors.registrationId = "Masukkan ID pendaftaran, contoh KB-REG-2026-H4K2PX.";
  }
  if (values.fullName.trim().length < 3) {
    errors.fullName = "Nama lengkap minimal 3 karakter.";
  }
  const contact = values.contact.trim();
  if (!EMAIL.test(contact) && !PHONE.test(normalizePhone(contact))) {
    errors.contact = "Masukkan email atau nomor WhatsApp yang dipakai saat mendaftar.";
  }
  if (!values.confirmed) {
    errors.confirmed = "Konfirmasi kehadiran terlebih dahulu.";
  }

  return errors;
}

export function hasErrors<T>(errors: FieldErrors<T>): boolean {
  return Object.values(errors).some(Boolean);
}
