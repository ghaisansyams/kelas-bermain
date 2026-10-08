import Image from "next/image";
import Link from "next/link";
import { getYoutubeEmbedUrl } from "@/lib/utils/youtube";

/**
 * A deliberately small writing format for news articles.
 *
 * Parsed into React elements rather than injected as HTML, so nothing an
 * author types can become markup the site did not intend — there is no
 * dangerouslySetInnerHTML anywhere in this file. That rules out the usual
 * rich-text XSS hole without pulling in an editor library.
 *
 * Supported, one marker per line:
 *   # / ## / ###   heading
 *   - item         bullet list
 *   1. item        numbered list
 *   > text         quote
 *   ![alt](url)    image
 *   @video url     YouTube
 * Inline: **bold**, *italic*, [text](url)
 */

type Block =
  | { type: "heading"; level: 2 | 3 | 4; text: string }
  | { type: "paragraph"; text: string }
  | { type: "quote"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "numbers"; items: string[] }
  | { type: "image"; src: string; alt: string }
  | { type: "video"; url: string };

function parse(source: string): Block[] {
  const lines = source.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let bullets: string[] = [];
  let numbers: string[] = [];

  const flush = () => {
    if (paragraph.length) {
      blocks.push({ type: "paragraph", text: paragraph.join(" ") });
      paragraph = [];
    }
    if (bullets.length) {
      blocks.push({ type: "bullets", items: bullets });
      bullets = [];
    }
    if (numbers.length) {
      blocks.push({ type: "numbers", items: numbers });
      numbers = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trim();

    if (!line) {
      flush();
      continue;
    }

    const image = /^!\[([^\]]*)\]\(([^)]+)\)$/.exec(line);
    if (image) {
      flush();
      blocks.push({ type: "image", alt: image[1], src: image[2] });
      continue;
    }

    if (line.startsWith("@video ")) {
      flush();
      blocks.push({ type: "video", url: line.slice(7).trim() });
      continue;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      flush();
      const level = (heading[1].length + 1) as 2 | 3 | 4;
      blocks.push({ type: "heading", level, text: heading[2] });
      continue;
    }

    if (line.startsWith("> ")) {
      flush();
      blocks.push({ type: "quote", text: line.slice(2) });
      continue;
    }

    const bullet = /^[-*]\s+(.*)$/.exec(line);
    if (bullet) {
      if (paragraph.length) flush();
      bullets.push(bullet[1]);
      continue;
    }

    const numbered = /^\d+\.\s+(.*)$/.exec(line);
    if (numbered) {
      if (paragraph.length) flush();
      numbers.push(numbered[1]);
      continue;
    }

    if (bullets.length || numbers.length) flush();
    paragraph.push(line);
  }

  flush();
  return blocks;
}

/** Inline formatting. Returns elements, never a string of HTML. */
function inline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const token = match[0];
    const key = `${keyPrefix}-${index++}`;

    if (token.startsWith("**")) {
      nodes.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("*")) {
      nodes.push(<em key={key}>{token.slice(1, -1)}</em>);
    } else {
      const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(token);
      if (link) {
        const href = link[2];
        // Only same-site and http(s) links are rendered as links, so a
        // "javascript:" URL can never become a clickable element.
        const safe = href.startsWith("/") || /^https?:\/\//.test(href);
        nodes.push(
          safe ? (
            <Link
              key={key}
              href={href}
              className="font-semibold text-brand hover:underline"
              {...(href.startsWith("http")
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
            >
              {link[1]}
            </Link>
          ) : (
            <span key={key}>{link[1]}</span>
          ),
        );
      } else {
        nodes.push(token);
      }
    }
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

export function RichText({ source }: { source: string }) {
  const blocks = parse(source);
  if (blocks.length === 0) return null;

  return (
    <div className="space-y-5">
      {blocks.map((block, index) => {
        const key = `b-${index}`;
        switch (block.type) {
          case "heading": {
            const Tag = `h${block.level}` as "h2" | "h3" | "h4";
            return (
              <Tag
                key={key}
                className="mt-8 text-xl font-extrabold text-ink first:mt-0 sm:text-2xl"
              >
                {inline(block.text, key)}
              </Tag>
            );
          }
          case "quote":
            return (
              <blockquote
                key={key}
                className="border-l-4 border-brand/30 bg-brand-soft/30 py-3 pl-4 text-[1.0625rem] leading-relaxed font-medium text-ink"
              >
                {inline(block.text, key)}
              </blockquote>
            );
          case "bullets":
            return (
              <ul key={key} className="list-disc space-y-1.5 pl-5 text-ink-soft">
                {block.items.map((item, i) => (
                  <li key={i}>{inline(item, `${key}-${i}`)}</li>
                ))}
              </ul>
            );
          case "numbers":
            return (
              <ol key={key} className="list-decimal space-y-1.5 pl-5 text-ink-soft">
                {block.items.map((item, i) => (
                  <li key={i}>{inline(item, `${key}-${i}`)}</li>
                ))}
              </ol>
            );
          case "image":
            return (
              <figure key={key} className="overflow-hidden rounded-card border border-line">
                <Image
                  src={block.src}
                  alt={block.alt}
                  width={1200}
                  height={800}
                  className="h-auto w-full object-cover"
                />
                {block.alt ? (
                  <figcaption className="px-4 py-2 text-xs text-muted">{block.alt}</figcaption>
                ) : null}
              </figure>
            );
          case "video": {
            const embed = getYoutubeEmbedUrl(block.url);
            if (!embed) return null;
            return (
              <div
                key={key}
                className="aspect-video overflow-hidden rounded-card border border-line"
              >
                <iframe
                  src={embed}
                  title="Video"
                  allow="accelerometer; clipboard-write; encrypted-media; picture-in-picture"
                  allowFullScreen
                  className="size-full"
                />
              </div>
            );
          }
          default:
            return (
              <p key={key} className="text-[1.0625rem] leading-relaxed text-ink-soft">
                {inline(block.text, key)}
              </p>
            );
        }
      })}
    </div>
  );
}

/** Plain-text preview for cards, when an excerpt was not written. */
export function richTextExcerpt(source: string, max = 180): string {
  const text = parse(source)
    .filter((block) => block.type === "paragraph")
    .map((block) => (block as { text: string }).text)
    .join(" ")
    .replace(/\*\*|\*/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}
