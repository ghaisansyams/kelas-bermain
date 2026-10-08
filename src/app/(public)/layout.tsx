import { PreviewBanner } from "@/components/layout/preview-banner";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { getNavigationItems } from "@/lib/services/cms";
import { isPreviewRequest } from "@/lib/cms/preview";
import {
  getPageContent,
  toFooterContent,
  toSiteIdentity,
  toThemeStyle,
} from "@/lib/services/cms-website";

/** Chrome for the customer-facing site. The admin has its own shell. */
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [navItems, global, preview] = await Promise.all([
    getNavigationItems(),
    getPageContent("global"),
    isPreviewRequest(),
  ]);

  const identity = toSiteIdentity(global.sections.identity);
  const footer = toFooterContent(global.sections.footer);
  // Only colours and two radii are overridable, so a theme change can never
  // break the mobile layout — font sizes and spacing stay in the stylesheet.
  const themeStyle = toThemeStyle(global.sections.theme);

  return (
    <div style={themeStyle as React.CSSProperties} className="contents">
      {preview ? <PreviewBanner /> : null}
      <SiteHeader navItems={navItems} identity={identity} />
      <main id="konten" className="flex-1">
        {children}
      </main>
      <SiteFooter identity={identity} content={footer} />
    </div>
  );
}
