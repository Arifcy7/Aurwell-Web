import React from "react";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Clock, Calendar, Sparkles } from "lucide-react";
import BlogHeader from "@/components/blog/BlogHeader";
import PortableTextRenderer from "@/components/blog/PortableTextRenderer";
import BlogInteractions from "@/components/blog/BlogInteractions";
import { getPostBySlug, getAllPostSlugs, getAllPosts } from "@/sanity/lib/sanityFetch";
import { urlForImage } from "@/sanity/lib/image";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 60;

export async function generateStaticParams() {
  const slugs = await getAllPostSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const post = (await getPostBySlug(decodedSlug)) || (await getPostBySlug(slug));

  if (!post) {
    return {
      title: "Story Not Found — Aurwell Journal",
    };
  }

  const imageUrl = post.mainImage ? urlForImage(post.mainImage) : null;

  return {
    title: `${post.title} — Aurwell Journal`,
    description: post.excerpt || "Read insightful perspectives on the Aurwell Journal.",
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      publishedTime: post.publishedAt,
      authors: post.author?.name ? [post.author.name] : ["Aurwell"],
      images: imageUrl ? [{ url: imageUrl }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const decodedSlug = decodeURIComponent(slug);
  const post = (await getPostBySlug(decodedSlug)) || (await getPostBySlug(slug));

  if (!post) {
    notFound();
  }

  const allPosts = await getAllPosts();
  const recommendedPosts = allPosts
    .filter((p) => p.slug.current !== slug)
    .slice(0, 2);

  const mainImageUrl = post.mainImage ? urlForImage(post.mainImage) : null;
  const authorImageUrl = post.author?.image ? urlForImage(post.author.image) : null;

  const formattedDate = new Date(post.publishedAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-[#f8faf8] flex flex-col justify-between">
      <div>
        <BlogHeader showBackToArticles />

        {/* Centered Reading Column - Classic Medium Width */}
        <article className="max-w-[720px] mx-auto px-4 sm:px-6 md:px-8 pt-6 sm:pt-12 pb-16 w-full">
          {/* Article Title */}
          <h1 className="text-2xl sm:text-3xl md:text-[40px] font-extrabold tracking-tight text-[#162218] leading-[1.2] sm:leading-[1.16] break-words">
            {post.title}
          </h1>

          {/* Subtitle / Excerpt */}
          {post.excerpt && (
            <p className="text-base sm:text-lg md:text-[20px] text-[#4d5e50] leading-relaxed mt-2.5 sm:mt-3 font-normal break-words">
              {post.excerpt}
            </p>
          )}

          {/* Minimal Single-line Author, Date & Duration Metadata (Responsive flex-wrap) */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-3 sm:mt-4 mb-6 sm:mb-8 text-xs text-[#526a56]">
            <span className="font-semibold text-[#18311e]">
              {post.author?.name || "Aurwell Editorial"}
            </span>
            <span className="text-[#a4bca8]">·</span>
            <time dateTime={post.publishedAt}>{formattedDate}</time>
            <span className="text-[#a4bca8]">·</span>
            <span>{post.readingTime || 5} min read</span>
          </div>

          {/* Main Featured Image */}
          {mainImageUrl && (
            <figure className="my-8 sm:my-10 -mx-2 sm:mx-0">
              <div className="relative w-full aspect-[16/10] sm:aspect-[16/9] rounded-2xl overflow-hidden bg-[#eef3ee] border border-[#e2eae3]">
                <Image
                  src={mainImageUrl}
                  alt={post.mainImage?.alt || post.title}
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 720px"
                />
              </div>
              {post.mainImage?.caption && (
                <figcaption className="mt-3 text-center text-xs sm:text-sm text-[#5d6d60] font-sans italic">
                  {post.mainImage.caption}
                </figcaption>
              )}
            </figure>
          )}

          {/* Article Body Content */}
          <div className="article-body font-serif">
            <PortableTextRenderer value={post.body} />
          </div>

          {/* Bottom Interactions Bar (Only at bottom as requested) */}
          <BlogInteractions
            postTitle={post.title}
            postSlug={post.slug?.current || slug}
            initialLikes={post.likes ?? 24}
          />

          {/* Recommended Articles Section (No duplicate border line) */}
          {recommendedPosts.length > 0 && (
            <div className="mt-8 pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                {recommendedPosts.map((rec) => {
                  const recImage = rec.mainImage ? urlForImage(rec.mainImage) : null;
                  return (
                    <Link
                      key={rec._id}
                      href={`/blog/${rec.slug.current}`}
                      className="group block p-5 rounded-2xl bg-white hover:bg-[#f4f7f4] border border-[#e2eae3] transition-all shadow-xs"
                    >
                      {recImage && (
                        <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden bg-[#eef3ee] mb-3">
                          <Image
                            src={recImage}
                            alt={rec.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            sizes="(max-width: 640px) 100vw, 320px"
                          />
                        </div>
                      )}
                      <div className="text-[11px] text-[#5e7061] mb-1">
                        {rec.readingTime || 4} min read
                      </div>
                      <h4 className="font-bold text-sm sm:text-base text-[#19241b] group-hover:text-[#2d5f39] transition-colors line-clamp-2 leading-snug">
                        {rec.title}
                      </h4>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </article>
      </div>

      {/* Minimal Footer */}
      <footer className="border-t border-[#e2eae3] py-8 text-center text-xs text-[#6e8071]">
        <div className="max-w-[760px] mx-auto px-6 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Aurwell. Built for modern clinical excellence.</p>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-[#182319] transition-colors">
              Home
            </Link>
            <Link href="/blog" className="hover:text-[#182319] transition-colors">
              Journal
            </Link>
            <Link href="/privacy" className="hover:text-[#182319] transition-colors">
              Privacy
            </Link>
            <Link href="/contact" className="hover:text-[#182319] transition-colors">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
