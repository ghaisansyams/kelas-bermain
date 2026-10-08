/**
 * Certificate template model.
 *
 * Deliberately small. The artwork — border, logo, signature, the wording
 * "atas partisipasinya dalam…" — is designed in Canva and uploaded as one
 * background image. The only things this CMS positions are the two values
 * that differ per child: their name and the certificate number.
 *
 * The earlier version let an admin add arbitrary text and image elements,
 * which produced exactly the problem reported: a Canva design underneath and
 * a pile of built-in headings on top of it, overlapping.
 */

export type FieldKey = "participantName" | "certificateNumber";

export interface PlacedField {
  /** Percentage of the page width/height, so it scales at any preview size. */
  x: number;
  y: number;
  /** Box width as a percentage of the page. */
  width: number;
  fontSize: number;
  fontWeight: number;
  color: string;
  align: "left" | "center" | "right";
  fontFamily: string;
  /** Hidden fields are simply not printed. */
  enabled: boolean;
  /** Text around the value, e.g. "No. " before the number. */
  prefix: string;
}

export interface TemplateConfig {
  /** Which event this template is for. Empty means it is the general one. */
  eventId: string;
  fields: Record<FieldKey, PlacedField>;
}

export interface CertificateTemplate {
  id: string;
  name: string;
  description: string;
  backgroundUrl: string;
  orientation: "LANDSCAPE" | "PORTRAIT";
  config: TemplateConfig;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  isDefault: boolean;
}

export const FIELD_LABEL: Record<FieldKey, string> = {
  participantName: "Nama peserta",
  certificateNumber: "Nomor sertifikat",
};

export const FONT_CHOICES = [
  { value: "", label: "Bawaan website" },
  { value: "Georgia, serif", label: "Georgia (serif)" },
  { value: "'Times New Roman', serif", label: "Times New Roman" },
  { value: "Arial, Helvetica, sans-serif", label: "Arial" },
  { value: "'Courier New', monospace", label: "Courier" },
];

/** A4 in millimetres, used only to keep the preview's aspect ratio right. */
export const PAGE_SIZE = {
  LANDSCAPE: { width: 297, height: 210 },
  PORTRAIT: { width: 210, height: 297 },
} as const;

export interface CertificateData {
  participantName: string;
  certificateNumber: string;
}

/** Shown in the designer before any real certificate exists. */
export const SAMPLE_DATA: CertificateData = {
  participantName: "Alya Putri",
  certificateNumber: "KB-2026-00001",
};

/**
 * Starting positions: name in the middle, number near the bottom left.
 * Both sit where most Canva certificate layouts leave space, but the admin
 * drags them to wherever their own design needs.
 */
export function defaultConfig(): TemplateConfig {
  return {
    eventId: "",
    fields: {
      participantName: {
        x: 50,
        y: 48,
        width: 70,
        fontSize: 42,
        fontWeight: 700,
        color: "#1a1a1a",
        align: "center",
        fontFamily: "",
        enabled: true,
        prefix: "",
      },
      certificateNumber: {
        x: 20,
        y: 88,
        width: 30,
        fontSize: 11,
        fontWeight: 400,
        color: "#555555",
        align: "left",
        fontFamily: "",
        enabled: true,
        prefix: "No. ",
      },
    },
  };
}

/** Fills in anything a stored config is missing, so an older row still opens. */
export function normaliseConfig(value: unknown): TemplateConfig {
  const base = defaultConfig();
  if (!value || typeof value !== "object") return base;

  const raw = value as Record<string, unknown>;
  const fields = (raw.fields ?? {}) as Record<string, unknown>;

  const merge = (key: FieldKey): PlacedField => {
    const stored = fields[key];
    if (!stored || typeof stored !== "object") return base.fields[key];
    return { ...base.fields[key], ...(stored as Partial<PlacedField>) };
  };

  return {
    eventId: typeof raw.eventId === "string" ? raw.eventId : "",
    fields: {
      participantName: merge("participantName"),
      certificateNumber: merge("certificateNumber"),
    },
  };
}

export function fieldText(field: PlacedField, value: string): string {
  return `${field.prefix}${value}`;
}
