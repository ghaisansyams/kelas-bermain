import "server-only";

import { db } from "@/lib/db";
import type { PageContent, SectionContent } from "@/lib/services/cms-website";

/**
 * Reads drafts instead of published content.
 *
 * Server-only, and callers must have confirmed `isPreviewRequest()` first —
 * that check requires both the preview cookie and a valid admin session, so
 * unpublished content never reaches a public visitor.
 */
export async function getDraftPageContent(pageKey: string): Promise<PageContent> {
  const empty: PageContent = { sections: {}, order: [], presentation: {} };

  try {
    const rows = await db.cms_sections.findMany({
      where: { page_key: pageKey },
      select: {
        section_key: true,
        draft: true,
        is_visible: true,
        presentation: true,
        archived: true,
      },
      orderBy: { sort_order: "asc" },
    });

    const sections: Record<string, SectionContent> = {};
    const presentation: Record<string, SectionContent> = {};
    const order: string[] = [];
    for (const row of rows) {
      if (!row.draft || row.archived) continue;
      sections[row.section_key] = row.draft as SectionContent;
      presentation[row.section_key] = (row.presentation ?? {}) as SectionContent;
      if (row.is_visible) order.push(row.section_key);
    }
    return { sections, order, presentation };
  } catch {
    return empty;
  }
}
