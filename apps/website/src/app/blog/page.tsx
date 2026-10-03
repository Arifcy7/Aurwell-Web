import React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import BlogHeader from "@/components/blog/BlogHeader";
import BlogCard from "@/components/blog/BlogCard";
import { getAllPosts } from "@/sanity/lib/sanityFetch";

export const revalidate = 60;

export default async function BlogIndexPage() {
  const posts = await getAllPosts();

  return (
    <div className="min-h-screen bg-[#f8faf8] flex flex-col justify-between">
      <div>
        <BlogHeader />

        {/* Main Centered Reading Container */}
        <main className="max-w-[760px] mx-auto px-4 sm:px-6 md:px-8 pt-8 sm:pt-16 pb-20 w-full">
          {/* Masthead Header: Clean, Typographic, Pill-free */}
          <div className="border-b border-[#e2eae3] pb-8 sm:pb-10 mb-8 space-y-3">
            <p className="text-[11px] sm:text-xs font-bold tracking-[0.22em] text-[#2c5a34] uppercase">
              The Aurwell Journal
            </p>

            <h1 className="text-2xl sm:text-3xl md:text-[40px] font-extrabold tracking-tight text-[#162218] leading-[1.2] sm:leading-[1.18] break-words">
              Stories, Perspectives & Clinical Craft
            </h1>

            <p className="text-sm sm:text-base md:text-lg text-[#516353] leading-relaxed max-w-xl">
              Thoughtful perspectives on modern clinic experiences, patient trust,
              and design-led healthcare.
            </p>
          </div>

          {/* Posts List */}
          <section className="divide-y divide-[#e3ece4]">
            {posts.map((post) => (
              <BlogCard key={post._id} post={post} />
            ))}
          </section>

          {posts.length === 0 && (
            <div className="text-center py-16 sm:py-20 text-[#556e58]">
              <p className="text-base sm:text-lg font-medium">No published stories yet.</p>
              <p className="text-xs sm:text-sm mt-1">
                New clinical articles and case studies will appear here once published.
              </p>
            </div>
          )}

          {/* Consultation Hook */}
          <div className="mt-12 sm:mt-16 p-6 sm:p-10 rounded-2xl sm:rounded-3xl bg-white border border-[#e2eae3] text-center space-y-4 shadow-xs">
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight text-[#162218]">
              Elevate your practice experience
            </h3>
            <p className="text-xs sm:text-sm md:text-[15px] text-[#516353] max-w-md mx-auto leading-relaxed">
              Join visionary clinic founders and medical directors receiving our monthly
              dispatches on clinic technology and client retention.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <Link
                href="/#contact"
                className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-[#18261b] text-white text-xs font-semibold hover:bg-[#273d2c] transition-colors shadow-xs"
              >
                <span>Book a Discovery Call</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-[#a4c9a8]" />
              </Link>
            </div>
          </div>
        </main>
      </div>

      {/* Minimal Footer */}
      <footer className="border-t border-[#e2eae3] py-8 text-center text-xs text-[#6e8071]">
        <div className="max-w-[760px] mx-auto px-4 sm:px-6 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Aurwell. Built for modern clinical excellence.</p>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-[#18261b] transition-colors">
              Home
            </Link>
            <Link href="/privacy" className="hover:text-[#18261b] transition-colors">
              Privacy
            </Link>
            <Link href="/contact" className="hover:text-[#18261b] transition-colors">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
