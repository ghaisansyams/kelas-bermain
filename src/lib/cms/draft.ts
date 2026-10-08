import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
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
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("cms_sections")
      .select("section_key, draft, sort_order, is_visible, presentation, archived")
      .eq("page_key", pageKey)
      .order("sort_order");

    if (error || !Array.isArray(data)) return empty;

    const rows = data as unknown as {
      section_key: string;
      draft: SectionContent | null;
      is_visible: boolean;
      presentation: SectionContent | null;
      archived: boolean;
    }[];

    const sections: Record<string, SectionContent> = {};
    const presentation: Record<string, SectionContent> = {};
    const order: string[] = [];
    for (const row of rows) {
      if (!row.draft || row.archived) continue;
      sections[row.section_key] = row.draft;
      presentation[row.section_key] = row.presentation ?? {};
      if (row.is_visible) order.push(row.section_key);
    }
    return { sections, order, presentation };
  } catch {
    return empty;
  }
}
