"use client";

import { useState } from "react";
import { ExternalLink, Monitor, RefreshCw, Smartphone, Tablet } from "lucide-react";

const DEVICES = [
  { key: "desktop", label: "Desktop", icon: Monitor, width: "100%" },
  { key: "tablet", label: "Tablet", icon: Tablet, width: "768px" },
  { key: "mobile", label: "Mobile", icon: Smartphone, width: "375px" },
] as const;

/**
 * Live preview of the public page, inside an iframe.
 *
 * Device switching only resizes this container — the public website is never
 * changed by what is selected here (§12). The iframe loads the same URL a
 * visitor would, so there is one rendering path, not a second mock of the
 * site that could drift out of sync.
 */
export function PreviewPane({
  path,
  draftMode,
}: {
  path: string;
  /** Loads through /preview so unpublished content is visible to the admin. */
  draftMode: boolean;
}) {
  const [device, setDevice] = useState<(typeof DEVICES)[number]["key"]>("desktop");
  const [nonce, setNonce] = useState(0);

  const src = draftMode
    ? `/preview?path=${encodeURIComponent(path)}&v=${nonce}`
    : `${path}${path.includes("?") ? "&" : "?"}v=${nonce}`;
  const width = DEVICES.find((item) => item.key === device)?.width ?? "100%";

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          role="group"
          aria-label="Ukuran layar pratinjau"
          className="flex gap-1 rounded-pill border border-line p-0.5"
        >
          {DEVICES.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setDevice(item.key)}
              aria-pressed={device === item.key}
              title={item.label}
              className={`inline-flex min-h-8 items-center gap-1.5 rounded-pill px-2.5 text-xs font-bold transition-colors ${
                device === item.key ? "bg-brand text-white" : "text-muted hover:text-brand"
              }`}
            >
              <item.icon className="size-3.5" aria-hidden />
              <span className="hidden sm:inline">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setNonce((value) => value + 1)}
            title="Muat ulang pratinjau"
            aria-label="Muat ulang pratinjau"
            className="inline-flex size-9 items-center justify-center rounded-full border border-line text-muted hover:border-brand/40 hover:text-brand"
          >
            <RefreshCw className="size-4" aria-hidden />
          </button>
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            title="Buka di tab baru"
            aria-label="Buka pratinjau di tab baru"
            className="inline-flex size-9 items-center justify-center rounded-full border border-line text-muted hover:border-brand/40 hover:text-brand"
          >
            <ExternalLink className="size-4" aria-hidden />
          </a>
        </div>
      </div>

      <div className="flex min-h-[32rem] flex-1 justify-center overflow-hidden rounded-card border border-line bg-canvas-deep/40 p-3">
        <iframe
          key={`${device}-${nonce}-${String(draftMode)}`}
          src={src}
          title="Pratinjau website"
          className="h-full rounded-xl border border-line bg-white shadow-soft transition-[width] duration-300"
          style={{ width, maxWidth: "100%" }}
        />
      </div>

      <p className="text-xs text-muted">
        {draftMode
          ? "Menampilkan draf. Pengunjung website tetap melihat versi yang sudah terbit."
          : "Menampilkan versi yang sudah terbit, persis seperti yang dilihat pengunjung."}
      </p>
    </div>
  );
}
