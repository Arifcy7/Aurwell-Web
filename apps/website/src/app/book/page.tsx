"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Calendar, Sparkles, Loader2, ExternalLink } from "lucide-react";

const CALENDAR_EMBED_URL =
  "https://calendar.google.com/calendar/appointments/schedules/AcZssZ3Qoyi_oPxXlvrt5ncSeEuuyv8nk2LsABMutyNDD0NnDyAST-iXGcLIggfxl6_iTPbA8nBJ5fyu?gv=true";

export default function BookPage() {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-neutral-900 font-sans flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-neutral-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 group">
              <Image
                src="/logo-black.png"
                alt="Aurwell Logo"
                width={130}
                height={34}
                className="h-7 w-auto object-contain"
                priority
              />
            </Link>
            <span className="hidden sm:inline-block w-px h-5 bg-neutral-300" />
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Home</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={CALENDAR_EMBED_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-700 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200/70 px-3.5 py-1.5 rounded-full transition-all"
            >
              <span>Open in Google Calendar</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* Main Section */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 flex flex-col">
        {/* Title Area */}
        <div className="text-center space-y-3 mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-neutral-100 border border-neutral-200 text-neutral-800 text-xs font-bold uppercase tracking-wider mx-auto">
            <Calendar className="w-4 h-4 text-neutral-700" />
            Live Appointment Scheduler
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight">
            Schedule Your Aurwell Demo & Walkthrough
          </h1>
          <p className="text-neutral-600 text-xs sm:text-sm max-w-xl mx-auto font-normal">
            Choose a date and time that fits your schedule for a personalized 1-on-1 walkthrough of the Aurwell clinic app & patient loyalty system.
          </p>
        </div>

        {/* Embedded Calendar Container */}
        <div className="w-full flex-1 min-h-[700px] h-[750px] bg-white rounded-3xl shadow-xl border border-neutral-200/80 overflow-hidden relative flex flex-col">
          {isLoading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white gap-3">
              <Loader2 className="w-8 h-8 text-neutral-900 animate-spin" />
              <p className="text-xs font-semibold text-neutral-600">
                Loading appointment calendar...
              </p>
            </div>
          )}

          <iframe
            src={CALENDAR_EMBED_URL}
            onLoad={() => setIsLoading(false)}
            className="w-full h-full border-0 flex-1"
            title="Google Calendar Appointment Scheduling"
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-[#F3F4F6] border-t border-neutral-200/60 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-neutral-500">
          © 2026 Aurwell. All rights reserved. • <Link href="/" className="hover:underline">Home</Link> • <Link href="/contact" className="hover:underline">Contact</Link>
        </div>
      </footer>
    </div>
  );
}
