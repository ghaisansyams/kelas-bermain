import type { SVGProps } from "react";

/**
 * Brand glyphs for the organisation's own social profiles.
 * lucide-react v1 no longer ships these, so they live here as plain paths.
 */

type IconProps = SVGProps<SVGSVGElement>;

export function InstagramIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5.5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function TiktokIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <path d="M14.3 3v10.8a3.6 3.6 0 1 1-3.1-3.57" />
      <path d="M14.3 3c.3 2.4 1.9 4 4.4 4.2" />
    </svg>
  );
}

export function YoutubeIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
      <path d="M10.4 9.6 15 12l-4.6 2.4Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function ThreadsIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <path d="M12.2 21c-4.9 0-8-3.3-8-9s3.2-9 8-9c3.6 0 6 1.7 7.1 4.4" />
      <path d="M15.8 13.4c0 2-1.6 3.2-3.5 3.2-1.5 0-2.6-.8-2.6-2s1-1.9 2.7-2c2.9-.2 4.9.7 4.9 3.3 0 2.1-1.7 3.6-4 3.9" />
    </svg>
  );
}

export function FacebookIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <path d="M15.2 8.2h-1.3c-1 0-1.6.6-1.6 1.6v1.4h2.7l-.4 2.7h-2.3V21" />
      <path d="M9.6 11.2h2.7" />
    </svg>
  );
}

export function WhatsappIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <path d="M3.5 20.5l1.3-4.1a8 8 0 1 1 3 3l-4.3 1.1Z" />
      <path d="M9.2 8.6c.3 2.9 2.6 5.3 5.5 5.7.6.1 1.2-.3 1.4-.9l.1-.5-2-1-.8.9a6 6 0 0 1-2.4-2.4l.9-.8-1-2-.5.1c-.7.2-1.1.8-1.2 1.4Z" />
    </svg>
  );
}
