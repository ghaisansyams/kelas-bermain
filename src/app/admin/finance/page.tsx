import { Card, PageHeader, StatCard } from "@/components/admin/admin-ui";
import { EmptyRow, StatusBadge, TableShell, Td, Th } from "@/components/admin/data-table";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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
  transaction_date: string;
  payment_method: string | null;
}

export default async function AdminFinancePage() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [ledger, paidPayments, pendingPayments, monthLedger] = await Promise.all([
    supabase
      .from("financial_transactions")
      .select("id, transaction_number, type, category, description, amount, transaction_date, payment_method")
      .order("transaction_date", { ascending: false })
      .limit(50),
    supabase.from("payments").select("amount").eq("status", "PAID"),
    supabase.from("payments").select("amount").eq("status", "PENDING"),
    supabase
      .from("financial_transactions")
      .select("amount, type")
      .gte("transaction_date", monthStart.toISOString()),
  ]);

  const rows = (ledger.data ?? []) as LedgerRow[];
  const sum = (list: { amount: number }[] | null) =>
    (list ?? []).reduce((total, row) => total + Number(row.amount), 0);

  const grossIncome = (monthLedger.data ?? [])
    .filter((row) => (row as { type: string }).type === "INCOME")
    .reduce((total, row) => total + Number((row as { amount: number }).amount), 0);
  const refunds = (monthLedger.data ?? [])
    .filter((row) => (row as { type: string }).type === "REFUND")
    .reduce((total, row) => total + Number((row as { amount: number }).amount), 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Keuangan"
        description="Pendapatan hanya dihitung dari pembayaran berstatus LUNAS."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pendapatan (lunas)" value={formatRupiah(sum(paidPayments.data))} />
        <StatCard label="Belum dibayar" value={formatRupiah(sum(pendingPayments.data))} hint="Tidak dihitung sebagai pendapatan" />
        <StatCard label="Pemasukan bulan ini" value={formatRupiah(grossIncome)} />
        <StatCard label="Refund bulan ini" value={formatRupiah(Math.abs(refunds))} />
      </div>

      {ledger.error ? (
        <Card>
          <p className="text-sm text-brand-ink">
            Buku keuangan gagal dimuat. Pastikan supabase/erp-schema.sql sudah dijalankan.
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
                  <Td>{formatDate(row.transaction_date)}</Td>
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
