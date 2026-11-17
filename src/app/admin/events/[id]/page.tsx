import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, ExternalLink } from "lucide-react";
import { deleteEventAction, setEventStatusAction, updateEventAction } from "@/app/admin/events/actions";
import { DeleteDialog } from "@/components/admin/delete-dialog";
import { describeStats, statsByOwner } from "@/lib/admin/delete-records";
import { Notice, PageHeader, StatCard } from "@/components/admin/admin-ui";
import { EventForm, type EventFormValues } from "@/components/admin/event-form";
import { requireAdmin } from "@/lib/admin/auth";
import { EVENT_STATUS_LABEL, type EventRow } from "@/lib/services/event-mapper";
import { db } from "@/lib/db";
import { getEventCategories } from "@/lib/services/event-categories";
import { formatRupiah } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

const NOTICES: Record<string, { tone: "success" | "error"; text: string }> = {
  saved: { tone: "success", text: "Perubahan tersimpan. Website publik sudah disegarkan." },
  "saved-draft": { tone: "success", text: "Perubahan tersimpan. Event ini masih draft, jadi belum tampil di website." },
  "created-live": { tone: "success", text: "Event dibuat dan sudah tampil di website." },
  "created-draft": { tone: "success", text: "Event disimpan sebagai draft. Belum tampil di website; tekan Tayangkan di website kalau sudah siap." },
  "now-live": { tone: "success", text: "Selesai. Event ini sekarang tampil di website." },
  "now-hidden": { tone: "success", text: "Event disembunyikan dari website. Datanya tetap tersimpan." },
  "bad-category": { tone: "error", text: "Kategori tidak dikenal, jadi event belum disimpan. Pilih salah satu kategori dari daftar." },
  "wrong-confirm": { tone: "error", text: "Tulisan konfirmasi tidak cocok, jadi tidak ada yang dihapus." },
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
  const session = await requireAdmin();
  const { id } = await params;
  const { status } = await searchParams;

  // id dari URL yang bukan milik event mana pun harus berakhir di 404, bukan
  // di halaman galat.
  const [event, paidSum, presentCount] = await Promise.all([
    db.events.findUnique({ where: { id } }),
    db.payments.aggregate({ _sum: { amount: true }, where: { event_id: id, status: "PAID" } }),
    db.registrations.count({ where: { event_id: id, attendance_status: "PRESENT" } }),
  ]);

  if (!event) notFound();

  // Formulir dan pemetanya bekerja dengan tanggal "YYYY-MM-DD", bukan Date.
  const row = {
    ...event,
    start_date: event.start_date.toISOString().slice(0, 10),
    end_date: event.end_date.toISOString().slice(0, 10),
  } as unknown as EventRow;

  const stats = (await statsByOwner("event_id", [id])).get(id);
  const eventCount = await db.events.count();
  const revenue = Number(paidSum._sum.amount ?? 0);
  const present = presentCount;

  const initial: EventFormValues = {
    id: row.id,
    slug: row.slug,
    title: row.title,
    tagline: row.tagline ?? "",
    summary: row.summary ?? "",
    // Deskripsi khusus "Tentang Event" dari katalog lama ikut disunting di sini,
    // karena itulah yang tampil di halaman publik.
    description: (row.about_event?.description ?? row.description ?? []).join("\n"),
    category: row.category,
    coverSrc: row.cover?.src ?? "",
    coverAlt: row.cover?.alt ?? "",
    posterSrc: row.poster?.src ?? "",
    posterAlt: row.poster?.alt ?? "",
    posterWidth: row.poster?.width ?? 0,
    posterHeight: row.poster?.height ?? 0,
    aboutImages: (row.about_event?.images ?? []).map((image) => ({ src: image.src, alt: image.alt })),
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
    extraCompanionPrice: row.registration?.extraCompanionPrice ?? 0,
    priceDisplay: row.registration?.priceDisplay ?? "SHOW_PRICE",
    deadline: row.registration?.deadline ?? "",
    registrationNotes: row.registration?.notes ?? [],
    agenda: (row.agenda ?? []).map((item) => ({ time: item.time, title: item.title })),
    facilities: row.facilities ?? [],
    requirements: row.requirements ?? [],
    certificateAvailable: Boolean(row.certificate?.available),
    featured: row.featured,
    status: row.status,
  };

  const notice = status ? NOTICES[status] : undefined;
  const live = row.status === "PUBLISHED" || row.status === "ONGOING";
  const statusText = EVENT_STATUS_LABEL[row.status]?.text ?? row.status;

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
        description={`${row.registered}/${row.capacity} peserta · ${live ? "tampil di website" : `belum tampil di website (${statusText.toLowerCase()})`}`}
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
            {session.role === "SUPER_ADMIN" ? (
              <DeleteDialog
                action={deleteEventAction}
                hidden={{ id: row.id }}
                code={row.title}
                title="Hapus event?"
                triggerLabel="Hapus event"
                triggerClassName="inline-flex min-h-10 items-center gap-1.5 rounded-pill border border-brand/40 px-4 text-sm font-semibold text-brand hover:bg-brand-soft"
                summary={[
                  { label: "Judul", value: row.title },
                  { label: "Terdaftar", value: `${row.registered}/${row.capacity}` },
                ]}
                consequences={[
                  "Event ini dan halamannya di website",
                  ...describeStats(stats),
                  "Data pendamping dan anak tetap ada",
                  ...(eventCount === 1
                    ? [
                        "Ini event terakhir: setelah dihapus, website kembali menampilkan katalog bawaan sampai ada event baru",
                      ]
                    : []),
                ]}
              />
            ) : null}
          </div>
        }
      />

      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}

      {row.status === "DRAFT" ? (
        <div className="flex flex-col gap-3 rounded-card border-2 border-sun bg-sun-soft p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <EyeOff className="mt-0.5 size-5 shrink-0 text-sun-dark" aria-hidden />
            <div>
              <p className="text-sm font-extrabold text-ink">Event ini belum tampil di website</p>
              <p className="text-sm text-ink-soft">Statusnya masih draft. Tekan tombol di samping kalau sudah siap dilihat pengunjung.</p>
            </div>
          </div>
          <form action={setEventStatusAction}>
            <input type="hidden" name="id" value={row.id} />
            <input type="hidden" name="status" value="PUBLISHED" />
            <input type="hidden" name="next" value="detail" />
            <button
              type="submit"
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-pill bg-brand px-5 text-sm font-bold text-white hover:bg-brand-dark sm:w-auto"
            >
              <Eye className="size-4" aria-hidden />
              Tayangkan di website
            </button>
          </form>
        </div>
      ) : live ? (
        <div className="flex flex-col gap-3 rounded-card border border-pine/30 bg-pine-soft/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Eye className="mt-0.5 size-5 shrink-0 text-pine-dark" aria-hidden />
            <p className="text-sm font-extrabold text-pine-dark">Event ini tampil di website</p>
          </div>
          <form action={setEventStatusAction}>
            <input type="hidden" name="id" value={row.id} />
            <input type="hidden" name="status" value="DRAFT" />
            <input type="hidden" name="next" value="detail" />
            <button
              type="submit"
              className="inline-flex min-h-10 w-full items-center justify-center gap-2 whitespace-nowrap rounded-pill border border-line bg-surface px-4 text-sm font-semibold text-ink-soft hover:border-brand/40 hover:text-brand sm:w-auto"
            >
              <EyeOff className="size-4" aria-hidden />
              Sembunyikan dari website
            </button>
          </form>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Terdaftar" value={`${row.registered}`} hint={`Kapasitas ${row.capacity}`} />
        <StatCard label="Hadir" value={String(present)} />
        <StatCard label="Pendapatan (lunas)" value={formatRupiah(revenue)} />
        <StatCard
          label="Di website"
          value={live ? "Tampil" : "Tersembunyi"}
          hint={live ? statusText : `Status: ${statusText}`}
        />
      </div>

      <EventForm
        initial={initial}
        action={updateEventAction}
        submitLabel="Simpan Perubahan"
        categories={(await getEventCategories()).map((item) => item.name)}
      />
    </div>
  );
}
