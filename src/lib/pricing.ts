/**
 * Registration pricing engine — pure functions, no UI, no network. Mirrors
 * the client's 5-condition notes (Personal / Sibling / Group / Affiliate /
 * Voucher) as configurable numbers so a rule change (e.g. sibling discount
 * moving to a flat Rp5.000 instead of per-child) never touches a component.
 *
 * Diskon dasar ditentukan otomatis dari pendaftarannya sendiri, tidak pernah
 * dipilih manual, dan tepat satu yang berlaku: kalau ada kode affiliate aktif,
 * Affiliate (Rp10.000 per anak) dan itu MENGGANTIKAN diskon jumlah anak
 * (notulen rapat klien: "kalau 2 anak pakai kode affiliate, diskon +1 anak
 * Rp5.000 dihapus"). Tanpa kode, berlaku Personal, Sibling, atau Group menurut
 * jumlah anak. Voucher dihitung terakhir, di atas hasil tersebut.
 */

export type RegistrationPricingType = "PERSONAL" | "SIBLING" | "GROUP" | "AFFILIATE";

export interface PricingConfig {
  /** Rp per child, applied once a submission has `siblingMinChildren` or more children. */
  siblingDiscountPerChild: number;
  /** How many children (paying ones) it takes to earn the sibling discount. */
  siblingMinChildren: number;
  /** Rp per child when a valid affiliate code is used. Set apart from Group so each can change alone. */
  affiliateDiscountPerChild: number;
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
  siblingMinChildren: 2,
  affiliateDiscountPerChild: 10_000,
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
  /** Semua anak yang didaftarkan, termasuk yang gratis. */
  childrenCount: number;
  /**
   * Dari `childrenCount`, berapa yang gratis (di bawah 3 tahun dan datang
   * bersama anak yang membayar). Menentukan siapa yang ditagih; keputusan
   * siapa yang gratis ada di `freeChildFlags`.
   */
  freeChildrenCount?: number;
  /** Pendamping di luar yang mendaftar; masing-masing dikenai `extraCompanionPrice`. */
  extraCompanions?: number;
  /** Rp per pendamping tambahan, diatur per event di admin. 0 = gratis. */
  extraCompanionPrice?: number;
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

/** Satu baris potongan harga, untuk ditampilkan satu per satu. */
export interface PricingDiscountLine {
  label: string;
  amount: number;
}

export interface PricingResult {
  /** Diskon dasar yang berlaku: AFFILIATE kalau ada kode aktif, kalau tidak menurut jumlah anak. */
  registrationType: RegistrationPricingType;
  unitPrice: number;
  /** Semua anak, termasuk yang gratis. */
  childrenCount: number;
  freeChildrenCount: number;
  /** Anak yang ditagih: `childrenCount - freeChildrenCount`. */
  payingChildrenCount: number;
  /** `unitPrice * payingChildrenCount`, before any discount. */
  subtotal: number;
  /** Rincian potongan dasar (satu baris: Sibling, Group, atau Affiliate), tanpa voucher. */
  discounts: PricingDiscountLine[];
  /** Nama potongan digabung ("Diskon Sibling + Diskon Affiliate"); null kalau tidak ada. */
  discountLabel: string | null;
  /** Jumlah semua potongan di `discounts`. */
  discountAmount: number;
  voucher: PricingVoucherResult | null;
  /** Set when a voucher code was entered but the server rejected it. */
  voucherError: string | null;
  extraCompanions: number;
  extraCompanionPrice: number;
  /** `extraCompanions * extraCompanionPrice`, ditambahkan setelah diskon dan voucher. */
  extraCompanionTotal: number;
  /** `subtotal - discountAmount - voucher + extraCompanionTotal`, tidak pernah di bawah 0. */
  total: number;
}

function resolveBaseType(
  input: PricingInput,
  config: PricingConfig,
): RegistrationPricingType {
  // Diskon dihitung dari anak yang membayar. Balita gratis tidak membuat
  // keluarga "kakak-adik" atau "rombongan" kalau hanya satu anak yang ditagih.
  // Kode affiliate menggantikan diskon jumlah anak, bukan ditambahkan padanya.
  if (input.hasActiveAffiliate) return "AFFILIATE";
  if (input.childrenCount >= config.groupMinChildren) return "GROUP";
  if (input.childrenCount >= config.siblingMinChildren) return "SIBLING";
  return "PERSONAL";
}

export function calculateRegistrationPrice(input: PricingInput): PricingResult {
  const childrenCount = Math.max(0, input.childrenCount);
  const unitPrice = Math.max(0, input.eventPrice);
  // Setidaknya satu anak selalu membayar: gratis hanya berlaku bagi anak yang
  // dibawa bersama anak yang membayar.
  const freeChildrenCount = Math.min(
    Math.max(0, Math.floor(input.freeChildrenCount ?? 0)),
    Math.max(0, childrenCount - 1),
  );
  const payingChildrenCount = childrenCount - freeChildrenCount;
  const subtotal = unitPrice * payingChildrenCount;
  const config = input.config ?? PRICING_CONFIG;
  const registrationType = resolveBaseType(
    { ...input, childrenCount: payingChildrenCount },
    config,
  );

  const discounts: PricingDiscountLine[] = [];
  if (registrationType === "SIBLING") {
    discounts.push({
      label: "Diskon Sibling",
      amount: config.siblingDiscountPerChild * payingChildrenCount,
    });
  } else if (registrationType === "GROUP") {
    discounts.push({
      label: "Diskon Group",
      amount: config.groupDiscountPerChild * payingChildrenCount,
    });
  } else if (registrationType === "AFFILIATE") {
    discounts.push({
      label: "Diskon Affiliate",
      amount: config.affiliateDiscountPerChild * payingChildrenCount,
    });
  }
  const visible = discounts.filter((line) => line.amount > 0);
  const discountLabel = visible.length > 0 ? visible.map((line) => line.label).join(" + ") : null;
  // Potongan tidak pernah melebihi harga anaknya.
  const discountAmount = Math.min(subtotal, visible.reduce((sum, line) => sum + line.amount, 0));

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

  const extraCompanions = Math.max(0, Math.floor(input.extraCompanions ?? 0));
  const extraCompanionPrice = Math.max(0, input.extraCompanionPrice ?? 0);
  const extraCompanionTotal = extraCompanions * extraCompanionPrice;

  // Biaya pendamping tambahan tidak ikut didiskon: diskon sibling/group/voucher
  // adalah untuk anak, bukan untuk orang dewasa yang menemani.
  const total = Math.max(0, afterBaseDiscount - (voucher?.amount ?? 0)) + extraCompanionTotal;

  return {
    registrationType,
    unitPrice,
    childrenCount,
    freeChildrenCount,
    payingChildrenCount,
    subtotal,
    discounts: visible,
    discountLabel,
    discountAmount,
    voucher,
    voucherError: null,
    extraCompanions,
    extraCompanionPrice,
    extraCompanionTotal,
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
