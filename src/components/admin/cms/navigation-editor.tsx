import { saveNavigationAction } from "@/app/admin/cms/actions";

export interface NavRow {
  id: string;
  label: string;
  href: string;
  sort_order: number;
  is_visible: boolean;
  open_in_new_tab: boolean;
}

const inputClass =
  "h-11 w-full rounded-xl border border-line bg-surface px-3 text-[0.9375rem] font-medium text-ink";

/**
 * Menu editor, moved inside the CMS as part of Global Website settings. It
 * reuses the existing saveNavigationAction, so the navigation_items table and
 * its field names are unchanged — only where the form lives has moved.
 */
export function NavigationEditor({ items }: { items: NavRow[] }) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-extrabold text-ink">Menu Navigasi</h3>
        <p className="text-xs text-muted">
          Nama, tautan, dan urutan menu di bagian atas website.
        </p>
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
          Belum ada menu. Jalankan supabase/admin-schema.sql lebih dulu.
        </p>
      ) : (
        <form action={saveNavigationAction} className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="grid gap-3 rounded-xl border border-line p-3 sm:grid-cols-[1fr_1fr_6rem]"
            >
              <input type="hidden" name="id" value={item.id} />
              <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
                Nama menu
                <input
                  name={`label.${item.id}`}
                  defaultValue={item.label}
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
                Tautan
                <input name={`href.${item.id}`} defaultValue={item.href} className={inputClass} />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
                Urutan
                <input
                  name={`order.${item.id}`}
                  type="number"
                  defaultValue={String(item.sort_order)}
                  className={inputClass}
                />
              </label>
              <div className="flex flex-wrap items-center gap-4 sm:col-span-3">
                <label className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <input
                    type="checkbox"
                    name={`visible.${item.id}`}
                    defaultChecked={item.is_visible}
                    className="size-4 accent-brand"
                  />
                  Tampilkan
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <input
                    type="checkbox"
                    name={`newtab.${item.id}`}
                    defaultChecked={item.open_in_new_tab}
                    className="size-4 accent-brand"
                  />
                  Buka di tab baru
                </label>
              </div>
            </div>
          ))}

          <button
            type="submit"
            className="inline-flex min-h-11 items-center rounded-pill bg-brand px-5 text-sm font-bold text-white"
          >
            Simpan Menu
          </button>
        </form>
      )}
    </div>
  );
}
