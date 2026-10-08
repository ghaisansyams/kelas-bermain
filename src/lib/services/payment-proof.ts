"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { getSupabase } from "@/lib/supabase/client";

/**
 * A parent handing in proof of transfer.
 *
 * This can only move a payment to WAITING_VERIFICATION — never to PAID.
 * Letting the browser settle its own payment would turn "I transferred" into
 * "I typed one network request", which is exactly the fraud a shared
 * database would actually expose money to. An admin decides.
 *
 * The file goes to a private bucket. Only an admin can read it back, so a
 * screenshot of someone's banking app never becomes a public URL.
 */

const BUCKET = "bukti-pembayaran";
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export type ProofResult = { ok: true } | { ok: false; error: string };

export async function uploadPaymentProof(token: string, file: File): Promise<ProofResult> {
  if (!ALLOWED.includes(file.type)) {
    return { ok: false, error: "Kirim foto (JPG, PNG, WEBP) atau PDF." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "Ukuran berkas maksimal 5 MB." };
  }

  try {
    const supabase = createSupabaseBrowserClient();
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    // Named by the registration's own random token, so one upload cannot
    // overwrite another and the path is not guessable.
    const path = `bukti/${token}-${Date.now().toString(36)}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (uploadError) {
      return { ok: false, error: "Berkas gagal diunggah. Coba lagi atau kirim lewat WhatsApp." };
    }

    return await submitProof(token, path);
  } catch {
    return { ok: false, error: "Berkas gagal diunggah. Coba lagi atau kirim lewat WhatsApp." };
  }
}

/** Records the claim without a file — used by "Saya sudah kirim lewat WhatsApp". */
export async function submitProof(token: string, proofPath?: string): Promise<ProofResult> {
  try {
    const { data, error } = await getSupabase().rpc("submit_payment_proof", {
      p_token: token,
      p_proof_url: proofPath ?? null,
      p_note: proofPath
        ? "Bukti diunggah lewat halaman pembayaran."
        : "Pendaftar menyatakan bukti dikirim lewat WhatsApp.",
    });

    if (error || !data || typeof data !== "object" || (data as { ok?: boolean }).ok !== true) {
      return { ok: false, error: "Status belum bisa diperbarui. Coba muat ulang halaman." };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Status belum bisa diperbarui. Coba muat ulang halaman." };
  }
}
