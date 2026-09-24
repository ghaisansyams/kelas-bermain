import type { Metadata } from "next";
import { ActivityPreview } from "@/components/home/activity-preview";
import { CtaBanner } from "@/components/home/cta-banner";
import { Hero } from "@/components/home/hero";
import { JoinSteps } from "@/components/home/join-steps";
import { Pillars } from "@/components/home/pillars";
import { SocialFeed } from "@/components/home/social-feed";
import { Stats } from "@/components/home/stats";
import { Testimonials } from "@/components/home/testimonials";
import { UpcomingEvents } from "@/components/home/upcoming-events";
import { siteConfig } from "@/data/site";
import {
  getActivities,
  getSocialFeed,
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
  const [events, activities, testimonials, posts] = await Promise.all([
    getUpcomingEvents(6),
    getActivities(),
    getTestimonials(),
    getSocialFeed(),
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
      <Hero nextEvent={events.find((event) => event.lifecycle === "upcoming")} />
      <Pillars />
      <UpcomingEvents events={events.slice(0, 6)} />
      <JoinSteps />
      <Stats />
      <ActivityPreview activities={activities.slice(0, 3)} />
      <Testimonials items={testimonials} />
      <SocialFeed posts={posts} />
      <CtaBanner />
    </>
  );
}
