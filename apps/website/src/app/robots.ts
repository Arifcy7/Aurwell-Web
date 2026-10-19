import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.aurwell.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/blog", "/blog/*", "/contact", "/privacy"],
        disallow: [
          "/studio",
          "/studio/*",
          "/api/*",
          "/_next/*",
          "/booking",
          "/book/*",
          "/schedule",
        ],
      },
      {
        userAgent: "Googlebot",
        allow: ["/", "/blog", "/blog/*", "/contact", "/privacy"],
        disallow: [
          "/studio",
          "/studio/*",
          "/api/*",
          "/_next/*",
          "/booking",
          "/book/*",
          "/schedule",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
