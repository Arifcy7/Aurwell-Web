import type { MetadataRoute } from "next";
import { getAllPosts } from "@/sanity/lib/sanityFetch";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.aurwell.app";

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${siteUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  try {
    const posts = await getAllPosts();
    const blogRoutes: MetadataRoute.Sitemap = posts
      .filter((post) => Boolean(post?.slug?.current))
      .map((post) => {
        let lastMod = new Date();
        if (post.publishedAt) {
          const parsed = new Date(post.publishedAt);
          if (!isNaN(parsed.getTime())) {
            lastMod = parsed;
          }
        }
        return {
          url: `${siteUrl}/blog/${post.slug.current}`,
          lastModified: lastMod,
          changeFrequency: "weekly" as const,
          priority: 0.8,
        };
      });

    return [...staticRoutes, ...blogRoutes];
  } catch (error) {
    console.error("[Sitemap] Error fetching posts for sitemap:", error);
    return staticRoutes;
  }
}
