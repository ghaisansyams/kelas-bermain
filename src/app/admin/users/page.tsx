import { grantAccessAction, revokeAccessAction, updateUserAction } from "@/app/admin/users/actions";
import { Card, Notice, PageHeader, StatCard } from "@/components/admin/admin-ui";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { EmptyRow, StatusBadge, TableShell, Td, Th } from "@/components/admin/data-table";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface UserRow {
  user_id: string;
  email: string;
  full_name: string;
  role: "SUPER_ADMIN" | "ADMIN" | "STAFF";
  status: "ACTIVE" | "INACTIVE";
  created_at: string;
  last_sign_in_at: string | null;
}

const ROLE_LABEL: Record<string, { text: string; tone: string }> = {
  SUPER_ADMIN: { text: "Super Admin", tone: "brand" },
  ADMIN: { text: "Admin", tone: "pine" },
  STAFF: { text: "Staff", tone: "grey" },
};

const ROLE_DESCRIPTION: { role: string; text: string }[] = [
  { role: "Super Admin", text: "Semua akses, termasuk mengelola pengguna di halaman ini." },
  { role: "Admin", text: "Semua modul operasional, keuangan, dan website. Tidak bisa mengubah pengguna." },
  { role: "Staff", text: "Sama seperti Admin saat ini; dipisahkan agar pembatasan lebih lanjut bisa ditambahkan tanpa mengubah akun." },
];

const NOTICES: Record<string, { tone: "success" | "error" | "info"; text: string }> = {
  granted: { tone: "success", text: "Akses admin diberikan." },
  updated: { tone: "success", text: "Pengguna diperbarui." },
  revoked: { tone: "success", text: "Akses admin dicabut. Akun login-nya sendiri tidak dihapus." },
  "not-found": {
    tone: "error",
    text: "Email itu belum punya akun. Buat dulu di Supabase → Authentication → Users, baru beri akses di sini.",
  },
  self: { tone: "error", text: "Kamu tidak bisa menurunkan atau mencabut aksesmu sendiri." },
  "last-super": {
    tone: "error",
    text: "Harus selalu ada minimal satu Super Admin aktif. Angkat orang lain dulu.",
  },
  forbidden: { tone: "error", text: "Hanya Super Admin yang bisa mengubah pengguna." },
  invalid: { tone: "error", text: "Data yang dikirim tidak lengkap." },
  error: { tone: "error", text: "Aksi gagal dijalankan." },
};

