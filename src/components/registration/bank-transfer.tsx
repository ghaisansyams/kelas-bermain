"use client";

import { useState } from "react";
import { Check, Copy, Info, Landmark } from "lucide-react";
import { paymentAccounts } from "@/data/payment-accounts";
import { siteConfig, showWhatsapp } from "@/data/site";
import { buttonStyles } from "@/components/ui/button";
import { formatRupiah } from "@/lib/utils/format";

/**
 * Manual bank transfer instructions.
 *
 * Wording comes verbatim from the message the team already sends in
 * WhatsApp (PRD v2.0, R-04) — parents recognise it, and matching it means
 * the site and the chat never contradict each other.
 *
 * The amount is always the real total for this registration. The team's
 * template happens to quote Rp160.000 because that was one particular class;
 * hard-coding it would bill every other class wrongly.
 */
export function BankTransferPanel({
  amount,
  registrationNumber,
  eventTitle,
  childName,
}: {
  amount: number;
  registrationNumber: string;
  eventTitle: string;
  childName?: string;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      window.setTimeout(() => setCopied(null), 1800);
    } catch {
      // Clipboard can be blocked; the number is on screen either way.
    }
  }

  const proofMessage = [
    `Halo Kelas Bermain, saya sudah transfer untuk pendaftaran ${registrationNumber}`,
    childName ? ` atas nama ${childName}` : "",
    ` di kelas ${eventTitle}. Berikut bukti transfernya.`,
  ].join("");

  return (
    <div className="rounded-card border border-sun/30 bg-sun-soft/50 p-5 sm:p-6">
      <p className="text-[0.9375rem] leading-relaxed text-ink">
        Halo Bunda, terima kasih ya sudah melengkapi data pendaftarannya. 🤍
      </p>

      <h3 className="mt-5 flex items-center gap-2 text-base font-extrabold text-ink">
        <Landmark className="size-5 text-sun-dark" aria-hidden />
        Pembayaran
      </h3>

      <p className="mt-2.5 text-sm leading-relaxed text-ink-soft">
        Bunda dapat melakukan pembayaran sebesar{" "}
        <strong className="font-extrabold text-ink">{formatRupiah(amount)}</strong> ke
        rekening berikut:
      </p>

      <div className="mt-4 space-y-2.5">
        <p className="text-sm text-ink-soft">
          Atas Nama:{" "}
          <strong className="font-bold text-ink">{paymentAccounts[0]?.holder}</strong>
        </p>

        {paymentAccounts.map((account) => (
          <div
            key={account.number}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sun/25 bg-surface px-4 py-3"
          >
            <span className="min-w-0">
              <span className="block text-xs font-semibold text-muted">{account.bank}</span>
              <span className="block font-mono text-base font-extrabold tracking-tight text-ink">
                {account.number}
              </span>
            </span>
            <button
              type="button"
              onClick={() => copy(account.number)}
              className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-pill border border-line bg-canvas px-3.5 text-xs font-bold text-ink-soft transition-colors hover:border-brand/40 hover:text-brand"
            >
              {copied === account.number ? (
                <>
                  <Check className="size-3.5" aria-hidden />
                  Tersalin
                </>
              ) : (
                <>
                  <Copy className="size-3.5" aria-hidden />
                  Salin
                </>
              )}
            </button>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-xl border border-line bg-surface p-4">
        <p className="text-sm leading-relaxed text-ink-soft">
          Setelah melakukan pembayaran, mohon kirimkan bukti transfer sebagai konfirmasi
          agar kami dapat segera memproses pendaftaran Ananda dan mengamankan kuotanya. 🙏🏻
        </p>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Terima kasih banyak, Bunda. Kami tunggu konfirmasinya ya. Semoga Bunda dan Ananda
          bisa segera bergabung bersama kami di Kelas Bermain! 🥰✨
        </p>

        {showWhatsapp ? (
          <a
            href={`https://wa.me/${siteConfig.whatsappE164}?text=${encodeURIComponent(proofMessage)}`}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonStyles({ className: "mt-4 w-full sm:w-auto" })}
          >
            Kirim Bukti Transfer
          </a>
        ) : (
          <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-muted">
            <Info className="mt-px size-3.5 shrink-0" aria-hidden />
            Kirimkan bukti transfer ke kontak resmi Kelas Bermain, cantumkan nomor
            pendaftaran <span className="font-mono font-bold">{registrationNumber}</span>.
          </p>
        )}
      </div>
    </div>
  );
}
