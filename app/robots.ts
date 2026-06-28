import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/links";

export const dynamic = "force-static";

// Same origin the metadata/OG and sitemap resolve against; a fork can point all
// three at its own domain with NEXT_PUBLIC_SITE_URL. Mirrors the sibling tools.
const siteUrl = SITE_URL;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
