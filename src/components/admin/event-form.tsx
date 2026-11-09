"use client";

import { useEffect, useState } from "react";
import { ImageDropArea } from "@/components/admin/image-drop-area";
import { MediaPicker } from "@/components/admin/media-picker";
import { Card } from "@/components/admin/admin-ui";
import {
  AboutImagesInput,
  AgendaInput,
  ListInput,
  type AboutImageDraft,
  type AgendaDraft,
} from "@/components/admin/event-list-inputs";
import { Field, Select, TextArea, TextInput } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { EVENT_STATUSES } from "@/lib/services/event-mapper";
import { EVENT_CATEGORIES } from "@/lib/types";

export interface EventFormValues {
  id?: string;
  slug: string;
  title: string;
  tagline: string;
  summary: string;
  description: string;
  category: string;
  coverSrc: string;
  coverAlt: string;
  posterSrc: string;
  posterAlt: string;
  posterWidth: number;
  posterHeight: number;
  aboutImages: AboutImageDraft[];
  startDate: string;
  endDate: string;
  timeStart: string;
  timeEnd: string;
  venue: string;
  city: string;
  address: string;
  locationNote: string;
  organizer: string;
  ageMin: number;
  ageMax: number;
  capacity: number;
  price: number;
  extraCompanionPrice: number;
  priceDisplay: string;
  deadline: string;
  registrationNotes: string[];
  agenda: AgendaDraft[];
  facilities: string[];
  requirements: string[];
  certificateAvailable: boolean;
  featured: boolean;
  status: string;
}

/**
 * One form for both create and edit. Lists (agenda, fasilitas, ketentuan,
 * catatan) are one input per item with Tambah/Hapus buttons — an admin
 * should not have to think about JSON or line breaks.
 */
