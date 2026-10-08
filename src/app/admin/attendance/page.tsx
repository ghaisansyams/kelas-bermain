import { setAttendanceAction } from "@/app/admin/attendance/actions";
import { Card, Notice, PageHeader, StatCard } from "@/components/admin/admin-ui";
import {
  ATTENDANCE_LABEL,
  EmptyRow,
  FilterBar,
  RefCell,
  PAYMENT_LABEL,
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

interface AttendanceRow {
  id: string;
  registration_number: string;
  attendance_status: string;
  payment_status: string;
  children: { full_name: string } | null;
  customers: { full_name: string } | null;
  attendance_records: { checked_in_at: string | null; method: string }[] | null;
}

export default async function AdminAttendancePage({
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
          "id, registration_number, attendance_status, payment_status, children(full_name), customers(full_name), attendance_records(checked_in_at, method)",
        )
        .eq("event_id", selected)
        .neq("status", "CANCELLED")
        .order("registration_number")
        .limit(500)
    : { data: [], error: null };

  const rows = (data ?? []) as unknown as AttendanceRow[];
  const present = rows.filter((row) => row.attendance_status === "PRESENT").length;
  const absent = rows.filter((row) => row.attendance_status === "ABSENT").length;
  const waiting = rows.length - present - absent;
  const rate = rows.length > 0 ? Math.round((present / rows.length) * 100) : 0;
  const eventTitle = events.find((item) => item.id === selected)?.title ?? "—";

  return (
    <div className="space-y-5">
      <PageHeader
        title="Kehadiran"
        description="Pilih event, lalu tandai peserta yang datang. Tercatat lengkap dengan waktu check-in."
      />

      {status === "saved" ? <Notice tone="success">Kehadiran diperbarui.</Notice> : null}
      {status === "error" ? <Notice tone="error">Gagal memperbarui kehadiran.</Notice> : null}

      <FilterBar action="/admin/attendance">
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total anak" value={String(rows.length)} hint={eventTitle} />
        <StatCard label="Hadir" value={String(present)} />
        <StatCard label="Belum check-in" value={String(waiting)} />
        <StatCard label="Tingkat kehadiran" value={`${rate}%`} />
      </div>

      {error ? (
        <Card>
          <p className="text-sm text-brand-ink">Data kehadiran gagal dimuat.</p>
        </Card>
      ) : (
        <TableShell>
          <thead>
            <tr className="border-b border-line">
              <Th>Registrasi</Th>
              <Th>Anak</Th>
              <Th>Pendamping</Th>
              <Th>Pembayaran</Th>
              <Th>Kehadiran</Th>
              <Th className="w-[11rem]">Check-in</Th>
              <Th className="w-[13rem]">Aksi</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 ? (
              <EmptyRow colSpan={7}>Belum ada anak terdaftar untuk event ini.</EmptyRow>
            ) : (
              rows.map((row) => {
                const attendance = ATTENDANCE_LABEL[row.attendance_status] ?? {
                  text: row.attendance_status,
                  tone: "grey",
                };
                const payment = PAYMENT_LABEL[row.payment_status] ?? {
                  text: row.payment_status,
                  tone: "grey",
                };
                const record = row.attendance_records?.[0];
                return (
                  <tr key={row.id}>
                    <Td>
                      <RefCell>{row.registration_number}</RefCell>
                    </Td>
                    <Td className="font-semibold text-ink">{row.children?.full_name ?? "—"}</Td>
                    <Td>{row.customers?.full_name ?? "—"}</Td>
                    <Td>
                      <StatusBadge tone={payment.tone}>{payment.text}</StatusBadge>
                    </Td>
                    <Td>
                      <StatusBadge tone={attendance.tone}>{attendance.text}</StatusBadge>
                    </Td>
                    <Td className="text-xs">
                      {record?.checked_in_at
                        ? `${new Date(record.checked_in_at).toLocaleString("id-ID")} · ${record.method}`
                        : "—"}
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1.5">
                        {row.attendance_status !== "PRESENT" ? (
                          <form action={setAttendanceAction}>
                            <input type="hidden" name="registrationId" value={row.id} />
                            <input type="hidden" name="eventId" value={selected} />
                            <input type="hidden" name="status" value="PRESENT" />
                            <button
                              type="submit"
                              className="inline-flex min-h-9 items-center whitespace-nowrap rounded-pill bg-brand px-3.5 text-xs font-bold text-white transition-colors hover:bg-brand-ink"
                            >
                              Hadir
                            </button>
                          </form>
                        ) : null}
                        {row.attendance_status !== "ABSENT" ? (
                          <form action={setAttendanceAction}>
                            <input type="hidden" name="registrationId" value={row.id} />
                            <input type="hidden" name="eventId" value={selected} />
                            <input type="hidden" name="status" value="ABSENT" />
                            <button
                              type="submit"
                              className="inline-flex min-h-9 items-center whitespace-nowrap rounded-pill border border-line px-3.5 text-xs font-semibold text-ink-soft transition-colors hover:border-brand/40 hover:text-brand"
                            >
                              Tidak hadir
                            </button>
                          </form>
                        ) : null}
                      </div>
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
