"use client";

import { useMemo } from "react";
import { qrMatrix } from "@/lib/services/qr";

/**
 * Renders a QR code as inline SVG so it stays crisp at any print size and can
 * be exported without a canvas round-trip.
 */
export function QrCode({
  value,
  size = 220,
  className,
  id,
}: {
  value: string;
  size?: number;
  className?: string;
  id?: string;
}) {
  const matrix = useMemo(() => qrMatrix(value), [value]);
  const modules = matrix.length;
  const quiet = 4;
  const total = modules + quiet * 2;

  return (
    <svg
      id={id}
      viewBox={`0 0 ${total} ${total}`}
      width={size}
      height={size}
      role="img"
      aria-label={`Kode QR untuk ${value}`}
      shapeRendering="crispEdges"
      className={className}
    >
      <rect width={total} height={total} fill="#ffffff" />
      {matrix.map((row, y) =>
        row.map((dark, x) =>
          dark ? (
            <rect key={`${x}-${y}`} x={x + quiet} y={y + quiet} width={1} height={1} fill="#1e1b18" />
          ) : null,
        ),
      )}
    </svg>
  );
}

/** Serialises the rendered SVG for download. */
export function qrSvgMarkup(value: string, size = 1024): string {
  const matrix = qrMatrix(value);
  const modules = matrix.length;
  const quiet = 4;
  const total = modules + quiet * 2;
  const rects = matrix
    .map((row, y) =>
      row
        .map((dark, x) =>
          dark
            ? `<rect x="${x + quiet}" y="${y + quiet}" width="1" height="1" fill="#1e1b18"/>`
            : "",
        )
        .join(""),
    )
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" width="${size}" height="${size}" shape-rendering="crispEdges"><rect width="${total}" height="${total}" fill="#ffffff"/>${rects}</svg>`;
}
