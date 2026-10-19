import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { setCustomerStatusAction } from "@/app/admin/customers/actions";
import { Card, PageHeader, StatCard } from "@/components/admin/admin-ui";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import {
  PAYMENT_LABEL,
  REGISTRATION_LABEL,
  StatusBadge,
  TableShell,
  Td,
  Th,
} from "@/components/admin/data-table";
import { requireAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils/date";
import { formatRupiah } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAdmin();
  const { id } = await params;

  // Id dari URL yang bukan uuid akan membuat Postgres melempar galat, bukan
  // "tidak ditemukan". Alamat yang diketik asal harus berakhir di 404.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();

  const [customer, children, registrationRows, paymentRows] = await Promise.all([
    db.customers.findUnique({
      where: { id },
      select: {
        id: true,
        customer_number: true,
        full_name: true,
        whatsapp: true,
        email: true,
        domicile: true,
        occupation: true,
        source: true,
        status: true,
        created_at: true,
      },
    }),
    db.children.findMany({
      where: { customer_id: id },
      select: {
        id: true,
        child_number: true,
        full_name: true,
        nickname: true,
        age_years: true,
        age_months: true,
        status: true,
      },
      orderBy: { created_at: "asc" },
    }),
    db.registrations.findMany({
      where: { customer_id: id },
      select: {
        id: true,
        registration_number: true,
        event_id: true,
        registration_date: true,
        status: true,
        payment_status: true,
        amount: true,
        attendance_status: true,
        children: { select: { full_name: true } },
      },
      orderBy: { registration_date: "desc" },
    }),
    db.payments.findMany({
      where: { customer_id: id },
      select: {
        id: true,
        payment_number: true,
        invoice_number: true,
        amount: true,
        status: true,
        method: true,
        paid_at: true,
        created_at: true,
      },
      orderBy: { created_at: "desc" },
    }),
  ]);

  if (!customer) notFound();

  const registrations = registrationRows.map((row) => ({
    ...row,
    registration_date: row.registration_date.toISOString(),
    amount: Number(row.amount),
  }));
  const payments = paymentRows.map((row) => ({
    ...row,
    amount: Number(row.amount),
    paid_at: row.paid_at ? row.paid_at.toISOString() : null,
    created_at: row.created_at.toISOString(),
  }));

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
        action={
          session.role === "SUPER_ADMIN" ? (
            <ConfirmDialog
              action={setCustomerStatusAction}
              hidden={{
                customerId: customer.id,
                next: customer.status === "active" ? "inactive" : "active",
              }}
              trigger={customer.status === "active" ? "Nonaktifkan" : "Aktifkan kembali"}
              size="md"
              tone={customer.status === "active" ? "danger" : "brand"}
              title={
                customer.status === "active" ? "Nonaktifkan pendamping?" : "Aktifkan pendamping?"
              }
              description={
                customer.status === "active"
                  ? "Data dan seluruh riwayatnya tetap tersimpan — peserta ini hanya ditandai tidak aktif dan bisa disaring keluar dari daftar. Bisa diaktifkan lagi kapan saja."
                  : "Pendamping ini akan ditandai aktif kembali."
              }
              summary={[
                { label: "Kode", value: customer.customer_number },
                { label: "Nama", value: customer.full_name },
                { label: "Riwayat pendaftaran", value: String(registrations.length) },
              ]}
              confirmLabel={customer.status === "active" ? "Nonaktifkan" : "Aktifkan"}
            />
          ) : undefined
        }
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
          <Line label="Terdaftar" value={formatDate(customer.created_at.toISOString())} />
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
