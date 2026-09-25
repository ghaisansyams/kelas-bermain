import qrcode from "qrcode-generator";
import { siteConfig } from "@/data/site";

/**
 * QR registration links.
 *
 * Every event gets its own code so a scan lands straight on that event's
 * registration page rather than the home page. The optional `source` is carried
 * through to the registration record, which is how printed posters, banners and
 * social posts can be attributed later.
 */

export type QrSource =
  | "poster"
  | "banner"
  | "brosur"
  | "instagram"
  | "lokasi"
  | "event"
  | string;

export function registrationPath(eventSlug: string, source?: QrSource): string {
  const query = source ? `?source=${encodeURIComponent(source)}` : "";
  return `/register/${eventSlug}${query}`;
}

export function registrationUrl(
  eventSlug: string,
  source?: QrSource,
  baseUrl: string = siteConfig.url,
): string {
  return `${baseUrl.replace(/\/$/, "")}${registrationPath(eventSlug, source)}`;
}

export function attendanceUrl(
  eventSlug: string,
  baseUrl: string = siteConfig.url,
): string {
  return `${baseUrl.replace(/\/$/, "")}/attendance/${eventSlug}`;
}

/** Error correction level — M survives a printed poster being scuffed. */
const LEVEL = "M" as const;

function build(value: string) {
  const qr = qrcode(0, LEVEL);
  qr.addData(value);
  qr.make();
  return qr;
}

export function qrSvg(value: string, cellSize = 6, margin = 4): string {
  return build(value).createSvgTag({ cellSize, margin });
}

export function qrDataUrl(value: string, cellSize = 6, margin = 4): string {
  return build(value).createDataURL(cellSize, margin);
}

/** Module matrix, for rendering the code as real DOM nodes. */
export function qrMatrix(value: string): boolean[][] {
  const qr = build(value);
  const count = qr.getModuleCount();
  return Array.from({ length: count }, (_, row) =>
    Array.from({ length: count }, (_, col) => qr.isDark(row, col)),
  );
}
