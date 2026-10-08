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
}

/**
 * The message a parent sends after confirming, pre-filled so the team gets
 * everything it needs in the first line instead of asking for it.
 */
export function registrationWhatsappUrl(info: RegistrationHandoff): string {
  const message = [
    "Halo Kelas Bermain, saya sudah melakukan pendaftaran.",
    "",
    `Nomor Pendaftaran: ${info.registrationNumber}`,
    `Nama Pendamping: ${info.companionName}`,
    `Jumlah Anak: ${info.childrenCount}`,
    `Event: ${info.eventName}`,
    `Total Pembayaran: ${info.formattedTotal}`,
    "",
    "Mohon informasi pembayaran selanjutnya.",
    "",
    "Terima kasih.",
  ].join("\n");

  return `https://wa.me/${WHATSAPP_REGISTRATION_NUMBER}?text=${encodeURIComponent(message)}`;
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
