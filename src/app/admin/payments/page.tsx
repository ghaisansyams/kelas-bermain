import {
  confirmPaymentAction,
  refundPaymentAction,
  rejectPaymentAction,
} from "@/app/admin/payments/actions";
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
import { createSupabaseServerClient } from "@/lib/supabase/server";
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
  created_at: string;
  paid_at: string | null;
  proof_url: string | null;
  proof_submitted_at: string | null;
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
  const supabase = await createSupabaseServerClient();
  const events = await getEvents();

  let query = supabase
    .from("payments")
    .select(
      "id, payment_number, invoice_number, amount, status, method, created_at, paid_at, proof_url, proof_submitted_at, rejection_reason, event_id, registrations(registration_number, children(full_name)), customers(full_name)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (q) query = query.or(`invoice_number.ilike.%${q}%,payment_number.ilike.%${q}%`);
  if (event) query = query.eq("event_id", event);
  if (status) query = query.eq("status", status);

  const [{ data, count, error }, pendingAgg, waitingAgg, paidAgg] = await Promise.all([
    query,
    supabase.from("payments").select("amount").eq("status", "PENDING"),
    supabase.from("payments").select("amount").eq("status", "WAITING_VERIFICATION"),
    supabase.from("payments").select("amount").eq("status", "PAID"),
  ]);

  const rows = (data ?? []) as unknown as PaymentRow[];
  const sum = (list: { amount: number }[] | null) =>
    (list ?? []).reduce((total, row) => total + Number(row.amount), 0);

  // The proof bucket is private on purpose — a screenshot of someone's
  // banking app must never sit behind a public URL. Admins get a short-lived
  // signed link instead, minted per page load.
  const proofPaths = rows.map((row) => row.proof_url).filter((url): url is string => Boolean(url));
  const proofLinks = new Map<string, string>();
  if (proofPaths.length > 0) {
    const { data: signed } = await supabase.storage
      .from("bukti-pembayaran")
      .createSignedUrls(proofPaths, 300);
    for (const item of signed ?? []) {
      if (item.path && item.signedUrl) proofLinks.set(item.path, item.signedUrl);
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
        <StatCard label="Menunggu pembayaran" value={formatRupiah(sum(pendingAgg.data))} />
        <StatCard
          label="Bukti menunggu dicek"
          value={String((waitingAgg.data ?? []).length)}
        />
        <StatCard label="Sudah lunas" value={formatRupiah(sum(paidAgg.data))} />
        <StatCard label="Total transaksi" value={String(count ?? 0)} />
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
            Data gagal dimuat. Pastikan supabase/erp-schema.sql sudah dijalankan.
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
                        {row.proof_url ? (
                          proofLinks.get(row.proof_url) ? (
                            <a
                              href={proofLinks.get(row.proof_url)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-bold text-brand hover:underline"
                            >
                              Lihat bukti
                            </a>
                          ) : (
                            <span className="text-xs text-muted">Berkas tidak terbaca</span>
                          )
                        ) : row.proof_submitted_at ? (
                          <span className="text-xs text-ink-soft">Lewat WhatsApp</span>
                        ) : (
                          <span className="text-xs text-muted">—</span>
                        )}
                        {row.proof_submitted_at ? (
                          <span className="mt-1 block text-xs text-muted">
                            {formatDate(row.proof_submitted_at)}
                          </span>
                        ) : null}
                      </Td>
                      <Td>
                        <StatusBadge tone={label.tone}>{label.text}</StatusBadge>
                        {row.paid_at ? (
                          <span className="mt-1 block text-xs text-muted">
                            {formatDate(row.paid_at)}
                          </span>
                        ) : null}
                        {row.status === "REJECTED" && row.rejection_reason ? (
                          <span className="mt-1 block text-xs text-muted">
                            {row.rejection_reason}
                          </span>
                        ) : null}
                      </Td>
                      <Td>{formatDate(row.created_at)}</Td>
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
            total={count ?? 0}
            basePath="/admin/payments"
            params={{ q, event, status }}
          />
        </>
      )}
    </div>
  );
}
