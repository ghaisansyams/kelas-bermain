import type { MetadataRoute } from "next";
import { siteConfig } from "@/data/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          // The ERP is staff-only. Pages also carry noindex, but keep crawlers
          // off the path entirely.
          "/admin",
          // Personal flows: forms, checkouts, and someone's certificate.
          "/register/",
          "/payment/",
          "/attendance/",
          "/certificate/",
          // Pre-restructure URLs that now redirect into the paths above.
          "/event/*/daftar",
          "/event/*/attendance",
          "/sertifikat/",
        ],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
