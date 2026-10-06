"use client";

import { useState } from "react";
import { Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/forms/field";
import type { PricingResult } from "@/lib/pricing";
import { formatRupiah } from "@/lib/utils/format";

/**
 * Tokopedia-style order summary: subtotal → discount → voucher → total, in
 * that visual weight, total always the most prominent line. Reused as-is on
 * the confirmation step (voucher editable) and the payment step (read-only
 * recap) — see `editable`.
 */
export function PricingSummary({
  pricing,
  isFree,
  editable = false,
  onApplyVoucher,
  voucherError,
  voucherChecking = false,
}: {
  pricing: PricingResult;
  isFree: boolean;
  editable?: boolean;
  onApplyVoucher?: (code: string) => void;
  /** Rejection message from the server-side validator. */
  voucherError?: string | null;
  voucherChecking?: boolean;
}) {
  const [voucherInput, setVoucherInput] = useState("");

  if (isFree) {
    return (
      <div className="rounded-card border border-line bg-surface p-5 sm:p-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
          Ringkasan Pembayaran
        </h3>
        <div className="mt-3 flex items-baseline justify-between">
          <span className="font-bold text-ink">Total</span>
          <span className="text-xl font-extrabold text-pine-dark">Gratis</span>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-card border border-line bg-surface p-5 sm:p-6">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
        Ringkasan Pembayaran
      </h3>

      <dl className="mt-3 space-y-2 text-sm">
        <Row label="Harga per anak" value={formatRupiah(pricing.unitPrice)} />
        <Row label="Jumlah peserta" value={`${pricing.childrenCount} anak`} />
        <Row label="Subtotal" value={formatRupiah(pricing.subtotal)} />
        {pricing.discountLabel ? (
          <Row
            label={pricing.discountLabel}
            value={`- ${formatRupiah(pricing.discountAmount)}`}
            tone="discount"
          />
        ) : null}
        {pricing.voucher ? (
          <Row
            label={pricing.voucher.label}
            value={`- ${formatRupiah(pricing.voucher.amount)}`}
            tone="discount"
          />
        ) : null}
      </dl>

      {editable ? (
        <div className="mt-4 border-t border-line pt-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
            <Ticket className="size-3.5 text-brand" aria-hidden />
            Punya voucher?
          </p>
          <div className="mt-2 flex gap-2">
            <TextInput
              id="voucherCode"
              aria-label="Kode voucher"
              placeholder="Masukkan kode voucher"
              value={voucherInput}
              onChange={(event) => setVoucherInput(event.target.value.toUpperCase())}
              className="flex-1"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => onApplyVoucher?.(voucherInput)}
              disabled={!voucherInput.trim() || voucherChecking}
            >
              {voucherChecking ? "Memeriksa…" : "Gunakan"}
            </Button>
          </div>
          {voucherError ?? pricing.voucherError ? (
            <p role="alert" className="mt-1.5 text-xs font-medium text-brand-ink">
              {voucherError ?? pricing.voucherError}
            </p>
          ) : null}
          {pricing.voucher ? (
            <p className="mt-1.5 text-xs font-semibold text-pine-dark">
              Voucher {pricing.voucher.code} dipakai.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
        <span className="font-bold text-ink">Total</span>
        <span className="text-xl font-extrabold text-brand">{formatRupiah(pricing.total)}</span>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "discount";
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className={tone === "discount" ? "font-semibold text-pine-dark" : "font-semibold text-ink"}>
        {value}
      </dd>
    </div>
  );
}
