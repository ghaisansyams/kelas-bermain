/**
 * Jam rundown ditulis bebas oleh admin ("09.00", "9:30", "09:00 - 09:30 WIB").
 * Fungsi di sini merapikan tampilannya dan menghitung durasi tanpa mengubah
 * apa yang tersimpan di database.
 */

const CLOCK = /(\d{1,2})\s*[:.]\s*(\d{2})/g;

function toMinutes(hours: string, minutes: string): number | null {
  const h = Number(hours);
  const m = Number(minutes);
  return h <= 23 && m <= 59 ? h * 60 + m : null;
}

/** Semua jam yang ditemukan di teks, dalam menit sejak tengah malam. */
export function parseClocks(value: string): number[] {
  const found: number[] = [];
  for (const match of value.matchAll(CLOCK)) {
    const minutes = toMinutes(match[1], match[2]);
    if (minutes !== null) found.push(minutes);
  }
  return found;
}

const TIME_ONLY = /^\s*(\d{1,2})\s*[:.]\s*(\d{2})\s*(wib|wita|wit)?\s*$/i;

const TIME_RANGE =
  /^\s*(\d{1,2})\s*[:.]\s*(\d{2})\s*[-–—]\s*(\d{1,2})\s*[:.]\s*(\d{2})\s*(?:wib|wita|wit)?\s*$/i;

/** "9.00" dan "09.00 WIB" menjadi "09:00"; teks lain (rentang, "Pagi") dibiarkan. */
export function formatClock(value: string): string {
  const match = value.match(TIME_ONLY);
  if (match && toMinutes(match[1], match[2]) !== null) {
    return `${match[1].padStart(2, "0")}:${match[2]}`;
  }
  const range = value.match(TIME_RANGE);
  if (range && toMinutes(range[1], range[2]) !== null && toMinutes(range[3], range[4]) !== null) {
    return `${range[1].padStart(2, "0")}:${range[2]} – ${range[3].padStart(2, "0")}:${range[4]}`;
  }
  return value.trim();
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} menit`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} jam` : `${hours} jam ${rest} menit`;
}

/**
 * Lama sesi: selisih dengan jam mulai sesi berikutnya, atau panjang rentang
 * kalau admin menulis "09:00 - 09:30". Null kalau tidak bisa dipastikan.
 */
export function sessionMinutes(time: string, nextTime?: string): number | null {
  const own = parseClocks(time);
  if (own.length >= 2) {
    const span = own[1] - own[0];
    return span > 0 ? span : null;
  }
  if (own.length === 1 && nextTime) {
    const next = parseClocks(nextTime)[0];
    if (next !== undefined && next > own[0]) return next - own[0];
  }
  return null;
}

const LINE_TIME_FIRST =
  /^(\d{1,2}\s*[:.]\s*\d{2}(?:\s*[-–—]\s*\d{1,2}\s*[:.]\s*\d{2})?)\s*(?:wib|wita|wit)?\s*[-–—:|]?\s*(.*)$/i;
const LINE_TIME_LAST = /^(.*?\S)\s*[-–—:|(]?\s*(\d{1,2}\s*[:.]\s*\d{2})\s*\)?\s*(?:wib|wita|wit)?$/i;

/**
 * Mengubah teks tempelan menjadi baris rundown. Menerima "09.00 Registrasi",
 * "Registrasi 09.00", dan jam yang ditulis di baris tersendiri sebelum
 * kegiatannya. Baris tanpa jam tetap diambil sebagai kegiatan.
 */
export function parseAgendaText(text: string): { time: string; title: string }[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const rows: { time: string; title: string }[] = [];
  let pendingTime = "";

  for (const line of lines) {
    const first = line.match(LINE_TIME_FIRST);
    if (first) {
      const [, time, rest] = first;
      if (rest.trim()) {
        rows.push({ time: formatClock(time), title: rest.trim() });
        pendingTime = "";
      } else {
        pendingTime = formatClock(time);
      }
      continue;
    }
    const last = line.match(LINE_TIME_LAST);
    if (last) {
      rows.push({ time: formatClock(last[2]), title: last[1].trim() });
      pendingTime = "";
      continue;
    }
    rows.push({ time: pendingTime, title: line });
    pendingTime = "";
  }
  return rows;
}
