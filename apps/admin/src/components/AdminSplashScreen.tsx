"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

interface AdminSplashScreenProps {
  isVisible?: boolean;
  fullScreen?: boolean;
  label?: string;
  onFinished?: () => void;
}

export default function AdminSplashScreen({
  isVisible = true,
  fullScreen = true,
  label = "Initializing Aurwell Admin...",
  onFinished,
}: AdminSplashScreenProps) {
  const [loadProgress, setLoadProgress] = useState(25);
  const [show, setShow] = useState(isVisible);

  useEffect(() => {
    setShow(isVisible);
  }, [isVisible]);

  useEffect(() => {
    if (!show) return;

    // Fast progress bar animation from 25% -> 95%
    const interval = setInterval(() => {
      setLoadProgress((prev) => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        return prev + Math.floor(Math.random() * 15) + 12;
      });
    }, 110);

    return () => clearInterval(interval);
  }, [show]);

  useEffect(() => {
    if (loadProgress >= 95 && !isVisible) {
      setLoadProgress(100);
      const timer = setTimeout(() => {
        if (onFinished) onFinished();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [loadProgress, isVisible, onFinished]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="admin-splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.03, filter: "blur(12px)" }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className={
            fullScreen
              ? "fixed inset-0 z-[9999] bg-[#F3F4F6] flex flex-col items-center justify-center overflow-hidden select-none"
              : "absolute inset-0 z-40 bg-[#F3F4F6]/95 backdrop-blur-sm flex flex-col items-center justify-center min-h-[480px] rounded-3xl overflow-hidden select-none"
          }
        >
          {/* Ambient Background Glow Aura */}
          <motion.div
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 0.7, scale: 1.2 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="absolute w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-emerald-200/40 via-purple-200/30 to-amber-200/30 blur-3xl pointer-events-none"
          />

          {/* Brand Logo & Typography Lockup */}
          <div className="relative z-10 flex items-center gap-4 sm:gap-6">
            {/* Logo Icon Reveal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.75, filter: "blur(16px)", y: 12 }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)", y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="relative"
            >
              <Image
                src="/logo-black.png"
                alt="Aurwell Logo"
                width={160}
                height={44}
                className="h-12 sm:h-16 w-auto object-contain drop-shadow-sm"
                style={{ width: "auto" }}
                priority
              />
            </motion.div>

            {/* Vertical Shimmer Divider */}
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "40px", opacity: 0.3 }}
              transition={{ duration: 0.4, delay: 0.15, ease: "easeOut" }}
              className="w-[1.5px] bg-neutral-900 rounded-full"
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
                className="h-9 sm:h-12 w-auto object-contain transform translate-y-[2px]"
                style={{ width: "auto" }}
                priority
              />
            </motion.div>
          </div>

          {/* Fast Progress Bar & Label */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="absolute bottom-16 flex flex-col items-center gap-2.5"
          >
            <div className="w-40 sm:w-48 h-[3px] bg-neutral-200/80 rounded-full overflow-hidden p-[0.5px]">
              <motion.div
                initial={{ width: "25%" }}
                animate={{ width: `${loadProgress}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="h-full bg-neutral-900 rounded-full shadow-sm"
              />
            </div>
            <p className="text-[11px] font-semibold text-neutral-500 tracking-wide">
              {label}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
