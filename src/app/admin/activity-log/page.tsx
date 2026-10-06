import { Card, PageHeader } from "@/components/admin/admin-ui";
import { EmptyRow, TableShell, Td, Th } from "@/components/admin/data-table";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface LogRow {
  id: string;
  action: string;
  entity: string;
  entity_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  created_at: string;
}

/**
 * Renders one logged value. Arrays and nested objects used to come out as
 * "[object Object]" — a log entry nobody could read. Collections are
 * summarised by count, and a nested object by its own keys, so the row stays
 * one line while still saying what actually changed.
 */
function describeValue(val: unknown, depth = 0): string {
  if (val === null || val === undefined) return "—";
  if (Array.isArray(val)) {
    if (val.length === 0) return "kosong";
    if (val.every((item) => typeof item !== "object" || item === null)) {
      return val.map((item) => String(item)).join(", ");
    }
    return `${val.length} item`;
  }
  if (typeof val === "object") {
    const entries = Object.entries(val as Record<string, unknown>);
    if (entries.length === 0) return "kosong";
    if (depth >= 1) return `{${entries.map(([key]) => key).join(", ")}}`;
    return entries.map(([key, inner]) => `${key}: ${describeValue(inner, depth + 1)}`).join(", ");
  }
  if (typeof val === "boolean") return val ? "ya" : "tidak";
  return String(val);
}

function describe(value: Record<string, unknown> | null): string {
  if (!value) return "—";
  const entries = Object.entries(value);
  if (entries.length === 0) return "—";
  return entries.map(([key, val]) => `${key}: ${describeValue(val, 1)}`).join(", ");
}

export default async function AdminActivityLogPage() {
  await requireAdmin();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("activity_logs")
    .select("id, action, entity, entity_id, old_value, new_value, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = (data ?? []) as LogRow[];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Activity Log"
        description="Jejak perubahan penting: pembayaran, refund, dan perubahan konten."
      />

      {error ? (
        <Card>
          <p className="text-sm text-brand-ink">Log gagal dimuat.</p>
        </Card>
      ) : (
        <TableShell>
          <thead>
            <tr className="border-b border-line">
              <Th>Waktu</Th>
              <Th>Aksi</Th>
              <Th>Entitas</Th>
              <Th>Sebelum</Th>
              <Th>Sesudah</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.length === 0 ? (
              <EmptyRow colSpan={5}>Belum ada aktivitas tercatat.</EmptyRow>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <Td className="whitespace-nowrap text-xs">
                    {new Date(row.created_at).toLocaleString("id-ID")}
                  </Td>
                  <Td className="font-semibold text-ink">{row.action}</Td>
                  <Td className="text-xs">
                    {row.entity}
                    {row.entity_id ? (
                      <span className="block font-mono text-[0.6875rem] text-muted">
                        {row.entity_id}
                      </span>
                    ) : null}
                  </Td>
                  <Td className="text-xs">{describe(row.old_value)}</Td>
                  <Td className="text-xs">{describe(row.new_value)}</Td>
                </tr>
              ))
            )}
          </tbody>
        </TableShell>
      )}
    </div>
  );
}
