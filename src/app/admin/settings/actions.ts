"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logActivity } from "@/lib/admin/activity";
import { requireAdmin } from "@/lib/admin/auth";
import { PRICING_CONFIG } from "@/lib/pricing";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function positive(formData: FormData, key: string, fallback: number): number {
  const value = Number(String(formData.get(key) ?? "").trim());
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

/**
 * Writes the discount rules the pricing engine reads. Nothing here can make a
 * registration free by itself — the engine floors every total at zero and
 * falls back to PRICING_CONFIG if this row ever goes missing.
 */
export async function savePricingSettingsAction(formData: FormData) {
  await requireAdmin();

  const value = {
    siblingDiscountPerChild: positive(
      formData,
      "siblingDiscountPerChild",
      PRICING_CONFIG.siblingDiscountPerChild,
    ),
    groupMinChildren: Math.max(
      2,
      Math.round(positive(formData, "groupMinChildren", PRICING_CONFIG.groupMinChildren)),
    ),
    groupDiscountPerChild: positive(
      formData,
      "groupDiscountPerChild",
      PRICING_CONFIG.groupDiscountPerChild,
    ),
  };

  const supabase = await createSupabaseServerClient();
  const { data: before } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "pricing")
    .maybeSingle();

  const { error } = await supabase
    .from("site_settings")
    .upsert({ key: "pricing", value, updated_at: new Date().toISOString() }, { onConflict: "key" });

  if (error) redirect("/admin/settings?status=error");

  await logActivity(
    "UPDATE_PRICING",
    "site_settings",
    "pricing",
    (before as { value: unknown } | null)?.value ?? null,
    value,
  );

  // The register page prices from this, so every event's form must refresh.
  revalidatePath("/admin/settings");
  revalidatePath("/register", "layout");
  redirect("/admin/settings?status=saved");
}
