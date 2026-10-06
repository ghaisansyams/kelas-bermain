import { CircleCheck, ListChecks } from "lucide-react";
import type { AgendaItem } from "@/lib/types";

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

export function EventAgenda({ items }: { items: AgendaItem[] }) {
  return (
    <ol className="space-y-0">
      {items.map((item, index) => (
        <li key={`${item.time}-${item.title}`} className="flex gap-4">
          <div className="flex flex-col items-center">
            <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-brand ring-4 ring-brand-soft" />
            {index < items.length - 1 ? (
              <span aria-hidden className="w-px flex-1 bg-line" />
            ) : null}
          </div>
          <div className="min-w-0 flex-1 pb-6">
            <p className="text-xs font-bold uppercase tracking-wider text-brand">{item.time}</p>
            <p className="mt-1 text-[0.9375rem] font-bold text-ink">{item.title}</p>
            {item.description ? (
              <p className="mt-1 text-sm leading-relaxed text-muted">{item.description}</p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
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

