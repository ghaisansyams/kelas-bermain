import type { MetadataRoute } from "next";
import { siteConfig } from "@/data/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
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
