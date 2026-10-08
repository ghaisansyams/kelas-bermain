import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { updateEventAction } from "@/app/admin/events/actions";
import { Notice, PageHeader, StatCard } from "@/components/admin/admin-ui";
import { EventForm, type EventFormValues } from "@/components/admin/event-form";
import { requireAdmin } from "@/lib/admin/auth";
import type { EventRow } from "@/lib/services/event-mapper";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatRupiah } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

const NOTICES: Record<string, { tone: "success" | "error"; text: string }> = {
  saved: { tone: "success", text: "Event tersimpan. Website publik sudah disegarkan." },
  created: { tone: "success", text: "Event dibuat." },
  error: { tone: "error", text: "Perubahan gagal disimpan." },
};

export default async function EditEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { status } = await searchParams;
  const supabase = await createSupabaseServerClient();

  const [{ data }, paidAgg, attendanceAgg] = await Promise.all([
    supabase.from("events").select("*").eq("id", id).maybeSingle(),
    supabase.from("payments").select("amount").eq("event_id", id).eq("status", "PAID"),
    supabase.from("registrations").select("attendance_status").eq("event_id", id),
  ]);

  if (!data) notFound();
  const row = data as unknown as EventRow;

  const revenue = (paidAgg.data ?? []).reduce(
    (total, item) => total + Number((item as { amount: number }).amount),
    0,
  );
  const attendance = (attendanceAgg.data ?? []) as { attendance_status: string }[];
  const present = attendance.filter((item) => item.attendance_status === "PRESENT").length;

  const initial: EventFormValues = {
    id: row.id,
    slug: row.slug,
    title: row.title,
    tagline: row.tagline ?? "",
    summary: row.summary ?? "",
    description: (row.description ?? []).join("\n"),
    category: row.category,
    coverSrc: row.cover?.src ?? "",
    coverAlt: row.cover?.alt ?? "",
    startDate: row.start_date,
    endDate: row.end_date,
    timeStart: row.time_start,
    timeEnd: row.time_end,
    venue: row.location?.venue ?? "",
    city: row.location?.city ?? "",
    address: row.location?.address ?? "",
    locationNote: row.location?.note ?? "",
    organizer: row.organizer,
    ageMin: row.age_min,
    ageMax: row.age_max,
    capacity: row.capacity,
    price: row.registration?.price ?? 0,
    priceDisplay: row.registration?.priceDisplay ?? "SHOW_PRICE",
    deadline: row.registration?.deadline ?? "",
    registrationNotes: (row.registration?.notes ?? []).join("\n"),
    agenda: (row.agenda ?? []).map((item) => `${item.time} | ${item.title}`).join("\n"),
    facilities: (row.facilities ?? []).join("\n"),
    requirements: (row.requirements ?? []).join("\n"),
    certificateAvailable: Boolean(row.certificate?.available),
    youtubeUrl: row.video?.youtubeUrl ?? "",
    videoTitle: row.video?.title ?? "",
    videoFileUrl: row.video?.fileUrl ?? "",
    videoThumbnail: row.video?.thumbnail ?? "",
    featured: row.featured,
    status: row.status,
  };

  const notice = status ? NOTICES[status] : undefined;

  return (
    <div className="space-y-5">
      <Link
        href="/admin/events"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-brand"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Kembali ke daftar event
      </Link>

      <PageHeader
        title={row.title}
        description={`${row.registered}/${row.capacity} peserta · status ${row.status}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/admin/attendance?event=${row.id}`}
              className="inline-flex min-h-10 items-center rounded-pill border border-line px-4 text-sm font-semibold text-ink hover:border-brand/40 hover:text-brand"
            >
              Kehadiran
            </Link>
            <Link
              href={`/event/${row.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-pill border border-line px-4 text-sm font-semibold text-ink hover:border-brand/40 hover:text-brand"
            >
              Lihat di website
              <ExternalLink className="size-3.5" aria-hidden />
            </Link>
          </div>
        }
      />

      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Terdaftar" value={`${row.registered}`} hint={`Kapasitas ${row.capacity}`} />
        <StatCard label="Hadir" value={String(present)} />
        <StatCard label="Pendapatan (lunas)" value={formatRupiah(revenue)} />
        <StatCard label="Status" value={row.status} />
      </div>

      <EventForm initial={initial} action={updateEventAction} submitLabel="Simpan Perubahan" />
    </div>
  );
}
