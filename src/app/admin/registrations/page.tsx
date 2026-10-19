import Link from "next/link";
import { Card, PageHeader } from "@/components/admin/admin-ui";
import {
  EmptyRow,
  FilterBar,
  PAYMENT_LABEL,
  Pagination,
  REGISTRATION_LABEL,
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

export default async function AdminRegistrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; event?: string; status?: string; payment?: string; page?: string }>;
}) {
  await requireAdmin();
  const { q, event, status, payment, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam ?? 1) || 1);
  const events = await getEvents();

  const where = {
    ...(q ? { registration_number: { contains: q, mode: "insensitive" as const } } : {}),
    ...(event ? { event_id: event } : {}),
    ...(status ? { status } : {}),
    ...(payment ? { payment_status: payment } : {}),
  };

  type RegistrationRow = {
    id: string;
    registration_number: string;
    event_id: string;
    registration_date: Date;
    status: string;
    payment_status: string;
    attendance_status: string;
    amount: number;
    affiliate_code: string | null;
    customers: { id: string; full_name: string } | null;
    children: { full_name: string } | null;
  };

  let rows: RegistrationRow[] = [];
  let count = 0;
  let error = false;

  try {
    const [list, total] = await Promise.all([
      db.registrations.findMany({
        where,
        select: {
          id: true,
          registration_number: true,
          event_id: true,
          registration_date: true,
          status: true,
          payment_status: true,
          attendance_status: true,
          amount: true,
          affiliate_code: true,
          customers: { select: { id: true, full_name: true } },
          children: { select: { full_name: true } },
        },
        orderBy: { registration_date: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      db.registrations.count({ where }),
    ]);
    rows = list.map((row) => ({ ...row, amount: Number(row.amount) }));
    count = total;
  } catch {
    error = true;
  }

  const eventTitle = (id: string) => events.find((item) => item.id === id)?.title ?? id;

  return (
    <div className="space-y-5">
      <PageHeader title="Registrasi" description="Semua pendaftaran dari website publik." />

      <FilterBar action="/admin/registrations">
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
            { value: "REGISTERED", label: "Terdaftar" },
            { value: "CONFIRMED", label: "Dikonfirmasi" },
            { value: "CANCELLED", label: "Dibatalkan" },
            { value: "COMPLETED", label: "Selesai" },
          ]}
        />
        <SelectField
          name="payment"
          label="Pembayaran"
          value={payment}
          options={[
            { value: "", label: "Semua" },
            { value: "PENDING", label: "Menunggu" },
            { value: "PAID", label: "Lunas" },
            { value: "REFUNDED", label: "Refund" },
            { value: "NOT_REQUIRED", label: "Tidak diperlukan" },
          ]}
        />
      </FilterBar>

      {error ? (
        <Card>
          <p className="text-sm text-brand-ink">Data gagal dimuat.</p>
        </Card>
      ) : (
        <>
          <TableShell>
            <thead>
              <tr className="border-b border-line">
                <Th>Nomor</Th>
                <Th>Anak</Th>
                <Th>Pendamping</Th>
                <Th>Event</Th>
                <Th>Tanggal</Th>
                <Th>Nominal</Th>
                <Th>Status</Th>
                <Th>Pembayaran</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.length === 0 ? (
                <EmptyRow colSpan={8}>Belum ada registrasi.</EmptyRow>
              ) : (
                rows.map((row) => {
                  const reg = REGISTRATION_LABEL[row.status] ?? { text: row.status, tone: "grey" };
                  const pay = PAYMENT_LABEL[row.payment_status] ?? { text: row.payment_status, tone: "grey" };
                  return (
                    <tr key={row.id}>
                      <Td className="whitespace-nowrap font-mono text-xs font-bold text-ink">{row.registration_number}</Td>
                      <Td className="font-semibold text-ink">{row.children?.full_name ?? "—"}</Td>
                      <Td>
                        {row.customers ? (
                          <Link
                            href={`/admin/customers/${row.customers.id}`}
                            className="font-semibold text-brand hover:underline"
                          >
                            {row.customers.full_name}
                          </Link>
                        ) : (
                          "—"
                        )}
                      </Td>
                      <Td>{eventTitle(row.event_id)}</Td>
                      <Td>{formatDate(row.registration_date.toISOString())}</Td>
                      <Td>{formatRupiah(Number(row.amount))}</Td>
                      <Td>
                        <StatusBadge tone={reg.tone}>{reg.text}</StatusBadge>
                      </Td>
                      <Td>
                        <StatusBadge tone={pay.tone}>{pay.text}</StatusBadge>
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
            basePath="/admin/registrations"
            params={{ q, event, status, payment }}
          />
        </>
      )}
    </div>
  );
}
