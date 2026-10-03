"use client";

import React, { useState, useEffect } from "react";
import { Heart, Share2, Check } from "lucide-react";

interface BlogInteractionsProps {
  postTitle: string;
  postSlug: string;
  initialLikes?: number;
}

export default function BlogInteractions({
  postTitle,
  postSlug,
  initialLikes = 24,
}: BlogInteractionsProps) {
  const [likes, setLikes] = useState(initialLikes);
  const [hasLiked, setHasLiked] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Sync with initialLikes if it changes from Sanity
  useEffect(() => {
    setLikes(initialLikes);
  }, [initialLikes]);

  // Check localStorage for persisted user like status
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && postSlug) {
        const stored = localStorage.getItem(`aurwell_liked_${postSlug}`);
        if (stored === "true") {
          setHasLiked(true);
          setLikes((prev) => prev + 1);
        }
      }
    } catch (e) {
      // Local storage disabled or error
    }
  }, [postSlug]);

  const handleToggleLike = () => {
    try {
      if (!hasLiked) {
        setLikes((prev) => prev + 1);
        setHasLiked(true);
        if (typeof window !== "undefined" && postSlug) {
          localStorage.setItem(`aurwell_liked_${postSlug}`, "true");
        }
      } else {
        setLikes((prev) => Math.max(0, prev - 1));
        setHasLiked(false);
        if (typeof window !== "undefined" && postSlug) {
          localStorage.removeItem(`aurwell_liked_${postSlug}`);
        }
      }
    } catch (e) {
      console.error("Like interaction error:", e);
    }
  };

  const handleCopyLink = async () => {
    try {
      if (typeof window !== "undefined") {
        await navigator.clipboard.writeText(window.location.href);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2200);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleShareTwitter = () => {
    if (typeof window !== "undefined") {
      const url = encodeURIComponent(window.location.href);
      const text = encodeURIComponent(`"${postTitle}" — Aurwell Journal`);
      window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank");
    }
  };

  const handleShareLinkedIn = () => {
    if (typeof window !== "undefined") {
      const url = encodeURIComponent(window.location.href);
      window.open(
        `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
        "_blank"
      );
    }
  };

  return (
    <div className="pt-6 pb-2 my-10 border-t border-[#e2eae3] flex items-center justify-between gap-3 text-xs text-[#556958]">
      {/* Left: Interactive Like / Heart Button (No save button) */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleToggleLike}
          className={`group flex items-center gap-2 px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
            hasLiked
              ? "bg-[#e2ede4] text-[#1c4724] shadow-xs"
              : "hover:bg-[#edf3ee] text-[#4f6452]"
          }`}
          aria-label={hasLiked ? "Unlike article" : "Like article"}
        >
          <Heart
            className={`w-4 h-4 transition-all duration-200 group-hover:scale-110 ${
              hasLiked
                ? "fill-[#245e31] text-[#245e31] scale-105"
                : "text-[#4f6452] group-hover:text-[#245e31]"
            }`}
          />
          <span className="font-semibold text-xs select-none">{likes}</span>
        </button>
      </div>

      {/* Right: Sharing Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={handleShareTwitter}
          className="p-2 rounded-full hover:bg-[#edf3ee] text-[#556958] hover:text-[#18261b] transition-colors cursor-pointer"
          title="Share on X"
          aria-label="Share on X"
        >
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </button>

        <button
          onClick={handleShareLinkedIn}
          className="p-2 rounded-full hover:bg-[#edf3ee] text-[#556958] hover:text-[#18261b] transition-colors cursor-pointer"
          title="Share on LinkedIn"
          aria-label="Share on LinkedIn"
        >
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
          </svg>
        </button>

        <button
          onClick={handleCopyLink}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-[#edf3ee] text-[#556958] hover:text-[#18261b] transition-colors cursor-pointer"
          title="Copy link"
          aria-label="Copy link"
        >
          {isCopied ? (
            <>
              <Check className="w-3.5 h-3.5 text-[#245e31]" />
              <span className="text-[11px] font-semibold text-[#245e31]">Copied</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium hidden sm:inline">Share</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
