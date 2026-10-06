import { setAffiliateStatusAction } from "@/app/admin/affiliates/actions";
import { Card, Notice, PageHeader, StatCard } from "@/components/admin/admin-ui";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { EmptyRow, StatusBadge, TableShell, Td, Th } from "@/components/admin/data-table";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils/date";
import { formatRupiah } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

interface AffiliateRow {
  id: string;
  affiliate_number: string;
  code: string | null;
  full_name: string;
  whatsapp: string;
  email: string | null;
  domicile: string;
  bank_name: string;
  bank_account_number: string;
  bank_account_name: string;
  reason: string | null;
  status: "PENDING" | "ACTIVE" | "INACTIVE" | "REJECTED";
  applied_at: string;
  notes: string | null;
}

interface StatRow {
  code: string;
  registrations: number;
  paid_registrations: number;
  revenue: number;
}

const STATUS_LABEL: Record<string, { text: string; tone: string }> = {
  PENDING: { text: "Menunggu", tone: "sun" },
  ACTIVE: { text: "Aktif", tone: "pine" },
  INACTIVE: { text: "Nonaktif", tone: "grey" },
  REJECTED: { text: "Ditolak", tone: "grey" },
};

const NOTICES: Record<string, { tone: "success" | "error"; text: string }> = {
  approved: { tone: "success", text: "Affiliate disetujui dan kodenya sudah aktif." },
  updated: { tone: "success", text: "Status affiliate diperbarui." },
  "code-taken": { tone: "error", text: "Kode itu sudah dipakai affiliate lain." },
  "not-found": { tone: "error", text: "Data affiliate tidak ditemukan." },
  error: { tone: "error", text: "Aksi gagal dijalankan." },
};

