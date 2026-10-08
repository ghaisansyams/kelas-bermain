/**
 * Ready-made palettes.
 *
 * Every pair that carries text was checked against WCAG AA before being
 * listed here (see scripts/check-contrast.mjs): body text on its background
 * is at least 4.5:1, and the brand colour on white is at least 4.5:1 so
 * buttons and links stay readable. Picking a preset can therefore never
 * produce text somebody cannot read — which is why the admin gets presets
 * rather than a free colour picker for the whole site.
 */

export interface ThemePreset {
  id: string;
  label: string;
  description: string;
  /** Swatches shown in the admin, left to right. */
  swatches: string[];
  values: Record<string, string>;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "default",
    label: "Kelas Bermain",
    description: "Palet bawaan: merah bata hangat dengan latar krem lembut.",
    swatches: ["#d93a2b", "#8c2318", "#fdfaf6", "#1f1a17"],
    // Empty strings mean "use the stylesheet's own value", so the default
    // preset restores the shipped look rather than hardcoding a copy of it.
    values: {
      brand: "",
      brandInk: "",
      accent: "",
      canvas: "",
      surface: "",
      ink: "",
      muted: "",
      line: "",
      radiusButton: "",
      radiusCard: "",
    },
  },
  {
    id: "warm",
    label: "Hangat",
    description: "Oranye terakota dengan latar pasir. Terasa ramah dan cerah.",
    swatches: ["#b4451f", "#7a2d13", "#fdf6ef", "#241a14"],
    values: {
      brand: "#b4451f",
      brandInk: "#7a2d13",
      accent: "#b4451f",
      canvas: "#fdf6ef",
      surface: "#ffffff",
      ink: "#241a14",
      muted: "#6b5a4e",
      line: "#e6d9cb",
      radiusButton: "999px",
      radiusCard: "20px",
    },
  },
  {
    id: "minimal",
    label: "Minimal",
    description: "Abu netral dengan aksen biru tua. Tenang dan tidak ramai.",
    swatches: ["#1d4ed8", "#1e3a8a", "#fafafa", "#18181b"],
    values: {
      brand: "#1d4ed8",
      brandInk: "#1e3a8a",
      accent: "#1d4ed8",
      canvas: "#fafafa",
      surface: "#ffffff",
      ink: "#18181b",
      muted: "#5c5c66",
      line: "#e4e4e7",
      radiusButton: "12px",
      radiusCard: "14px",
    },
  },
  {
    id: "playful",
    label: "Ceria",
    description: "Ungu dengan latar lavender muda. Paling cocok untuk anak.",
    swatches: ["#7c3aed", "#5b21b6", "#faf7ff", "#1e1b2e"],
    values: {
      brand: "#7c3aed",
      brandInk: "#5b21b6",
      accent: "#7c3aed",
      canvas: "#faf7ff",
      surface: "#ffffff",
      ink: "#1e1b2e",
      muted: "#5f5a70",
      line: "#e6e0f2",
      radiusButton: "999px",
      radiusCard: "24px",
    },
  },
];

export function findThemePreset(id: string): ThemePreset | undefined {
  return THEME_PRESETS.find((preset) => preset.id === id);
}
