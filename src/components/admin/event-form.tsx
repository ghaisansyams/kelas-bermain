"use client";

import { useState } from "react";
import { MediaPicker } from "@/components/admin/media-picker";
import { Card } from "@/components/admin/admin-ui";
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
  priceDisplay: string;
  deadline: string;
  registrationNotes: string;
  agenda: string;
  facilities: string;
  requirements: string;
  certificateAvailable: boolean;
  youtubeUrl: string;
  videoTitle: string;
  videoFileUrl: string;
  videoThumbnail: string;
  featured: boolean;
  status: string;
}

/**
 * One form for both create and edit. Lists (agenda, fasilitas, ketentuan)
 * are plain one-per-line textareas — an admin should not have to think
 * about JSON.
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
  const [videoFileUrl, setVideoFileUrl] = useState(initial.videoFileUrl);
  const [videoThumbnail, setVideoThumbnail] = useState(initial.videoThumbnail);

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
        <div className="mt-4 grid gap-4 sm:grid-cols-[12rem_1fr]">
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
        </div>
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
        <h2 className="text-base font-extrabold text-ink">Peserta & biaya</h2>
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
          <Field
            label="Catatan pendaftaran"
            htmlFor="registrationNotes"
            hint="Satu catatan per baris."
            className="sm:col-span-2"
          >
            <TextArea
              id="registrationNotes"
              name="registrationNotes"
              rows={3}
              defaultValue={initial.registrationNotes}
            />
          </Field>
        </div>
      </Card>

      <Card>
        <h2 className="text-base font-extrabold text-ink">Detail kegiatan</h2>
        <div className="mt-4 grid gap-5">
          <Field
            label="Agenda"
            htmlFor="agenda"
            hint="Satu baris per agenda, format: 09.00 | Registrasi ulang"
          >
            <TextArea id="agenda" name="agenda" rows={5} defaultValue={initial.agenda} />
          </Field>
          <Field label="Fasilitas" htmlFor="facilities" hint="Satu fasilitas per baris.">
            <TextArea id="facilities" name="facilities" rows={4} defaultValue={initial.facilities} />
          </Field>
          <Field label="Ketentuan peserta" htmlFor="requirements" hint="Satu ketentuan per baris.">
            <TextArea id="requirements" name="requirements" rows={4} defaultValue={initial.requirements} />
          </Field>
          <Field label="Video YouTube" htmlFor="youtubeUrl">
            <TextInput id="youtubeUrl" name="youtubeUrl" defaultValue={initial.youtubeUrl} />
          </Field>
          <Field label="Judul video" htmlFor="videoTitle">
            <TextInput id="videoTitle" name="videoTitle" defaultValue={initial.videoTitle} />
          </Field>
          <Field
            label="Atau unggah berkas video"
            htmlFor="videoFileUrl"
            hint="MP4 atau WEBM, maksimal 50 MB. Kalau diisi, ini dipakai dan tautan YouTube diabaikan."
          >
            <MediaPicker
              folder="events"
              value={videoFileUrl}
              onChange={(url) => setVideoFileUrl(url)}
              label="Pilih video dari Media"
            />
            <input type="hidden" name="videoFileUrl" value={videoFileUrl} />
            {videoFileUrl ? (
              <p className="mt-1 truncate text-xs text-muted">{videoFileUrl}</p>
            ) : null}
          </Field>
          <Field label="Gambar sampul video" htmlFor="videoThumbnail">
            <MediaPicker
              folder="events"
              value={videoThumbnail}
              onChange={(url) => setVideoThumbnail(url)}
              label="Pilih sampul"
            />
            <input type="hidden" name="videoThumbnail" value={videoThumbnail} />
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
