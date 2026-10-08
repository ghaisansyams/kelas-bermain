"use client";

import { useState } from "react";
import { MousePointer2 } from "lucide-react";
import { MediaPicker } from "@/components/admin/media-picker";
import { TemplateCanvas } from "@/components/certificate/template-canvas";
import {
  defaultConfig,
  FIELD_LABEL,
  FONT_CHOICES,
  normaliseConfig,
  SAMPLE_DATA,
  type CertificateTemplate,
  type FieldKey,
  type PlacedField,
} from "@/lib/cms/certificate-template";

const inputClass =
  "h-10 w-full rounded-lg border border-line bg-surface px-2.5 text-sm font-medium text-ink";

/**
 * Certificate designer.
 *
 * The finished artwork comes from Canva and is uploaded as the background.
 * All this does is place two values on top of it: the child's name and the
 * certificate number. Nothing else is editable here, because everything else
 * already lives in the uploaded design — adding text boxes on top of a
 * finished layout is what produced the overlapping mess before.
 */
export function CertificateDesigner({
  template,
  events,
  action,
}: {
  template: CertificateTemplate | null;
  events: { id: string; title: string }[];
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [name, setName] = useState(template?.name ?? "");
  const [description, setDescription] = useState(template?.description ?? "");
  const [backgroundUrl, setBackgroundUrl] = useState(template?.backgroundUrl ?? "");
  const [orientation, setOrientation] = useState<"LANDSCAPE" | "PORTRAIT">(
    template?.orientation ?? "LANDSCAPE",
  );
  const [status, setStatus] = useState(template?.status ?? "DRAFT");
  const [config, setConfig] = useState(
    template ? normaliseConfig(template.config) : defaultConfig(),
  );
  const [selected, setSelected] = useState<FieldKey>("participantName");

  const field = config.fields[selected];

  function patch(key: FieldKey, changes: Partial<PlacedField>) {
    setConfig((current) => ({
      ...current,
      fields: { ...current.fields, [key]: { ...current.fields[key], ...changes } },
    }));
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="templateId" value={template?.id ?? ""} />
      <input type="hidden" name="config" value={JSON.stringify(config)} />
      <input type="hidden" name="backgroundUrl" value={backgroundUrl} />

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-3">
          <TemplateCanvas
            config={config}
            backgroundUrl={backgroundUrl}
            orientation={orientation}
            data={SAMPLE_DATA}
            selected={selected}
            onSelect={setSelected}
            onMove={(key, x, y) => patch(key, { x, y })}
          />

          <p className="flex items-start gap-1.5 text-xs leading-relaxed text-muted">
            <MousePointer2 className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            Seret nama atau nomor langsung di atas desain untuk memindahkannya. Bisa juga pakai
            tombol panah setelah diklik — tahan Shift untuk langkah lebih besar. Contoh memakai
            data dummy; saat sertifikat asli dibuat, isinya diambil dari data peserta.
          </p>

          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(config.fields) as FieldKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(key)}
                className={`inline-flex min-h-9 items-center rounded-pill px-3 text-xs font-bold transition-colors ${
                  selected === key
                    ? "bg-brand text-white"
                    : "border border-line text-ink-soft hover:border-brand/40"
                }`}
              >
                {FIELD_LABEL[key]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-3 rounded-xl border border-line p-3">
            <h4 className="text-sm font-extrabold text-ink">Desain dari Canva</h4>
            <p className="text-xs leading-relaxed text-muted">
              Rancang sertifikat lengkap di Canva — bingkai, logo, tanda tangan, dan tulisan
              &ldquo;atas partisipasinya dalam…&rdquo;. Ekspor sebagai PNG atau JPG ukuran A4,
              lalu unggah di sini. Sisakan ruang kosong untuk nama anak.
            </p>
            <MediaPicker
              value={backgroundUrl}
              onChange={(url) => setBackgroundUrl(url)}
              folder="certificate"
            />
            {backgroundUrl ? (
              <button
                type="button"
                onClick={() => setBackgroundUrl("")}
                className="text-xs font-semibold text-muted hover:text-brand"
              >
                Hapus desain
              </button>
            ) : null}
          </div>

          <div className="space-y-3 rounded-xl border border-line p-3">
            <h4 className="text-sm font-extrabold text-ink">Template</h4>

            <Field label="Nama template">
              <input
                name="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                placeholder="Sertifikat Decorate Mini Cake"
                className={inputClass}
              />
            </Field>

            <Field label="Untuk kegiatan">
              <select
                value={config.eventId}
                onChange={(event) =>
                  setConfig((current) => ({ ...current, eventId: event.target.value }))
                }
                className={inputClass}
              >
                <option value="">Semua kegiatan</option>
                {events.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-xs text-muted">
                Dipakai otomatis saat menerbitkan sertifikat kegiatan itu.
              </span>
            </Field>

            <Field label="Keterangan">
              <input
                name="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className={inputClass}
              />
            </Field>

            <div className="grid grid-cols-2 gap-2">
              <Field label="Orientasi">
                <select
                  name="orientation"
                  value={orientation}
                  onChange={(event) =>
                    setOrientation(event.target.value as "LANDSCAPE" | "PORTRAIT")
                  }
                  className={inputClass}
                >
                  <option value="LANDSCAPE">A4 Mendatar</option>
                  <option value="PORTRAIT">A4 Tegak</option>
                </select>
              </Field>
              <Field label="Status">
                <select
                  name="status"
                  value={status}
                  onChange={(event) =>
                    setStatus(event.target.value as "DRAFT" | "PUBLISHED" | "ARCHIVED")
                  }
                  className={inputClass}
                >
                  <option value="DRAFT">Draf</option>
                  <option value="PUBLISHED">Terbit</option>
                  <option value="ARCHIVED">Diarsipkan</option>
                </select>
              </Field>
            </div>
          </div>

          <div className="space-y-3 rounded-xl border border-line p-3">
            <h4 className="text-sm font-extrabold text-ink">{FIELD_LABEL[selected]}</h4>

            <label className="flex items-center gap-2 text-xs font-semibold text-ink">
              <input
                type="checkbox"
                checked={field.enabled}
                onChange={(event) => patch(selected, { enabled: event.target.checked })}
                className="size-4 accent-brand"
              />
              Tampilkan di sertifikat
            </label>

            <Field label="Tulisan di depannya">
              <input
                value={field.prefix}
                onChange={(event) => patch(selected, { prefix: event.target.value })}
                placeholder={selected === "certificateNumber" ? "No. " : "(kosongkan)"}
                className={inputClass}
              />
            </Field>

            <div className="grid grid-cols-2 gap-2">
              <Num
                label="Kiri (%)"
                value={field.x}
                onChange={(value) => patch(selected, { x: value })}
              />
              <Num
                label="Atas (%)"
                value={field.y}
                onChange={(value) => patch(selected, { y: value })}
              />
              <Num
                label="Lebar (%)"
                value={field.width}
                onChange={(value) => patch(selected, { width: value })}
              />
              <Num
                label="Ukuran huruf"
                value={field.fontSize}
                onChange={(value) => patch(selected, { fontSize: value })}
              />
            </div>

            <Field label="Jenis huruf">
              <select
                value={field.fontFamily}
                onChange={(event) => patch(selected, { fontFamily: event.target.value })}
                className={inputClass}
              >
                {FONT_CHOICES.map((font) => (
                  <option key={font.label} value={font.value}>
                    {font.label}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-2">
              <Field label="Perataan">
                <select
                  value={field.align}
                  onChange={(event) =>
                    patch(selected, { align: event.target.value as PlacedField["align"] })
                  }
                  className={inputClass}
                >
                  <option value="left">Kiri</option>
                  <option value="center">Tengah</option>
                  <option value="right">Kanan</option>
                </select>
              </Field>
              <Field label="Ketebalan">
                <select
                  value={field.fontWeight}
                  onChange={(event) =>
                    patch(selected, { fontWeight: Number(event.target.value) })
                  }
                  className={inputClass}
                >
                  <option value={400}>Biasa</option>
                  <option value={600}>Tebal</option>
                  <option value={800}>Sangat tebal</option>
                </select>
              </Field>
            </div>

            <Field label="Warna">
              <input
                type="color"
                value={field.color}
                onChange={(event) => patch(selected, { color: event.target.value })}
                className="h-10 w-full cursor-pointer rounded-lg border border-line bg-surface p-1"
              />
            </Field>
          </div>

          <button
            type="submit"
            className="inline-flex min-h-11 w-full items-center justify-center rounded-pill bg-brand px-5 text-sm font-bold text-white"
          >
            {template ? "Simpan Template" : "Buat Template"}
          </button>
        </div>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold text-ink">
      {label}
      {children}
    </label>
  );
}

function Num({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold text-ink">
      {label}
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className={inputClass}
      />
    </label>
  );
}
