/**
 * Per-section presentation, chosen from presets only.
 *
 * The admin never types a pixel value. Every option here maps to a class the
 * stylesheet already defines, so a content change cannot produce a layout the
 * designer never checked — which is the whole reason the brief rules out
 * arbitrary width, font-size, margin and position (§13).
 */

export interface SectionPresentation {
  spacing?: "compact" | "normal" | "relaxed";
  container?: "standard" | "wide" | "full";
  backgroundType?: "none" | "color" | "gradient" | "image";
  backgroundColor?: string;
  gradientFrom?: string;
  gradientTo?: string;
  gradientDirection?: "to bottom" | "to right" | "to bottom right";
  backgroundImage?: string;
  backgroundPosition?: "center" | "top" | "bottom" | "left" | "right";
  overlay?: "none" | "light" | "dark";
}

export const SPACING_CLASS: Record<string, string> = {
  compact: "py-8 sm:py-10",
  normal: "",
  relaxed: "py-20 sm:py-28",
};

export const CONTAINER_CLASS: Record<string, string> = {
  standard: "",
  wide: "[&_.kb-container]:max-w-[88rem]",
  full: "[&_.kb-container]:max-w-none",
};

export const OVERLAY_CLASS: Record<string, string> = {
  none: "",
  light: "before:absolute before:inset-0 before:bg-white/60 before:content-['']",
  dark: "before:absolute before:inset-0 before:bg-ink/55 before:content-['']",
};

/** Wrapper classes for one section. Returns "" when nothing was configured. */
export function presentationClass(presentation?: SectionPresentation): string {
  if (!presentation) return "";
  const parts: string[] = [];

  const spacing = SPACING_CLASS[presentation.spacing ?? "normal"];
  if (spacing) parts.push(spacing);

  const container = CONTAINER_CLASS[presentation.container ?? "standard"];
  if (container) parts.push(container);

  const type = presentation.backgroundType ?? "none";
  if (type !== "none") parts.push("relative isolate");
  if (type === "image") {
    parts.push("bg-cover bg-no-repeat");
    const overlay = OVERLAY_CLASS[presentation.overlay ?? "none"];
    if (overlay) parts.push(overlay, "[&>*]:relative [&>*]:z-10");
  }

  return parts.join(" ");
}

/** Inline style for the colour values, which cannot be class names. */
export function presentationStyle(
  presentation?: SectionPresentation,
): React.CSSProperties | undefined {
  if (!presentation) return undefined;
  const style: React.CSSProperties = {};

  switch (presentation.backgroundType) {
    case "color":
      if (presentation.backgroundColor) style.backgroundColor = presentation.backgroundColor;
      break;
    case "gradient":
      if (presentation.gradientFrom && presentation.gradientTo) {
        const direction = presentation.gradientDirection ?? "to bottom";
        style.backgroundImage = `linear-gradient(${direction}, ${presentation.gradientFrom}, ${presentation.gradientTo})`;
      }
      break;
    case "image":
      if (presentation.backgroundImage) {
        // url() is quoted so a crafted filename cannot close the declaration
        // and inject another CSS property.
        style.backgroundImage = `url("${presentation.backgroundImage.replace(/["\\]/g, "")}")`;
        style.backgroundPosition = presentation.backgroundPosition ?? "center";
      }
      break;
    default:
      break;
  }

  return Object.keys(style).length > 0 ? style : undefined;
}

export function toPresentation(value: unknown): SectionPresentation {
  if (!value || typeof value !== "object") return {};
  return value as SectionPresentation;
}
