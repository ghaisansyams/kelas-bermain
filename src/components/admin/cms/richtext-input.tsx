"use client";

import { useRef, useState } from "react";
import {
  Bold,
  Heading2,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Video,
} from "lucide-react";
import { MediaPicker } from "@/components/admin/media-picker";

interface Tool {
  label: string;
  icon: typeof Bold;
  /** Wraps the selection, for inline marks. */
  wrap?: [string, string];
  /** Prefixes the line, for block marks. */
  prefix?: string;
}

const TOOLS: Tool[] = [
  { label: "Judul", icon: Heading2, prefix: "## " },
  { label: "Tebal", icon: Bold, wrap: ["**", "**"] },
  { label: "Miring", icon: Italic, wrap: ["*", "*"] },
  { label: "Tautan", icon: Link2, wrap: ["[", "](https://)"] },
  { label: "Daftar", icon: List, prefix: "- " },
  { label: "Daftar bernomor", icon: ListOrdered, prefix: "1. " },
  { label: "Kutipan", icon: Quote, prefix: "> " },
  { label: "Video YouTube", icon: Video, prefix: "@video " },
];

/**
 * Writing box for news articles. No editor library: the toolbar inserts the
 * same small markers the public renderer understands, and the admin can
 * always see and fix exactly what is stored.
 */
export function RichTextInput({
  name,
  initial,
  hint,
}: {
  name: string;
  initial: string;
  hint?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState(initial);

  function apply(tool: Tool) {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end);

    let next: string;
    let caret: number;

    if (tool.wrap) {
      next = value.slice(0, start) + tool.wrap[0] + selected + tool.wrap[1] + value.slice(end);
      caret = start + tool.wrap[0].length + selected.length;
    } else {
      // Put the prefix at the start of the line the cursor sits on.
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      next = value.slice(0, lineStart) + tool.prefix + value.slice(lineStart);
      caret = start + (tool.prefix?.length ?? 0);
    }

    setValue(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(caret, caret);
    });
  }

  function insertImage(url: string) {
    const el = ref.current;
    const at = el ? el.selectionStart : value.length;
    const snippet = `\n![Keterangan gambar](${url})\n`;
    setValue(value.slice(0, at) + snippet + value.slice(at));
  }

  return (
    <span className="flex flex-col gap-2">
      <span className="flex flex-wrap items-center gap-1 rounded-xl border border-line bg-canvas-deep/30 p-1.5">
        {TOOLS.map((tool) => (
          <button
            key={tool.label}
            type="button"
            onClick={() => apply(tool)}
            title={tool.label}
            aria-label={tool.label}
            className="inline-flex size-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-brand"
          >
            <tool.icon className="size-4" aria-hidden />
          </button>
        ))}
        <span className="ml-auto flex items-center gap-1">
          <ImageIcon className="size-3.5 text-muted" aria-hidden />
          <MediaPicker value="" onChange={insertImage} label="Sisipkan gambar" folder="general" />
        </span>
      </span>

      <textarea
        ref={ref}
        name={name}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        rows={14}
        className="w-full rounded-xl border border-line bg-surface px-3 py-2.5 font-mono text-sm leading-relaxed text-ink"
      />

      {hint ? <span className="text-xs font-medium text-muted">{hint}</span> : null}
    </span>
  );
}
