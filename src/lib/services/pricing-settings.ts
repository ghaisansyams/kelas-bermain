/**
 * Discount rules, read from `site_settings.pricing` so the team can change
 * them in the admin without a deploy. Every failure path falls back to the
 * shipped `PRICING_CONFIG` — a settings outage must never price a
 * registration at zero.
 */

import { PRICING_CONFIG, type PricingConfig } from "@/lib/pricing";
import { getSupabase } from "@/lib/supabase/client";

function coerce(value: unknown): PricingConfig {
  if (!value || typeof value !== "object") return PRICING_CONFIG;
  const raw = value as Record<string, unknown>;
  const num = (key: keyof PricingConfig): number => {
    const parsed = Number(raw[key]);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : PRICING_CONFIG[key];
  };
  return {
    siblingDiscountPerChild: num("siblingDiscountPerChild"),
    groupMinChildren: Math.max(2, Math.round(num("groupMinChildren"))),
    groupDiscountPerChild: num("groupDiscountPerChild"),
  };
}

export async function getPricingConfig(): Promise<PricingConfig> {
  try {
    const { data, error } = await getSupabase().rpc("get_site_setting", { p_key: "pricing" });
    if (error || !data) return PRICING_CONFIG;
    return coerce(data);
  } catch {
    return PRICING_CONFIG;
  }
}
