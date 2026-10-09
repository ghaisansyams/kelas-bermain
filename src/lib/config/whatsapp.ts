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
  process.env.NEXT_PUBLIC_WHATSAPP_REGISTRATION_NUMBER?.replace(/\D/g, "") || "6282211278857";

export interface RegistrationHandoff {
  registrationNumber: string;
  companionName: string;
  childrenCount: number;
  eventName: string;
  formattedTotal: string;
  /** Absolute link to the page that carries "Kirim Bukti Pembayaran". */
  statusUrl?: string;
  /** A free class has nothing to transfer, so it is not asked to. */
  needsPayment?: boolean;
}

/**
 * The message a parent sends the moment they confirm, pre-filled so the team
 * gets everything it needs in the first message instead of asking for it
 * across four replies.
 *
 * The status link is in the message on purpose. WhatsApp is where this
 * conversation lives, so the way back to the proof upload has to live there
 * too — a parent who closes the tab otherwise has no route back.
 */
export function registrationWhatsappUrl(info: RegistrationHandoff): string {
  const lines = [
    "Halo Kelas Bermain,",
    "",
    "Saya ingin mengonfirmasi pendaftaran dengan rincian berikut.",
    "",
    `Nomor Pendaftaran : ${info.registrationNumber}`,
    `Nama Pendamping   : ${info.companionName}`,
    `Jumlah Anak       : ${info.childrenCount}`,
    `Kegiatan          : ${info.eventName}`,
    `Total Biaya       : ${info.formattedTotal}`,
  ];

  if (info.statusUrl) {
    lines.push(
      "",
      info.needsPayment
        ? "Halaman pembayaran dan pengiriman bukti transfer:"
        : "Halaman status pendaftaran saya:",
      info.statusUrl,
    );
  }

  lines.push(
    "",
    info.needsPayment
      ? "Mohon informasi mengenai langkah pembayaran selanjutnya."
      : "Mohon konfirmasi ketersediaan tempat untuk pendaftaran ini.",
    "",
    "Terima kasih atas perhatiannya.",
  );

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
