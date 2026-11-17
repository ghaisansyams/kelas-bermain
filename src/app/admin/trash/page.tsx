import { ArchiveRestore } from "lucide-react";
import { purgeBinEntryAction, restoreBinEntryAction } from "@/app/admin/trash/actions";
import { Card, Notice, PageHeader } from "@/components/admin/admin-ui";
import { DeleteDialog } from "@/components/admin/delete-dialog";
import { EmptyRow, StatusBadge, TableShell, Td, Th } from "@/components/admin/data-table";
import { requireRole } from "@/lib/admin/auth";
import { daysLeft, listBin, purgeExpired, RETENTION_DAYS, type BinDetails } from "@/lib/admin/recycle-bin";
import { formatDate } from "@/lib/utils/date";
import { formatRupiah } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, { text: string; tone: string }> = {
  EVENT: { text: "Event", tone: "amber" },
  CUSTOMER: { text: "Pendamping", tone: "green" },
  CHILD: { text: "Anak", tone: "grey" },
};

/** Apa saja yang ikut dipulihkan, supaya admin tahu isi sebuah entri sebelum memulihkannya. */
function describeDetails(kind: string, details: BinDetails): string {
  const parts: string[] = [];
  if (kind === "CUSTOMER" && details.children) parts.push(`${details.children} anak`);
  if (details.registrations) parts.push(`${details.registrations} pendaftaran`);
  if (details.payments) {
    parts.push(
      details.paidPayments
        ? `${details.payments} pembayaran (${details.paidPayments} lunas, ${formatRupiah(details.paidTotal)})`
        : `${details.payments} pembayaran`,
    );
  }
  if (details.certificates) parts.push(`${details.certificates} sertifikat`);
  return parts.length > 0 ? parts.join(" · ") : "Tanpa pendaftaran";
}

export default async function AdminTrashPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string; note?: string }>;
}) {
  await requireRole("SUPER_ADMIN");
  const params = await searchParams;
  await purgeExpired();

  let rows: Awaited<ReturnType<typeof listBin>> = [];
  let failed = false;
  try {
    rows = await listBin();
  } catch {
    failed = true;
  }

  const notice =
    params.msg === "restored"
      ? { tone: "success" as const, text: params.note || "Data dipulihkan." }
      : params.msg === "restore-failed"
        ? { tone: "error" as const, text: params.note || "Pemulihan gagal." }
        : params.msg === "purged"
          ? { tone: "success" as const, text: "Dibuang permanen." }
          : params.msg === "wrong-confirm"
            ? { tone: "error" as const, text: "Tulisan konfirmasi tidak cocok, jadi tidak ada yang dibuang." }
            : params.msg === "error"
              ? { tone: "error" as const, text: "Aksi gagal dijalankan." }
              : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Terhapus"
        description={`Event, pendamping, dan anak yang dihapus disimpan di sini selama ${RETENTION_DAYS} hari. Pulihkan kapan saja sebelum waktunya habis; sesudahnya dibuang permanen.`}
      />

      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
      {failed ? <Notice tone="error">Daftar gagal dimuat. Coba muat ulang halaman ini.</Notice> : null}

      <Card className="text-sm leading-relaxed text-ink-soft">
        Memulihkan mengembalikan data persis seperti sebelum dihapus, termasuk pendaftaran, pembayaran,
        kehadiran, sertifikat, dan catatan keuangannya. Kalau event, pendamping, atau anak yang
        berkaitan sudah dihapus juga, pendaftaran yang bergantung padanya tidak ikut pulih dan
        akan diberi tahu. Alamat event yang sudah dipakai event baru diberi akhiran &quot;-pulih&quot;.
      </Card>

      {!failed ? (
        <TableShell>
          <thead>
            <tr className="border-b border-line">
              <Th>Jenis</Th>
              <Th>Nama</Th>
              <Th>Isi</Th>
              <Th>Dihapus</Th>
              <Th>Sisa waktu</Th>
              <Th>Aksi</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 ? (
              <EmptyRow colSpan={6}>Tidak ada yang terhapus. Data yang kamu hapus akan muncul di sini.</EmptyRow>
            ) : (
              rows.map((row) => {
                const kind = KIND_LABEL[row.kind] ?? { text: row.kind, tone: "grey" };
                const left = daysLeft(row.expires_at);
                const details = row.details as unknown as BinDetails;
                return (
                  <tr key={row.id}>
                    <Td>
                      <StatusBadge tone={kind.tone}>{kind.text}</StatusBadge>
                    </Td>
                    <Td className="font-semibold text-ink">
                      {row.label}
                      {row.code ? <span className="block text-xs font-normal text-muted">{row.code}</span> : null}
                    </Td>
                    <Td className="max-w-xs text-xs text-ink-soft">{describeDetails(row.kind, details)}</Td>
                    <Td>
                      {formatDate(row.deleted_at.toISOString())}
                      {row.deleted_by_name ? (
                        <span className="block text-xs text-muted">oleh {row.deleted_by_name}</span>
                      ) : null}
                    </Td>
                    <Td>
                      <span className={left <= 3 ? "font-bold text-brand" : "font-semibold text-ink"}>
                        {left} hari lagi
                      </span>
                      <span className="block text-xs text-muted">sampai {formatDate(row.expires_at.toISOString())}</span>
                    </Td>
                    <Td>
                      <div className="flex flex-wrap items-center gap-2">
                        <form action={restoreBinEntryAction}>
                          <input type="hidden" name="id" value={row.id} />
                          <button
                            type="submit"
                            className="inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-pill bg-brand px-3 text-xs font-bold text-white hover:bg-brand-ink"
                          >
                            <ArchiveRestore className="size-3.5" aria-hidden />
                            Pulihkan
                          </button>
                        </form>
                        <DeleteDialog
                          permanent
                          action={purgeBinEntryAction}
                          hidden={{ id: row.id }}
                          code="HAPUS"
                          title="Buang permanen sekarang?"
                          triggerLabel="Buang"
                          summary={[
                            { label: "Jenis", value: kind.text },
                            { label: "Nama", value: row.label },
                            { label: "Sisa waktu", value: `${left} hari` },
                          ]}
                          consequences={[
                            "Seluruh isinya: " + describeDetails(row.kind, details).toLowerCase(),
                            "Berkas bukti transfer yang terkait",
                            `Dibuang sebelum ${RETENTION_DAYS} hari habis, jadi tidak ada lagi jalan untuk memulihkannya`,
                          ]}
                        />
                      </div>
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </TableShell>
      ) : null}
    </div>
  );
}
