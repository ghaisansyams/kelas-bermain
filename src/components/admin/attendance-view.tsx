"use client";

import { useMemo, useState } from "react";
import { CheckCheck, Download, Loader2, QrCode } from "lucide-react";
import Link from "next/link";
import {
  AdminPageHeader, DataTable, FilterBar, FilterSearch, FilterSelect,
  Panel, ResultCount, StatCard, StatusBadge, type Column,
} from "@/components/admin/ui";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useCollection } from "@/hooks/use-collection";
import { events } from "@/data/events";
import type { AttendanceStatus } from "@/lib/repositories/types";
import { setAttendance } from "@/lib/services/attendance";
import {
  downloadCsv, getRegistrationRows, toCsv, type RegistrationRow,
} from "@/lib/services/admin";
import { formatDateShort } from "@/lib/utils/date";

const STATUSES: AttendanceStatus[] = ["NOT_ATTENDED", "PRESENT", "ABSENT"];

/**
 * Attendance is driven from the registration list rather than the raw records,
 * so a participant who has not checked in yet still appears and can be marked.
 */
export function AttendanceView() {
  const { data, loading, reload } = useCollection(() => getRegistrationRows(), []);
  const [query, setQuery] = useState("");
  const [eventId, setEventId] = useState("all");
  const [status, setStatus] = useState("all");
  const [updating, setUpdating] = useState<string | null>(null);

  const rows = useMemo(() => data ?? [], [data]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesQuery =
        !q ||
        [row.registration.registrationNumber, row.child?.fullName, row.customer?.fullName].some(
          (v) => v?.toLowerCase().includes(q),
        );
      return (
        matchesQuery &&
        (eventId === "all" || row.registration.eventId === eventId) &&
        (status === "all" || row.registration.attendanceStatus === status)
      );
    });
  }, [rows, query, eventId, status]);

  const counts = useMemo(
    () => ({
      present: filtered.filter((r) => r.registration.attendanceStatus === "PRESENT").length,
      absent: filtered.filter((r) => r.registration.attendanceStatus === "ABSENT").length,
      pending: filtered.filter((r) => r.registration.attendanceStatus === "NOT_ATTENDED").length,
    }),
    [filtered],
  );

  async function mark(registrationId: string, next: AttendanceStatus) {
    setUpdating(registrationId);
    await setAttendance(registrationId, next);
    await reload();
    setUpdating(null);
  }

  const selectedEvent = events.find((e) => e.id === eventId);

  const columns: Column<RegistrationRow>[] = [
    {
      key: "number",
      header: "No. Pendaftaran",
      render: (row) => (
        <span className="whitespace-nowrap font-mono text-xs font-bold text-ink">
          {row.registration.registrationNumber}
        </span>
      ),
    },
    {
      key: "child",
      header: "Anak",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{row.child?.fullName ?? "—"}</p>
          <p className="truncate text-xs text-muted">{row.customer?.fullName}</p>
        </div>
      ),
    },
    {
      key: "event",
      header: "Event",
      hideBelow: "md",
      render: (row) => (
        <span className="block max-w-[12rem] truncate text-xs text-ink-soft">
          {row.event?.title ?? "—"}
        </span>
      ),
    },
    {
      key: "date",
      header: "Tanggal Event",
      hideBelow: "lg",
      render: (row) => (
        <span className="whitespace-nowrap text-xs text-muted">
          {row.event ? formatDateShort(row.event.startDate) : "—"}
        </span>
      ),
    },
    { key: "status", header: "Kehadiran", render: (row) => <StatusBadge status={row.registration.attendanceStatus} /> },
    {
      key: "actions",
      header: "Tandai",
      render: (row) =>
        updating === row.registration.id ? (
          <Loader2 className="size-4 animate-spin text-muted" aria-hidden />
        ) : (
          <select
            aria-label={`Ubah kehadiran ${row.registration.registrationNumber}`}
            value={row.registration.attendanceStatus}
            onChange={(e) => mark(row.registration.id, e.target.value as AttendanceStatus)}
            className="h-8 rounded-lg border border-line bg-canvas px-2 text-xs font-medium text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === "PRESENT" ? "Hadir" : s === "ABSENT" ? "Tidak Hadir" : "Belum Hadir"}
              </option>
            ))}
          </select>
        ),
    },
  ];

  return (
    <>
      <AdminPageHeader
        title="Kehadiran"
        description="Tandai kehadiran manual, atau bagikan QR check-in agar peserta mencatat sendiri di lokasi."
        actions={
          <>
            {selectedEvent ? (
              <Link
                href={`/admin/events/${selectedEvent.id}/qr`}
                className={buttonStyles({ variant: "secondary", size: "sm" })}
              >
                <QrCode className="size-4" aria-hidden />
                QR Check-in
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() =>
                downloadCsv(
                  "kelas-bermain-kehadiran.csv",
                  toCsv(filtered, [
                    { header: "No. Pendaftaran", value: (r) => r.registration.registrationNumber },
                    { header: "Anak", value: (r) => r.child?.fullName ?? "" },
                    { header: "Orang Tua", value: (r) => r.customer?.fullName ?? "" },
                    { header: "Event", value: (r) => r.event?.title ?? "" },
                    { header: "Tanggal Event", value: (r) => r.event?.startDate ?? "" },
                    { header: "Kehadiran", value: (r) => r.registration.attendanceStatus },
                  ]),
                )
              }
              className={buttonStyles({ variant: "secondary", size: "sm" })}
            >
              <Download className="size-4" aria-hidden />
              Ekspor CSV
            </button>
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Hadir" value={String(counts.present)} tone="pine" />
        <StatCard label="Tidak Hadir" value={String(counts.absent)} tone="brand" />
        <StatCard label="Belum Tercatat" value={String(counts.pending)} tone="neutral" />
      </div>

      <FilterBar>
        <FilterSearch value={query} onChange={setQuery} placeholder="Nomor pendaftaran, nama anak…" />
        <FilterSelect
          label="Event"
          value={eventId}
          onChange={setEventId}
          options={[{ value: "all", label: "Semua event" }, ...events.map((e) => ({ value: e.id, label: e.title }))]}
        />
        <FilterSelect
          label="Kehadiran"
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: "Semua" },
            { value: "PRESENT", label: "Hadir" },
            { value: "ABSENT", label: "Tidak Hadir" },
            { value: "NOT_ATTENDED", label: "Belum Hadir" },
          ]}
        />
      </FilterBar>

      <ResultCount shown={filtered.length} total={rows.length} noun="peserta" />

      <Panel>
        <DataTable
          rows={filtered}
          columns={columns}
          getKey={(row) => row.registration.id}
          loading={loading}
          caption="Daftar kehadiran peserta"
          empty={
            <EmptyState
              icon={<CheckCheck className="size-6" aria-hidden />}
              title="Tidak ada peserta"
              description="Coba ubah filter event atau status kehadiran."
              className="border-none bg-transparent"
            />
          }
        />
      </Panel>
    </>
  );
}
