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

/**
 * Media CMS (foto, logo, video, gambar Instagram), satu akar untuk semuanya.
 *
 * Variabelnya UPLOAD_DIR, sama dengan yang dipakai sinkronisasi Instagram —
 * dua akar berbeda berarti gambar yang ditulis satu bagian tidak ditemukan
 * bagian lain. Bawaannya public/uploads supaya berkas terlihat saat
 * pengembangan; di produksi Next hanya melayani berkas public/ yang sudah ada
 * saat build, jadi berkas yang masuk sesudahnya dilayani rute /uploads/[...path],
 * yang membaca folder yang sama. Di VPS, nginx boleh melayani folder ini
 * langsung lewat `location /uploads/ { alias ...; }` tanpa mengubah satu URL.
 */
export const MEDIA_DIR = process.env.UPLOAD_DIR || "public/uploads";

/** Awalan URL publik semua berkas media. Disimpan di konten CMS. */
export const MEDIA_URL_PREFIX = "/uploads";
