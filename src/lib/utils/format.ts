const RUPIAH = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export function formatRupiah(value: number): string {
  return RUPIAH.format(value).replace(/\s/g, "");
}

export function pluralCount(count: number, noun: string): string {
  return `${count.toLocaleString("id-ID")} ${noun}`;
}

/** "09:00 – 15:00 WIB" */
export function formatTimeRange(start: string, end: string, tz: string): string {
  return `${start} – ${end} ${tz}`;
}
