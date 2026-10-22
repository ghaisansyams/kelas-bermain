"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, MessageCircle, Upload } from "lucide-react";
import { buttonStyles } from "@/components/ui/button";
import { submitProof, uploadPaymentProof } from "@/lib/services/payment-proof";
import { paymentProofWhatsappUrl } from "@/lib/config/whatsapp";

/**
 * Unggah bukti transfer. Dipakai di dua tempat: langsung di langkah
 * Pembayaran milik wizard (begitu pendaftaran dan tagihan sudah ada), dan di
 * halaman status /payment/[token] untuk orang tua yang kembali lagi nanti.
 * Satu implementasi, supaya aturannya — hanya bisa ke WAITING_VERIFICATION,
 * tidak pernah ke PAID — tidak perlu dijaga dua kali di dua berkas berbeda.
 *
 * Mengunggah di sini otomatis terlihat di /admin/payments: keduanya membaca
 * dan menulis baris `payments` yang sama, tidak ada jalur terpisah yang
 * perlu disambungkan ke admin.
 */
export function ProofUploadPanel({
  accessToken,
  registrationNumber,
  companionName,
  childName,
  onSubmitted,
}: {
  accessToken: string;
  registrationNumber: string;
  companionName: string;
  childName: string;
  onSubmitted?: () => void;
}) {
  const [markingProof, setMarkingProof] = useState(false);
  const [proofError, setProofError] = useState<string | null>(null);
  // Berkas yang sudah dipilih tapi BELUM dikirim: orang tua bisa memeriksa
  // namanya dulu, supaya tidak salah kirim bukti.
  const [staged, setStaged] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  // Yang sudah terkirim; null + proofDone berarti "sudah kirim lewat WhatsApp".
  const [sentName, setSentName] = useState<string | null>(null);
  const [proofDone, setProofDone] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const proofInputRef = useRef<HTMLInputElement>(null);

  const proofWhatsappUrl = paymentProofWhatsappUrl({
    registrationNumber,
    companionName: companionName || "Orang tua",
    childName,
  });

  useEffect(() => {
    if (!staged || !staged.type.startsWith("image/")) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(staged);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [staged]);

  function handleProofFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setProofError(null);
    setStaged(file);
  }

  function clearStaged() {
    setStaged(null);
    setProofError(null);
    if (proofInputRef.current) proofInputRef.current.value = "";
  }

  async function handleSendStaged() {
    if (!staged || markingProof) return;

    setProofError(null);
    setMarkingProof(true);
    const result = await uploadPaymentProof(accessToken, staged);
    setMarkingProof(false);

    if (!result.ok) {
      setProofError(result.error);
      return;
    }
    setSentName(staged.name);
    setProofDone(true);
    setReplacing(false);
    clearStaged();
    onSubmitted?.();
  }

  async function handleProofSent() {
    if (markingProof) return;
    setProofError(null);
    setMarkingProof(true);
    const result = await submitProof(accessToken);
    setMarkingProof(false);
    if (!result.ok) {
      setProofError(result.error);
      return;
    }
    setProofDone(true);
    onSubmitted?.();
  }

  if (proofDone && !replacing) {
    return (
      <div className="rounded-card border border-pine/25 bg-pine-soft/50 p-5 sm:p-6">
        <h3 className="flex items-center gap-2 text-base font-extrabold text-ink">
          <Upload className="size-4 text-pine" aria-hidden />
          Bukti sudah kami terima
        </h3>
        {sentName ? (
          <p className="mt-2 text-sm text-ink">
            Berkas terkirim: <span className="font-mono font-bold break-all">{sentName}</span>
          </p>
        ) : (
          <p className="mt-2 text-sm text-ink">Bukti dikirim lewat WhatsApp.</p>
        )}
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Status pendaftaranmu sekarang menunggu diperiksa tim kami. Kami yang memastikan
          dananya masuk sebelum pendaftaran dinyatakan lunas.
        </p>
        <button
          type="button"
          onClick={() => setReplacing(true)}
          className="mt-3 text-sm font-bold text-brand hover:underline"
        >
          Salah kirim? Ganti bukti
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-card border border-brand/25 bg-brand-soft/35 p-5 sm:p-6">
      <h3 className="flex items-center gap-2 text-base font-extrabold text-ink">
        <Upload className="size-4 text-brand" aria-hidden />
        Sudah transfer? Kirim buktinya
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        Unggah foto atau tangkapan layar bukti transfer langsung di sini, atau kirim lewat
        WhatsApp kalau lebih mudah. Nomor pendaftaranmu sudah kami siapkan di pesannya.
      </p>

      <div className="mt-4 rounded-xl border border-dashed border-brand/40 bg-surface p-4">
        <label htmlFor="paymentProof" className="text-sm font-bold text-ink">
          {replacing ? "Pilih bukti pengganti" : "Unggah bukti transfer"}
        </label>
        <input
          ref={proofInputRef}
          id="paymentProof"
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          disabled={markingProof}
          onChange={(e) => handleProofFile(e.target.files)}
          className="mt-2 block w-full text-sm text-ink-soft file:mr-3 file:min-h-10 file:cursor-pointer file:rounded-pill file:border-0 file:bg-brand file:px-4 file:text-sm file:font-bold file:text-white disabled:opacity-60"
        />
        <p className="mt-2 text-xs text-muted">
          JPG, PNG, WEBP, atau PDF. Maksimal 5 MB. Hanya tim Kelas Bermain yang bisa melihat
          berkas ini.
        </p>

        {staged ? (
          <div className="mt-3 rounded-xl border border-line bg-canvas-deep/30 p-3">
            <p className="text-xs font-bold uppercase tracking-wider text-muted">
              Berkas yang akan dikirim
            </p>
            <div className="mt-2 flex items-center gap-3">
              {previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="Pratinjau bukti transfer"
                  className="size-16 shrink-0 rounded-lg border border-line object-cover"
                />
              ) : null}
              <div className="min-w-0">
                <p className="font-mono text-sm font-bold break-all text-ink">{staged.name}</p>
                <p className="text-xs text-muted">{(staged.size / 1024).toFixed(0)} KB</p>
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => void handleSendStaged()}
                disabled={markingProof}
                className={buttonStyles({ size: "lg", className: "w-full sm:w-auto" })}
              >
                {markingProof ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <Upload className="size-4" aria-hidden />
                )}
                Kirim Bukti
              </button>
              <button
                type="button"
                onClick={clearStaged}
                disabled={markingProof}
                className={buttonStyles({
                  variant: "secondary",
                  size: "lg",
                  className: "w-full sm:w-auto",
                })}
              >
                Ganti File
              </button>
            </div>
          </div>
        ) : null}
        {replacing && !staged ? (
          <button
            type="button"
            onClick={() => setReplacing(false)}
            className="mt-3 text-xs font-bold text-muted hover:underline"
          >
            Batal ganti
          </button>
        ) : null}
        {proofError ? (
          <p role="alert" className="mt-2 text-xs font-semibold text-brand-ink">
            {proofError}
          </p>
        ) : null}
      </div>

      <p className="mt-4 text-xs font-bold uppercase tracking-wider text-muted">
        Atau lewat WhatsApp
      </p>

      <div className="mt-2 flex flex-col gap-2.5 sm:flex-row">
        <a
          href={proofWhatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => void handleProofSent()}
          className={buttonStyles({ size: "lg", className: "w-full sm:w-auto" })}
        >
          <MessageCircle className="size-4" aria-hidden />
          Kirim Bukti via WhatsApp
        </a>
        <button
          type="button"
          onClick={() => void handleProofSent()}
          disabled={markingProof}
          className={buttonStyles({
            variant: "secondary",
            size: "lg",
            className: "w-full sm:w-auto",
          })}
        >
          {markingProof ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          Saya Sudah Kirim Bukti
        </button>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-muted">
        Setelah menekan salah satunya, status berubah jadi menunggu pemeriksaan. Tim kami
        yang memastikan dananya masuk sebelum pendaftaran dinyatakan lunas.
      </p>
    </div>
  );
}
