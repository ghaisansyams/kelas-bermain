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
import { getHomeContent } from "@/lib/services/cms";
import { getLatestUpdates } from "@/lib/services/update";
import {
  getActivities,
  getGalleryItems,
  getTestimonials,
  getUpcomingEvents,
} from "@/lib/services/content";

/** Event status is derived from the current date; regenerate hourly. */
export const revalidate = 3600;

export const metadata: Metadata = {
  title: `${siteConfig.name} — ${siteConfig.tagline}`,
  description: siteConfig.description,
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const [events, activities, testimonials, updates, gallery, content] = await Promise.all([
    getUpcomingEvents(6),
    getActivities(),
    getTestimonials(),
    getLatestUpdates(6),
    getGalleryItems(),
    getHomeContent(),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
    email: siteConfig.email,
    description: siteConfig.description,
    sameAs: [
      "https://instagram.com/kelasbermain",
      "https://tiktok.com/@kelasbermain",
      "https://youtube.com/@kelasbermain",
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Hero content={content.hero} slides={content.heroSlides} />
      <Pillars />
      <UpcomingEvents events={events.slice(0, 6)} heading={content.eventsTeaser} />
      <JoinSteps />
      <ActivityPreview activities={activities.slice(0, 3)} />
      <GalleryPreview items={gallery.slice(0, 6)} />
      <Testimonials items={testimonials} />
      <SocialFeed updates={updates} />
      <CtaBanner />
    </>
  );
}
