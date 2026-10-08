import {
  issueAllCertificatesAction,
  issueCertificateAction,
  revokeCertificateAction,
} from "@/app/admin/certificates/actions";
import { Card, Notice, PageHeader, StatCard } from "@/components/admin/admin-ui";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import {
  EmptyRow,
  FilterBar,
  RefCell,
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

export const dynamic = "force-dynamic";

interface Row {
  id: string;
  registration_number: string;
  attendance_status: string;
  certificate_status: string;
  children: { full_name: string } | null;
  certificates: { number: string; status: string; issued_at: string }[] | null;
}

const CERT_LABEL: Record<string, { text: string; tone: string }> = {
  NOT_ELIGIBLE: { text: "Belum memenuhi syarat", tone: "grey" },
  AVAILABLE: { text: "Siap diterbitkan", tone: "sun" },
  ISSUED: { text: "Terbit", tone: "pine" },
};

function noticeFor(status?: string) {
  if (!status) return undefined;
  if (status === "issued") return { tone: "success" as const, text: "Sertifikat diterbitkan." };
  if (status === "revoked") return { tone: "success" as const, text: "Sertifikat dibatalkan." };
  if (status.startsWith("bulk-")) {
    return {
      tone: "success" as const,
      text: `${status.replace("bulk-", "")} sertifikat diterbitkan.`,
    };
  }
  if (status === "none") {
    return { tone: "info" as const, text: "Tidak ada peserta hadir yang belum punya sertifikat." };
  }
  if (status === "not-attended") {
    return {
      tone: "error" as const,
      text: "Sertifikat hanya bisa diterbitkan untuk peserta yang tercatat hadir.",
    };
  }
  return { tone: "error" as const, text: "Aksi gagal dijalankan." };
}

export default async function AdminCertificatesPage({
  searchParams,
}: {
  searchParams: Promise<{ event?: string; status?: string }>;
}) {
  await requireAdmin();
  const { event, status } = await searchParams;
  const events = await getEvents();
  const selected = event ?? events[0]?.id ?? "";
  const supabase = await createSupabaseServerClient();

  const { data, error } = selected
    ? await supabase
        .from("registrations")
        .select(
          "id, registration_number, attendance_status, certificate_status, children(full_name), certificates(number, status, issued_at)",
        )
        .eq("event_id", selected)
        .neq("status", "CANCELLED")
        .order("registration_number")
        .limit(500)
    : { data: [], error: null };

  const rows = (data ?? []) as unknown as Row[];
  const issued = rows.filter((row) => row.certificate_status === "ISSUED").length;
  const ready = rows.filter((row) => row.certificate_status === "AVAILABLE").length;
  const eventTitle = events.find((item) => item.id === selected)?.title ?? "—";
  const notice = noticeFor(status);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Sertifikat"
        description="Sertifikat hanya terbit untuk peserta yang tercatat hadir. Nomor dibuat otomatis dan tidak pernah dipakai dua kali."
      />

      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}

      <FilterBar action="/admin/certificates">
        <SelectField
          name="event"
          label="Event"
          value={selected}
          options={events.map((item) => ({
            value: item.id,
            label: `${item.title} — ${formatDate(item.startDate)}`,
          }))}
        />
      </FilterBar>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Anak" value={String(rows.length)} hint={eventTitle} />
        <StatCard label="Sertifikat terbit" value={String(issued)} />
        <StatCard label="Siap diterbitkan" value={String(ready)} />
      </div>

      {ready > 0 ? (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-soft">
            {ready} peserta hadir belum punya sertifikat untuk event ini.
          </p>
          <ConfirmDialog
            action={issueAllCertificatesAction}
            hidden={{ eventId: selected }}
            trigger={`Terbitkan ${ready} sertifikat`}
            title="Terbitkan sertifikat massal"
            description="Setiap anak yang tercatat hadir dan belum punya sertifikat akan mendapat satu nomor. Yang sudah punya dilewati."
            summary={[
              { label: "Event", value: eventTitle },
              { label: "Akan diterbitkan", value: String(ready) },
            ]}
            confirmLabel="Terbitkan"
          />
        </Card>
      ) : null}

      {error ? (
        <Card>
          <p className="text-sm text-brand-ink">Data sertifikat gagal dimuat.</p>
        </Card>
      ) : (
        <TableShell>
          <thead>
            <tr className="border-b border-line">
              <Th>Registrasi</Th>
              <Th>Anak</Th>
              <Th>Kehadiran</Th>
              <Th className="w-[12rem]">Status sertifikat</Th>
              <Th>Nomor</Th>
              <Th className="w-[12rem]">Aksi</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 ? (
              <EmptyRow colSpan={6}>Belum ada anak terdaftar untuk event ini.</EmptyRow>
            ) : (
              rows.map((row) => {
                const cert = row.certificates?.find((item) => item.status === "issued");
                const label = CERT_LABEL[row.certificate_status] ?? {
                  text: row.certificate_status,
                  tone: "grey",
                };
                return (
                  <tr key={row.id}>
                    <Td>
                      <RefCell>{row.registration_number}</RefCell>
                    </Td>
                    <Td className="font-semibold text-ink">{row.children?.full_name ?? "—"}</Td>
                    <Td>
                      <StatusBadge tone={row.attendance_status === "PRESENT" ? "pine" : "grey"}>
                        {row.attendance_status === "PRESENT" ? "Hadir" : "Belum hadir"}
                      </StatusBadge>
                    </Td>
                    <Td>
                      <StatusBadge tone={label.tone}>{label.text}</StatusBadge>
                    </Td>
                    <Td>
                      {cert ? <RefCell>{cert.number}</RefCell> : "—"}
                    </Td>
                    <Td>
                      {cert ? (
                        <ConfirmDialog
                          action={revokeCertificateAction}
                          hidden={{ number: cert.number, eventId: selected }}
                          trigger="Batalkan"
                          title="Batalkan sertifikat"
                          description="Nomor tetap tercatat dan tidak akan dipakai ulang. Anak ini bisa diterbitkan sertifikat baru setelah ini."
                          summary={[
                            { label: "Nomor", value: cert.number },
                            { label: "Anak", value: row.children?.full_name ?? "—" },
                          ]}
                          confirmLabel="Batalkan sertifikat"
                          tone="danger"
                          reasonField={{
                            name: "reason",
                            label: "Alasan pembatalan",
                            placeholder: "Nama salah tulis",
                          }}
                        />
                      ) : row.attendance_status === "PRESENT" ? (
                        <form action={issueCertificateAction}>
                          <input type="hidden" name="registrationId" value={row.id} />
                          <input type="hidden" name="eventId" value={selected} />
                          <button
                            type="submit"
                            className="inline-flex min-h-9 items-center rounded-pill bg-brand px-3 text-xs font-bold text-white"
                          >
                            Terbitkan
                          </button>
                        </form>
                      ) : (
                        <span className="text-xs text-muted">Tandai hadir dulu</span>
                      )}
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </TableShell>
      )}
    </div>
  );
}
