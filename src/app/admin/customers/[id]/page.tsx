import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, PageHeader, StatCard } from "@/components/admin/admin-ui";
import {
  PAYMENT_LABEL,
  REGISTRATION_LABEL,
  StatusBadge,
  TableShell,
  Td,
  Th,
} from "@/components/admin/data-table";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils/date";
import { formatRupiah } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const [{ data: customer }, { data: childRows }, { data: registrationRows }, { data: paymentRows }] =
    await Promise.all([
      supabase
        .from("customers")
        .select("id, customer_number, full_name, whatsapp, email, domicile, occupation, source, status, created_at")
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("children")
        .select("id, child_number, full_name, nickname, age_years, age_months, status")
        .eq("customer_id", id)
        .order("created_at"),
      supabase
        .from("registrations")
        .select("id, registration_number, event_id, registration_date, status, payment_status, amount, attendance_status, children(full_name)")
        .eq("customer_id", id)
        .order("registration_date", { ascending: false }),
      supabase
        .from("payments")
        .select("id, payment_number, invoice_number, amount, status, method, paid_at, created_at")
        .eq("customer_id", id)
        .order("created_at", { ascending: false }),
    ]);

  if (!customer) notFound();

  const children = (childRows ?? []) as {
    id: string;
    child_number: string;
    full_name: string;
    nickname: string;
    age_years: number | null;
    age_months: number | null;
    status: string;
  }[];
  const registrations = (registrationRows ?? []) as unknown as {
    id: string;
    registration_number: string;
    event_id: string;
    registration_date: string;
    status: string;
    payment_status: string;
    amount: number;
    attendance_status: string;
    children: { full_name: string } | null;
  }[];
  const payments = (paymentRows ?? []) as {
    id: string;
    payment_number: string;
    invoice_number: string | null;
    amount: number;
    status: string;
    method: string;
    paid_at: string | null;
    created_at: string;
  }[];

  const paidTotal = payments
    .filter((payment) => payment.status === "PAID")
    .reduce((sum, payment) => sum + Number(payment.amount), 0);
  const presentCount = registrations.filter((row) => row.attendance_status === "PRESENT").length;

  return (
    <div className="space-y-5">
      <Link
        href="/admin/customers"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-brand"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Kembali ke daftar peserta
      </Link>

      <PageHeader
        title={customer.full_name}
        description={`${customer.customer_number} · ${customer.whatsapp}`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Anak" value={String(children.length)} />
        <StatCard label="Registrasi" value={String(registrations.length)} />
        <StatCard label="Total dibayar" value={formatRupiah(paidTotal)} />
        <StatCard label="Kehadiran" value={`${presentCount}x hadir`} />
      </div>

      <Card>
        <h2 className="text-base font-extrabold text-ink">Data pendamping</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <Line label="Email" value={customer.email || "—"} />
          <Line label="Domisili" value={customer.domicile || "—"} />
          <Line label="Pekerjaan" value={customer.occupation || "—"} />
          <Line label="Mengetahui dari" value={customer.source || "—"} />
          <Line label="Status" value={customer.status === "active" ? "Aktif" : "Nonaktif"} />
          <Line label="Terdaftar" value={formatDate(customer.created_at)} />
        </dl>
      </Card>

      <Card className="p-0">
        <h2 className="px-5 pt-5 text-base font-extrabold text-ink sm:px-6">Anak</h2>
        <div className="mt-3">
          <TableShell>
            <thead>
              <tr className="border-b border-line">
                <Th>Kode</Th>
                <Th>Nama</Th>
                <Th>Panggilan</Th>
                <Th>Usia</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {children.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-muted">
                    Belum ada anak terdaftar.
                  </td>
                </tr>
              ) : (
                children.map((child) => (
                  <tr key={child.id}>
                    <Td className="font-mono text-xs font-bold text-ink">{child.child_number}</Td>
                    <Td className="font-semibold text-ink">{child.full_name}</Td>
                    <Td>{child.nickname || "—"}</Td>
                    <Td>
                      {child.age_years !== null
                        ? `${child.age_years} tahun${child.age_months ? ` ${child.age_months} bulan` : ""}`
                        : "—"}
                    </Td>
                    <Td>{child.status === "active" ? "Aktif" : "Nonaktif"}</Td>
                  </tr>
                ))
              )}
            </tbody>
          </TableShell>
        </div>
      </Card>

      <Card className="p-0">
        <h2 className="px-5 pt-5 text-base font-extrabold text-ink sm:px-6">Registrasi</h2>
        <div className="mt-3">
          <TableShell>
            <thead>
              <tr className="border-b border-line">
                <Th>Nomor</Th>
                <Th>Anak</Th>
                <Th>Event</Th>
                <Th>Tanggal</Th>
                <Th>Status</Th>
                <Th>Pembayaran</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {registrations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-sm text-muted">
                    Belum ada registrasi.
                  </td>
                </tr>
              ) : (
                registrations.map((row) => {
                  const reg = REGISTRATION_LABEL[row.status] ?? { text: row.status, tone: "grey" };
                  const pay = PAYMENT_LABEL[row.payment_status] ?? {
                    text: row.payment_status,
                    tone: "grey",
                  };
                  return (
                    <tr key={row.id}>
                      <Td className="font-mono text-xs font-bold text-ink">{row.registration_number}</Td>
                      <Td>{row.children?.full_name ?? "—"}</Td>
                      <Td>{row.event_id}</Td>
                      <Td>{formatDate(row.registration_date)}</Td>
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
        </div>
      </Card>

      <Card className="p-0">
        <h2 className="px-5 pt-5 text-base font-extrabold text-ink sm:px-6">Pembayaran</h2>
        <div className="mt-3">
          <TableShell>
            <thead>
              <tr className="border-b border-line">
                <Th>Invoice</Th>
                <Th>Nominal</Th>
                <Th>Metode</Th>
                <Th>Status</Th>
                <Th>Dibayar</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-muted">
                    Belum ada pembayaran.
                  </td>
                </tr>
              ) : (
                payments.map((payment) => {
                  const label = PAYMENT_LABEL[payment.status] ?? { text: payment.status, tone: "grey" };
                  return (
                    <tr key={payment.id}>
                      <Td className="font-mono text-xs font-bold text-ink">
                        {payment.invoice_number ?? payment.payment_number}
                      </Td>
                      <Td>{formatRupiah(Number(payment.amount))}</Td>
                      <Td>{payment.method}</Td>
                      <Td>
                        <StatusBadge tone={label.tone}>{label.text}</StatusBadge>
                      </Td>
                      <Td>{payment.paid_at ? formatDate(payment.paid_at) : "—"}</Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </TableShell>
        </div>
      </Card>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wider text-muted">{label}</dt>
      <dd className="mt-0.5 font-semibold text-ink">{value}</dd>
    </div>
  );
}
