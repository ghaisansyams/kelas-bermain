import {
  confirmPaymentAction,
  refundPaymentAction,
  rejectPaymentAction,
} from "@/app/admin/payments/actions";
import { ProofViewer } from "@/components/admin/proof-viewer";
import { Card, Notice, PageHeader, StatCard } from "@/components/admin/admin-ui";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import {
  EmptyRow,
  FilterBar,
  PAYMENT_LABEL,
  Pagination,
  SearchField,
  SelectField,
  StatusBadge,
  TableShell,
  Td,
  Th,
} from "@/components/admin/data-table";
import { requireAdmin } from "@/lib/admin/auth";
import { getEvents } from "@/lib/services/content";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils/date";
import { formatRupiah } from "@/lib/utils/format";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 20;

const STATUS_NOTICE: Record<string, { tone: "success" | "error"; text: string }> = {
  confirmed: { tone: "success", text: "Pembayaran ditandai LUNAS dan tercatat di keuangan." },
  refunded: { tone: "success", text: "Refund tercatat. Transaksi awal tetap tersimpan." },
  rejected: {
    tone: "success",
    text: "Bukti pembayaran ditolak. Alasannya terlihat oleh pendaftar di halaman Cek Tiket.",
  },
  error: { tone: "error", text: "Aksi gagal. Coba lagi atau periksa hak akses Anda." },
};

