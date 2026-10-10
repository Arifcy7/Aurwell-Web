import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { BlogPost } from "@/sanity/lib/types";
import { urlForImage } from "@/sanity/lib/image";

interface BlogCardProps {
  post: BlogPost;
}

export default function BlogCard({ post }: BlogCardProps) {
  const imageUrl = urlForImage(post.mainImage);

  const formattedDate = new Date(post.publishedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <article className="py-7 sm:py-10 border-b border-[#e2eae3] last:border-b-0 group">
      {/* Top: Clean Typographic Author & Reading Time Row (Responsive flex-wrap) */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2.5 sm:mb-3 text-xs text-[#526a56]">
        <span className="font-semibold text-[#18311e]">
          {post.author?.name || "Aurwell Editorial"}
        </span>
        <span className="text-[#a4bca8]">·</span>
        <time dateTime={post.publishedAt}>{formattedDate}</time>
        <span className="text-[#a4bca8]">·</span>
        <span>{post.readingTime || 4} min read</span>
      </div>

      {/* Main Grid: Content on Left, Thumbnail on Right */}
      <div className="flex flex-col-reverse sm:flex-row gap-4 sm:gap-8 items-start justify-between">
        <div className="flex-1 space-y-2">
          <Link href={`/blog/${post.slug.current}`} className="block group">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-[#162218] group-hover:text-[#275d33] transition-colors leading-[1.3] break-words">
              {post.title}
            </h2>
          </Link>

          {post.excerpt && (
            <p className="text-sm sm:text-[15px] leading-relaxed text-[#4f6251] line-clamp-2 sm:line-clamp-3 break-words">
              {post.excerpt}
            </p>
          )}

          {/* Bottom link: clean without pills */}
          <div className="pt-2">
            <Link
              href={`/blog/${post.slug.current}`}
              className="text-xs font-semibold text-[#275d33] hover:text-[#183d21] inline-flex items-center gap-1.5 transition-colors"
            >
              <span>Read story</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

        {imageUrl && (
          <Link
            href={`/blog/${post.slug.current}`}
            className="relative w-full sm:w-44 h-44 sm:h-28 rounded-xl overflow-hidden bg-[#eef3ee] border border-[#e2eae3] flex-shrink-0 group-hover:opacity-95 transition-opacity"
          >
            <Image
              src={imageUrl}
              alt={post.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 640px) 100vw, 176px"
            />
          </Link>
        )}
      </div>
    </article>
  );
}
