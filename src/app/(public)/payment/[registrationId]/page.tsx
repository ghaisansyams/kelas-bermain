import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, CreditCard } from "lucide-react";
import { Checkout } from "@/components/registration/checkout";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Pembayaran",
  description: "Halaman pembayaran pendaftaran kelas Kelas Bermain.",
  robots: { index: false, follow: false },
};

export default async function PaymentPage({
  params,
}: {
  params: Promise<{ registrationId: string }>;
}) {
  const { registrationId } = await params;

  return (
    <Container className="max-w-2xl py-10 sm:py-14">
      <Link
        href="/event"
        className="-my-2 inline-flex min-h-11 items-center gap-1.5 py-2 text-sm font-semibold text-muted transition-colors hover:text-brand"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Kembali ke daftar kelas
      </Link>

      <header className="mt-5">
        <span className="inline-flex items-center gap-2 rounded-pill bg-sun-soft px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-sun-dark">
          <CreditCard className="size-3.5" aria-hidden />
          Pembayaran
        </span>
        <h1 className="mt-4 text-[1.75rem] leading-tight font-extrabold text-ink sm:text-4xl">
          Checkout Pendaftaran
        </h1>
        <p className="mt-2 font-mono text-sm text-muted">{registrationId}</p>
      </header>

      <div className="mt-8">
        <Checkout registrationRef={registrationId} />
      </div>
    </Container>
  );
}
