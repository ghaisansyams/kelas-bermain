import type { Metadata } from "next";
import { Ticket } from "lucide-react";
import { TicketCheckForm } from "@/components/registration/ticket-check-form";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Cek Tiket",
  description: "Cek status pendaftaran dan pembayaran kelas Kelas Bermain.",
  robots: { index: false, follow: false },
};

export default function TiketPage() {
  return (
    <Container className="max-w-2xl py-10 sm:py-14">
      <header>
        <span className="inline-flex items-center gap-2 rounded-pill bg-sun-soft px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-sun-dark">
          <Ticket className="size-3.5" aria-hidden />
          Cek Tiket
        </span>
        <h1 className="mt-4 text-[1.75rem] leading-tight font-extrabold text-ink sm:text-4xl">
          Cek Status Pendaftaran
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Masukkan nomor pendaftaran dan kontak yang kamu pakai saat mendaftar untuk melihat
          apakah pembayarannya sudah berhasil atau masih menunggu.
        </p>
      </header>

      <div className="mt-8 rounded-card border border-line bg-surface p-5 shadow-soft sm:p-7">
        <TicketCheckForm />
      </div>
    </Container>
  );
}
