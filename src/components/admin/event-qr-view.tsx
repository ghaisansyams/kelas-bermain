"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Printer,
  QrCode as QrIcon,
} from "lucide-react";
import { QrCode, qrSvgMarkup } from "@/components/qr/qr-code";
import { AdminPageHeader, Panel } from "@/components/admin/ui";
import { buttonStyles } from "@/components/ui/button";
import type { EventRecord } from "@/lib/types";
import { attendanceUrl, registrationUrl, type QrSource } from "@/lib/services/qr";
import { formatDateRange } from "@/lib/utils/date";

const SOURCES: { value: QrSource; label: string }[] = [
  { value: "", label: "Tanpa penanda" },
  { value: "poster", label: "Poster" },
  { value: "banner", label: "Banner" },
  { value: "brosur", label: "Brosur" },
  { value: "instagram", label: "Instagram" },
  { value: "lokasi", label: "Lokasi Kelas Bermain" },
];

type Kind = "register" | "attendance";

export function EventQrView({ event, baseUrl }: { event: EventRecord; baseUrl: string }) {
  const [kind, setKind] = useState<Kind>("register");
  const [source, setSource] = useState<QrSource>("");
  const [copied, setCopied] = useState(false);

  const url =
    kind === "register"
      ? registrationUrl(event.slug, source || undefined, baseUrl)
      : attendanceUrl(event.slug, baseUrl);

  const filename = `qr-${kind}-${event.slug}${source ? `-${source}` : ""}`;

  function download(format: "svg" | "png") {
    const svg = qrSvgMarkup(url, 1024);
    if (format === "svg") {
      const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      triggerDownload(URL.createObjectURL(blob), `${filename}.svg`);
      return;
    }
    // Rasterise the same SVG through a canvas for the PNG variant.
    const image = new Image();
    const svgUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1024;
      canvas.height = 1024;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, 1024, 1024);
      context.drawImage(image, 0, 0, 1024, 1024);
      triggerDownload(canvas.toDataURL("image/png"), `${filename}.png`);
    };
    image.src = svgUrl;
  }

  function triggerDownload(href: string, name: string) {
    const link = document.createElement("a");
    link.href = href;
    link.download = name;
    link.click();
    if (href.startsWith("blob:")) URL.revokeObjectURL(href);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <AdminPageHeader
        breadcrumb={[
          { href: "/admin/events", label: "Event" },
          { href: `/admin/events/${event.id}`, label: event.title },
        ]}
        title="QR Registrasi"
        description="Cetak atau bagikan kode ini. Pemindai langsung mendarat di halaman pendaftaran event ini — bukan beranda."
        actions={
          <Link
            href={`/admin/events/${event.id}`}
            className={buttonStyles({ variant: "secondary", size: "sm" })}
          >
            Kembali ke Event
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_1fr]">
        <Panel title="Kode QR">
          <div className="print-area flex flex-col items-center gap-4 p-5">
            <div className="rounded-xl border border-line bg-white p-3">
              <QrCode value={url} size={224} />
            </div>
            <div className="text-center">
              <p className="text-sm font-extrabold text-ink">{event.title}</p>
              <p className="mt-0.5 text-xs text-muted">
                {formatDateRange(event.startDate, event.endDate)}
              </p>
              <p className="mt-1 text-[0.6875rem] font-semibold uppercase tracking-wider text-brand">
                {kind === "register" ? "Pendaftaran" : "Check-in Kehadiran"}
              </p>
            </div>
          </div>

          <div className="no-print flex flex-wrap gap-2 border-t border-line p-4">
            <button type="button" onClick={() => download("png")} className={buttonStyles({ size: "sm" })}>
              <Download className="size-4" aria-hidden />
              PNG
            </button>
            <button
              type="button"
              onClick={() => download("svg")}
              className={buttonStyles({ variant: "secondary", size: "sm" })}
            >
              <Download className="size-4" aria-hidden />
              SVG
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className={buttonStyles({ variant: "secondary", size: "sm" })}
            >
              <Printer className="size-4" aria-hidden />
              Cetak
            </button>
          </div>
        </Panel>

        <div className="min-w-0 space-y-4">
          <Panel title="Pengaturan Kode">
            <div className="space-y-4 p-4 sm:p-5">
              <div>
                <span className="mb-1.5 block text-[0.6875rem] font-bold uppercase tracking-wider text-muted">
                  Jenis QR
                </span>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Jenis QR">
                  {(
                    [
                      { value: "register", label: "Pendaftaran" },
                      { value: "attendance", label: "Check-in Kehadiran" },
                    ] as const
                  ).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={kind === option.value}
                      onClick={() => setKind(option.value)}
                      className={
                        kind === option.value
                          ? "inline-flex min-h-9 items-center rounded-pill bg-ink px-3.5 text-xs font-bold text-canvas"
                          : "inline-flex min-h-9 items-center rounded-pill border border-line px-3.5 text-xs font-semibold text-ink-soft hover:border-brand/40"
                      }
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {kind === "register" ? (
                <div>
                  <label
                    htmlFor="qr-source"
                    className="mb-1.5 block text-[0.6875rem] font-bold uppercase tracking-wider text-muted"
                  >
                    Penanda sumber
                  </label>
                  <select
                    id="qr-source"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="h-10 w-full max-w-xs rounded-lg border border-line bg-canvas px-3 text-sm font-medium text-ink outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
                  >
                    {SOURCES.map((option) => (
                      <option key={option.value || "none"} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1.5 text-xs text-muted">
                    Penanda ini tersimpan pada setiap pendaftaran, sehingga bisa dipakai untuk
                    melihat media mana yang paling banyak menghasilkan peserta.
                  </p>
                </div>
              ) : null}

              <div>
                <span className="mb-1.5 block text-[0.6875rem] font-bold uppercase tracking-wider text-muted">
                  Tautan tujuan
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded-lg bg-canvas-deep px-3 py-2 font-mono text-xs text-ink">
                    {url}
                  </code>
                  <button
                    type="button"
                    onClick={copyLink}
                    className={buttonStyles({ variant: "secondary", size: "sm" })}
                  >
                    {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
                    {copied ? "Tersalin" : "Salin"}
                  </button>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonStyles({ variant: "secondary", size: "sm" })}
                  >
                    <ExternalLink className="size-4" aria-hidden />
                    Buka
                  </a>
                </div>
              </div>
            </div>
          </Panel>

          <Panel title="Cara pakai">
            <ol className="space-y-3 p-4 text-sm leading-relaxed text-ink-soft sm:p-5">
              {[
                "Unduh PNG untuk materi cetak, atau SVG bila desainer butuh versi vektor.",
                "Tempel di poster, banner, brosur, atau area kelas. Satu event satu kode.",
                "Pilih penanda sumber berbeda untuk tiap media agar asal pendaftaran terlacak.",
                "Peserta memindai, lalu langsung masuk ke formulir event ini tanpa mencari lagi.",
              ].map((step, index) => (
                <li key={step} className="flex gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-bold text-brand-ink">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
            <p className="flex items-start gap-2 border-t border-line px-4 py-3.5 text-xs text-muted sm:px-5">
              <QrIcon className="mt-px size-3.5 shrink-0" aria-hidden />
              Statistik pemindaian belum tersedia — yang tercatat saat ini adalah sumber
              pendaftaran, yang bisa dilihat di kolom Sumber pada halaman Pendaftaran.
            </p>
          </Panel>
        </div>
      </div>
    </>
  );
}
