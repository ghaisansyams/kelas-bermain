import { Card, PageHeader, StatCard } from "@/components/admin/admin-ui";
import { EmptyRow, StatusBadge, TableShell, Td, Th } from "@/components/admin/data-table";
import { requireAdmin } from "@/lib/admin/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils/date";
import { formatRupiah } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

interface LedgerRow {
  id: string;
  transaction_number: string;
  type: string;
  category: string;
  description: string;
  amount: number;
  transaction_date: Date;
  payment_method: string | null;
}

/** Belum masuk kas: belum dibayar, menunggu dicek, atau bukti ditolak. */
const UNPAID_STATUSES = ["PENDING", "WAITING_VERIFICATION", "REJECTED"];

export default async function AdminFinancePage() {
  await requireAdmin();

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  let failed = false;
  let rows: LedgerRow[] = [];
  let paid = 0;
  let unpaid = 0;
  let grossIncome = 0;
  let refunds = 0;

  try {
    // Dijumlahkan di database, bukan ditarik semua lalu dijumlahkan di sini:
    // jumlah baris buku kas bertambah terus, jumlah baris yang dikirim ke
    // halaman ini seharusnya tidak.
    const [ledger, paidSum, unpaidSum, month] = await Promise.all([
      db.financial_transactions.findMany({
        select: {
          id: true,
          transaction_number: true,
          type: true,
          category: true,
          description: true,
          amount: true,
          transaction_date: true,
          payment_method: true,
        },
        orderBy: { transaction_date: "desc" },
        take: 50,
      }),
      db.payments.aggregate({ _sum: { amount: true }, where: { status: "PAID" } }),
      db.payments.aggregate({
        _sum: { amount: true },
        where: { status: { in: UNPAID_STATUSES } },
      }),
      db.financial_transactions.groupBy({
        by: ["type"],
        _sum: { amount: true },
        where: { transaction_date: { gte: monthStart } },
      }),
    ]);

    rows = ledger.map((row) => ({ ...row, amount: Number(row.amount) }));
    paid = Number(paidSum._sum.amount ?? 0);
    unpaid = Number(unpaidSum._sum.amount ?? 0);
    const byType = (type: string) =>
      Number(month.find((row) => row.type === type)?._sum.amount ?? 0);
    grossIncome = byType("INCOME");
    refunds = byType("REFUND");
  } catch {
    failed = true;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Keuangan"
        description="Pendapatan hanya dihitung dari pembayaran berstatus LUNAS."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pendapatan (lunas)" value={formatRupiah(paid)} />
        <StatCard label="Belum dibayar" value={formatRupiah(unpaid)} hint="Tidak dihitung sebagai pendapatan" />
        <StatCard label="Pemasukan bulan ini" value={formatRupiah(grossIncome)} />
        <StatCard label="Refund bulan ini" value={formatRupiah(Math.abs(refunds))} />
      </div>

      {failed ? (
        <Card>
          <p className="text-sm text-brand-ink">
            Buku keuangan gagal dimuat. Coba muat ulang halaman ini.
          </p>
        </Card>
      ) : (
        <TableShell>
          <thead>
            <tr className="border-b border-line">
              <Th>Nomor</Th>
              <Th>Tanggal</Th>
              <Th>Tipe</Th>
              <Th>Keterangan</Th>
              <Th>Metode</Th>
              <Th className="text-right">Nominal</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 ? (
              <EmptyRow colSpan={6}>Belum ada transaksi keuangan.</EmptyRow>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <Td className="font-mono text-xs font-bold text-ink">{row.transaction_number}</Td>
                  <Td>{formatDate(row.transaction_date.toISOString())}</Td>
                  <Td>
                    <StatusBadge tone={row.type === "INCOME" ? "green" : row.type === "REFUND" ? "red" : "grey"}>
                      {row.type === "INCOME" ? "Pemasukan" : row.type === "REFUND" ? "Refund" : "Penyesuaian"}
                    </StatusBadge>
                  </Td>
                  <Td>{row.description}</Td>
                  <Td>{row.payment_method ?? "—"}</Td>
                  <Td className="text-right font-semibold text-ink">
                    {formatRupiah(Number(row.amount))}
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </TableShell>
      )}
    </div>
  );
}
