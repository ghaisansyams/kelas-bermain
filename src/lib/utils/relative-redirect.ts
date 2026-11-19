/**
 * Pengalihan dengan alamat relatif ("/event"), bukan "https://domain/event".
 *
 * Di hosting, aplikasi berjalan di belakang proxy dan hanya tahu alamat
 * dalamnya (localhost:3001). Membuat alamat tujuan dari request.url atau
 * url.origin membuat pengunjung dialihkan ke localhost:3001 yang tidak bisa
 * dibuka dari luar. Header Location relatif diselesaikan browser terhadap
 * alamat yang sedang dibuka, jadi domain aslinya selalu terjaga.
 */
export function relativeRedirect(location: string, status: 301 | 302 | 303 | 307 | 308 = 307): Response {
  return new Response(null, { status, headers: { Location: location } });
}

/** Hanya path satu situs ("/x"); "//host" dan alamat penuh jatuh ke "/". */
export function safeSitePath(path: string | null): string {
  return path && path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/\\") ? path : "/";
}
