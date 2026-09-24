import Link from "next/link";
import { Compass, Home } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { mainNav } from "@/data/site";

export default function NotFound() {
  return (
    <Container className="flex min-h-[70vh] max-w-2xl flex-col items-center justify-center py-16 text-center">
      <LogoMark className="size-14 motion-safe:animate-float-slow" />

      <p className="mt-8 text-6xl font-extrabold tracking-tight text-brand sm:text-7xl">404</p>
      <h1 className="mt-3 text-2xl font-extrabold text-ink sm:text-3xl">
        Halaman ini tidak ditemukan
      </h1>
      <p className="mt-3 max-w-md text-[0.9375rem] leading-relaxed text-muted">
        Tautannya mungkin salah ketik, atau halaman yang kamu cari sudah dipindahkan. Coba
        mulai lagi dari salah satu halaman berikut.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/" className={buttonStyles({ size: "lg", className: "w-full sm:w-auto" })}>
          <Home className="size-4" aria-hidden />
          Kembali ke Beranda
        </Link>
        <Link
          href="/event"
          className={buttonStyles({
            variant: "secondary",
            size: "lg",
            className: "w-full sm:w-auto",
          })}
        >
          <Compass className="size-4" aria-hidden />
          Lihat Event
        </Link>
      </div>

      <nav aria-label="Navigasi alternatif" className="mt-10 border-t border-line pt-6">
        <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2">
          {mainNav.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-sm font-semibold text-muted transition-colors hover:text-brand"
              >
                {link.label}
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/sertifikat"
              className="text-sm font-semibold text-muted transition-colors hover:text-brand"
            >
              Cek Sertifikat
            </Link>
          </li>
        </ul>
      </nav>
    </Container>
  );
}
