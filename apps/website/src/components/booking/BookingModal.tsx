"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";

const CALENDAR_EMBED_URL =
  "https://calendar.app.google/RKZkDjKQvjdYNjrf7";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BookingModal({ isOpen, onClose }: BookingModalProps) {
  const [isLoading, setIsLoading] = useState(true);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "unset";
      setIsLoading(true);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-hidden">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 bg-neutral-950/70 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 20 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-4xl bg-white rounded-3xl sm:rounded-[32px] shadow-2xl border border-neutral-200/80 overflow-hidden flex flex-col max-h-[92vh] h-[780px] z-10"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Floating Close Button */}
            <button
              onClick={onClose}
              className="absolute top-3.5 right-3.5 z-30 p-2 rounded-full bg-neutral-100/90 hover:bg-neutral-200 text-neutral-600 hover:text-neutral-900 backdrop-blur-md transition-all focus:outline-none focus:ring-2 focus:ring-neutral-400 cursor-pointer shadow-xs"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Body with Embedded Google Calendar Appointment Scheduler */}
            <div className="flex-1 w-full h-full bg-white relative overflow-hidden">
              {/* Branded Native Aurwell Header Overlay */}
              <div className="absolute top-0 left-0 right-0 h-[58px] bg-white border-b border-neutral-100 px-4 sm:px-6 flex items-center justify-between z-10 select-none">
                <div className="flex items-center gap-2.5">
                  <Image
                    src="/logo-black.png"
                    alt="Aurwell"
                    width={110}
                    height={28}
                    className="h-5 sm:h-6 w-auto object-contain"
                  />
                  <span className="h-3.5 w-px bg-neutral-300" />
                  <span className="text-xs sm:text-sm font-semibold text-neutral-800 tracking-tight">
                    Demo Call
                  </span>
                </div>
                {/* Spacer for floating modal close button */}
                <div className="w-10" />
              </div>

              {isLoading && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white gap-3">
                  <Loader2 className="w-8 h-8 text-neutral-900 animate-spin" />
                  <p className="text-xs font-semibold text-neutral-600">
                    Loading appointment schedule...
                  </p>
                </div>
              )}

              <iframe
                src={CALENDAR_EMBED_URL}
                onLoad={() => setIsLoading(false)}
                className="w-full h-full border-0"
                style={{ minHeight: "100%", width: "100%" }}
                title="Google Calendar Appointment Scheduling"
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
