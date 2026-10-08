"use client";

import { useState } from "react";
import { MediaPicker } from "@/components/admin/media-picker";
import type { SectionPresentation } from "@/lib/cms/presentation";

const selectClass =
  "h-10 w-full rounded-lg border border-line bg-surface px-2.5 text-sm font-medium text-ink";

/**
 * Background and spacing, chosen from presets.
 *
 * There is no free pixel, font-size or margin input anywhere here. That is
 * deliberate: it is the one rule that keeps an admin from producing a layout
 * that breaks on a phone (§13, §15).
 */
export function PresentationEditor({
  pageKey,
  sectionKey,
  tab,
  value,
  action,
}: {
  pageKey: string;
  sectionKey: string;
  tab: string;
  value: SectionPresentation;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [type, setType] = useState(value.backgroundType ?? "none");
  const [image, setImage] = useState(value.backgroundImage ?? "");

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="pageKey" value={pageKey} />
      <input type="hidden" name="sectionKey" value={sectionKey} />
      <input type="hidden" name="tab" value={tab} />
      <input type="hidden" name="backgroundImage" value={image} />

      <div className="grid grid-cols-2 gap-2">
        <Field label="Jarak atas–bawah">
          <select name="spacing" defaultValue={value.spacing ?? "normal"} className={selectClass}>
            <option value="compact">Rapat</option>
            <option value="normal">Normal</option>
            <option value="relaxed">Lega</option>
          </select>
        </Field>
        <Field label="Lebar isi">
          <select name="container" defaultValue={value.container ?? "standard"} className={selectClass}>
            <option value="standard">Standar</option>
            <option value="wide">Lebar</option>
            <option value="full">Penuh</option>
          </select>
        </Field>
      </div>

      <Field label="Latar belakang">
        <select
          name="backgroundType"
          value={type}
          onChange={(event) => setType(event.target.value as typeof type)}
          className={selectClass}
        >
          <option value="none">Tanpa latar</option>
          <option value="color">Warna polos</option>
          <option value="gradient">Gradasi</option>
          <option value="image">Gambar</option>
        </select>
      </Field>

      {type === "color" ? (
        <Field label="Warna latar">
          <input
            type="color"
            name="backgroundColor"
            defaultValue={value.backgroundColor || "#ffffff"}
            className="h-10 w-full cursor-pointer rounded-lg border border-line bg-surface p-1"
          />
        </Field>
      ) : null}

      {type === "gradient" ? (
        <div className="grid grid-cols-2 gap-2">
          <Field label="Warna awal">
            <input
              type="color"
              name="gradientFrom"
              defaultValue={value.gradientFrom || "#ffffff"}
              className="h-10 w-full cursor-pointer rounded-lg border border-line bg-surface p-1"
            />
          </Field>
          <Field label="Warna akhir">
            <input
              type="color"
              name="gradientTo"
              defaultValue={value.gradientTo || "#f5f5f5"}
              className="h-10 w-full cursor-pointer rounded-lg border border-line bg-surface p-1"
            />
          </Field>
          <div className="col-span-2">
            <Field label="Arah gradasi">
              <select
                name="gradientDirection"
                defaultValue={value.gradientDirection ?? "to bottom"}
                className={selectClass}
              >
                <option value="to bottom">Atas ke bawah</option>
                <option value="to right">Kiri ke kanan</option>
                <option value="to bottom right">Diagonal</option>
              </select>
            </Field>
          </div>
        </div>
      ) : null}

      {type === "image" ? (
        <div className="space-y-2">
          <Field label="Gambar latar">
            <MediaPicker value={image} onChange={(url) => setImage(url)} folder="home" />
          </Field>
          {image ? (
            <button
              type="button"
              onClick={() => setImage("")}
              className="text-xs font-semibold text-muted hover:text-brand"
            >
              Hapus gambar latar
            </button>
          ) : null}
          <div className="grid grid-cols-2 gap-2">
            <Field label="Posisi gambar">
              <select
                name="backgroundPosition"
                defaultValue={value.backgroundPosition ?? "center"}
                className={selectClass}
              >
                <option value="center">Tengah</option>
                <option value="top">Atas</option>
                <option value="bottom">Bawah</option>
                <option value="left">Kiri</option>
                <option value="right">Kanan</option>
              </select>
            </Field>
            <Field label="Lapisan gelap/terang">
              <select name="overlay" defaultValue={value.overlay ?? "none"} className={selectClass}>
                <option value="none">Tanpa lapisan</option>
                <option value="light">Terang</option>
                <option value="dark">Gelap</option>
              </select>
            </Field>
          </div>
        </div>
      ) : null}

      <button
        type="submit"
        className="inline-flex min-h-10 w-full items-center justify-center rounded-pill border border-line px-4 text-sm font-bold text-ink hover:border-brand/40 hover:text-brand"
      >
        Simpan Tampilan Section
      </button>
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
