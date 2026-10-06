"use client";

import { useState } from "react";
import { Card } from "@/components/admin/admin-ui";

export interface VoucherFormValues {
  code: string;
  description: string;
  type: "FIXED" | "PERCENTAGE";
  value: number;
  maxDiscount: number | null;
  maxUses: number | null;
  minChildren: number;
  eventId: string;
  validFrom: string;
  validUntil: string;
  status: "ACTIVE" | "INACTIVE";
}

const EMPTY: VoucherFormValues = {
  code: "",
  description: "",
  type: "FIXED",
  value: 0,
  maxDiscount: null,
  maxUses: null,
  minChildren: 1,
  eventId: "",
  validFrom: "",
  validUntil: "",
  status: "ACTIVE",
};

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
      {label}
      {children}
      {hint ? <span className="text-xs font-medium text-muted">{hint}</span> : null}
    </label>
  );
}

const inputClass =
  "h-11 w-full rounded-xl border border-line bg-surface px-3 text-[0.9375rem] font-medium text-ink";

/**
 * Create / edit one voucher. `type` drives which fields matter, so the
 * percentage cap only appears when it can actually do something.
 */
export function VoucherForm({
  action,
  initial,
  events,
  onCancel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  initial?: VoucherFormValues;
  events: { id: string; title: string }[];
  onCancel?: () => void;
}) {
  const start = initial ?? EMPTY;
  const [type, setType] = useState<"FIXED" | "PERCENTAGE">(start.type);
  const isEdit = Boolean(initial);

  return (
    <Card>
      <form action={action} className="space-y-4">
        <input type="hidden" name="isEdit" value={isEdit ? "1" : "0"} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kode voucher" hint="Huruf kapital, tanpa spasi. Mis. KELAS50">
            <input
              name="code"
              required
              defaultValue={start.code}
              readOnly={isEdit}
              className={`${inputClass} font-mono uppercase ${isEdit ? "bg-canvas-deep/40" : ""}`}
            />
          </Field>
          <Field label="Keterangan" hint="Hanya untuk tim, tidak tampil ke pendaftar.">
            <input name="description" defaultValue={start.description} className={inputClass} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Jenis potongan">
            <select
              name="type"
              value={type}
              onChange={(event) => setType(event.target.value as "FIXED" | "PERCENTAGE")}
              className={inputClass}
            >
              <option value="FIXED">Nominal (Rp)</option>
              <option value="PERCENTAGE">Persentase (%)</option>
            </select>
          </Field>
          <Field label={type === "FIXED" ? "Potongan (Rp)" : "Potongan (%)"}>
            <input
              name="value"
              type="number"
              min={1}
              max={type === "PERCENTAGE" ? 100 : undefined}
              required
              defaultValue={start.value || ""}
              className={inputClass}
            />
          </Field>
          {type === "PERCENTAGE" ? (
            <Field label="Maksimal potongan (Rp)" hint="Kosongkan bila tanpa batas.">
              <input
                name="maxDiscount"
                type="number"
                min={0}
                defaultValue={start.maxDiscount ?? ""}
                className={inputClass}
              />
            </Field>
          ) : (
            <div />
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Kuota pemakaian" hint="Kosongkan bila tidak dibatasi.">
            <input
              name="maxUses"
              type="number"
              min={1}
              defaultValue={start.maxUses ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label="Minimal jumlah anak">
            <input
              name="minChildren"
              type="number"
              min={1}
              defaultValue={start.minChildren}
              className={inputClass}
            />
          </Field>
          <Field label="Status">
            <select name="status" defaultValue={start.status} className={inputClass}>
              <option value="ACTIVE">Aktif</option>
              <option value="INACTIVE">Nonaktif</option>
            </select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Berlaku dari" hint="Kosongkan bila langsung berlaku.">
            <input
              name="validFrom"
              type="date"
              defaultValue={start.validFrom}
              className={inputClass}
            />
          </Field>
          <Field label="Berlaku sampai" hint="Kosongkan bila tanpa batas waktu.">
            <input
              name="validUntil"
              type="date"
              defaultValue={start.validUntil}
              className={inputClass}
            />
          </Field>
          <Field label="Khusus event">
            <select name="eventId" defaultValue={start.eventId} className={inputClass}>
              <option value="">Semua event</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-line pt-4">
          <button
            type="submit"
            className="inline-flex min-h-11 items-center rounded-pill bg-brand px-5 text-sm font-bold text-white"
          >
            {isEdit ? "Simpan Perubahan" : "Buat Voucher"}
          </button>
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex min-h-11 items-center rounded-pill border border-line px-5 text-sm font-semibold text-ink-soft hover:border-brand/40 hover:text-brand"
            >
              Batal
            </button>
          ) : null}
        </div>
      </form>
    </Card>
  );
}
