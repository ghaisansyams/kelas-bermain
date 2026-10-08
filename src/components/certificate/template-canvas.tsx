"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  fieldText,
  FIELD_LABEL,
  PAGE_SIZE,
  type CertificateData,
  type FieldKey,
  type TemplateConfig,
} from "@/lib/cms/certificate-template";

/**
 * Renders a certificate: the Canva artwork as the background, with the two
 * live values positioned on top.
 *
 * Positions are percentages of the page, so the same markup is correct in a
 * small admin preview, on the public verification page, and in print — one
 * layout, not three.
 *
 * When `onMove` is supplied the fields become draggable. The public page
 * omits it, so there is nothing to drag for a visitor.
 */
export function TemplateCanvas({
  config,
  backgroundUrl,
  orientation,
  data,
  selected,
  onSelect,
  onMove,
}: {
  config: TemplateConfig;
  backgroundUrl?: string;
  orientation: "LANDSCAPE" | "PORTRAIT";
  data: CertificateData;
  selected?: FieldKey | null;
  onSelect?: (key: FieldKey) => void;
  /** Receives new x/y as percentages of the page. */
  onMove?: (key: FieldKey, x: number, y: number) => void;
}) {
  const page = PAGE_SIZE[orientation];
  const boxRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<FieldKey | null>(null);

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      const key = dragging.current;
      const box = boxRef.current;
      if (!key || !box || !onMove) return;

      const rect = box.getBoundingClientRect();
      // Clamped so a field can never be dragged off the page and lost.
      const x = Math.min(100, Math.max(0, ((event.clientX - rect.left) / rect.width) * 100));
      const y = Math.min(100, Math.max(0, ((event.clientY - rect.top) / rect.height) * 100));
      onMove(key, Math.round(x * 10) / 10, Math.round(y * 10) / 10);
    },
    [onMove],
  );

  const stopDrag = useCallback(() => {
    dragging.current = null;
  }, []);

  useEffect(() => {
    if (!onMove) return;
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopDrag);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopDrag);
    };
  }, [handlePointerMove, stopDrag, onMove]);

  const editable = Boolean(onMove);
  const values: Record<FieldKey, string> = {
    participantName: data.participantName,
    certificateNumber: data.certificateNumber,
  };

  return (
    <div
      ref={boxRef}
      className="relative w-full overflow-hidden rounded-xl border border-line bg-white shadow-soft"
      style={{ aspectRatio: `${page.width} / ${page.height}`, containerType: "inline-size" }}
    >
      {backgroundUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={backgroundUrl} alt="" className="absolute inset-0 size-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-canvas-deep/40 text-center text-sm text-muted">
          <span className="max-w-xs px-6">
            Belum ada desain. Unggah hasil rancangan Canva sebagai latar belakang.
          </span>
        </div>
      )}

      {(Object.keys(config.fields) as FieldKey[]).map((key) => {
        const field = config.fields[key];
        if (!field.enabled) return null;
        const isSelected = selected === key;

        return (
          <div
            key={key}
            role={editable ? "button" : undefined}
            tabIndex={editable ? 0 : undefined}
            aria-label={editable ? `Geser ${FIELD_LABEL[key]}` : undefined}
            onPointerDown={
              editable
                ? (event) => {
                    event.preventDefault();
                    dragging.current = key;
                    onSelect?.(key);
                  }
                : undefined
            }
            // Arrow keys nudge by 1%, so placement works without a mouse.
            onKeyDown={
              editable
                ? (event) => {
                    const step = event.shiftKey ? 5 : 1;
                    if (event.key === "ArrowLeft") onMove?.(key, field.x - step, field.y);
                    else if (event.key === "ArrowRight") onMove?.(key, field.x + step, field.y);
                    else if (event.key === "ArrowUp") onMove?.(key, field.x, field.y - step);
                    else if (event.key === "ArrowDown") onMove?.(key, field.x, field.y + step);
                    else return;
                    event.preventDefault();
                  }
                : undefined
            }
            className={`absolute ${editable ? "cursor-move select-none" : ""}`}
            style={{
              left: `${field.x}%`,
              top: `${field.y}%`,
              width: `${field.width}%`,
              transform: "translate(-50%, -50%)",
              fontSize: `${(field.fontSize / page.width) * 100}cqw`,
              fontWeight: field.fontWeight,
              fontFamily: field.fontFamily || undefined,
              color: field.color,
              textAlign: field.align,
              lineHeight: 1.2,
              outline: isSelected ? "2px dashed rgba(217,58,43,0.9)" : undefined,
              outlineOffset: 4,
            }}
          >
            {fieldText(field, values[key])}
          </div>
        );
      })}
    </div>
  );
}
