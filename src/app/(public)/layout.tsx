import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { getNavigationItems } from "@/lib/services/cms";

/** Chrome for the customer-facing site. The admin has its own shell. */
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const navItems = await getNavigationItems();

  return (
    <>
      <SiteHeader navItems={navItems} />
      <main id="konten" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
