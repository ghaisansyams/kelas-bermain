/**
 * Lokasi berkas yang diunggah di disk server.
 *
 * Terpisah dari berkas-berkas yang memakainya karena payment-proof.ts adalah
 * server action, dan berkas server action hanya boleh mengekspor fungsi
 * async — sebuah konstanta di sana menggagalkan build.
 *
 * Bukti pembayaran sengaja di luar public/. Tangkapan layar aplikasi bank
 * orang tua tidak boleh punya URL yang bisa dibuka tanpa login admin.
 */
export const PAYMENT_PROOF_DIR = process.env.PAYMENT_PROOF_DIR || "storage/bukti-pembayaran";
