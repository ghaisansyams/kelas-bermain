import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createEventAction } from "@/app/admin/events/actions";
import { Notice, PageHeader } from "@/components/admin/admin-ui";
import { EventForm, type EventFormValues } from "@/components/admin/event-form";
import { requireAdmin } from "@/lib/admin/auth";
import { getEventCategories } from "@/lib/services/event-categories";

export const dynamic = "force-dynamic";

const EMPTY: EventFormValues = {
  slug: "",
  title: "",
  tagline: "",
  summary: "",
  description: "",
  category: "Kegiatan",
  coverSrc: "",
  coverAlt: "",
  posterSrc: "",
  posterAlt: "",
  posterWidth: 0,
  posterHeight: 0,
  aboutImages: [],
  startDate: "",
  endDate: "",
  timeStart: "09:00",
  timeEnd: "12:00",
  venue: "",
  city: "",
  address: "",
  locationNote: "",
  organizer: "Kelas Bermain",
  ageMin: 3,
  ageMax: 15,
  capacity: 30,
  price: 0,
  extraCompanionPrice: 0,
  priceDisplay: "SHOW_PRICE",
  deadline: "",
  registrationNotes: [],
  agenda: [],
  facilities: [],
  requirements: [],
  certificateAvailable: false,
  featured: false,
  status: "DRAFT",
};

export default async function NewEventPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const { status } = await searchParams;
  const categories = (await getEventCategories()).map((item) => item.name);

  return (
    <div className="space-y-5">
      <Link
        href="/admin/events"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-brand"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Kembali ke daftar event
      </Link>

      <PageHeader title="Event Baru" description="Isi data event, lalu saat menyimpan kamu bisa memilih: langsung tampil di website atau simpan sebagai draft dulu." />

      {status === "invalid" ? <Notice tone="error">Judul dan tanggal mulai wajib diisi.</Notice> : null}
      {status === "bad-category" ? <Notice tone="error">Kategori tidak dikenal. Pilih salah satu kategori dari daftar.</Notice> : null}
      {status === "error" ? <Notice tone="error">Event gagal dibuat. Coba lagi.</Notice> : null}

      <EventForm
        initial={{ ...EMPTY, category: categories[0] ?? "" }}
        action={createEventAction}
        submitLabel="Simpan Event"
        categories={categories}
      />
    </div>
  );
}
