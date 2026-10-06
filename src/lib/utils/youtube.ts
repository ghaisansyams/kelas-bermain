/**
 * Minimal YouTube URL parsing — accepts watch/short/embed/share links and
 * extracts the 11-character video id, so event and testimonial data can
 * store whatever URL shape someone pastes rather than a specific format.
 */
const YOUTUBE_ID_PATTERN =
  /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

export function extractYoutubeId(url: string): string | null {
  const match = url.match(YOUTUBE_ID_PATTERN);
  return match ? match[1] : null;
}

/** `null` when the URL can't be parsed, so callers can skip rendering rather than embed a broken player. */
export function getYoutubeEmbedUrl(url: string): string | null {
  const id = extractYoutubeId(url);
  return id ? `https://www.youtube.com/embed/${id}?autoplay=1&rel=0` : null;
}

export function getYoutubeThumbnail(url: string): string | null {
  const id = extractYoutubeId(url);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}
