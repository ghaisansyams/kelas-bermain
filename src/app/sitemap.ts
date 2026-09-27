import type { MetadataRoute } from "next";
import { siteConfig } from "@/data/site";
import { certificatesEnabled } from "@/lib/features";
import { getActivitySlugs, getEventSlugs } from "@/lib/services/content";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [eventSlugs, activitySlugs] = await Promise.all([
    getEventSlugs(),
    getActivitySlugs(),
  ]);
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${siteConfig.url}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${siteConfig.url}/event`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteConfig.url}/kegiatan`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteConfig.url}/galeri`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
  ];

  // Certificate lookup is off (R-06 / K-07); listing it would advertise a 404.
  if (certificatesEnabled) {
    staticRoutes.push({
      url: `${siteConfig.url}/sertifikat`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    });
  }

  return [
    ...staticRoutes,
    ...eventSlugs.map((slug) => ({
      url: `${siteConfig.url}/event/${slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...activitySlugs.map((slug) => ({
      url: `${siteConfig.url}/kegiatan/${slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
