"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

interface AdminSplashScreenProps {
  label?: string;
  fullScreen?: boolean;
}

export default function AdminSplashScreen({
  label = "Opening Workspace...",
  fullScreen = true,
}: AdminSplashScreenProps) {
  const [loadProgress, setLoadProgress] = useState(25);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Rapid progress bar increment simulation
    const timer1 = setTimeout(() => setLoadProgress(65), 100);
    const timer2 = setTimeout(() => setLoadProgress(95), 250);
    const timer3 = setTimeout(() => {
      setLoadProgress(100);
      // Small graceful fade out delay
      setTimeout(() => setIsVisible(false), 300);
    }, 450);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, filter: "blur(6px)" }}
          transition={{ duration: 0.35, ease: "easeInOut" }}
          className={
            fullScreen
              ? "fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white select-none overflow-hidden"
              : "w-full flex-1 min-h-[calc(100vh-10rem)] flex flex-col items-center justify-center select-none bg-transparent py-12"
          }
        >
          {/* Subtle Ambient Radial Lighting */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(0,0,0,0.02),transparent_60%)] pointer-events-none" />

          {/* Primary Emblem & Typography Centerpiece */}
          <div className="relative flex items-center justify-center gap-3 sm:gap-4 scale-95 sm:scale-105 transform translate-y-[-8px]">
            {/* Logo Emblem Reveal */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0, rotate: -4 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="relative flex items-center justify-center"
            >
              <Image
                src="/logo-black.png"
                alt="Aurwell Emblem"
                width={70}
                height={70}
                className="h-8 sm:h-14 w-auto object-contain"
                style={{ width: "auto" }}
                priority
                loading="eager"
              />
            </motion.div>

            {/* Vertical Shimmer Divider */}
            <motion.div
              initial={{ scaleY: 0, opacity: 0 }}
              animate={{ scaleY: 1, opacity: 0.3 }}
              transition={{ duration: 0.4, delay: 0.15, ease: "easeOut" }}
              className="w-[1.5px] h-6 sm:h-10 bg-neutral-900 rounded-full origin-center"
            />

            {/* Typography Wordmark Reveal */}
            <motion.div
              initial={{ opacity: 0, x: -18, filter: "blur(12px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            >
              <Image
                src="/typo.png"
                alt="Aurwell Typography"
                width={180}
                height={48}
                className="h-6 sm:h-11 w-auto object-contain transform translate-y-[1px] sm:translate-y-[2px]"
                style={{ width: "auto" }}
                priority
                loading="eager"
              />
            </motion.div>
          </div>

          {/* Fast Progress Bar & Label */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="mt-8 sm:mt-10 flex flex-col items-center gap-2 sm:gap-2.5 z-10"
          >
            <div className="w-32 sm:w-48 h-[3px] bg-neutral-200/80 rounded-full overflow-hidden p-[0.5px]">
              <motion.div
                initial={{ width: "25%" }}
                animate={{ width: `${loadProgress}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="h-full bg-neutral-950 rounded-full"
              />
            </div>
            <p className="text-[10px] sm:text-[11px] font-semibold text-neutral-500 tracking-wide text-center px-4">
              {label}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
