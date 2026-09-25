"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Search, X } from "lucide-react";
import { globalSearch, searchKindLabel, type SearchHit } from "@/lib/services/admin";
import { cn } from "@/lib/utils/cn";

/** Cross-entity search: parents, children, registrations, events, payments, certificates. */
export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setHits([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    // Debounced so typing does not re-scan every collection on each keystroke.
    const timer = setTimeout(() => {
      void globalSearch(query).then((result) => {
        setHits(result);
        setLoading(false);
        setOpen(true);
      });
    }, 180);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key === "/" && document.activeElement !== inputRef.current) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative min-w-0 flex-1 sm:max-w-md">
      <label htmlFor="admin-search" className="sr-only">
        Cari orang tua, anak, pendaftaran, event, pembayaran, sertifikat
      </label>
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <input
          ref={inputRef}
          id="admin-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => hits.length > 0 && setOpen(true)}
          placeholder="Cari nama, nomor, atau event…"
          className="h-10 w-full rounded-lg border border-line bg-canvas pl-9 pr-9 text-sm text-ink outline-none transition-colors placeholder:text-muted/70 focus:border-brand focus:ring-4 focus:ring-brand/10"
        />
        {loading ? (
          <Loader2
            className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted"
            aria-hidden
          />
        ) : query ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setOpen(false);
            }}
            aria-label="Bersihkan pencarian"
            className="absolute right-2 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded text-muted hover:text-ink"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        ) : null}
      </div>

      {open && query.trim().length >= 2 ? (
        <div className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-line bg-surface shadow-lift">
          {hits.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted">
              {loading ? "Mencari…" : `Tidak ada hasil untuk "${query}".`}
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1" role="listbox">
              {hits.map((hit) => (
                <li key={`${hit.kind}-${hit.href}-${hit.title}`}>
                  <Link
                    href={hit.href}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-canvas-deep"
                  >
                    <span
                      className={cn(
                        "shrink-0 rounded-pill px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wider",
                        hit.kind === "customer" && "bg-brand-soft text-brand-ink",
                        hit.kind === "child" && "bg-sun-soft text-sun-dark",
                        hit.kind === "registration" && "bg-pine-soft text-pine-dark",
                        hit.kind === "event" && "bg-sky-soft text-sky",
                        hit.kind === "payment" && "bg-grape-soft text-grape",
                        hit.kind === "certificate" && "bg-leaf-soft text-leaf",
                      )}
                    >
                      {searchKindLabel(hit.kind)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">
                        {hit.title}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {hit.subtitle}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
