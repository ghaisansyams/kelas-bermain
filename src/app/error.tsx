"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button, buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Replace with a real reporter (Sentry, Vercel Monitoring) when available.
    console.error(error);
  }, [error]);

  return (
    <Container className="flex min-h-[70vh] max-w-xl flex-col items-center justify-center py-16 text-center">
      <span className="flex size-16 items-center justify-center rounded-full bg-brand-soft text-brand">
        <TriangleAlert className="size-8" aria-hidden />
      </span>
      <h1 className="mt-6 text-2xl font-extrabold text-ink sm:text-3xl">
        Ada yang tidak berjalan semestinya
      </h1>
      <p className="mt-3 max-w-md text-[0.9375rem] leading-relaxed text-muted">
        Maaf, halaman ini gagal dimuat. Coba muat ulang — kalau masih bermasalah, beri tahu
        kami lewat Instagram @kelasbermain.
      </p>
      {error.digest ? (
        <p className="mt-3 font-mono text-xs text-muted">Kode kesalahan: {error.digest}</p>
      ) : null}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button onClick={reset} size="lg" className="w-full sm:w-auto">
          <RotateCcw className="size-4" aria-hidden />
          Coba Lagi
        </Button>
        <Link
          href="/"
          className={buttonStyles({
            variant: "secondary",
            size: "lg",
            className: "w-full sm:w-auto",
          })}
        >
          Kembali ke Beranda
        </Link>
      </div>
    </Container>
  );
}
