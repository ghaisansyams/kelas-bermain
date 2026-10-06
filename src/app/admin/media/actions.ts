"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { MEDIA_BUCKET } from "@/lib/admin/media";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function deleteMediaAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const storagePath = String(formData.get("storagePath") ?? "");
  if (!id || !storagePath) redirect("/admin/media?status=error");

  const supabase = await createSupabaseServerClient();
  const { error: storageError } = await supabase.storage.from(MEDIA_BUCKET).remove([storagePath]);
  if (storageError) redirect("/admin/media?status=error");

  const { error } = await supabase.from("media").delete().eq("id", id);
  if (error) redirect("/admin/media?status=error");

  await supabase.from("activity_logs").insert({
    action: "DELETE",
    entity: "media",
    entity_id: id,
    old_value: { storagePath } as never,
  });

  revalidatePath("/admin/media");
  redirect("/admin/media?status=deleted");
}

export async function updateAltTextAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const altText = String(formData.get("altText") ?? "").trim();
  if (!id) redirect("/admin/media?status=error");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("media").update({ alt_text: altText }).eq("id", id);
  if (error) redirect("/admin/media?status=error");

  revalidatePath("/admin/media");
  redirect("/admin/media?status=saved");
}
