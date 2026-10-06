/**
 * Registration pricing engine — pure functions, no UI, no network. Mirrors
 * the client's 5-condition notes (Personal / Sibling / Group / Affiliate /
 * Voucher) as configurable numbers so a rule change (e.g. sibling discount
 * moving to a flat Rp5.000 instead of per-child) never touches a component.
 *
 * The base discount mode is auto-detected from the registration itself
 * (child count, whether a valid affiliate code was used) — never picked by
 * hand — and exactly one applies. A voucher, if valid, is then layered on
 * top of that result. This is deliberately not stacked further (see PRD
 * notes: "jangan menggabungkan Sibling + Group + Voucher secara otomatis").
 */

export type RegistrationPricingType = "PERSONAL" | "SIBLING" | "GROUP" | "AFFILIATE";

export interface PricingConfig {
  /** Rp per child, applied when a submission has 2+ children. */
  siblingDiscountPerChild: number;
  /** A submission needs at least this many children to price as GROUP. */
  groupMinChildren: number;
  /** Rp per child, applied at GROUP (and AFFILIATE, which uses GROUP pricing). */
  groupDiscountPerChild: number;
}

/**
 * Fallback rules. The live numbers are edited in the admin (Pengaturan →
 * Diskon) and stored in `site_settings.pricing`; these are what the site
 * prices with when that row is missing or unreadable, so a settings outage
 * can never produce a free registration.
 */
export const PRICING_CONFIG: PricingConfig = {
  siblingDiscountPerChild: 5_000,
  groupMinChildren: 5,
  groupDiscountPerChild: 10_000,
};

export interface VoucherDefinition {
  code: string;
  type: "FIXED" | "PERCENTAGE";
  value: number;
  /** Caps a PERCENTAGE voucher in rupiah. null/undefined = no cap. */
  maxDiscount?: number | null;
  description?: string;
}

export interface PricingInput {
  /** The event's real internal price — used even when priceDisplay is HIDDEN. */
  eventPrice: number;
  childrenCount: number;
  /** Set once an affiliate code has been looked up and found ACTIVE. */
  hasActiveAffiliate?: boolean;
  affiliateCode?: string;
  /**
   * Already validated by the server (`find_voucher`). The browser never holds
   * the voucher catalogue, so an unknown code simply never reaches here.
   */
  voucher?: VoucherDefinition | null;
  /** Set when the admin's rules differ from PRICING_CONFIG. */
  config?: PricingConfig;
}

export interface PricingVoucherResult {
  code: string;
  label: string;
  amount: number;
}

export interface PricingResult {
  registrationType: RegistrationPricingType;
  unitPrice: number;
  childrenCount: number;
  /** `unitPrice * childrenCount`, before any discount. */
  subtotal: number;
  discountLabel: string | null;
  discountAmount: number;
  voucher: PricingVoucherResult | null;
  /** Set when a voucher code was entered but the server rejected it. */
  voucherError: string | null;
  /** `subtotal - discountAmount - (voucher?.amount ?? 0)`, floored at 0. */
  total: number;
}

function resolveBaseType(
  input: PricingInput,
  config: PricingConfig,
): RegistrationPricingType {
  if (input.hasActiveAffiliate) return "AFFILIATE";
  if (input.childrenCount >= config.groupMinChildren) return "GROUP";
  if (input.childrenCount >= 2) return "SIBLING";
  return "PERSONAL";
}

export function calculateRegistrationPrice(input: PricingInput): PricingResult {
  const childrenCount = Math.max(0, input.childrenCount);
  const unitPrice = Math.max(0, input.eventPrice);
  const subtotal = unitPrice * childrenCount;
  const config = input.config ?? PRICING_CONFIG;
  const registrationType = resolveBaseType({ ...input, childrenCount }, config);

  let discountLabel: string | null = null;
  let discountAmount = 0;

  if (registrationType === "SIBLING") {
    discountLabel = "Diskon Sibling";
    discountAmount = config.siblingDiscountPerChild * childrenCount;
  } else if (registrationType === "GROUP" || registrationType === "AFFILIATE") {
    discountLabel = registrationType === "GROUP" ? "Diskon Group" : "Diskon Affiliate";
    discountAmount = config.groupDiscountPerChild * childrenCount;
  }

  const afterBaseDiscount = Math.max(0, subtotal - discountAmount);

  let voucher: PricingVoucherResult | null = null;
  const match = input.voucher;
  if (match) {
    const raw =
      match.type === "FIXED"
        ? match.value
        : Math.round((afterBaseDiscount * match.value) / 100);
    const capped =
      match.type === "PERCENTAGE" && match.maxDiscount
        ? Math.min(raw, match.maxDiscount)
        : raw;
    voucher = {
      code: match.code,
      label: `Voucher ${match.code}`,
      amount: Math.min(capped, afterBaseDiscount),
    };
  }

  const total = Math.max(0, afterBaseDiscount - (voucher?.amount ?? 0));

  return {
    registrationType,
    unitPrice,
    childrenCount,
    subtotal,
    discountLabel,
    discountAmount,
    voucher,
    voucherError: null,
    total,
  };
}

/** `INV-YYYYMMDD-XXXX` — unique enough for a mock flow; a real backend would issue this instead. */
export function generateInvoiceNumber(date: Date = new Date()): string {
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `INV-${stamp}-${suffix}`;
}
