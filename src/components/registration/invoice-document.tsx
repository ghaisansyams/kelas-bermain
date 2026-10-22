import type { RegistrationBatch } from "@/lib/services/registration";
import type { EventView } from "@/lib/types";
import { paymentAccounts } from "@/data/payment-accounts";
import { formatDate, formatDateRange } from "@/lib/utils/date";
import { formatRupiah } from "@/lib/utils/format";

/**
 * Invoice sebagai tagihan, bukan sebagai bukti lunas.
 *
 * Tersembunyi di layar (`hidden`), hanya tampil saat mencetak (`print:block`
 * — variannya bawaan Tailwind, mengaktif saat @media print). Browser tidak
 * punya pustaka pembuat PDF di proyek ini, jadi "Unduh" di sini artinya
 * dialog cetak bawaan browser dengan tujuan "Simpan sebagai PDF" — itu cara
 * standar menghasilkan PDF tanpa menambah dependensi baru, dan sudah
 * dipakai untuk unduhan sertifikat di aplikasi ini.
 *
 * Nomor invoice yang sesungguhnya (`payments.invoice_number`) baru terbit
 * saat admin mengonfirmasi lunas — sengaja begitu, supaya nomor invoice di
 * buku keuangan tidak pernah berarti dua hal berbeda. Dokumen ini dicetak
 * SEBELUM itu terjadi, jadi nomor rujukannya diturunkan dari nomor
 * pendaftaran (sudah unik, sudah permanen) dengan awalan "INV-", ditandai
 * jelas sebagai nomor referensi — bukan nomor invoice resmi ERP.
 */
export function InvoiceDocument({
  event,
  batch,
  parentName,
}: {
  event: EventView;
  batch: RegistrationBatch;
  parentName: string;
}) {
  const lead = batch.registrations[0];
  const childNames = batch.registrations
    .map((_, index) => `Anak ${index + 1}`)
    .join(", ");
  const reference = `INV-${lead.registrationNumber.replace(/^KB-REG-/, "")}`;
  const today = formatDate(new Date().toISOString().slice(0, 10));

  return (
    <div className="hidden print:block print-area bg-white p-10 text-ink">
      <header className="flex items-start justify-between border-b-2 border-ink pb-6">
        <div>
          <p className="text-2xl font-extrabold tracking-tight">Kelas Bermain</p>
          <p className="mt-1 text-xs text-muted">
            Tempat anak bermain, belajar, dan bertumbuh bersama teman baru di Jabodetabek.
          </p>
          <p className="mt-0.5 text-xs text-muted">kelasbermain.id@gmail.com</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-extrabold tracking-wide">INVOICE</p>
          <p className="mt-1 text-sm">
            No. Invoice: <span className="font-mono font-bold">{reference}</span>
          </p>
          <p className="text-xs text-muted">Diterbitkan {today}</p>
        </div>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-6 text-sm">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted">
            Ditagihkan kepada
          </p>
          <p className="mt-1 font-bold">{parentName || "Orang tua / Wali"}</p>
          <p className="text-ink-soft">{childNames}</p>
          <p className="mt-1 text-ink-soft">No. Pendaftaran: {lead.registrationNumber}</p>
          <p className="text-ink-soft">No. Pelanggan: {batch.customerNumber}</p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Status</p>
          {/* Kuning, bukan hijau — ini tagihan, bukan kuitansi. Warna yang
              sama dengan yang dipakai status "Menunggu Konfirmasi" di seluruh
              alur, supaya tidak ada dokumen yang terlihat lebih "selesai"
              dari yang sebenarnya. */}
          <p className="mt-1 inline-block rounded-full border border-sun/60 bg-sun-soft px-3 py-1 text-xs font-bold text-sun-dark">
            MENUNGGU PEMBAYARAN
          </p>
        </div>
      </section>

      <table className="mt-8 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-ink text-left text-xs font-bold uppercase tracking-wider">
            <th className="py-2">Deskripsi</th>
            <th className="py-2 text-right">Jumlah Anak</th>
            <th className="py-2 text-right">Harga Satuan</th>
            <th className="py-2 text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-line">
            <td className="py-3">
              <p className="font-bold">{event.title}</p>
              <p className="text-xs text-ink-soft">
                {formatDateRange(event.startDate, event.endDate)} ·{" "}
                {event.location.venue}, {event.location.city}
              </p>
            </td>
            <td className="py-3 text-right align-top">{batch.registrations.length}</td>
            <td className="py-3 text-right align-top">
              {formatRupiah(batch.totalAmount / batch.registrations.length)}
            </td>
            <td className="py-3 text-right align-top font-semibold">
              {formatRupiah(batch.totalAmount)}
            </td>
          </tr>
          {batch.pricing.discountAmount > 0 ? (
            <tr className="border-b border-line text-ink-soft">
              <td className="py-2" colSpan={3}>
                {batch.pricing.discountLabel ?? "Diskon"}
              </td>
              <td className="py-2 text-right">
                −{formatRupiah(batch.pricing.discountAmount)}
              </td>
            </tr>
          ) : null}
          {batch.pricing.voucher ? (
            <tr className="border-b border-line text-ink-soft">
              <td className="py-2" colSpan={3}>
                Voucher {batch.pricing.voucher.code}
              </td>
              <td className="py-2 text-right">
                −{formatRupiah(batch.pricing.voucher.amount)}
              </td>
            </tr>
          ) : null}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className="pt-4 text-right text-base font-bold">
              Total Tagihan
            </td>
            <td className="pt-4 text-right text-base font-extrabold">
              {formatRupiah(batch.totalAmount)}
            </td>
          </tr>
        </tfoot>
      </table>

      <section className="mt-10 rounded-lg border border-line p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-muted">
          Instruksi pembayaran
        </p>
        <p className="mt-2 text-sm">
          Transfer ke salah satu rekening berikut atas nama{" "}
          <strong>{paymentAccounts[0]?.holder}</strong>, lalu kirim bukti transfer lewat
          WhatsApp atau halaman status pendaftaran.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
          {paymentAccounts.map((account) => (
            <div key={account.number} className="rounded-md border border-line px-3 py-2">
              <p className="text-xs text-muted">{account.bank}</p>
              <p className="font-mono font-bold">{account.number}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mt-8 border-t border-line pt-4 text-xs text-muted">
        <p>
          Dokumen ini adalah tagihan pembayaran, bukan bukti pembayaran telah diterima.
          Status akan berubah menjadi lunas setelah tim Kelas Bermain memverifikasi bukti
          transfer.
        </p>
        <p className="mt-1">Kelas Bermain · kelasbermain.id@gmail.com</p>
      </footer>
    </div>
  );
}
