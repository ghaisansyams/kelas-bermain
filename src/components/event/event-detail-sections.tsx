import {
  BookOpen,
  Camera,
  ChefHat,
  CircleCheck,
  ClipboardCheck,
  Flag,
  ListChecks,
  Mic,
  Music,
  Palette,
  Puzzle,
  Sparkles,
  Sprout,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import type { AgendaItem } from "@/lib/types";
import { formatClock, formatDuration, parseClocks, sessionMinutes } from "@/lib/utils/agenda";

export function SectionBlock({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="border-t border-line pt-8">
      <h2 className="text-xl font-extrabold text-ink sm:text-2xl">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

const AGENDA_ICONS: { match: RegExp; icon: LucideIcon }[] = [
  { match: /registrasi|daftar ulang|check.?in|kedatangan|absen/i, icon: ClipboardCheck },
  { match: /opening|pembukaan|sambutan|perkenalan|salam/i, icon: Mic },
  { match: /danc|menari|tari|senam|musik|nyanyi|lagu/i, icon: Music },
  { match: /cook|masak|memasak|membuat|baking|kue/i, icon: ChefHat },
  { match: /makan|snack|lunch|istirahat|minum/i, icon: Utensils },
  { match: /lukis|mewarnai|gambar|craft|kreasi|kerajinan/i, icon: Palette },
  { match: /foto|dokumentasi/i, icon: Camera },
  { match: /game|permainan|lomba|kuis|puzzle/i, icon: Puzzle },
  { match: /cerita|dongeng|belajar|membaca|buku/i, icon: BookOpen },
  { match: /tanam|kebun|panen|berkebun/i, icon: Sprout },
  { match: /closing|penutup|selesai|pulang|bubar|doa/i, icon: Flag },
];

function agendaIcon(title: string): LucideIcon {
  return AGENDA_ICONS.find((rule) => rule.match.test(title))?.icon ?? Sparkles;
}

/**
 * Rundown untuk admin yang menulis satu kalimat pendek per sesi: setiap sesi
 * jadi kartu selebar kolom dengan jam besar, kalimat kegiatan yang besar,
 * ikon dari kata kuncinya, dan lamanya sesi di kanan.
 */
export function EventAgenda({ items }: { items: AgendaItem[] }) {
  const first = items[0] ? formatClock(items[0].time) : "";
  return (
    <div>
      <p className="mb-4 flex flex-wrap items-center gap-x-2 text-sm font-semibold text-muted">
        <span>{items.length} sesi</span>
        {first && parseClocks(first).length > 0 ? (
          <>
            <span aria-hidden>·</span>
            <span>
              mulai <span className="tabular-nums text-ink-soft">{first}</span>
            </span>
          </>
        ) : null}
      </p>
      <ol>
        {items.map((item, index) => {
          const Icon = agendaIcon(item.title);
          const minutes = sessionMinutes(item.time, items[index + 1]?.time);
          const last = index === items.length - 1;
          return (
            <li key={`${index}-${item.time}-${item.title}`} className="flex gap-3 sm:gap-4">
              <div className="flex flex-col items-center">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand ring-4 ring-canvas">
                  <Icon className="size-5" aria-hidden />
                </span>
                {!last ? <span aria-hidden className="w-px flex-1 bg-line" /> : null}
              </div>
              <div className={`min-w-0 flex-1 ${last ? "" : "pb-3"}`}>
                <div className="flex flex-col gap-x-5 gap-y-1 rounded-card border border-line bg-surface px-4 py-3.5 shadow-soft sm:flex-row sm:items-center sm:px-5">
                  <p className="text-base font-extrabold tabular-nums text-brand sm:w-24 sm:shrink-0 sm:text-lg">
                    {formatClock(item.time)}
                  </p>
                  <div className="min-w-0 flex-1">
                    <p className="text-base font-bold leading-snug text-ink sm:text-lg">{item.title}</p>
                    {item.description ? (
                      <p className="mt-1 text-sm leading-relaxed text-muted">{item.description}</p>
                    ) : null}
                  </div>
                  {minutes ? (
                    <span className="inline-flex w-fit shrink-0 items-center rounded-pill bg-canvas-deep px-3 py-1 text-xs font-semibold text-ink-soft">
                      {formatDuration(minutes)}
                    </span>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function CheckList({
  items,
  variant = "check",
}: {
  items: string[];
  variant?: "check" | "box";
}) {
  const Icon = variant === "check" ? CircleCheck : ListChecks;
  return (
    <ul className="grid gap-2.5 sm:grid-cols-2">
      {items.map((item) => (
        <li
          key={item}
          className="flex items-start gap-2.5 rounded-xl bg-canvas-deep/60 p-3.5 text-sm leading-relaxed text-ink-soft"
        >
          <Icon
            className={`mt-0.5 size-4 shrink-0 ${variant === "check" ? "text-pine" : "text-brand"}`}
            aria-hidden
          />
          {item}
        </li>
      ))}
    </ul>
  );
}

