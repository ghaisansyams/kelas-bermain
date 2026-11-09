/**
 * Where a finished registration is handed over to a human.
 *
 * One constant, not a number repeated across components: the team will
 * change it, and a number spread through the code is a number that gets
 * changed in three places out of four.
 *
 * Must be in international format — wa.me rejects a leading zero, and it
 * fails by opening an empty chat rather than showing an error, so a mistake
 * here stays invisible until a parent reports it.
 */
export const WHATSAPP_REGISTRATION_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_REGISTRATION_NUMBER?.replace(/\D/g, "") || "6281774918611";

import type { PricingResult } from "@/lib/pricing";
import { formatRupiah } from "@/lib/utils/format";

/** Rincian harga dari mesin harga, dalam bentuk baris untuk pesan WhatsApp. */
export function pricingToLines(pricing: PricingResult): { label: string; value: string }[] {
  const lines = [
    { label: "Harga per anak", value: formatRupiah(pricing.unitPrice) },
    {
      label: "Jumlah anak",
      value:
        pricing.freeChildrenCount > 0
          ? `${pricing.childrenCount} anak (${pricing.freeChildrenCount} gratis, di bawah 3 tahun)`
          : `${pricing.childrenCount} anak`,
    },
    { label: "Subtotal", value: formatRupiah(pricing.subtotal) },
  ];
  for (const discount of pricing.discounts) {
    lines.push({ label: discount.label, value: `- ${formatRupiah(discount.amount)}` });
  }
  if (pricing.voucher) {
    lines.push({ label: pricing.voucher.label, value: `- ${formatRupiah(pricing.voucher.amount)}` });
  }
  if (pricing.extraCompanions > 0) {
    lines.push({
      label: `Pendamping tambahan (${pricing.extraCompanions} × ${formatRupiah(pricing.extraCompanionPrice)})`,
      value: formatRupiah(pricing.extraCompanionTotal),
    });
  }
  return lines;
}

export interface HandoffChild {
  name: string;
  registrationNumber: string;
  /** Usia pada hari kelas, sudah berupa teks ("3 tahun 8 bulan"). */
  age: string;
  /** Anak di bawah 3 tahun yang tidak ditagih. */
  free: boolean;
}

export interface HandoffCompanion {
  name: string;
  whatsapp: string;
  domicile: string;
  extraCompanions: number;
  children: HandoffChild[];
}

export interface RegistrationHandoff {
  eventName: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string;
  companions: HandoffCompanion[];
  /** Rincian biaya baris demi baris; kosong untuk kelas gratis. */
  priceLines: { label: string; value: string }[];
  formattedTotal: string;
  /** Kelas gratis tidak diminta transfer, jadi rekeningnya tidak dicantumkan. */
  needsPayment: boolean;
  bankAccounts: { bank: string; number: string }[];
  accountHolder: string;
  /** Link ke halaman status pendaftaran (Cek Tiket atau halaman pembayaran). */
  statusUrl?: string;
}

/**
 * Pesan yang dikirim orang tua ke admin begitu pendaftarannya tercatat. Satu
 * pesan sudah memuat semuanya — data peserta, rincian harga, dan rekening
 * tujuan transfer — supaya tim tidak perlu menanyakannya berulang kali dan
 * bukti transfer cukup dibalas di chat yang sama.
 *
 * Link status ikut dicantumkan: WhatsApp adalah tempat percakapan ini
 * berlangsung, jadi jalan kembali ke halaman status harus ada di sana juga.
 */
export function registrationWhatsappUrl(info: RegistrationHandoff): string {
  const lines: string[] = [
    "Halo Kelas Bermain,",
    "",
    info.needsPayment
      ? "Saya sudah mendaftar dan akan melakukan pembayaran. Berikut rincian pendaftaran saya."
      : "Saya sudah mendaftar. Berikut rincian pendaftaran saya, mohon dikonfirmasi ketersediaan tempatnya.",
    "",
    "*KEGIATAN*",
    info.eventName,
    `Tanggal : ${info.eventDate}`,
    `Waktu   : ${info.eventTime}`,
    `Lokasi  : ${info.eventLocation}`,
  ];

  info.companions.forEach((companion, index) => {
    lines.push("", info.companions.length > 1 ? `*PENDAMPING ${index + 1}*` : "*PENDAMPING*");
    lines.push(
      `Nama      : ${companion.name}`,
      `WhatsApp  : ${companion.whatsapp}`,
      `Domisili  : ${companion.domicile}`,
    );
    if (companion.extraCompanions > 0) {
      lines.push(`Pendamping tambahan : ${companion.extraCompanions} orang`);
    }
    lines.push(
      "",
      companion.children.length > 1 ? `*ANAK (${companion.children.length})*` : "*ANAK*",
    );
    companion.children.forEach((child, childIndex) => {
      lines.push(
        `${childIndex + 1}. ${child.name} — ${child.age}${child.free ? " (gratis)" : ""}`,
        `   No. Pendaftaran: ${child.registrationNumber}`,
      );
    });
  });

  if (info.needsPayment) {
    lines.push("", "*RINCIAN BIAYA*");
    for (const line of info.priceLines) lines.push(`${line.label}: ${line.value}`);
    lines.push(`*Total: ${info.formattedTotal}*`);

    lines.push("", "*PEMBAYARAN*", "Transfer ke salah satu rekening berikut:");
    for (const account of info.bankAccounts) lines.push(`• ${account.bank}: ${account.number}`);
    lines.push(`a.n. ${info.accountHolder}`, "", "Bukti transfer saya kirim di chat ini.");
  } else {
    lines.push("", "*BIAYA*", "Gratis");
  }

  if (info.statusUrl) {
    lines.push("", "Status pendaftaran saya:", info.statusUrl);
  }

  lines.push("", "Terima kasih atas perhatiannya.");

  return `https://wa.me/${WHATSAPP_REGISTRATION_NUMBER}?text=${encodeURIComponent(lines.join("\n"))}`;
}

/** Sending proof of transfer for a registration that already exists. */
export function paymentProofWhatsappUrl(info: {
  registrationNumber: string;
  companionName: string;
  childName: string;
}): string {
  const message = [
    `Halo Kelas Bermain, saya ${info.companionName}.`,
    `Saya sudah transfer untuk pendaftaran ${info.registrationNumber}`,
    `atas nama ${info.childName}.`,
    "Berikut bukti transfernya.",
  ].join(" ");

  return `https://wa.me/${WHATSAPP_REGISTRATION_NUMBER}?text=${encodeURIComponent(message)}`;
}
