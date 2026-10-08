import { mockInstagramMedia, type RawInstagramMedia } from "@/data/updates";

/**
 * Where updates come from.
 *
 * Everything above this file (the update service, the pages, the cards)
 * depends only on `UpdateSource`, so switching between the sample content and
 * the real account is this file's decision alone.
 *
 * The real adapter is used as soon as INSTAGRAM_ACCESS_TOKEN exists on the
 * server. There is no flag to flip and nothing to redeploy for: add the
 * variable, and the next page build reads the live account. Without it the
 * site keeps showing the sample posts rather than an empty page, and the
 * server log says plainly which one is in use.
 */
export interface UpdateSource {
  fetchMedia(): Promise<RawInstagramMedia[]>;
}

export const mockInstagramSource: UpdateSource = {
  async fetchMedia() {
    return mockInstagramMedia;
  },
};

let warned = false;

/**
 * Picks the live account when a token is configured, the sample feed when it
 * is not. The import is deferred so the server-only Instagram module is never
 * pulled into a client bundle.
 */
export async function resolveUpdateSource(): Promise<UpdateSource> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;

  if (!token) {
    if (!warned && process.env.NODE_ENV === "production") {
      warned = true;
      console.warn(
        "[update] INSTAGRAM_ACCESS_TOKEN belum diatur — halaman Update memakai konten contoh, bukan akun Instagram asli.",
      );
    }
    return mockInstagramSource;
  }

  const { createInstagramSource } = await import("@/lib/services/instagram-source");
  return createInstagramSource({
    token,
    username: process.env.INSTAGRAM_USERNAME ?? "@kelasbermain.id",
  });
}
