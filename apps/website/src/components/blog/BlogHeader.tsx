"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { useBookingModal } from "@/components/booking/BookingProvider";

interface BlogHeaderProps {
  showBackToArticles?: boolean;
}

export default function BlogHeader({ showBackToArticles = false }: BlogHeaderProps) {
  const { openBookingModal } = useBookingModal();
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollTop;
      const windowHeight =
        document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (windowHeight > 0) {
        setScrollProgress(Math.min(100, Math.max(0, (totalScroll / windowHeight) * 100)));
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-[#f8faf8]/95 backdrop-blur-md border-b border-[#e2eae3] transition-all">
      {/* Reading Progress Indicator */}
      <div
        className="absolute bottom-0 left-0 h-[2px] bg-[#2d5f39] transition-all duration-100 ease-out"
        style={{ width: `${scrollProgress}%` }}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-8 h-16 flex items-center justify-between">
        {/* Left: Optional Back Arrow & Prominent Aurwell Logo (Gap reduced, larger logo, same navbar height) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {showBackToArticles && (
            <Link
              href="/"
              className="p-1.5 -ml-1 rounded-full hover:bg-[#edf3ee] text-[#425946] hover:text-[#162218] transition-colors flex items-center justify-center flex-shrink-0"
              aria-label="Back to home page"
              title="Back to home page"
            >
              <ArrowLeft className="w-5 h-5 text-[#304734]" />
            </Link>
          )}

          <Link
            href="/"
            className="flex items-center text-[#19241b] hover:opacity-85 transition-opacity"
          >
            <Image
              src="/logo-black.png"
              alt="Aurwell"
              width={40}
              height={40}
              className="h-8 sm:h-9 w-auto object-contain select-none transition-transform hover:scale-105"
              priority
            />
          </Link>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <Link
            href="/"
            className="text-xs font-medium text-[#4f6052] hover:text-[#19241b] px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-full hover:bg-[#edf3ee] transition-all"
          >
            Home
          </Link>

          <button
            onClick={() => openBookingModal("blog_header_cta")}
            className="inline-flex items-center gap-1 text-xs font-medium bg-[#1d261e] hover:bg-[#2e3b2f] text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-full shadow-xs transition-all cursor-pointer whitespace-nowrap"
          >
            <span>Build app</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-[#98b89f]" />
          </button>
        </div>
      </div>
    </header>
  );
}