export default async function AdminAffiliatesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const { status } = await searchParams;
  const supabase = await createSupabaseServerClient();

  const [{ data, error }, statsRes] = await Promise.all([
    supabase.from("affiliates").select("*").order("applied_at", { ascending: false }),
    supabase.rpc("admin_affiliate_stats"),
  ]);

  const rows = (data ?? []) as unknown as AffiliateRow[];
  const stats = new Map(
    ((statsRes.data ?? []) as unknown as StatRow[]).map((row) => [row.code, row]),
  );

  const pending = rows.filter((row) => row.status === "PENDING");
  const active = rows.filter((row) => row.status === "ACTIVE");
  const totalRevenue = [...stats.values()].reduce((sum, row) => sum + Number(row.revenue), 0);
  const notice = status ? NOTICES[status] : undefined;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Affiliate"
        description="Pendaftar program affiliate. Kode rujukan baru terbit saat kamu menyetujui mereka di sini."
      />

      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
      {error ? (
        <Notice tone="error">
          Data affiliate gagal dimuat. Pastikan supabase/affiliate-certificate-schema.sql sudah
          dijalankan.
        </Notice>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total pendaftar" value={String(rows.length)} />
        <StatCard label="Menunggu persetujuan" value={String(pending.length)} />
        <StatCard label="Affiliate aktif" value={String(active.length)} />
        <StatCard label="Omzet dari affiliate" value={formatRupiah(totalRevenue)} />
      </div>

      {pending.length > 0 ? (
        <Notice tone="info">
          {pending.length} orang menunggu persetujuan. Selama belum disetujui, mereka tidak punya
          kode apa pun untuk dibagikan.
        </Notice>
      ) : null}

      <TableShell>
        <thead>
          <tr className="border-b border-line">
            <Th>Affiliate</Th>
            <Th>Kontak</Th>
            <Th>Rekening</Th>
            <Th>Kode</Th>
            <Th>Performa</Th>
            <Th>Status</Th>
            <Th>Aksi</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.length === 0 ? (
            <EmptyRow colSpan={7}>Belum ada pendaftar affiliate.</EmptyRow>
          ) : (
            rows.map((row) => {
              const label = STATUS_LABEL[row.status] ?? { text: row.status, tone: "grey" };
              const stat = row.code ? stats.get(row.code.toUpperCase()) : undefined;
              return (
                <tr key={row.id}>
                  <Td>
                    <span className="font-semibold text-ink">{row.full_name}</span>
                    <span className="mt-0.5 block font-mono text-[0.6875rem] text-muted">
                      {row.affiliate_number}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">
                      {row.domicile || "—"} · {formatDate(row.applied_at)}
                    </span>
                  </Td>
                  <Td className="text-xs">
                    <a
                      href={`https://wa.me/${row.whatsapp.replace(/\D/g, "").replace(/^0/, "62")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-brand hover:underline"
                    >
                      {row.whatsapp}
                    </a>
                    {row.email ? (
                      <span className="mt-0.5 block text-muted">{row.email}</span>
                    ) : null}
                  </Td>
                  <Td className="text-xs">
                    {row.bank_name}
                    <span className="mt-0.5 block font-mono text-muted">
                      {row.bank_account_number}
                    </span>
                    <span className="mt-0.5 block text-muted">{row.bank_account_name}</span>
                  </Td>
                  <Td>
                    {row.code ? (
                      <span className="font-mono text-xs font-bold text-ink">{row.code}</span>
                    ) : (
                      <span className="text-xs text-muted">Belum ada</span>
                    )}
                  </Td>
                  <Td className="text-xs">
                    {stat ? (
                      <>
                        <span className="font-semibold text-ink">
                          {stat.paid_registrations}/{stat.registrations} lunas
                        </span>
                        <span className="mt-0.5 block text-muted">
                          {formatRupiah(Number(stat.revenue))}
                        </span>
                      </>
                    ) : (
                      "—"
                    )}
                  </Td>
                  <Td>
                    <StatusBadge tone={label.tone}>{label.text}</StatusBadge>
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-2">
                      {row.status !== "ACTIVE" ? (
                        <ConfirmDialog
                          action={setAffiliateStatusAction}
                          hidden={{ affiliateId: row.id, status: "ACTIVE" }}
                          trigger={row.code ? "Aktifkan" : "Setujui"}
                          title="Setujui affiliate"
                          description={
                            row.code
                              ? "Kode yang sudah ada akan dipakai kembali."
                              : "Kode rujukan akan dibuat otomatis dari nama depannya dan langsung bisa dipakai pendaftar."
                          }
                          summary={[
                            { label: "Nama", value: row.full_name },
                            { label: "WhatsApp", value: row.whatsapp },
                            { label: "Kode", value: row.code ?? "Dibuat otomatis" },
                          ]}
                          confirmLabel="Setujui"
                        />
                      ) : null}
                      {row.status === "ACTIVE" ? (
                        <ConfirmDialog
                          action={setAffiliateStatusAction}
                          hidden={{ affiliateId: row.id, status: "INACTIVE" }}
                          trigger="Nonaktifkan"
                          title="Nonaktifkan affiliate"
                          description="Kodenya langsung berhenti memberi diskon, tapi tetap tersimpan atas nama orang ini dan tidak akan diberikan ke orang lain."
                          summary={[
                            { label: "Nama", value: row.full_name },
                            { label: "Kode", value: row.code ?? "—" },
                          ]}
                          confirmLabel="Nonaktifkan"
                          tone="danger"
                        />
                      ) : null}
                      {row.status === "PENDING" ? (
                        <ConfirmDialog
                          action={setAffiliateStatusAction}
                          hidden={{ affiliateId: row.id, status: "REJECTED" }}
                          trigger="Tolak"
                          title="Tolak pendaftaran affiliate"
                          description="Pendaftaran ini ditandai ditolak. Datanya tetap tersimpan untuk catatan."
                          summary={[{ label: "Nama", value: row.full_name }]}
                          confirmLabel="Tolak"
                          tone="danger"
                          reasonField={{
                            name: "notes",
                            label: "Catatan (opsional)",
                            placeholder: "Alasan penolakan",
                          }}
                        />
                      ) : null}
                    </div>
                  </Td>
                </tr>
              );
            })
          )}
        </tbody>
      </TableShell>

      <Card>
        <h2 className="text-sm font-extrabold text-ink">Cara kerjanya</h2>
        <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-ink-soft">
          <li>
            Pendaftar mengisi form di halaman Affiliate dan masuk ke sini dengan status Menunggu,
            tanpa kode.
          </li>
          <li>
            Saat disetujui, kode dibuat dari nama depannya (mis. BUDI01). Kode tidak pernah
            dipindahtangankan ke orang lain, bahkan setelah dinonaktifkan.
          </li>
          <li>
            Pendaftar yang memakai kode aktif otomatis mendapat harga Group, sesuai aturan di
            Pengaturan Diskon.
          </li>
        </ul>
      </Card>
    </div>
  );
}
