import { Fragment } from "react";
import type { Metadata } from "next";
import { ActivityPreview } from "@/components/home/activity-preview";
import { CtaBanner } from "@/components/home/cta-banner";
import { GalleryPreview } from "@/components/home/gallery-preview";
import { Hero } from "@/components/home/hero";
import { JoinSteps } from "@/components/home/join-steps";
import { Pillars } from "@/components/home/pillars";
import { SocialFeed } from "@/components/home/social-feed";
import { Testimonials } from "@/components/home/testimonials";
import { UpcomingEvents } from "@/components/home/upcoming-events";
import { siteConfig } from "@/data/site";
import { getDraftPageContent } from "@/lib/cms/draft";
import { presentationClass, presentationStyle, toPresentation } from "@/lib/cms/presentation";
import { isPreviewRequest } from "@/lib/cms/preview";
import { getHomeContent } from "@/lib/services/cms";
import {
  getCollectionItems,
  getPageContent,
  sectionLimit,
  toHeading,
  toPillars,
  toSeoContent,
} from "@/lib/services/cms-website";
import { getLatestUpdates } from "@/lib/services/update";
import {
  getActivities,
  getGalleryDrive,
  getTestimonials,
  getUpcomingEvents,
} from "@/lib/services/content";

/** Event status is derived from the current date; regenerate hourly. */
export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const [page] = await Promise.all([getPageContent("global")]);
  const seo = toSeoContent(page.sections.seo);
  return {
    title: seo.siteTitle,
    description: seo.description,
    keywords: seo.keywords || undefined,
    alternates: { canonical: "/" },
    openGraph: seo.ogImageUrl ? { images: [seo.ogImageUrl] } : undefined,
  };
}

export default async function HomePage() {
  // A signed-in admin in preview mode sees drafts; everyone else sees
  // published content from the same URL.
  const preview = await isPreviewRequest();

  const [events, activities, testimonials, updates, gallery, content, publishedPage, pillarItems] =
    await Promise.all([
      getUpcomingEvents(6),
      getActivities(),
      getTestimonials(),
      getLatestUpdates(6),
      getGalleryDrive(),
      getHomeContent(),
      getPageContent("home"),
      getCollectionItems("pillars"),
    ]);

  const page = preview ? await getDraftPageContent("home") : publishedPage;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
    email: siteConfig.email,
    description: siteConfig.description,
    sameAs: ["https://instagram.com/kelasbermain.id"],
  };

  const s = page.sections;

  /**
   * Each section is built once here, then emitted in the order the admin set
   * in the CMS. A section the admin hid is simply absent from `page.order`,
   * so hiding one is not a special case anywhere in the markup.
   */
  const blocks: Record<string, React.ReactNode> = {
    hero: <Hero content={content.hero} slides={content.heroSlides} />,
    hero_slides: null,
    pillars: (
      <Pillars
        items={toPillars(pillarItems)}
        heading={toHeading(s.pillars, {
          eyebrow: "Yang diasah",
          title: "Empat keterampilan yang diasah di setiap kegiatan",
          description:
            "Temanya berganti setiap pekan — memasak, bertani, mengenal profesi. Tapi empat hal ini selalu jadi tujuannya.",
        })}
      />
    ),
    events_teaser: <UpcomingEvents events={events.slice(0, 6)} heading={content.eventsTeaser} />,
    join_steps: <JoinSteps />,
    activities: <ActivityPreview activities={activities.slice(0, sectionLimit(s.activities, 3))} />,
    gallery: (
      <GalleryPreview
        drive={gallery}
        heading={toHeading(s.gallery, {
          eyebrow: "Galeri",
          title: "Sekilas keseruan di kelas",
          description: "Momen yang sempat kami abadikan di beberapa kegiatan terakhir.",
        })}
      />
    ),
    testimonials: <Testimonials items={testimonials} />,
    social_feed: <SocialFeed updates={updates} />,
    cta: <CtaBanner />,
  };

  // Falls back to the shipped order when the CMS has nothing published yet.
  const order =
    page.order.length > 0
      ? page.order
      : [
          "hero",
          "pillars",
          "events_teaser",
          "join_steps",
          "activities",
          "gallery",
          "testimonials",
          "social_feed",
          "cta",
        ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {order.map((key) => {
        const block = blocks[key];
        if (!block) return null;

        // A section with no presentation preset is emitted bare, so its own
        // spacing and sibling rules stay exactly as they were.
        const preset = toPresentation(page.presentation?.[key]);
        const className = presentationClass(preset);
        const style = presentationStyle(preset);
        if (!className && !style) return <Fragment key={key}>{block}</Fragment>;

        return (
          <div key={key} className={className} style={style}>
            {block}
          </div>
        );
      })}
    </>
  );
}
