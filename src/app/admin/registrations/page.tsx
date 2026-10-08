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
import { createSupabaseServerClient } from "@/lib/supabase/server";
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
  const supabase = await createSupabaseServerClient();
  const events = await getEvents();

  let query = supabase
    .from("registrations")
    .select(
      "id, registration_number, event_id, registration_date, status, payment_status, attendance_status, amount, affiliate_code, customers(id, full_name), children(full_name)",
      { count: "exact" },
    )
    .order("registration_date", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  if (q) query = query.ilike("registration_number", `%${q}%`);
  if (event) query = query.eq("event_id", event);
  if (status) query = query.eq("status", status);
  if (payment) query = query.eq("payment_status", payment);

  const { data, count, error } = await query;
  const rows = (data ?? []) as unknown as {
    id: string;
    registration_number: string;
    event_id: string;
    registration_date: string;
    status: string;
    payment_status: string;
    attendance_status: string;
    amount: number;
    affiliate_code: string | null;
    customers: { id: string; full_name: string } | null;
    children: { full_name: string } | null;
  }[];

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
                      <Td>{formatDate(row.registration_date)}</Td>
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
            total={count ?? 0}
            basePath="/admin/registrations"
            params={{ q, event, status, payment }}
          />
        </>
      )}
    </div>
  );
}
