import Link from "next/link";
import {
  Award,
  BarChart3,
  CalendarDays,
  CircleCheck,
  ExternalLink,
  LayoutDashboard,
  PanelsTopLeft,
  Rocket,
  Users,
  Wallet,
} from "lucide-react";
import { Card, PageHeader } from "@/components/admin/admin-ui";
import { requireAdmin } from "@/lib/admin/auth";
import { GUIDE, type GuideChapter } from "@/lib/admin/guide";

export const dynamic = "force-dynamic";

const ICONS: Record<GuideChapter["icon"], typeof Rocket> = {
  rocket: Rocket,
  calendar: CalendarDays,
  users: Users,
  wallet: Wallet,
  check: CircleCheck,
  award: Award,
  chart: BarChart3,
  layout: PanelsTopLeft,
};

export default async function PanduanPage() {
  await requireAdmin();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Panduan Pemakaian"
        description="Cara memakai ERP Kelas Bermain, dari pendaftaran masuk sampai sertifikat terbit."
      />

      {/* Jump list, so a long page stays navigable on a phone too. */}
      <Card>
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted">Daftar isi</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {GUIDE.map((chapter) => {
            const Icon = ICONS[chapter.icon];
            return (
              <li key={chapter.id}>
                <a
                  href={`#${chapter.id}`}
                  className="flex items-start gap-2.5 rounded-xl border border-line p-3 transition-colors hover:border-brand/40"
                >
                  <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-ink">{chapter.title}</span>
                    <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                      {chapter.summary}
                    </span>
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      </Card>

      {GUIDE.map((chapter) => {
        const Icon = ICONS[chapter.icon];
        return (
          <section key={chapter.id} id={chapter.id} className="scroll-mt-20 space-y-3">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-brand text-white">
                <Icon className="size-4.5" aria-hidden />
              </span>
              <div>
                <h2 className="text-lg font-extrabold text-ink">{chapter.title}</h2>
                <p className="text-xs text-muted">{chapter.summary}</p>
              </div>
            </div>

            <ol className="space-y-3">
              {chapter.steps.map((step, index) => (
                <li key={step.title}>
                  <Card className="flex flex-col gap-4 sm:flex-row">
                    <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-canvas-deep/70 text-sm font-extrabold text-ink">
                      {index + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-extrabold text-ink">{step.title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{step.body}</p>

                      {step.href ? (
                        <Link
                          href={step.href}
                          className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-pill border border-line px-3 text-xs font-bold text-ink-soft transition-colors hover:border-brand/40 hover:text-brand"
                        >
                          Buka halamannya
                          <ExternalLink className="size-3" aria-hidden />
                        </Link>
                      ) : null}

                      {/* A step without a screenshot simply has none — no
                          empty frame, no broken image icon. */}
                      {step.screenshot ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={step.screenshot}
                          alt={`Tampilan: ${step.title}`}
                          className="mt-3 w-full rounded-xl border border-line"
                        />
                      ) : null}
                    </div>
                  </Card>
                </li>
              ))}
            </ol>
          </section>
        );
      })}

      <Card>
        <h2 className="flex items-center gap-2 text-sm font-extrabold text-ink">
          <LayoutDashboard className="size-4 text-brand" aria-hidden />
          Menambahkan gambar ke panduan ini
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Unggah tangkapan layar lewat Media Library, salin tautannya, lalu tempelkan sebagai
          <code className="mx-1 rounded bg-canvas-deep/60 px-1.5 py-0.5 font-mono text-xs">
            screenshot
          </code>
          pada langkah yang sesuai di berkas
          <code className="mx-1 rounded bg-canvas-deep/60 px-1.5 py-0.5 font-mono text-xs">
            src/lib/admin/guide.ts
          </code>
          . Panduan ini sengaja disimpan sebagai data, jadi menambah langkah cukup satu baris
          tanpa menyentuh tampilan halamannya.
        </p>
      </Card>
    </div>
  );
}