const inputClass =
  "h-11 w-full rounded-xl border border-line bg-surface px-3 text-[0.9375rem] font-medium text-ink";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await requireAdmin();
  const { status } = await searchParams;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_list_users");

  const rows = (data ?? []) as unknown as UserRow[];
  const activeCount = rows.filter((row) => row.status === "ACTIVE").length;
  const superCount = rows.filter(
    (row) => row.role === "SUPER_ADMIN" && row.status === "ACTIVE",
  ).length;
  const isSuper = session.role === "SUPER_ADMIN";
  const notice = status ? NOTICES[status] : undefined;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pengguna"
        description="Siapa saja yang bisa masuk ke admin, dan sebagai apa."
      />

      {notice ? <Notice tone={notice.tone}>{notice.text}</Notice> : null}
      {error ? (
        <Notice tone="error">
          Daftar pengguna belum bisa dibaca. Jalankan supabase/voucher-users-schema.sql di SQL
          Editor.
        </Notice>
      ) : null}
      {!isSuper ? (
        <Notice tone="info">
          Kamu masuk sebagai {ROLE_LABEL[session.role]?.text ?? session.role}. Daftar di bawah bisa
          dilihat, tapi hanya Super Admin yang bisa mengubahnya.
        </Notice>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total pengguna" value={String(rows.length)} />
        <StatCard label="Aktif" value={String(activeCount)} />
        <StatCard label="Super Admin aktif" value={String(superCount)} />
      </div>

      {isSuper ? (
        <Card>
          <h2 className="text-sm font-extrabold text-ink">Beri akses admin</h2>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            Buat dulu akunnya di Supabase → Authentication → Users, lalu masukkan emailnya di sini.
            Pembuatan akun login sengaja tidak dilakukan dari aplikasi karena itu butuh
            service-role key, yang tidak pernah dipegang aplikasi ini.
          </p>
          <form action={grantAccessAction} className="mt-4 grid gap-3 sm:grid-cols-4">
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink sm:col-span-2">
              Email akun
              <input name="email" type="email" required className={inputClass} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
              Nama
              <input name="fullName" className={inputClass} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
              Peran
              <select name="role" defaultValue="STAFF" className={inputClass}>
                <option value="STAFF">Staff</option>
                <option value="ADMIN">Admin</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select>
            </label>
            <div className="sm:col-span-4">
              <button
                type="submit"
                className="inline-flex min-h-11 items-center rounded-pill bg-brand px-5 text-sm font-bold text-white"
              >
                Beri Akses
              </button>
            </div>
          </form>
        </Card>
      ) : null}

      <TableShell>
        <thead>
          <tr className="border-b border-line">
            <Th>Nama</Th>
            <Th>Email</Th>
            <Th>Peran</Th>
            <Th>Status</Th>
            <Th>Terakhir masuk</Th>
            {isSuper ? <Th>Aksi</Th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.length === 0 ? (
            <EmptyRow colSpan={isSuper ? 6 : 5}>Belum ada pengguna admin.</EmptyRow>
          ) : (
            rows.map((row) => {
              const role = ROLE_LABEL[row.role] ?? { text: row.role, tone: "grey" };
              const isSelf = row.user_id === session.userId;
              return (
                <tr key={row.user_id}>
                  <Td className="font-semibold text-ink">
                    {row.full_name || "—"}
                    {isSelf ? (
                      <span className="ml-1.5 text-xs font-semibold text-muted">(kamu)</span>
                    ) : null}
                  </Td>
                  <Td className="text-xs">{row.email}</Td>
                  <Td>
                    <StatusBadge tone={role.tone}>{role.text}</StatusBadge>
                  </Td>
                  <Td>
                    <StatusBadge tone={row.status === "ACTIVE" ? "pine" : "grey"}>
                      {row.status === "ACTIVE" ? "Aktif" : "Nonaktif"}
                    </StatusBadge>
                  </Td>
                  <Td className="text-xs">
                    {row.last_sign_in_at
                      ? new Date(row.last_sign_in_at).toLocaleString("id-ID")
                      : "Belum pernah"}
                  </Td>
                  {isSuper ? (
                    <Td>
                      <div className="flex flex-wrap items-center gap-2">
                        <form action={updateUserAction} className="flex items-center gap-1.5">
                          <input type="hidden" name="userId" value={row.user_id} />
                          <input type="hidden" name="fullName" value={row.full_name} />
                          <select
                            name="role"
                            defaultValue={row.role}
                            disabled={isSelf}
                            className="h-9 rounded-pill border border-line bg-surface px-2 text-xs font-semibold text-ink disabled:opacity-50"
                          >
                            <option value="STAFF">Staff</option>
                            <option value="ADMIN">Admin</option>
                            <option value="SUPER_ADMIN">Super Admin</option>
                          </select>
                          <select
                            name="status"
                            defaultValue={row.status}
                            disabled={isSelf}
                            className="h-9 rounded-pill border border-line bg-surface px-2 text-xs font-semibold text-ink disabled:opacity-50"
                          >
                            <option value="ACTIVE">Aktif</option>
                            <option value="INACTIVE">Nonaktif</option>
                          </select>
                          <button
                            type="submit"
                            disabled={isSelf}
                            className="inline-flex min-h-9 items-center rounded-pill bg-brand px-3 text-xs font-bold text-white disabled:opacity-50"
                          >
                            Simpan
                          </button>
                        </form>
                        {!isSelf ? (
                          <ConfirmDialog
                            action={revokeAccessAction}
                            hidden={{ userId: row.user_id }}
                            trigger="Cabut akses"
                            title="Cabut akses admin"
                            description="Orang ini langsung kehilangan akses ke admin. Akun login-nya di Supabase Auth tetap ada dan bisa diberi akses lagi kapan saja."
                            summary={[
                              { label: "Nama", value: row.full_name || "—" },
                              { label: "Email", value: row.email },
                              { label: "Peran", value: role.text },
                            ]}
                            confirmLabel="Cabut akses"
                            tone="danger"
                          />
                        ) : null}
                      </div>
                    </Td>
                  ) : null}
                </tr>
              );
            })
          )}
        </tbody>
      </TableShell>

      <Card>
        <h2 className="text-sm font-extrabold text-ink">Arti peran</h2>
        <dl className="mt-2 space-y-2 text-sm">
          {ROLE_DESCRIPTION.map((item) => (
            <div key={item.role}>
              <dt className="font-bold text-ink">{item.role}</dt>
              <dd className="text-ink-soft">{item.text}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  );
}
