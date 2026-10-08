import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createEventAction } from "@/app/admin/events/actions";
import { Notice, PageHeader } from "@/components/admin/admin-ui";
import { EventForm, type EventFormValues } from "@/components/admin/event-form";
import { requireAdmin } from "@/lib/admin/auth";

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
  priceDisplay: "SHOW_PRICE",
  deadline: "",
  registrationNotes: "",
  agenda: "",
  facilities: "",
  requirements: "",
  certificateAvailable: false,
  youtubeUrl: "",
  videoTitle: "",
  videoFileUrl: "",
  videoThumbnail: "",
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

  return (
    <div className="space-y-5">
      <Link
        href="/admin/events"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-brand"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Kembali ke daftar event
      </Link>

      <PageHeader title="Event Baru" description="Simpan sebagai Draft dulu, tayangkan saat siap." />

      {status === "invalid" ? <Notice tone="error">Judul dan tanggal mulai wajib diisi.</Notice> : null}
      {status === "error" ? <Notice tone="error">Event gagal dibuat. Coba lagi.</Notice> : null}

      <EventForm initial={EMPTY} action={createEventAction} submitLabel="Simpan Event" />
    </div>
  );
}
