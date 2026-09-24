import Image from "next/image";
import { CircleCheck, Dot, ListChecks, Package } from "lucide-react";
import type { AgendaItem, Speaker } from "@/lib/types";

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

export function SpeakerList({ speakers }: { speakers: Speaker[] }) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {speakers.map((speaker) => (
        <li
          key={speaker.id}
          className="flex gap-4 rounded-card border border-line bg-surface p-4 transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-soft"
        >
          <Image
            src={speaker.avatar.src}
            alt={speaker.avatar.alt}
            width={72}
            height={72}
            sizes="72px"
            className="size-16 shrink-0 rounded-2xl object-cover sm:size-[4.5rem]"
          />
          <div className="min-w-0">
            <p className="text-[0.9375rem] font-extrabold text-ink">{speaker.name}</p>
            <p className="mt-0.5 flex flex-wrap items-center text-xs font-semibold text-brand">
              {speaker.role}
              <Dot className="size-4 text-muted" aria-hidden />
              <span className="font-medium text-muted">{speaker.organization}</span>
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted">{speaker.bio}</p>
          </div>
        </li>
      ))}
    </ul>
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

export function FacilityList({ items }: { items: string[] }) {
  return (
    <ul className="grid gap-2.5 sm:grid-cols-2">
      {items.map((item) => (
        <li
          key={item}
          className="flex items-start gap-2.5 rounded-xl border border-line bg-surface p-3.5 text-sm leading-relaxed text-ink-soft"
        >
          <Package className="mt-0.5 size-4 shrink-0 text-grape" aria-hidden />
          {item}
        </li>
      ))}
    </ul>
  );
}