interface PaymentRow {
  id: string;
  payment_number: string;
  invoice_number: string | null;
  amount: number;
  status: string;
  method: string;
  created_at: Date;
  paid_at: Date | null;
  proof_url: string | null;
  proof_submitted_at: Date | null;
  rejection_reason: string | null;
  event_id: string;
  registrations: { registration_number: string; children: { full_name: string } | null } | null;
  customers: { full_name: string } | null;
}

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; event?: string; status?: string; page?: string }>;
}) {
  const session = await requireAdmin();
  const { q, event, status, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? 1) || 1);
  const events = await getEvents();

  // ?status= dipakai dua hal sekaligus: penyaring daftar, dan penanda hasil
  // aksi (?status=confirmed). Tanpa pemisahan ini, begitu pembayaran
  // dikonfirmasi daftar disaring dengan status "confirmed", yang tidak cocok
  // dengan baris mana pun, dan admin melihat tabel kosong tepat setelah
  // berhasil. Hanya nilai yang memang status pembayaran yang menyaring.
  const FILTERABLE = [
    "PENDING",
    "WAITING_VERIFICATION",
    "REJECTED",
    "PAID",
    "FAILED",
    "EXPIRED",
    "CANCELLED",
    "REFUNDED",
  ];
  const statusFilter = status && FILTERABLE.includes(status) ? status : undefined;

  const where = {
    ...(q
      ? {
          OR: [
            { invoice_number: { contains: q, mode: "insensitive" as const } },
            { payment_number: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(event ? { event_id: event } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
  };

  let rows: PaymentRow[] = [];
  let count = 0;
  let pending = 0;
  let waiting = 0;
  let paid = 0;
  let error = false;

  try {
    const [list, total, pendingSum, waitingSum, paidSum] = await Promise.all([
      db.payments.findMany({
        where,
        select: {
          id: true,
          payment_number: true,
          invoice_number: true,
          amount: true,
          status: true,
          method: true,
          created_at: true,
          paid_at: true,
          proof_url: true,
          proof_submitted_at: true,
          rejection_reason: true,
          event_id: true,
          registrations: {
            select: { registration_number: true, children: { select: { full_name: true } } },
          },
          customers: { select: { full_name: true } },
        },
        orderBy: { created_at: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      db.payments.count({ where }),
      db.payments.aggregate({ _sum: { amount: true }, where: { status: "PENDING" } }),
      db.payments.aggregate({
        _count: true,
        where: { status: "WAITING_VERIFICATION" },
      }),
      db.payments.aggregate({ _sum: { amount: true }, where: { status: "PAID" } }),
    ]);

    rows = list.map((row) => ({ ...row, amount: Number(row.amount) })) as PaymentRow[];
    count = total;
    pending = Number(pendingSum._sum.amount ?? 0);
    waiting = waitingSum._count;
    paid = Number(paidSum._sum.amount ?? 0);
  } catch {
    error = true;
  }

  // Bukti transfer dilayani lewat rute khusus admin yang memeriksa sesi setiap
  // kali dibuka. Berkasnya di luar public/, jadi tidak ada URL yang bisa
  // ditebak atau dibagikan: tangkapan layar aplikasi bank orang tua tidak
  // boleh bisa dibuka siapa pun yang memegang tautannya.
  const proofLinks = new Map<string, string>();
  for (const row of rows) {
    if (row.proof_url) {
      proofLinks.set(row.proof_url, `/admin/payments/proof/${encodeURIComponent(row.proof_url)}`);
    }
  }

  const { status: notice } = await searchParams;
  const noticeConfig = notice ? STATUS_NOTICE[notice] : undefined;
  const eventTitle = (id: string) => events.find((item) => item.id === id)?.title ?? id;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pembayaran"
        description="Verifikasi pembayaran yang masuk. Konfirmasi di sini mengubah database, bukan hanya tampilan."
      />

      {noticeConfig ? <Notice tone={noticeConfig.tone}>{noticeConfig.text}</Notice> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Menunggu pembayaran" value={formatRupiah(pending)} />
        <StatCard
          label="Bukti menunggu dicek"
          value={String(waiting)}
        />
        <StatCard label="Sudah lunas" value={formatRupiah(paid)} />
        <StatCard label="Total transaksi" value={String(count)} />
      </div>

      <FilterBar action="/admin/payments">
        <SearchField value={q} />
        <SelectField
          name="event"
          label="Event"
          value={event}
          options={[{ value: "", label: "Semua" }, ...events.map((item) => ({ value: item.id, label: item.title }))]}
        />
        <SelectField
          name="status"
          label="Status"
          value={status}
          options={[
            { value: "", label: "Semua" },
            { value: "PENDING", label: "Menunggu" },
            { value: "WAITING_VERIFICATION", label: "Menunggu Dicek" },
            { value: "REJECTED", label: "Ditolak" },
            { value: "PAID", label: "Lunas" },
            { value: "FAILED", label: "Gagal" },
            { value: "EXPIRED", label: "Kadaluarsa" },
            { value: "CANCELLED", label: "Dibatalkan" },
            { value: "REFUNDED", label: "Refund" },
          ]}
        />
      </FilterBar>

      {error ? (
        <Card>
          <p className="text-sm text-brand-ink">
            Data gagal dimuat. Coba muat ulang halaman ini.
          </p>
        </Card>
      ) : (
        <>
          <TableShell>
            <thead>
              <tr className="border-b border-line">
                <Th>Invoice</Th>
                <Th>Anak</Th>
                <Th>Event</Th>
                <Th>Nominal</Th>
                <Th>Metode</Th>
                <Th>Bukti</Th>
                <Th className="w-[10rem]">Status</Th>
                <Th>Dibuat</Th>
                <Th className="w-[11rem]">Aksi</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.length === 0 ? (
                <EmptyRow colSpan={9}>Belum ada transaksi pembayaran.</EmptyRow>
              ) : (
                rows.map((row) => {
                  const label = PAYMENT_LABEL[row.status] ?? { text: row.status, tone: "grey" };
                  const participant = row.registrations?.children?.full_name ?? "—";
                  const summary = [
                    { label: "Invoice", value: row.invoice_number ?? row.payment_number },
                    { label: "Anak", value: participant },
                    { label: "Pendamping", value: row.customers?.full_name ?? "—" },
                    { label: "Event", value: eventTitle(row.event_id) },
                    { label: "Total", value: formatRupiah(Number(row.amount)) },
                    { label: "Metode", value: row.method },
                  ];
                  return (
                    <tr key={row.id}>
                      <Td className="whitespace-nowrap font-mono text-xs font-bold text-ink">
                        {row.invoice_number ?? row.payment_number}
                      </Td>
                      <Td className="font-semibold text-ink">
                        {participant}
                        <span className="block text-xs font-normal text-muted">
                          {row.customers?.full_name ?? "—"}
                        </span>
                      </Td>
                      <Td>{eventTitle(row.event_id)}</Td>
                      <Td>{formatRupiah(Number(row.amount))}</Td>
                      <Td>{row.method}</Td>
                      <Td>
                        <ProofCell
                          url={row.proof_url ? proofLinks.get(row.proof_url) : undefined}
                          path={row.proof_url}
                          submittedAt={row.proof_submitted_at}
                        />
                      </Td>
                      <Td>
                        <StatusBadge tone={label.tone}>{label.text}</StatusBadge>
                        {row.paid_at ? (
                          <span className="mt-1 block text-xs text-muted">
                            {formatDate(row.paid_at.toISOString())}
                          </span>
                        ) : null}
                        {row.status === "REJECTED" && row.rejection_reason ? (
                          <span className="mt-1 block text-xs text-muted">
                            {row.rejection_reason}
                          </span>
                        ) : null}
                      </Td>
                      <Td>{formatDate(row.created_at.toISOString())}</Td>
                      <Td>
                        {row.status === "PENDING" ||
                        row.status === "WAITING_VERIFICATION" ||
                        row.status === "REJECTED" ? (
                          <div className="flex flex-col items-start gap-1.5">
                            <ConfirmDialog
                              action={confirmPaymentAction}
                              hidden={{ paymentId: row.id, method: row.method }}
                              trigger="Konfirmasi Lunas"
                              title="Tandai pembayaran sebagai LUNAS?"
                              description="Pastikan dana benar-benar sudah masuk ke rekening. Tindakan ini tercatat di Activity Log."
                              summary={summary}
                              confirmLabel="Konfirmasi Lunas"
                            />
                            {row.status === "WAITING_VERIFICATION" ? (
                              <ConfirmDialog
                                action={rejectPaymentAction}
                                hidden={{ paymentId: row.id }}
                                trigger="Tolak Bukti"
                                tone="danger"
                                title="Tolak bukti pembayaran ini?"
                                description="Pendaftaran tidak dihapus. Alasan di bawah ditampilkan ke pendaftar di halaman Cek Tiket supaya mereka bisa kirim ulang."
                                summary={summary}
                                confirmLabel="Tolak Bukti"
                                reasonField={{
                                  name: "reason",
                                  label: "Alasan penolakan",
                                  placeholder: "Contoh: nominal transfer tidak sesuai",
                                }}
                              />
                            ) : null}
                          </div>
                        ) : row.status === "PAID" && session.role === "SUPER_ADMIN" ? (
                          <ConfirmDialog
                            action={refundPaymentAction}
                            hidden={{ paymentId: row.id }}
                            trigger="Refund"
                            tone="danger"
                            title="Refund pembayaran yang sudah LUNAS?"
                            description="Transaksi awal tidak dihapus. Sistem mencatat transaksi refund terpisah."
                            summary={summary}
                            confirmLabel="Proses Refund"
                            reasonField={{
                              name: "reason",
                              label: "Alasan refund",
                              placeholder: "Contoh: peserta batal hadir",
                            }}
                          />
                        ) : (
                          <span className="text-xs text-muted">—</span>
                        )}
                      </Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </TableShell>

          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={count}
            basePath="/admin/payments"
            params={{ q, event, status }}
          />
        </>
      )}
    </div>
  );
}

/**
 * The proof, as a picture. An admin is deciding whether a transfer happened,
 * and a link they have to open in another tab for every row turns a minute
 * of verifying into ten. A PDF has no thumbnail to show, so that one stays
 * a link.
 */
function ProofCell({
  url,
  path,
  submittedAt,
}: {
  url?: string;
  path: string | null;
  submittedAt: Date | null;
}) {
  const isPdf = Boolean(path?.toLowerCase().endsWith(".pdf"));

  return (
    <div className="space-y-1">
      {path && url ? (
        <ProofViewer url={url} isPdf={isPdf} />
      ) : path ? (
        <span className="text-xs text-muted">Berkas tidak terbaca</span>
      ) : submittedAt ? (
        <span className="text-xs text-ink-soft">Lewat WhatsApp</span>
      ) : (
        <span className="text-xs text-muted">—</span>
      )}
      {submittedAt ? (
        <span className="block text-xs text-muted">{formatDate(submittedAt.toISOString())}</span>
      ) : null}
    </div>
  );
}
