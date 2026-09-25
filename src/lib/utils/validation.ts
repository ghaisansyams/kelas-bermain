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
/* Parent / customer                                                   */
/* ------------------------------------------------------------------ */

export interface ParentFormValues {
  fullName: string;
  email: string;
  whatsapp: string;
  address: string;
  city: string;
  occupation: string;
}

export const emptyParent: ParentFormValues = {
  fullName: "",
  email: "",
  whatsapp: "",
  address: "",
  city: "",
  occupation: "",
};

export function validateParent(values: ParentFormValues): FieldErrors<ParentFormValues> {
  const errors: FieldErrors<ParentFormValues> = {};
  if (values.fullName.trim().length < 3) {
    errors.fullName = "Nama orang tua minimal 3 karakter.";
  }
  if (!isEmail(values.email)) {
    errors.email = "Masukkan alamat email yang valid.";
  }
  if (!isPhone(values.whatsapp)) {
    errors.whatsapp = "Gunakan format nomor Indonesia, contoh 08123456789.";
  }
  if (values.address.trim().length < 5) {
    errors.address = "Alamat minimal 5 karakter.";
  }
  if (values.city.trim().length < 2) {
    errors.city = "Isi kota domisili.";
  }
  return errors;
}

/* ------------------------------------------------------------------ */
/* Child                                                               */
/* ------------------------------------------------------------------ */

export interface ChildFormValues {
  fullName: string;
  nickname: string;
  gender: "L" | "P" | "";
  dateOfBirth: string;
  school: string;
  grade: string;
  specialNotes: string;
}

export const emptyChild: ChildFormValues = {
  fullName: "",
  nickname: "",
  gender: "",
  dateOfBirth: "",
  school: "",
  grade: "",
  specialNotes: "",
};

function ageAt(dateOfBirth: string, reference = new Date()): number {
  const birth = new Date(dateOfBirth);
  let age = reference.getFullYear() - birth.getFullYear();
  const monthDelta = reference.getMonth() - birth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && reference.getDate() < birth.getDate())) age -= 1;
  return age;
}

export function validateChild(
  values: ChildFormValues,
  ageRange?: [number, number],
): FieldErrors<ChildFormValues> {
  const errors: FieldErrors<ChildFormValues> = {};

  if (values.fullName.trim().length < 3) {
    errors.fullName = "Nama anak minimal 3 karakter.";
  }
  if (!values.gender) {
    errors.gender = "Pilih jenis kelamin anak.";
  }
  if (!values.dateOfBirth) {
    errors.dateOfBirth = "Tanggal lahir wajib diisi.";
  } else {
    const birth = new Date(values.dateOfBirth);
    if (Number.isNaN(birth.getTime())) {
      errors.dateOfBirth = "Tanggal lahir tidak valid.";
    } else if (birth.getTime() > Date.now()) {
      errors.dateOfBirth = "Tanggal lahir tidak boleh di masa depan.";
    } else if (ageRange) {
      const age = ageAt(values.dateOfBirth);
      if (age < ageRange[0] || age > ageRange[1]) {
        errors.dateOfBirth = `Kelas ini untuk anak usia ${ageRange[0]}–${ageRange[1]} tahun. Usia anak saat ini ${age} tahun.`;
      }
    }
  }
  if (values.school.trim().length < 2) {
    errors.school = "Isi asal sekolah atau PAUD/TK anak.";
  }
  if (values.specialNotes.trim().length > 300) {
    errors.specialNotes = "Maksimal 300 karakter.";
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
  const contact = values.contact.trim();
  if (!isEmail(contact) && !isPhone(contact)) {
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
