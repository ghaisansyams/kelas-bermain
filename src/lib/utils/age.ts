import type { Child } from "@/lib/repositories/types";

/**
 * A child's age in whole years.
 *
 * Two sources, in order of trust:
 *  1. `dateOfBirth` — exact, never goes stale. Seeded rows have it.
 *  2. `ageYears`/`ageMonths` as stated at sign-up, advanced by the time
 *     elapsed since. The intake form asks for an age rather than a birthday,
 *     so without this a record would quietly keep the age it was born with.
 */
export function ageOfChild(child: Child, now: Date = new Date()): number | null {
  if (child.dateOfBirth) return yearsSince(child.dateOfBirth, now);

  if (child.ageYears === undefined) return null;
  const statedMonths = child.ageYears * 12 + (child.ageMonths ?? 0);
  const elapsed = child.ageRecordedAt ? monthsBetween(child.ageRecordedAt, now) : 0;
  return Math.floor((statedMonths + elapsed) / 12);
}

/** "3 tahun 8 bulan" — how parents state it on the intake form. */
export function formatAge(years: number, months: number): string {
  if (months <= 0) return `${years} tahun`;
  return `${years} tahun ${months} bulan`;
}

export function yearsSince(isoDate: string, now: Date = new Date()): number {
  const birth = new Date(isoDate);
  let age = now.getFullYear() - birth.getFullYear();
  const monthDelta = now.getMonth() - birth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
}

function monthsBetween(isoDate: string, now: Date): number {
  const from = new Date(isoDate);
  if (Number.isNaN(from.getTime())) return 0;
  const months =
    (now.getFullYear() - from.getFullYear()) * 12 + (now.getMonth() - from.getMonth());
  return Math.max(0, months);
}

/* ------------------------------------------------------------------ */
/* Tanggal lahir                                                       */
/* ------------------------------------------------------------------ */

/**
 * Semua perhitungan di bawah memakai teks "YYYY-MM-DD", bukan objek Date.
 * Date mengurai teks itu sebagai tengah malam UTC lalu membacanya dengan zona
 * waktu perangkat, jadi anak yang lahir tanggal 1 bisa terbaca tanggal 31
 * bulan sebelumnya di server yang zonanya lain dari browser.
 */

/** Anak di bawah usia ini gratis kalau datang bersama anak yang sudah membayar. */
export const FREE_CHILD_UNDER_AGE = 3;

/** Usia maksimum yang diterima formulir, dalam tahun penuh. */
export const MAX_CHILD_AGE_YEARS = 17;

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseIsoDate(value: string): { y: number; m: number; d: number } | null {
  const match = ISO_DATE.exec(value ?? "");
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  // Date dipakai hanya untuk memastikan tanggalnya ada (31 Februari ditolak).
  const check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) {
    return null;
  }
  return { y, m, d };
}

/** Tanggal hari ini menurut Jakarta, bukan UTC. */
export function todayIso(now: Date = new Date()): string {
  return new Date(now.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

/** Usia dalam tahun dan bulan penuh pada `on`; null kalau tanggalnya tidak sah atau di masa depan. */
export function ageFromBirthDate(
  birthDate: string,
  on: string = todayIso(),
): { years: number; months: number } | null {
  const birth = parseIsoDate(birthDate);
  const ref = parseIsoDate(on);
  if (!birth || !ref) return null;

  let total = (ref.y - birth.y) * 12 + (ref.m - birth.m);
  if (ref.d < birth.d) total -= 1;
  if (total < 0) return null;
  return { years: Math.floor(total / 12), months: total % 12 };
}

/** Pesan galat untuk tanggal lahir yang tidak masuk akal; null kalau sah. */
export function birthDateError(birthDate: string): string | null {
  if (!birthDate.trim()) return "Tanggal lahir anak wajib diisi.";
  if (!parseIsoDate(birthDate)) return "Tanggal lahir tidak sah.";
  const age = ageFromBirthDate(birthDate);
  if (!age) return "Tanggal lahir tidak boleh di masa depan.";
  if (age.years > MAX_CHILD_AGE_YEARS) {
    return `Kelas ini untuk anak di bawah ${MAX_CHILD_AGE_YEARS + 1} tahun. Periksa kembali tanggal lahirnya.`;
  }
  return null;
}

/** "3 tahun 8 bulan" dari tanggal lahir; "—" kalau tanggalnya tidak ada atau tidak sah. */
export function formatAgeFromBirthDate(birthDate: string | null | undefined, on?: string): string {
  if (!birthDate) return "—";
  const age = ageFromBirthDate(birthDate, on);
  if (!age) return "—";
  if (age.years === 0 && age.months === 0) return "kurang dari 1 bulan";
  if (age.years === 0) return `${age.months} bulan`;
  return formatAge(age.years, age.months);
}

/**
 * Anak mana yang gratis, per kelompok pendamping.
 *
 * Aturannya: anak di bawah 3 tahun pada hari kelas tidak membayar, tetapi
 * hanya kalau kelompok yang sama membawa paling sedikit satu anak berusia 3
 * tahun ke atas yang membayar. Anak balita yang datang sendirian tetap
 * membayar penuh — tidak ada anak yang membayar yang "dibawanya".
 *
 * Dipakai di browser (untuk menampilkan harga) dan di server (untuk
 * menetapkan tagihan), supaya keduanya tidak pernah berbeda.
 */
export function freeChildFlags(birthDatesByGroup: string[][], eventDate: string): boolean[][] {
  return birthDatesByGroup.map((group) => {
    const ages = group.map((birthDate) => ageFromBirthDate(birthDate, eventDate)?.years ?? null);
    const hasPayingChild = ages.some((age) => age !== null && age >= FREE_CHILD_UNDER_AGE);
    return ages.map((age) => hasPayingChild && age !== null && age < FREE_CHILD_UNDER_AGE);
  });
}

/**
 * Tanggal lahir dan usia untuk halaman admin. Usia selalu dihitung dari
 * tanggal lahir saat halaman dibuka, jadi anak yang berulang tahun bulan ini
 * langsung tampil dengan usia barunya. Baris lama yang belum punya tanggal
 * lahir memakai usia yang tercatat saat mendaftar.
 */
export function describeChildAge(child: {
  date_of_birth: Date | null;
  age_years: number | null;
  age_months: number | null;
}): { birth: string | null; age: string } {
  if (child.date_of_birth) {
    const iso = child.date_of_birth.toISOString().slice(0, 10);
    return { birth: iso, age: formatAgeFromBirthDate(iso) };
  }
  if (child.age_years !== null) {
    return { birth: null, age: formatAge(child.age_years, child.age_months ?? 0) };
  }
  return { birth: null, age: "—" };
}
