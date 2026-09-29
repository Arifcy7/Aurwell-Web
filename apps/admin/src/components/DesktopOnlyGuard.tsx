"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Monitor, ArrowLeft, Copy, Check } from "lucide-react";

/**
 * Temporary Mobile Restriction Guard
 *
 * The Aurwell Admin Panel is desktop-first and temporarily restricted
 * on mobile phones / small screens (< 1024px).
 *
 * To disable this restriction later, simply set `ENABLE_DESKTOP_ONLY_GUARD = false`.
 */
export const ENABLE_DESKTOP_ONLY_GUARD = true;

interface DesktopOnlyGuardProps {
  children: React.ReactNode;
}

export default function DesktopOnlyGuard({ children }: DesktopOnlyGuardProps) {
  const [copied, setCopied] = useState(false);
  const websiteUrl = process.env.NEXT_PUBLIC_WEBSITE_URL || "https://www.aurwell.app";

  if (!ENABLE_DESKTOP_ONLY_GUARD) {
    return <>{children}</>;
  }

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      {/* Mobile Blocker Screen: Visible on screens smaller than 1024px (phones & small screens) */}
      <div className="block lg:hidden fixed inset-0 z-[99999] bg-[#f8f9fa] text-neutral-900 overflow-y-auto selection:bg-neutral-900 selection:text-white">
        <div className="min-h-full flex flex-col justify-between p-6 sm:p-10 max-w-lg mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Image
              src="/logo-black.png"
              alt="Aurwell Logo"
              width={130}
              height={34}
              className="h-7 w-auto object-contain select-none"
              priority
            />
            <span className="text-[11px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full bg-neutral-200/70 text-neutral-700">
              Admin Portal
            </span>
          </div>

          {/* Center Card */}
          <div className="my-auto py-8">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200/80 shadow-xs space-y-6 text-center">
              {/* Icon */}
              <div className="w-16 h-16 rounded-2xl bg-[#768957]/10 text-[#768957] border border-[#768957]/20 flex items-center justify-center mx-auto shadow-2xs">
                <Monitor className="w-8 h-8 stroke-[1.8]" />
              </div>

              {/* Title & Description */}
              <div className="space-y-3">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/70 text-amber-800 text-[11px] font-bold uppercase tracking-wider">
                  Desktop Experience Required
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-neutral-900 tracking-tight">
                  Please Open on a Desktop
                </h2>
                <p className="text-neutral-600 text-xs sm:text-sm leading-relaxed">
                  The Aurwell Clinic Admin Panel is built for larger displays with clinic configuration tools, calendars, and member management. Access from phones is temporarily restricted.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col gap-2.5 sm:gap-3">
                <Link
                  href={websiteUrl}
                  className="w-full inline-flex items-center justify-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold px-4 py-3 rounded-xl text-xs sm:text-sm shadow-xs transition-all active:scale-[0.99]"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Aurwell Home</span>
                </Link>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="w-full inline-flex items-center justify-center gap-2 bg-neutral-100 hover:bg-neutral-200/80 text-neutral-800 font-semibold px-4 py-3 rounded-xl text-xs sm:text-sm border border-neutral-200 transition-all cursor-pointer active:scale-[0.99]"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-[#768957]" />
                      <span className="text-[#768957]">Link Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-neutral-500" />
                      <span>Copy Admin Link for Desktop</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <p className="text-center text-[11px] text-neutral-400 mt-6">
              Optimized for Chrome, Safari, Edge, and Firefox on desktop computers.
            </p>
          </div>

          {/* Footer */}
          <div className="text-center text-[11px] text-neutral-400 pt-4 border-t border-neutral-200/60">
            © {new Date().getFullYear()} Aurwell Healthcare Systems Inc.
          </div>
        </div>
      </div>

      {/* Desktop Workspace: Rendered only on screens >= 1024px */}
      <div className="hidden lg:contents">
        {children}
      </div>
    </>
  );
}