export function EventForm({
  initial,
  action,
  submitLabel,
}: {
  initial: EventFormValues;
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
}) {
  const [cover, setCover] = useState({ src: initial.coverSrc, alt: initial.coverAlt });
  const [poster, setPoster] = useState({
    src: initial.posterSrc,
    alt: initial.posterAlt,
    width: initial.posterWidth,
    height: initial.posterHeight,
  });

  // Ukuran poster dibaca dari gambarnya sendiri begitu dipilih, supaya halaman
  // publik tahu bentuknya (tinggi bebas) tanpa admin mengisi angka apa pun.
  useEffect(() => {
    if (!poster.src || (poster.width > 0 && poster.height > 0)) return;
    let cancelled = false;
    const probe = new window.Image();
    probe.onload = () => {
      if (!cancelled) {
        setPoster((current) =>
          current.src === poster.src
            ? { ...current, width: probe.naturalWidth, height: probe.naturalHeight }
            : current,
        );
      }
    };
    probe.src = poster.src;
    return () => {
      cancelled = true;
    };
  }, [poster.src, poster.width, poster.height]);

  return (
    <form action={action} className="space-y-5">
      {initial.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      <input type="hidden" name="coverSrc" value={cover.src} />

      <Card>
        <h2 className="text-base font-extrabold text-ink">Informasi dasar</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <Field label="Judul" htmlFor="title" required className="sm:col-span-2">
            <TextInput id="title" name="title" defaultValue={initial.title} required />
          </Field>
          <Field label="Slug URL" htmlFor="slug" hint="Kosongkan untuk dibuat otomatis dari judul.">
            <TextInput id="slug" name="slug" defaultValue={initial.slug} />
          </Field>
          <Field label="Kategori" htmlFor="category">
            <Select id="category" name="category" defaultValue={initial.category}>
              {EVENT_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Tagline" htmlFor="tagline" className="sm:col-span-2">
            <TextInput id="tagline" name="tagline" defaultValue={initial.tagline} />
          </Field>
          <Field label="Ringkasan" htmlFor="summary" className="sm:col-span-2">
            <TextArea id="summary" name="summary" rows={2} defaultValue={initial.summary} />
          </Field>
          <Field
            label="Deskripsi"
            htmlFor="description"
            hint="Satu paragraf per baris."
            className="sm:col-span-2"
          >
            <TextArea id="description" name="description" rows={5} defaultValue={initial.description} />
          </Field>
        </div>
      </Card>

      <Card>
        <h2 className="text-base font-extrabold text-ink">Gambar sampul</h2>
        <p className="mt-1 text-sm text-muted">
          Seret gambar dari laptop ke kotak ini, atau pakai tombol Unggah.
        </p>
        <ImageDropArea
          className="mt-4 grid gap-4 sm:grid-cols-[12rem_1fr]"
          onUploaded={(url, fileName) =>
            setCover((current) => ({ src: url, alt: current.alt || fileName }))
          }
        >
          <div className="space-y-2">
            <div className="aspect-[4/3] overflow-hidden rounded-xl border border-line bg-canvas-deep">
              {cover.src ? (
                // eslint-disable-next-line @next/next/no-img-element -- admin preview
                <img src={cover.src} alt="" className="size-full object-cover" />
              ) : (
                <span className="flex size-full items-center justify-center text-xs text-muted">
                  Belum ada gambar
                </span>
              )}
            </div>
            <MediaPicker
              folder="events"
              value={cover.src}
              onChange={(url, altText) =>
                setCover((current) => ({ src: url, alt: altText || current.alt }))
              }
              label={cover.src ? "Ganti gambar" : "Pilih gambar"}
            />
          </div>
          <Field label="Teks alternatif gambar" htmlFor="coverAlt">
            <TextInput
              id="coverAlt"
              name="coverAlt"
              value={cover.alt}
              onChange={(event) => setCover((current) => ({ ...current, alt: event.target.value }))}
            />
          </Field>
        </ImageDropArea>
      </Card>

      <Card>
        <h2 className="text-base font-extrabold text-ink">Foto Tentang Event</h2>
        <p className="mt-1 text-sm text-muted">
          Tampil di bagian &ldquo;Tentang Event&rdquo; di halaman detail, di atas deskripsi. Pakai foto
          yang berbeda dari gambar sampul. Maksimal 4 foto. Ukuran ideal{" "}
          <strong className="font-semibold text-ink">1350 × 1080 px</strong> (rasio 5:4); foto
          dengan ukuran lain dipotong dari tengah, seperti yang terlihat di pratinjau.
        </p>
        <div className="mt-4">
          <AboutImagesInput initial={initial.aboutImages} />
        </div>
      </Card>

      <Card>
        <h2 className="text-base font-extrabold text-ink">Banner / Poster panjang</h2>
        <p className="mt-1 text-sm text-muted">
          Gambar panjang (poster resmi dari tim desain) yang tampil utuh, tidak dipotong, di
          halaman detail event, di bawah Tentang Event. Ukuran yang disarankan{" "}
          <strong className="font-semibold text-ink">lebar 1080 px</strong>; tingginya bebas,
          misalnya 1080 × 1350 atau 1080 × 1920 px. Kosongkan kalau event ini tidak punya poster.
        </p>
        <ImageDropArea
          className="mt-4 grid gap-4 sm:grid-cols-[12rem_1fr]"
          onUploaded={(url, fileName) =>
            setPoster((current) => ({ ...current, src: url, alt: current.alt || fileName }))
          }
        >
          <input type="hidden" name="posterSrc" value={poster.src} />
          <input type="hidden" name="posterWidth" value={poster.width} />
          <input type="hidden" name="posterHeight" value={poster.height} />
          <div className="space-y-2">
            <div className="max-h-72 overflow-hidden rounded-xl border border-line bg-canvas-deep">
              {poster.src ? (
                // eslint-disable-next-line @next/next/no-img-element -- admin preview
                <img src={poster.src} alt="" className="mx-auto max-h-72 w-full object-contain" />
              ) : (
                <span className="flex aspect-[4/5] items-center justify-center text-xs text-muted">
                  Belum ada poster
                </span>
              )}
            </div>
            <MediaPicker
              folder="events"
              value={poster.src}
              onChange={(url, altText) =>
                setPoster((current) => ({
                  src: url,
                  alt: altText || current.alt,
                  // Ukuran asli dibaca dari gambarnya, di effect di atas.
                  width: url === current.src ? current.width : 0,
                  height: url === current.src ? current.height : 0,
                }))
              }
              label={poster.src ? "Ganti poster" : "Pilih poster"}
            />
          </div>
          <Field label="Teks alternatif poster" htmlFor="posterAlt">
            <TextInput
              id="posterAlt"
              name="posterAlt"
              value={poster.alt}
              onChange={(event) => setPoster((current) => ({ ...current, alt: event.target.value }))}
            />
          </Field>
        </ImageDropArea>
        {poster.width > 0 && poster.width < 1000 ? (
          <p className="mt-3 text-xs font-medium text-sun-dark">
            Lebar poster ini {poster.width} px, di bawah 1080 px yang disarankan. Di layar besar
            tulisannya bisa terlihat kurang tajam.
          </p>
        ) : null}
      </Card>

      <Card>
        <h2 className="text-base font-extrabold text-ink">Jadwal & lokasi</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <Field label="Tanggal mulai" htmlFor="startDate" required>
            <TextInput id="startDate" name="startDate" type="date" defaultValue={initial.startDate} required />
          </Field>
          <Field label="Tanggal selesai" htmlFor="endDate">
            <TextInput id="endDate" name="endDate" type="date" defaultValue={initial.endDate} />
          </Field>
          <Field label="Jam mulai" htmlFor="timeStart">
            <TextInput id="timeStart" name="timeStart" defaultValue={initial.timeStart} placeholder="09:00" />
          </Field>
          <Field label="Jam selesai" htmlFor="timeEnd">
            <TextInput id="timeEnd" name="timeEnd" defaultValue={initial.timeEnd} placeholder="12:00" />
          </Field>
          <Field label="Nama lokasi" htmlFor="venue">
            <TextInput id="venue" name="venue" defaultValue={initial.venue} />
          </Field>
          <Field label="Kota" htmlFor="city">
            <TextInput id="city" name="city" defaultValue={initial.city} />
          </Field>
          <Field label="Alamat" htmlFor="address" className="sm:col-span-2">
            <TextInput id="address" name="address" defaultValue={initial.address} />
          </Field>
          <Field label="Catatan lokasi" htmlFor="locationNote" className="sm:col-span-2">
            <TextInput id="locationNote" name="locationNote" defaultValue={initial.locationNote} />
          </Field>
        </div>
      </Card>

      <Card>
        <h2 className="text-base font-extrabold text-ink">Kuota & biaya</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <Field label="Usia minimum" htmlFor="ageMin">
            <TextInput id="ageMin" name="ageMin" type="number" defaultValue={String(initial.ageMin)} />
          </Field>
          <Field label="Usia maksimum" htmlFor="ageMax">
            <TextInput id="ageMax" name="ageMax" type="number" defaultValue={String(initial.ageMax)} />
          </Field>
          <Field label="Kapasitas" htmlFor="capacity">
            <TextInput id="capacity" name="capacity" type="number" defaultValue={String(initial.capacity)} />
          </Field>
          <Field label="Harga per anak" htmlFor="price" hint="Isi 0 untuk kelas gratis.">
            <TextInput id="price" name="price" type="number" defaultValue={String(initial.price)} />
          </Field>
          <Field
            label="Biaya pendamping tambahan"
            htmlFor="extraCompanionPrice"
            hint="Per orang, di luar pendamping yang mendaftar. Isi 0 kalau gratis. Hanya berlaku untuk kelas berbayar."
          >
            <TextInput
              id="extraCompanionPrice"
              name="extraCompanionPrice"
              type="number"
              min={0}
              defaultValue={String(initial.extraCompanionPrice)}
            />
          </Field>
          <Field label="Tampilan harga" htmlFor="priceDisplay">
            <Select id="priceDisplay" name="priceDisplay" defaultValue={initial.priceDisplay}>
              <option value="SHOW_PRICE">Tampilkan harga</option>
              <option value="HIDDEN">Sembunyikan harga</option>
              <option value="FREE">Gratis</option>
            </Select>
          </Field>
          <Field label="Batas pendaftaran" htmlFor="deadline">
            <TextInput id="deadline" name="deadline" type="date" defaultValue={initial.deadline} />
          </Field>
        </div>
      </Card>

      <Card>
        <h2 className="text-base font-extrabold text-ink">Detail kegiatan</h2>
        <div className="mt-4 grid gap-5">
          <Field
            label="Catatan pendaftaran"
            htmlFor="registrationNotes-0"
            hint="Tampil di halaman event, di bawah deskripsi dan di atas rundown (bukan di kartu biaya). Contoh: Biaya sudah termasuk makan siang."
          >
            <ListInput
              name="registrationNotes"
              initial={initial.registrationNotes}
              itemLabel="Catatan"
              addLabel="Tambah catatan"
            />
          </Field>
          <Field label="Rundown" htmlFor="agendaTime-0" hint="Tampil sebagai &ldquo;Rundown&rdquo; di halaman event. Jam di kolom kiri, kegiatan di kolom kanan.">
            <AgendaInput initial={initial.agenda} />
          </Field>
          <Field label="Fasilitas" htmlFor="facilities-0">
            <ListInput
              name="facilities"
              initial={initial.facilities}
              placeholder="Contoh: Snack dan air mineral"
              itemLabel="Fasilitas"
              compact
              addLabel="Tambah fasilitas"
            />
          </Field>
          <Field
            label="Ketentuan peserta"
            htmlFor="requirements-0"
            hint="Satu kolom untuk satu ketentuan. Tekan Enter atau Tambah ketentuan untuk menambah baris."
          >
            <ListInput
              name="requirements"
              initial={initial.requirements}
              placeholder="Contoh: Didampingi satu orang tua atau wali"
              itemLabel="Ketentuan"
              compact
              addLabel="Tambah ketentuan"
            />
          </Field>
        </div>
      </Card>

      <Card>
        <h2 className="text-base font-extrabold text-ink">Publikasi</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <Field label="Status" htmlFor="status">
            <Select id="status" name="status" defaultValue={initial.status}>
              {EVENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex flex-col justify-center gap-3 pt-6">
            <label className="flex items-center gap-2 text-sm font-semibold text-ink">
              <input
                type="checkbox"
                name="featured"
                defaultChecked={initial.featured}
                className="size-4"
              />
              Tampilkan sebagai unggulan
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-ink">
              <input
                type="checkbox"
                name="certificateAvailable"
                defaultChecked={initial.certificateAvailable}
                className="size-4"
              />
              Menerbitkan sertifikat
            </label>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted">
          Hanya status Tayang (PUBLISHED) dan Berlangsung (ONGOING) yang muncul di website.
        </p>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" size="lg">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
