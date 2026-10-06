import { savePricingSettingsAction } from "@/app/admin/settings/actions";
import { Card, Notice, PageHeader } from "@/components/admin/admin-ui";
import { requireAdmin } from "@/lib/admin/auth";
import { calculateRegistrationPrice } from "@/lib/pricing";
import { getPricingConfig } from "@/lib/services/pricing-settings";
import { formatRupiah } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

const inputClass =
  "h-11 w-full rounded-xl border border-line bg-surface px-3 text-[0.9375rem] font-medium text-ink";

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireAdmin();
  const { status } = await searchParams;
  const config = await getPricingConfig();

  // A worked example from the live rules, so the effect of a change is
  // visible on this page instead of only on the public form.
  const sample = (children: number) =>
    calculateRegistrationPrice({ eventPrice: 150_000, childrenCount: children, config });

  const examples = [sample(1), sample(2), sample(config.groupMinChildren)];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pengaturan Diskon"
        description="Aturan harga yang dipakai halaman pendaftaran. Perubahan langsung berlaku tanpa deploy."
      />

      {status === "saved" ? <Notice tone="success">Aturan diskon tersimpan.</Notice> : null}
      {status === "error" ? <Notice tone="error">Aturan gagal disimpan.</Notice> : null}

      <Card>
        <form action={savePricingSettingsAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
              Diskon Sibling per anak (Rp)
              <input
                name="siblingDiscountPerChild"
                type="number"
                min={0}
                defaultValue={config.siblingDiscountPerChild}
                className={inputClass}
              />
              <span className="text-xs font-medium text-muted">
                Berlaku otomatis mulai 2 anak dalam satu pendaftaran.
              </span>
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
              Minimal anak untuk Group
              <input
                name="groupMinChildren"
                type="number"
                min={2}
                defaultValue={config.groupMinChildren}
                className={inputClass}
              />
              <span className="text-xs font-medium text-muted">
                Di bawah angka ini, pendaftaran dihitung sebagai Sibling.
              </span>
            </label>

            <label className="flex flex-col gap-1.5 text-sm font-semibold text-ink">
              Diskon Group per anak (Rp)
              <input
                name="groupDiscountPerChild"
                type="number"
                min={0}
                defaultValue={config.groupDiscountPerChild}
                className={inputClass}
              />
              <span className="text-xs font-medium text-muted">
                Dipakai juga untuk pendaftaran lewat kode affiliate.
              </span>
            </label>
          </div>

          <div className="border-t border-line pt-4">
            <button
              type="submit"
              className="inline-flex min-h-11 items-center rounded-pill bg-brand px-5 text-sm font-bold text-white"
            >
              Simpan Aturan
            </button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="text-sm font-extrabold text-ink">
          Contoh perhitungan (harga event Rp150.000/anak)
        </h2>
        <div className="mt-3 space-y-2 text-sm">
          {examples.map((example) => (
            <div
              key={example.childrenCount}
              className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-2 last:border-0"
            >
              <span className="font-semibold text-ink">
                {example.childrenCount} anak — {example.registrationType}
              </span>
              <span className="text-ink-soft">
                {formatRupiah(example.subtotal)}
                {example.discountAmount > 0
                  ? ` − ${formatRupiah(example.discountAmount)} (${example.discountLabel})`
                  : ""}
                {" = "}
                <strong className="font-extrabold text-brand">
                  {formatRupiah(example.total)}
                </strong>
              </span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Hanya satu diskon dasar yang berlaku per pendaftaran — Sibling, Group, atau Affiliate,
          tidak ditumpuk. Voucher dihitung terakhir, di atas hasil tersebut.
        </p>
      </Card>
    </div>
  );
}
