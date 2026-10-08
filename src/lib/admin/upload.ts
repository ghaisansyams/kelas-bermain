import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  ALLOWED_MIME,
  formatFileSize,
  maxBytesFor,
  MEDIA_BUCKET,
  safeFileName,
} from "@/lib/admin/media";

/**
 * Uploads one file to Supabase Storage and records it in `media`.
 *
 * Extracted so the Media Library page and every image field in the CMS run
 * the same code — the validation, the storage path and the metadata row stay
 * identical no matter where the upload was started from.
 *
 * Runs with the admin's own session: the storage policies decide whether it
 * is allowed, so no service-role key is involved.
 */

export type UploadResult =
  | { ok: true; url: string; fileName: string }
  | { ok: false; error: string };

export async function uploadMediaFile(file: File, folder = "general"): Promise<UploadResult> {
  if (!ALLOWED_MIME.includes(file.type)) {
    return {
      ok: false,
      error: `"${file.name}" formatnya tidak didukung. Pakai JPG, PNG, WEBP, AVIF, GIF, MP4, atau WEBM.`,
    };
  }

  const limit = maxBytesFor(file.type);
  if (file.size > limit) {
    return {
      ok: false,
      error: `"${file.name}" terlalu besar (${formatFileSize(file.size)}). Maksimal ${formatFileSize(limit)}.`,
    };
  }

  const supabase = createSupabaseBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // A timestamp prefix keeps two files of the same name from colliding,
  // which `upsert: false` would otherwise reject outright.
  const path = `${folder}/${Date.now().toString(36)}-${safeFileName(file.name)}`;

  const { error: uploadError } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false });

  if (uploadError) {
    return { ok: false, error: `Unggah gagal. ${uploadError.message}` };
  }

  const { data: urlData } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);

  const { error: insertError } = await supabase.from("media").insert({
    file_name: file.name,
    storage_path: path,
    public_url: urlData.publicUrl,
    mime_type: file.type,
    file_size: file.size,
    folder,
    created_by: user?.id ?? null,
  });

  if (insertError) {
    // The file is already in storage; recording it failed. Return the URL
    // anyway so the admin's work is not lost — it just will not appear in
    // the Media Library listing until re-uploaded.
    return { ok: true, url: urlData.publicUrl, fileName: file.name };
  }

  return { ok: true, url: urlData.publicUrl, fileName: file.name };
}
