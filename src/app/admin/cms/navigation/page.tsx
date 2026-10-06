import { saveNavigationAction } from "@/app/admin/cms/actions";
import { Card, Notice, PageHeader } from "@/components/admin/admin-ui";
import { Field, TextInput } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CmsNavigationPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const { status } = await searchParams;
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("navigation_items")
    .select("id, label, href, sort_order, is_visible, open_in_new_tab")
    .order("sort_order");

  const items = (data ?? []) as {
    id: string;
    label: string;
    href: string;
    sort_order: number;
    is_visible: boolean;
    open_in_new_tab: boolean;
  }[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="CMS — Navigasi"
        description="Label dan urutan menu di navbar website. Perubahan langsung tampil setelah disimpan."
      />

      {status === "saved" ? <Notice tone="success">Navigasi tersimpan dan sudah tampil di website.</Notice> : null}
      {status === "error" ? <Notice tone="error">Navigasi gagal disimpan. Coba lagi.</Notice> : null}
      {error ? <Notice tone="error">Data navigasi gagal dimuat.</Notice> : null}

      {items.length === 0 ? (
        <Card>
          <p className="text-sm text-muted">
            Belum ada menu. Jalankan seed pada supabase/admin-schema.sql terlebih dahulu.
          </p>
        </Card>
      ) : (
        <form action={saveNavigationAction} className="space-y-4">
          {items.map((item) => (
            <Card key={item.id}>
              <input type="hidden" name="id" value={item.id} />
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Label" htmlFor={`label.${item.id}`}>
                  <TextInput id={`label.${item.id}`} name={`label.${item.id}`} defaultValue={item.label} />
                </Field>
                <Field label="Tautan" htmlFor={`href.${item.id}`}>
                  <TextInput id={`href.${item.id}`} name={`href.${item.id}`} defaultValue={item.href} />
                </Field>
                <Field label="Urutan" htmlFor={`order.${item.id}`}>
                  <TextInput
                    id={`order.${item.id}`}
                    name={`order.${item.id}`}
                    type="number"
                    inputMode="numeric"
                    defaultValue={String(item.sort_order)}
                  />
                </Field>
                <div className="flex flex-wrap items-center gap-5 pt-7">
                  <label className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <input
                      type="checkbox"
                      name={`visible.${item.id}`}
                      defaultChecked={item.is_visible}
                      className="size-4 accent-[var(--color-brand,#d93a2b)]"
                    />
                    Tampilkan
                  </label>
                  <label className="flex items-center gap-2 text-sm font-semibold text-ink">
                    <input
                      type="checkbox"
                      name={`newtab.${item.id}`}
                      defaultChecked={item.open_in_new_tab}
                      className="size-4 accent-[var(--color-brand,#d93a2b)]"
                    />
                    Buka di tab baru
                  </label>
                </div>
              </div>
            </Card>
          ))}

          <div className="flex justify-end">
            <Button type="submit" size="lg">
              Simpan & Terapkan
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
