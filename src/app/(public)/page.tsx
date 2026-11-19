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
import {
  ACTIVITIES_HEADING,
  CTA_DEFAULTS,
  GALLERY_HEADING,
  JOIN_STEPS_HEADING,
  PILLARS_HEADING,
  SOCIAL_FEED_DEFAULTS,
  TESTIMONIALS_HEADING,
} from "@/lib/cms/home-defaults";
import { resolveHeroSlides } from "@/lib/cms/hero";
import { getHomeContent } from "@/lib/services/cms";
import {
  getCollectionItems,
  getPageContent,
  sectionLimit,
  toFields,
  toHeading,
  toJoinSteps,
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

  const [events, activities, testimonials, updates, gallery, content, publishedPage, pillarItems, joinStepItems] =
    await Promise.all([
      getUpcomingEvents(6),
      getActivities(),
      getTestimonials(),
      getLatestUpdates(6),
      getGalleryDrive(),
      getHomeContent(),
      getPageContent("home"),
      getCollectionItems("pillars"),
      getCollectionItems("join_steps"),
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
    hero: <Hero content={content.hero} slides={resolveHeroSlides(s.hero_slides, events)} />,
    hero_slides: null,
    pillars: (
      <Pillars
        items={toPillars(pillarItems)}
        heading={toHeading(s.pillars, PILLARS_HEADING)}
      />
    ),
    events_teaser: <UpcomingEvents events={events.slice(0, 6)} heading={content.eventsTeaser} />,
    join_steps: (
      <JoinSteps heading={toHeading(s.join_steps, JOIN_STEPS_HEADING)} steps={toJoinSteps(joinStepItems)} />
    ),
    activities: (
      <ActivityPreview
        activities={activities.slice(0, sectionLimit(s.activities, 3))}
        heading={toHeading(s.activities, ACTIVITIES_HEADING)}
      />
    ),
    gallery: (
      <GalleryPreview
        drive={gallery}
        heading={toHeading(s.gallery, GALLERY_HEADING)}
      />
    ),
    testimonials: <Testimonials items={testimonials} heading={toHeading(s.testimonials, TESTIMONIALS_HEADING)} />,
    social_feed: <SocialFeed updates={updates} content={toFields(s.social_feed, SOCIAL_FEED_DEFAULTS)} />,
    cta: <CtaBanner content={toFields(s.cta, CTA_DEFAULTS)} />,
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
