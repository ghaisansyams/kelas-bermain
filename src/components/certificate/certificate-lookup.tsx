"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Search } from "lucide-react";
import { Field, TextInput } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { verifyCertificate } from "@/lib/services/certificate";

export function CertificateLookup({ examples }: { examples: string[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const result = await verifyCertificate(query);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(`/sertifikat/${result.certificate.number}`);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <Field
        label="Nomor Sertifikat atau ID Pendaftaran"
        htmlFor="query"
        error={error ?? undefined}
        hint="Contoh: KB-2026-00125 atau KB-REG-2026-H4K2PX"
        required
      >
        <TextInput
          id="query"
          name="query"
          autoComplete="off"
          spellCheck={false}
          placeholder="KB-2026-00125"
          className="font-mono uppercase"
          value={query}
          error={error ?? undefined}
          hint="Contoh: KB-2026-00125 atau KB-REG-2026-H4K2PX"
          disabled={loading}
          onChange={(e) => {
            setQuery(e.target.value);
            setError(null);
          }}
        />
      </Field>

      {error ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-brand/25 bg-brand-soft p-3.5 text-xs leading-relaxed text-brand-ink"
        >
          <AlertTriangle className="mt-px size-3.5 shrink-0" aria-hidden />
          Pastikan nomor ditulis lengkap termasuk tanda hubung.
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={loading} className="w-full sm:w-auto">
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Memeriksa…
          </>
        ) : (
          <>
            <Search className="size-4" aria-hidden />
            Cek Sertifikat
          </>
        )}
      </Button>

      {examples.length > 0 ? (
        <div className="border-t border-line pt-4">
          <p className="text-xs font-semibold text-muted">Coba nomor contoh:</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {examples.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => {
                  setQuery(example);
                  setError(null);
                }}
                className="inline-flex min-h-10 items-center rounded-pill border border-line bg-surface px-3.5 font-mono text-xs font-bold text-ink-soft transition-colors hover:border-brand/40 hover:text-brand"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </form>
  );
}
