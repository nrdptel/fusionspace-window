import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/links";

export const dynamic = "force-static";

// Resolved against NEXT_PUBLIC_SITE_URL so a fork's sitemap points at its own
// domain, consistent with robots.ts, the metadata, and the sibling tools.
const siteUrl = SITE_URL;

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${siteUrl}/`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${siteUrl}/privacy/`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
