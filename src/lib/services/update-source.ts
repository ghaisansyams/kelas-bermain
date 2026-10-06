import { mockInstagramMedia, type RawInstagramMedia } from "@/data/updates";

/**
 * Where updates come from. Everything above this file (the update service,
 * the pages, the cards) depends only on `UpdateSource`, so swapping the mock
 * for the real thing is a change in this file alone.
 *
 * Planned real adapter: Instagram Graph API, called server-side only. Its
 * access token belongs in a server-side environment variable such as
 * INSTAGRAM_ACCESS_TOKEN — never NEXT_PUBLIC_*, and never a dummy value
 * committed to the repo. Until that credential exists, nothing here claims
 * the content is live.
 */
export interface UpdateSource {
  fetchMedia(): Promise<RawInstagramMedia[]>;
}

export const mockInstagramSource: UpdateSource = {
  async fetchMedia() {
    return mockInstagramMedia;
  },
};
