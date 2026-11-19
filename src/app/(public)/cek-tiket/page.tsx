import type { Metadata } from "next";
import Link from "next/link";
import { Ticket } from "lucide-react";
import { TicketCheckForm } from "@/components/registration/ticket-check-form";
import { Container } from "@/components/ui/container";
import { certificatesEnabled } from "@/lib/features";
import { PAGE_HEADINGS } from "@/lib/cms/home-defaults";
import { getPageContent, toHeading } from "@/lib/services/cms-website";

export const metadata: Metadata = {
  title: "Cek Tiket",
  description: "Cek status pendaftaran dan pembayaran kelas Kelas Bermain.",
  robots: { index: false, follow: false },
};

export default async function TiketPage() {
  const heading = toHeading((await getPageContent("pages")).sections.cek_tiket, PAGE_HEADINGS.cek_tiket);
  return (
    <Container className="max-w-2xl py-10 sm:py-14">
      <header>
        <span className="inline-flex items-center gap-2 rounded-pill bg-sun-soft px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-sun-dark">
          <Ticket className="size-3.5" aria-hidden />
          {heading.eyebrow}
        </span>
        <h1 className="mt-4 text-[1.75rem] leading-tight font-extrabold text-ink sm:text-4xl">
          {heading.title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">{heading.description}</p>
      </header>

      <div className="mt-8 rounded-card border border-line bg-surface p-5 shadow-soft sm:p-7">
        <TicketCheckForm />
      </div>

      {certificatesEnabled ? (
        <p className="mt-6 text-center text-sm text-muted">
          Sudah mengikuti kelas?{" "}
          <Link href="/sertifikat" className="font-semibold text-brand hover:underline">
            Unduh sertifikat anak
          </Link>
        </p>
      ) : null}
    </Container>
  );
}
