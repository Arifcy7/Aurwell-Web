"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { getAllPosts } from "@/sanity/lib/sanityFetch";
import { BlogPost } from "@/sanity/lib/types";
import { urlForImage } from "@/sanity/lib/image";

export default function LandingBlogSection() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    let isMounted = true;
    fetch("/api/posts")
      .then((res) => {
        if (!res.ok) throw new Error("API route returned error status");
        return res.json();
      })
      .then((data) => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setPosts(data);
        } else {
          return getAllPosts().then((fallback) => {
            if (isMounted && fallback) setPosts(fallback);
          });
        }
      })
      .catch((err) => {
        console.warn("API route fetch failed, using fallback:", err);
        getAllPosts().then((fallback) => {
          if (isMounted && fallback) setPosts(fallback);
        });
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const checkScrollability = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    // Allow a small 4px buffer for fractional zoom/DPI differences
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  }, []);

  useEffect(() => {
    checkScrollability();
    const el = scrollContainerRef.current;
    if (!el) return;

    const timer = setTimeout(checkScrollability, 150);
    window.addEventListener("resize", checkScrollability);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", checkScrollability);
    };
  }, [posts, checkScrollability]);

  const handleScroll = (direction: "left" | "right") => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const cardEl = el.querySelector<HTMLElement>(".blog-card");
    const scrollAmount = cardEl ? cardEl.offsetWidth + 24 : 360;
    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  if (!loading && posts.length === 0) return null;

  return (
    <section
      id="blog"
      data-analytics-section="landing-journal"
      data-analytics-title="Aurwell Journal Articles"
      className="w-full pt-14 sm:pt-20 pb-16 sm:pb-24 bg-[#f8faf8] border-t border-[#e2eae3] scroll-mt-12 relative overflow-hidden"
    >
      {/* Centered Minimal Header */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center mb-6 sm:mb-12 space-y-2.5 sm:space-y-3">
        <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.2em] text-[#2c5a34] block">
          Aurwell Journal
        </span>
        <h2 className="text-xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-[#162218]">
          Clinical Perspectives & Craft
        </h2>
        <p className="text-xs sm:text-base text-[#546a57] max-w-lg mx-auto">
          Thoughtful insights on patient trust, clinic operations, and design for aesthetic practices.
        </p>
        <div className="pt-1 flex items-center justify-between sm:justify-center">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#275d33] hover:text-[#142618] transition-colors group"
          >
            <span>Visit the Complete Journal</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
          </Link>

          {/* Mobile-only Arrow Navigation Controls */}
          <div className="flex sm:hidden items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleScroll("left")}
              disabled={!canScrollLeft}
              aria-label="Previous articles"
              className="w-8 h-8 rounded-full bg-white border border-[#d6e3d7] shadow-sm flex items-center justify-center text-[#2c5a34] active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => handleScroll("right")}
              disabled={!canScrollRight}
              aria-label="Next articles"
              className="w-8 h-8 rounded-full bg-white border border-[#d6e3d7] shadow-sm flex items-center justify-center text-[#2c5a34] active:scale-95 disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Width Horizontal Carousel Container */}
      <div className="w-full max-w-[1536px] mx-auto relative px-0 sm:px-6 lg:px-10">
        {/* Left Blur & Fade Mask (Subtle on mobile, deeper on desktop) */}
        <div
          className={`pointer-events-none absolute left-0 sm:left-4 lg:left-8 top-0 bottom-0 w-6 sm:w-28 md:w-36 z-10 bg-gradient-to-r from-[#f8faf8] via-[#f8faf8]/85 to-transparent backdrop-blur-[1.5px] transition-opacity duration-300 ${
            canScrollLeft ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Right Blur & Fade Mask */}
        <div
          className={`pointer-events-none absolute right-0 sm:right-4 lg:right-8 top-0 bottom-0 w-6 sm:w-28 md:w-36 z-10 bg-gradient-to-l from-[#f8faf8] via-[#f8faf8]/85 to-transparent backdrop-blur-[1.5px] transition-opacity duration-300 ${
            canScrollRight ? "opacity-100" : "opacity-0"
          }`}
        />

        {/* Desktop/Tablet Floating Left Arrow Button */}
        <button
          type="button"
          onClick={() => handleScroll("left")}
          disabled={!canScrollLeft}
          aria-label="Previous articles"
          className={`hidden sm:flex absolute left-3 sm:left-6 lg:left-10 top-1/2 -translate-y-1/2 z-20 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/95 backdrop-blur border border-[#d6e3d7] shadow-lg items-center justify-center text-[#18311e] hover:bg-[#edf4ed] hover:border-[#b8cfba] hover:scale-105 active:scale-95 transition-all duration-300 ${
            canScrollLeft
              ? "opacity-100 pointer-events-auto cursor-pointer"
              : "opacity-0 pointer-events-none cursor-default"
          }`}
        >
          <ChevronLeft className="w-5 h-5 text-[#2c5a34]" />
        </button>

        {/* Desktop/Tablet Floating Right Arrow Button */}
        <button
          type="button"
          onClick={() => handleScroll("right")}
          disabled={!canScrollRight}
          aria-label="Next articles"
          className={`hidden sm:flex absolute right-3 sm:right-6 lg:right-10 top-1/2 -translate-y-1/2 z-20 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/95 backdrop-blur border border-[#d6e3d7] shadow-lg items-center justify-center text-[#18311e] hover:bg-[#edf4ed] hover:border-[#b8cfba] hover:scale-105 active:scale-95 transition-all duration-300 ${
            canScrollRight
              ? "opacity-100 pointer-events-auto cursor-pointer"
              : "opacity-0 pointer-events-none cursor-default"
          }`}
        >
          <ChevronRight className="w-5 h-5 text-[#2c5a34]" />
        </button>

        {/* Single-Line Horizontal Scroll Container (Scrollbar Hidden, Touch Optimized) */}
        <div
          ref={scrollContainerRef}
          onScroll={checkScrollability}
          className="flex flex-row items-stretch overflow-x-auto scroll-smooth gap-4 sm:gap-6 py-3 sm:py-4 px-4 sm:px-12 md:px-16 scroll-pl-4 sm:scroll-pl-12 snap-x snap-mandatory touch-pan-x [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {posts.map((post) => {
            const imageUrl = post.mainImage ? urlForImage(post.mainImage) : null;
            const formattedDate = new Date(post.publishedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });

            return (
              <Link
                key={post._id}
                href={`/blog/${post.slug?.current}`}
                className="blog-card snap-start flex-shrink-0 w-[84vw] max-w-[330px] sm:max-w-none sm:w-[350px] md:w-[380px] lg:w-[400px] rounded-[24px] bg-white border border-[#e2eae3] hover:border-[#b8cfba] hover:shadow-xl transition-all duration-300 flex flex-col justify-between group cursor-pointer overflow-hidden p-3"
              >
                <div>
                  {/* Thumbnail with concentric corner radius (24px outer - 12px padding = 12px inner) */}
                  {imageUrl && (
                    <div className="relative w-full h-40 sm:h-44 md:h-48 rounded-[12px] overflow-hidden bg-[#eef3ee] border border-[#e2eae3]">
                      <Image
                        src={imageUrl}
                        alt={post.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 640px) 84vw, (max-width: 1024px) 350px, 400px"
                      />
                    </div>
                  )}

                  {/* Content Section */}
                  <div className="px-1.5 sm:px-2 pt-3 sm:pt-4">
                    {/* Category Tag */}
                    {post.categories && post.categories[0] && (
                      <div className="mb-1.5 sm:mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#2c5a34]">
                          {post.categories[0].title}
                        </span>
                      </div>
                    )}

                    {/* Article Title */}
                    <h3 className="text-sm sm:text-base md:text-lg font-bold tracking-tight text-[#162218] group-hover:text-[#275d33] transition-colors line-clamp-2 leading-snug">
                      {post.title}
                    </h3>

                    {/* Subtitle / Excerpt */}
                    {post.excerpt && (
                      <p className="text-xs sm:text-sm text-[#506653] line-clamp-3 mt-1.5 sm:mt-2 leading-relaxed">
                        {post.excerpt}
                      </p>
                    )}
                  </div>
                </div>

                {/* Bottom Date, Reading Time Pill (Middle) & Action */}
                <div className="px-1.5 sm:px-2 pt-3 pb-0.5 mt-4 sm:mt-5 border-t border-[#f0f4f0] flex items-center justify-between text-xs text-[#556958]">
                  <time dateTime={post.publishedAt} className="text-[10px] sm:text-[11px] text-[#718474] shrink-0">
                    {formattedDate}
                  </time>
                  <span className="text-[10px] sm:text-[11px] bg-[#eef3ee] text-[#2c5a34] px-2 sm:px-2.5 py-0.5 rounded-full font-medium shrink-0">
                    {post.readingTime || 5} min read
                  </span>
                  <span className="font-semibold text-[#275d33] inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform shrink-0">
                    <span className="text-[11px] sm:text-xs">Read Story</span>
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}


