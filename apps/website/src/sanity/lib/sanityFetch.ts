import { client, isSanityConfigured } from "./client";
import { postsQuery, postBySlugQuery, categoriesQuery, postPathsQuery } from "./queries";
import { BlogPost, Category } from "./types";
import { MOCK_POSTS, MOCK_CATEGORIES } from "./mockData";

export async function getAllPosts(): Promise<BlogPost[]> {
  if (isSanityConfigured && client) {
    try {
      const posts = await client.fetch<BlogPost[]>(
        postsQuery,
        {},
        {
          next: { revalidate: 60 },
        }
      );
      if (posts && posts.length > 0) {
        return posts;
      }
    } catch (err) {
      console.warn("[Sanity] Could not fetch posts from Sanity, using mock data fallback:", err);
    }
  }
  return MOCK_POSTS;
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const decodedSlug = decodeURIComponent(slug);
  const encodedSlug = encodeURIComponent(slug);

  if (isSanityConfigured && client) {
    try {
      const post = await client.fetch<BlogPost>(
        postBySlugQuery,
        { slug, decodedSlug, encodedSlug },
        {
          next: { revalidate: 60 },
        }
      );
      if (post) {
        return post;
      }
    } catch (err) {
      console.warn(`[Sanity] Could not fetch post "${slug}" from Sanity, checking mock data:`, err);
    }
  }

  const mock = MOCK_POSTS.find(
    (p) =>
      p.slug.current === slug ||
      p.slug.current === decodedSlug ||
      p.slug.current === encodedSlug
  );
  return mock || null;
}

export async function getAllCategories(): Promise<Category[]> {
  if (isSanityConfigured && client) {
    try {
      const categories = await client.fetch<Category[]>(
        categoriesQuery,
        {},
        {
          next: { revalidate: 300 },
        }
      );
      if (categories && categories.length > 0) {
        return categories;
      }
    } catch (err) {
      console.warn("[Sanity] Could not fetch categories from Sanity, using mock data fallback:", err);
    }
  }
  return MOCK_CATEGORIES;
}

export async function getAllPostSlugs(): Promise<string[]> {
  if (isSanityConfigured && client) {
    try {
      const slugs = await client.fetch<string[]>(postPathsQuery);
      if (slugs && slugs.length > 0) {
        return slugs;
      }
    } catch (err) {
      // fallback
    }
  }
  return MOCK_POSTS.map((p) => p.slug.current);
}
