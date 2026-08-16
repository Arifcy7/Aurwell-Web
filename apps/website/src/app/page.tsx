"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import MotionButton from "@/components/ui/motion-button";
import AppDemoPhone from "@/components/demo/AppDemoPhone";
import stepImg1 from "@/assets/1.png";
import stepImg2 from "@/assets/2.png";
import stepImg3 from "@/assets/3.png";
import {
  ArrowRight,
  Check,
  Users,
  Gift,
  Send,
  BarChart3,
  Lock,
  Star,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LayoutDashboard,
  Tag,
  CreditCard,
  Settings,
  Sparkles,
  Palette,
  Sliders,
  Rocket,
  Paintbrush,
  Maximize2,
  Pause,
  Play,
  X,
  SlidersHorizontal,
  Pencil,
} from "lucide-react";

export default function Home() {
  const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || "https://admin.aurwell.app";
  const [activeTab, setActiveTab] = useState("Membership");
  const [previousTab, setPreviousTab] = useState("Membership");

  const handleTabClick = (tabName: string) => {
    if (tabName !== "Configure") {
      setPreviousTab(tabName);
    }
    setActiveTab(tabName);
  };
  const [showSplash, setShowSplash] = useState(true);
  const [loadProgress, setLoadProgress] = useState(30);
  const [isMobile, setIsMobile] = useState(false);
  const [sliderOffset, setSliderOffset] = useState({ x: 0, y: 0 });

  const colorOptions = [
    { id: "obsidian", name: "Obsidian Black", hex: "#111827" },
    { id: "emerald", name: "Emerald Sage", hex: "#059669" },
    { id: "rose", name: "Blush Rose", hex: "#e11d48" },
    { id: "royal", name: "Royal Blue", hex: "#2563eb" },
    { id: "gold", name: "Champagne Gold", hex: "#d97706" },
  ];

  const currencyOptions = [
    { code: "USD", symbol: "$" },
    { code: "EUR", symbol: "€" },
    { code: "GBP", symbol: "£" },
    { code: "AUD", symbol: "A$" },
  ];

  const adminImages = ["/admin.png", "/admin1.png", "/admin2.png"];
  const [stackIndex, setStackIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isModalHovered, setIsModalHovered] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setStackIndex((prev) => (prev + 1) % adminImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [adminImages.length, isPaused]);

  const [clinicName, setClinicName] = useState("Luxe Aesthetics");
  const [selectedColor, setSelectedColor] = useState(colorOptions[0]);
  const [selectedCurrency, setSelectedCurrency] = useState(currencyOptions[0]);
  const [isColorMenuOpen, setIsColorMenuOpen] = useState(false);
  const [isCurrencyMenuOpen, setIsCurrencyMenuOpen] = useState(false);

  const handleHeroMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const trackEl = document.getElementById("outer-glass-track");
    if (!trackEl) return;

    const trackRect = trackEl.getBoundingClientRect();

    // Stop slider floating when mouse is directly hovering over or near the track
    if (
      e.clientX >= trackRect.left - 6 &&
      e.clientX <= trackRect.right + 6 &&
      e.clientY >= trackRect.top - 6 &&
      e.clientY <= trackRect.bottom + 6
    ) {
      setSliderOffset({ x: 0, y: 0 });
      return;
    }

    const trackCenterX = trackRect.left + trackRect.width / 2;
    const trackCenterY = trackRect.top + trackRect.height / 2;

    const dx = e.clientX - trackCenterX;
    const dy = e.clientY - trackCenterY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxRadius = 500;

    if (distance < maxRadius && distance > 0) {
      const pull = Math.pow(1 - distance / maxRadius, 1.2) * 22;
      setSliderOffset({
        x: (dx / distance) * pull,
        y: (dy / distance) * pull,
      });
    } else {
      setSliderOffset({ x: 0, y: 0 });
    }
  };

  const handleHeroMouseLeave = () => {
    setSliderOffset({ x: 0, y: 0 });
  };

  useEffect(() => {
    let isMounted = true;

    const checkMobile = () => {
      if (isMounted) setIsMobile(window.innerWidth < 1024);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    const progressTimer1 = setTimeout(() => {
      if (isMounted) setLoadProgress(75);
    }, 200);

    const progressTimer2 = setTimeout(() => {
      if (isMounted) setLoadProgress(100);
    }, 450);

    const hideSplashTimer = setTimeout(() => {
      if (isMounted) setShowSplash(false);
    }, 600);

    return () => {
      isMounted = false;
      window.removeEventListener("resize", checkMobile);
      clearTimeout(progressTimer1);
      clearTimeout(progressTimer2);
      clearTimeout(hideSplashTimer);
    };
  }, []);

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans selection:bg-neutral-900 selection:text-white">
      {/* Full-Screen Fast & Elegant Splash Screen */}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            key="splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.03, filter: "blur(12px)" }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-50 bg-[#F3F4F6] flex flex-col items-center justify-center overflow-hidden select-none px-4"
          >
            {/* Ambient Background Glow Aura */}
            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 0.7, scale: 1.2 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="absolute w-[260px] h-[260px] sm:w-[500px] sm:h-[500px] rounded-full bg-gradient-to-tr from-blue-200/40 via-purple-200/30 to-amber-200/30 blur-2xl sm:blur-3xl pointer-events-none"
            />

            {/* Brand Logo & Typography Lockup */}
            <div className="relative z-10 flex items-center gap-2.5 sm:gap-6">
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
                  className="h-8 sm:h-14 w-auto object-contain drop-shadow-sm"
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

            {/* Fast Progress Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="absolute bottom-10 sm:bottom-16 flex flex-col items-center"
            >
              <div className="w-32 sm:w-48 h-[3px] bg-neutral-200/80 rounded-full overflow-hidden p-[0.5px]">
                <motion.div
                  initial={{ width: "30%" }}
                  animate={{ width: `${loadProgress}%` }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="h-full bg-neutral-900 rounded-full shadow-sm"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Hero & Navigation Master Container (Full height of viewport on desktop) */}
      <div className="w-full max-w-[1840px] mx-auto p-1.5 sm:p-2 lg:p-2.5 min-h-screen flex flex-col justify-center">
        <section id="overview" className="w-full lg:h-[calc(100vh-20px)] lg:min-h-[660px]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-3 h-full items-stretch">
            {/* Left Content & Header Column (~33% width) */}
            <div className="lg:col-span-4 flex flex-col justify-between pt-2 sm:pt-3 lg:pt-3 pb-6 px-4 sm:px-6 lg:px-7 bg-white sm:rounded-2xl lg:rounded-[24px]">
              {/* Header / Navbar on Left Side (Moved closer to top & mobile responsive) */}
              <motion.header
                initial={{ opacity: 0, y: -20, filter: "blur(10px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center justify-between gap-1.5 sm:gap-2.5 w-full flex-wrap sm:flex-nowrap py-0.5"
              >
                {/* Left Group: Logo and Nav Links */}
                <div className="flex items-center gap-2 sm:gap-4 lg:gap-5">
                  <Link href="/" className="flex items-center gap-1.5 flex-shrink-0">
                    <Image
                      src="/logo-black.png"
                      alt="Aurwell Logo"
                      width={140}
                      height={36}
                      className="h-6 sm:h-8 w-auto object-contain select-none"
                      draggable={false}
                      priority
                      loading="eager"
                    />
                  </Link>

                  <nav className="flex items-center gap-2 sm:gap-3 text-[11px] sm:text-sm font-bold text-neutral-900">
                    <Link
                      href="#features"
                      className="hover:text-neutral-600 transition-colors"
                    >
                      Features
                    </Link>
                    <Link
                      href="#how-it-works"
                      className="hover:text-neutral-600 transition-colors"
                    >
                      How It Works
                    </Link>
                  </nav>
                </div>

                {/* Right Group: Action Buttons */}
                <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                  <Link
                    href={`${adminUrl}/login`}
                    className="bg-neutral-100 hover:bg-neutral-200/80 text-neutral-900 font-semibold px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-[11px] sm:text-xs transition-all"
                  >
                    Login
                  </Link>
                  <Link
                    href={`${adminUrl}/signup`}
                    className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-[11px] sm:text-xs shadow-sm transition-all flex items-center gap-1"
                  >
                    <span>Build app</span>
                  </Link>
                </div>
              </motion.header>

              {/* Center Group: Hero Heading, Subheading & CTAs */}
              <div className="my-auto py-6 sm:py-10 space-y-5 max-w-md">
                <motion.h1
                  initial={{ opacity: 0, y: 30, filter: "blur(12px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                  className="text-3xl sm:text-4xl lg:text-[40px] font-extrabold text-neutral-900 tracking-tight leading-[1.14]"
                >
                  Loyalty That Keeps Clients Coming Back
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 25, filter: "blur(10px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="text-neutral-600 text-sm sm:text-base leading-relaxed font-normal"
                >
                  Create memorable client experiences with rewards, personalized offers, and automated engagement—all from one platform.
                </motion.p>

                {/* Action Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-wrap items-center gap-3 pt-2"
                >
                  <Link
                    href={`${adminUrl}/signup`}
                    className="px-5 py-2.5 rounded-full border border-neutral-900 bg-white text-neutral-900 text-xs sm:text-sm font-semibold hover:bg-neutral-50 transition-colors shadow-sm"
                  >
                    Get Started
                  </Link>
                  <MotionButton
                    label="See it in action!"
                    href="#features"
                  />
                </motion.div>
              </div>

              {/* Bottom Spacer for balanced flex layout */}
              <div className="hidden lg:block h-2" />
            </div>

            {/* Right Visual Hero Container (Extended to Left ~67% width, Minimal Padding) */}
            <motion.div
              initial={{ opacity: 0, y: 35, filter: "blur(12px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.9, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-8 h-full min-h-[520px] lg:min-h-0"
            >
              <div
                id="hero-glass-root"
                onMouseMove={handleHeroMouseMove}
                onMouseLeave={handleHeroMouseLeave}
                className="relative w-full h-full min-h-[calc(100vh-32px)] sm:min-h-[750px] lg:min-h-[600px] rounded-2xl sm:rounded-[24px] overflow-visible lg:overflow-hidden flex items-center justify-center p-3.5 sm:p-5 lg:p-6 pb-10 sm:pb-5 lg:pb-6"
              >
                {/* Background Hero Gradient Image (Full Height & Rounded Clip) */}
                <div className="absolute inset-0 rounded-2xl sm:rounded-[24px] overflow-hidden pointer-events-none select-none">
                  <Image
                    src="/hero-image.png"
                    alt="Gradient Hero Background"
                    fill
                    className="object-cover pointer-events-none select-none"
                    draggable={false}
                    priority
                  />
                </div>

                {/* SVG Squircle ClipPath Definitions */}
                <svg className="absolute w-0 h-0 pointer-events-none opacity-0" aria-hidden="true">
                  <defs>
                    <clipPath id="squircle-track-clip" clipPathUnits="objectBoundingBox">
                      <path d="M 0,0.20 C 0,0.03 0.03,0 0.20,0 H 0.80 C 0.97,0 1,0.03 1,0.20 V 0.80 C 1,0.97 0.97,1 0.80,1 H 0.20 C 0.03,1 0,0.97 0,0.80 Z" />
                    </clipPath>
                    <clipPath id="squircle-pill-clip" clipPathUnits="objectBoundingBox">
                      <path d="M 0,0.36 C 0,0.08 0.08,0 0.36,0 H 0.64 C 0.92,0 1,0.08 1,0.36 V 0.64 C 1,0.92 0.92,1 0.64,1 H 0.36 C 0.08,1 0,0.92 0,0.64 Z" />
                    </clipPath>
                  </defs>
                </svg>

                {/* Centered Hero Assembly: Phone is Fixed Center Anchor */}
                <div className="relative z-10 flex flex-col items-center justify-center w-full h-full max-w-4xl mx-auto pt-1 sm:pt-0">
                  
                  {/* Phone Centered Anchor Container */}
                  <div className="relative flex flex-col lg:flex-row items-center justify-center w-full lg:w-auto">

                    {/* Left: Feature Slider Assembly (Anchored to Left of Phone on Desktop, Top on Mobile) */}
                    <div className="relative lg:absolute lg:right-full lg:mr-8 lg:top-1/2 lg:-translate-y-1/2 flex flex-col items-center flex-shrink-0 z-20 mb-5 sm:mb-6 lg:mb-0 w-full sm:max-w-[420px] lg:w-[115px] lg:max-w-none">
                      {/* "Try demo!" handwritten text with curved arch arrow */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.7, y: -10, filter: "blur(8px)" }}
                        animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                        transition={{ duration: 0.7, delay: 1.15, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute -top-11 sm:-top-16 left-2 sm:-left-10 z-30 flex flex-col items-start select-none pointer-events-none"
                      >
                        <span
                          className="text-neutral-900 text-lg sm:text-xl font-bold transform -rotate-12 translate-x-1"
                          style={{ fontFamily: "var(--font-shadows-into-light), 'Shadows Into Light', cursive, sans-serif" }}
                        >
                          Try demo!
                        </span>
                        {/* Curved Arch Arrow */}
                        <svg
                          className="w-10 h-8 sm:w-12 sm:h-10 text-neutral-900 -mt-1 ml-4 sm:ml-6 transform rotate-12"
                          viewBox="0 0 50 40"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M 5 5 Q 28 10 38 28" />
                          <path d="M 26 28 L 38 28 L 36 17" />
                        </svg>
                      </motion.div>

                      {/* Interactive Feature Slider */}
                      <motion.div
                        id="outer-glass-track"
                        initial={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
                        animate={{
                          opacity: 1,
                          scale: 1,
                          filter: "blur(0px)",
                          x: sliderOffset.x,
                          y: sliderOffset.y,
                        }}
                        transition={{
                          opacity: { duration: 0.8, delay: 0.95, ease: [0.16, 1, 0.3, 1] },
                          scale: { duration: 0.8, delay: 0.95, ease: [0.16, 1, 0.3, 1] },
                          filter: { duration: 0.8, delay: 0.95, ease: [0.16, 1, 0.3, 1] },
                          x: { type: "spring", stiffness: 140, damping: 16, mass: 0.4 },
                          y: { type: "spring", stiffness: 140, damping: 16, mass: 0.4 },
                        }}
                        style={{
                          clipPath: "url(#squircle-track-clip)",
                        }}
                        className="relative z-20 flex flex-row lg:flex-col items-center p-1.5 sm:p-2 lg:p-2 rounded-[28px] sm:rounded-[32px] w-full sm:max-w-[420px] lg:w-[115px] lg:max-w-none h-[82px] sm:h-[88px] lg:h-auto gap-1 sm:gap-1.5 lg:gap-1.5 cursor-pointer select-none bg-white/95 backdrop-blur-md border border-neutral-200/80 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.1)] text-neutral-900 overflow-hidden"
                      >
                        {/* Animated Active Tab Indicator (4 Segments) */}
                        <motion.div
                          className={`absolute rounded-[20px] sm:rounded-[24px] pointer-events-none z-10 bg-[#242426] shadow-[0_4px_14px_rgba(0,0,0,0.15)] ${
                            isMobile
                              ? "top-1.5 bottom-1.5 w-[calc(25%-4px)] h-[calc(100%-12px)] left-1.5"
                              : "left-2 right-2 aspect-square top-2"
                          }`}
                          style={{
                            clipPath: "url(#squircle-pill-clip)",
                          }}
                          animate={{
                            x: isMobile
                              ? activeTab === "Membership"
                                ? "0%"
                                : activeTab === "Rewards"
                                ? "calc(100% + 2px)"
                                : activeTab === "Smart Deals"
                                ? "calc(200% + 4px)"
                                : "calc(300% + 6px)"
                              : 0,
                            y: !isMobile
                              ? activeTab === "Membership"
                                ? "0%"
                                : activeTab === "Rewards"
                                ? "calc(100% + 6px)"
                                : activeTab === "Smart Deals"
                                ? "calc(200% + 12px)"
                                : "calc(300% + 18px)"
                              : 0,
                          }}
                          transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 30,
                            mass: 0.8,
                          }}
                        />

                        {/* Slider Item 1: Membership */}
                        <div
                          onClick={() => handleTabClick("Membership")}
                          className="flex-1 h-full lg:w-full lg:aspect-square flex flex-col items-center justify-center gap-1 rounded-[22px] sm:rounded-[24px] relative z-20 cursor-pointer group select-none px-1 py-1"
                        >
                          <Lock
                            className={`w-4 h-4 sm:w-5 sm:h-5 transition-all duration-300 ${activeTab === "Membership"
                              ? "text-white scale-110"
                              : "text-neutral-500 group-hover:text-neutral-800 group-hover:scale-105"
                              }`}
                          />
                          <span
                            className={`font-bold lg:font-semibold text-[10px] sm:text-xs tracking-tight whitespace-nowrap transition-all duration-300 ${activeTab === "Membership"
                              ? "text-white"
                              : "text-neutral-600 group-hover:text-neutral-800 font-medium"
                              }`}
                          >
                            Membership
                          </span>
                        </div>

                        {/* Slider Item 2: Rewards */}
                        <div
                          onClick={() => handleTabClick("Rewards")}
                          className="flex-1 h-full lg:w-full lg:aspect-square flex flex-col items-center justify-center gap-1 rounded-[22px] sm:rounded-[24px] relative z-20 cursor-pointer group select-none px-1 py-1"
                        >
                          <Gift
                            className={`w-4 h-4 sm:w-5 sm:h-5 transition-all duration-300 ${activeTab === "Rewards"
                              ? "text-white scale-110"
                              : "text-neutral-500 group-hover:text-neutral-800 group-hover:scale-105"
                              }`}
                          />
                          <span
                            className={`font-bold lg:font-semibold text-[10px] sm:text-xs tracking-tight whitespace-nowrap transition-all duration-300 ${activeTab === "Rewards"
                              ? "text-white"
                              : "text-neutral-600 group-hover:text-neutral-800 font-medium"
                              }`}
                          >
                            Rewards
                          </span>
                        </div>

                        {/* Slider Item 3: Smart Deals */}
                        <div
                          onClick={() => handleTabClick("Smart Deals")}
                          className="flex-1 h-full lg:w-full lg:aspect-square flex flex-col items-center justify-center gap-1 rounded-[22px] sm:rounded-[24px] relative z-20 cursor-pointer group select-none px-1 py-1"
                        >
                          <Star
                            className={`w-4 h-4 sm:w-5 sm:h-5 transition-all duration-300 ${activeTab === "Smart Deals"
                              ? "text-white scale-110"
                              : "text-neutral-500 group-hover:text-neutral-800 group-hover:scale-105"
                              }`}
                          />
                          <span
                            className={`font-bold lg:font-semibold text-[10px] sm:text-xs tracking-tight whitespace-nowrap transition-all duration-300 ${activeTab === "Smart Deals"
                              ? "text-white"
                              : "text-neutral-600 group-hover:text-neutral-800 font-medium"
                              }`}
                          >
                            Smart Deals
                          </span>
                        </div>

                        {/* Slider Item 4: Configure */}
                        <div
                          onClick={() => handleTabClick("Configure")}
                          className="flex-1 h-full lg:w-full lg:aspect-square flex flex-col items-center justify-center gap-1 rounded-[22px] sm:rounded-[24px] relative z-20 cursor-pointer group select-none px-1 py-1"
                        >
                          <SlidersHorizontal
                            className={`w-4 h-4 sm:w-5 sm:h-5 transition-all duration-300 ${activeTab === "Configure"
                              ? "text-white scale-110"
                              : "text-neutral-500 group-hover:text-neutral-800 group-hover:scale-105"
                              }`}
                          />
                          <span
                            className={`font-bold lg:font-semibold text-[10px] sm:text-xs tracking-tight whitespace-nowrap transition-all duration-300 ${activeTab === "Configure"
                              ? "text-white"
                              : "text-neutral-600 group-hover:text-neutral-800 font-medium"
                              }`}
                          >
                            Configure
                          </span>
                        </div>
                      </motion.div>
                    </div>

                    {/* Center: Mobile Phone Mockup Frame (PERFECT FIT ON MOBILE, PERFECT ON DESKTOP) */}
                    <div
                      className="relative z-10 h-[570px] xs:h-[610px] sm:h-[620px] lg:h-[610px] bg-white rounded-[36px] sm:rounded-[46px] shadow-[0_20px_50px_-15px_rgba(0,0,0,0.12)] border-[6px] sm:border-[8px] border-white flex flex-col items-center justify-center overflow-hidden select-none flex-shrink-0"
                      style={{ aspectRatio: "1170 / 2532" }}
                    >
                      {/* Side button detail */}
                      <div className="absolute -right-[11px] top-32 w-[3px] h-16 bg-neutral-200 rounded-r-md" />

                      {/* Screen Container with Dynamic Content */}
                      <div className="w-full h-full bg-white rounded-[32px] sm:rounded-[38px] relative overflow-hidden">
                        <AppDemoPhone
                          activeTab={activeTab === "Configure" ? previousTab : activeTab}
                          clinicName={clinicName}
                          brandColor={selectedColor.hex}
                          currency={selectedCurrency}
                          onSelectTab={(tab) => handleTabClick(tab)}
                        />
                      </div>
                    </div>

                    {/* Desktop App Configurator Card (lg only - exact original desktop layout & animation) */}
                    <AnimatePresence>
                      {activeTab === "Configure" && (
                        <motion.div
                          key="configure-card-desktop"
                          initial={{ opacity: 0, scale: 0.92, x: -20, filter: "blur(10px)" }}
                          animate={{
                            opacity: 1,
                            scale: 1,
                            x: 0,
                            filter: "blur(0px)",
                          }}
                          exit={{ opacity: 0, scale: 0.92, x: -20, filter: "blur(10px)" }}
                          transition={{
                            duration: 0.35,
                            ease: [0.16, 1, 0.3, 1],
                          }}
                          className="hidden lg:flex absolute left-full ml-8 top-1/2 -translate-y-1/2 z-30 flex-col p-4 sm:p-5 rounded-[28px] sm:rounded-[32px] w-[290px] sm:w-[220px] lg:w-[235px] bg-white/95 backdrop-blur-md border border-neutral-200/80 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.1)] text-neutral-900 select-none flex-shrink-0 space-y-3.5 mt-0"
                        >
                          {/* Card Header with Configure / Edit Icon on the Right */}
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-extrabold text-xs sm:text-sm text-neutral-900 tracking-tight leading-snug">
                                Configure App
                              </h4>
                              <p className="text-[10px] sm:text-xs font-normal text-neutral-500 mt-0.5">
                                Personalize preview
                              </p>
                            </div>
                            <SlidersHorizontal className="w-5 h-5 text-neutral-800 flex-shrink-0 mt-0.5" />
                          </div>

                          {/* 1. Clinic Name Input */}
                          <div className="space-y-1">
                            <label className="text-[11px] sm:text-xs font-bold text-neutral-800 tracking-tight block">
                              Clinic Name
                            </label>
                            <div className="w-full rounded-full bg-neutral-100/90 border border-neutral-200 px-3 py-1.5 focus-within:border-neutral-900 transition-colors shadow-2xs">
                              <input
                                type="text"
                                value={clinicName}
                                onChange={(e) => setClinicName(e.target.value)}
                                placeholder="Clinic Name"
                                className="w-full bg-transparent font-semibold text-xs text-neutral-900 placeholder:text-neutral-400 outline-none"
                              />
                            </div>
                          </div>

                          {/* 2. Color Dropdown with Larger Solid Pill Swatch */}
                          <div className="space-y-1 relative z-30">
                            <label className="text-[11px] sm:text-xs font-bold text-neutral-800 tracking-tight block">
                              Brand Color
                            </label>
                            <div
                              onClick={() => {
                                setIsColorMenuOpen(!isColorMenuOpen);
                                setIsCurrencyMenuOpen(false);
                              }}
                              className="w-full rounded-full bg-neutral-100 border border-neutral-200 px-3 py-1.5 flex items-center justify-between cursor-pointer hover:bg-neutral-200/70 transition-colors shadow-2xs"
                            >
                              <span className="text-xs font-semibold text-neutral-800 truncate pr-1">
                                {selectedColor.name}
                              </span>
                              <div
                                className="w-10 h-4.5 rounded-full flex-shrink-0 shadow-2xs"
                                style={{ backgroundColor: selectedColor.hex }}
                              />
                            </div>

                            {/* Dropdown Menu */}
                            <AnimatePresence>
                              {isColorMenuOpen && (
                                <motion.div
                                  initial={{ opacity: 0, y: -4, scale: 0.96 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: -4, scale: 0.96 }}
                                  transition={{ duration: 0.15 }}
                                  className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-neutral-200 shadow-2xl rounded-2xl p-1.5 z-[100] space-y-0.5"
                                >
                                  {colorOptions.map((color) => (
                                    <div
                                      key={color.id}
                                      onClick={() => {
                                        setSelectedColor(color);
                                        setIsColorMenuOpen(false);
                                      }}
                                      className={`flex items-center justify-between px-3 py-1.5 rounded-full cursor-pointer transition-colors ${
                                        selectedColor.id === color.id
                                          ? "bg-neutral-100 font-bold text-neutral-900"
                                          : "hover:bg-neutral-50 font-medium text-neutral-800"
                                      }`}
                                    >
                                      <span className="text-xs">{color.name}</span>
                                      <div
                                        className="w-7 h-3.5 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: color.hex }}
                                      />
                                    </div>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          {/* 3. Currency Dropdown with Pill Shape */}
                          <div className="space-y-1 relative z-20">
                            <label className="text-[11px] sm:text-xs font-bold text-neutral-800 tracking-tight block">
                              Currency
                            </label>
                            <div
                              onClick={() => {
                                setIsCurrencyMenuOpen(!isCurrencyMenuOpen);
                                setIsColorMenuOpen(false);
                              }}
                              className="w-full rounded-full bg-neutral-100 border border-neutral-200 px-3.5 py-1.5 flex items-center justify-between cursor-pointer hover:bg-neutral-200/70 transition-colors shadow-2xs"
                            >
                              <span className="text-xs font-semibold text-neutral-800">
                                {selectedCurrency.code} ({selectedCurrency.symbol})
                              </span>
                              <span className="text-[10px] font-bold text-neutral-400">▼</span>
                            </div>

                            {/* Dropdown Menu */}
                            <AnimatePresence>
                              {isCurrencyMenuOpen && (
                                <motion.div
                                  initial={{ opacity: 0, y: -4, scale: 0.96 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: -4, scale: 0.96 }}
                                  transition={{ duration: 0.15 }}
                                  className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-neutral-200 shadow-2xl rounded-2xl p-1.5 z-[100] space-y-0.5"
                                >
                                  {currencyOptions.map((curr) => (
                                    <div
                                      key={curr.code}
                                      onClick={() => {
                                        setSelectedCurrency(curr);
                                        setIsCurrencyMenuOpen(false);
                                      }}
                                      className={`flex items-center justify-between px-3 py-1.5 rounded-full cursor-pointer transition-colors ${
                                        selectedCurrency.code === curr.code
                                          ? "bg-neutral-100 font-bold text-neutral-900"
                                          : "hover:bg-neutral-50 font-medium text-neutral-800"
                                      }`}
                                    >
                                      <span className="text-xs">{curr.code}</span>
                                      <span className="text-xs font-bold text-neutral-600">
                                        {curr.symbol}
                                      </span>
                                    </div>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          {/* 4. Action Button */}
                          <div className="pt-1">
                            <Link
                              href={`${adminUrl}/signup`}
                              className="w-full py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold transition-all shadow-xs flex items-center justify-center text-center"
                            >
                              Build my app
                            </Link>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Mobile App Configurator Overlay Card (< lg only) */}
                    <AnimatePresence>
                      {activeTab === "Configure" && (
                        <motion.div
                          key="configure-card-mobile"
                          initial={{ opacity: 0, scale: 0.92, y: -10, filter: "blur(10px)" }}
                          animate={{
                            opacity: 1,
                            scale: 1,
                            y: 0,
                            filter: "blur(0px)",
                          }}
                          exit={{ opacity: 0, scale: 0.92, y: -10, filter: "blur(10px)" }}
                          transition={{
                            duration: 0.35,
                            ease: [0.16, 1, 0.3, 1],
                          }}
                          className="flex lg:hidden absolute left-1/2 -translate-x-1/2 top-14 xs:top-16 sm:top-20 z-50 flex-col p-3 rounded-[22px] w-[calc(100%-32px)] max-w-[245px] bg-white/95 backdrop-blur-xl border border-neutral-200/90 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.2)] text-neutral-900 select-none flex-shrink-0 space-y-2"
                        >
                          {/* Card Header with Configure / Edit Icon on the Right */}
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-extrabold text-[11px] text-neutral-900 tracking-tight leading-none">
                                Configure App
                              </h4>
                              <p className="text-[9.5px] font-normal text-neutral-500 mt-0.5">
                                Personalize preview
                              </p>
                            </div>
                            <SlidersHorizontal className="w-4 h-4 text-neutral-800 flex-shrink-0" />
                          </div>

                          {/* 1. Clinic Name Input */}
                          <div className="space-y-0.5">
                            <label className="text-[10px] font-bold text-neutral-800 tracking-tight block">
                              Clinic Name
                            </label>
                            <div className="w-full rounded-full bg-neutral-100/90 border border-neutral-200 px-2.5 py-1 focus-within:border-neutral-900 transition-colors shadow-2xs">
                              <input
                                type="text"
                                value={clinicName}
                                onChange={(e) => setClinicName(e.target.value)}
                                placeholder="Clinic Name"
                                className="w-full bg-transparent font-semibold text-[11px] text-neutral-900 placeholder:text-neutral-400 outline-none"
                              />
                            </div>
                          </div>

                          {/* 2. Color Dropdown with Solid Pill Swatch */}
                          <div className="space-y-0.5 relative z-30">
                            <label className="text-[10px] font-bold text-neutral-800 tracking-tight block">
                              Brand Color
                            </label>
                            <div
                              onClick={() => {
                                setIsColorMenuOpen(!isColorMenuOpen);
                                setIsCurrencyMenuOpen(false);
                              }}
                              className="w-full rounded-full bg-neutral-100 border border-neutral-200 px-2.5 py-1 flex items-center justify-between cursor-pointer hover:bg-neutral-200/70 transition-colors shadow-2xs"
                            >
                              <span className="text-[11px] font-semibold text-neutral-800 truncate pr-1">
                                {selectedColor.name}
                              </span>
                              <div
                                className="w-7 h-3.5 rounded-full flex-shrink-0 shadow-2xs"
                                style={{ backgroundColor: selectedColor.hex }}
                              />
                            </div>

                            {/* Dropdown Menu */}
                            <AnimatePresence>
                              {isColorMenuOpen && (
                                <motion.div
                                  initial={{ opacity: 0, y: -4, scale: 0.96 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: -4, scale: 0.96 }}
                                  transition={{ duration: 0.15 }}
                                  className="absolute left-0 right-0 top-full mt-1 bg-white border border-neutral-200 shadow-2xl rounded-2xl p-1 z-[100] space-y-0.5"
                                >
                                  {colorOptions.map((color) => (
                                    <div
                                      key={color.id}
                                      onClick={() => {
                                        setSelectedColor(color);
                                        setIsColorMenuOpen(false);
                                      }}
                                      className={`flex items-center justify-between px-2.5 py-1 rounded-full cursor-pointer transition-colors ${
                                        selectedColor.id === color.id
                                          ? "bg-neutral-100 font-bold text-neutral-900"
                                          : "hover:bg-neutral-50 font-medium text-neutral-800"
                                      }`}
                                    >
                                      <span className="text-[11px]">{color.name}</span>
                                      <div
                                        className="w-6 h-3 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: color.hex }}
                                      />
                                    </div>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          {/* 3. Currency Dropdown with Pill Shape */}
                          <div className="space-y-0.5 relative z-20">
                            <label className="text-[10px] font-bold text-neutral-800 tracking-tight block">
                              Currency
                            </label>
                            <div
                              onClick={() => {
                                setIsCurrencyMenuOpen(!isCurrencyMenuOpen);
                                setIsColorMenuOpen(false);
                              }}
                              className="w-full rounded-full bg-neutral-100 border border-neutral-200 px-2.5 py-1 flex items-center justify-between cursor-pointer hover:bg-neutral-200/70 transition-colors shadow-2xs"
                            >
                              <span className="text-[11px] font-semibold text-neutral-800">
                                {selectedCurrency.code} ({selectedCurrency.symbol})
                              </span>
                              <span className="text-[9px] font-bold text-neutral-400">▼</span>
                            </div>

                            {/* Dropdown Menu */}
                            <AnimatePresence>
                              {isCurrencyMenuOpen && (
                                <motion.div
                                  initial={{ opacity: 0, y: -4, scale: 0.96 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: -4, scale: 0.96 }}
                                  transition={{ duration: 0.15 }}
                                  className="absolute left-0 right-0 top-full mt-1 bg-white border border-neutral-200 shadow-2xl rounded-2xl p-1 z-[100] space-y-0.5"
                                >
                                  {currencyOptions.map((curr) => (
                                    <div
                                      key={curr.code}
                                      onClick={() => {
                                        setSelectedCurrency(curr);
                                        setIsCurrencyMenuOpen(false);
                                      }}
                                      className={`flex items-center justify-between px-2.5 py-1 rounded-full cursor-pointer transition-colors ${
                                        selectedCurrency.code === curr.code
                                          ? "bg-neutral-100 font-bold text-neutral-900"
                                          : "hover:bg-neutral-50 font-medium text-neutral-800"
                                      }`}
                                    >
                                      <span className="text-[11px]">{curr.code}</span>
                                      <span className="text-[11px] font-bold text-neutral-600">
                                        {curr.symbol}
                                      </span>
                                    </div>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          {/* 4. Action Button: Done Only on Mobile */}
                          <div className="pt-0.5">
                            <button
                              onClick={() => handleTabClick(previousTab || "Membership")}
                              className="w-full py-1.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white text-[11px] font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5 text-white" />
                              Done
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                  </div>
                </div>

                {/* Minimal Text Note Positioned at Absolute Bottom of Hero Container */}
                <div className="absolute bottom-2 sm:bottom-3 left-0 right-0 z-20 text-center px-4 pointer-events-none">
                  <p className="text-[10px] sm:text-[11px] text-white/80 font-medium tracking-tight select-none max-w-sm sm:max-w-md mx-auto leading-tight drop-shadow-sm opacity-90">
                    * Interactive demo preview. The actual mobile app features complete booking, payments & live clinic management.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </div>

      {/* Remaining Sections Container (Centered with normal padding) */}
      <div className="max-w-7xl mx-auto px-6 sm:px-12 lg:px-20">
        {/* Built for Growth Section */}
        <section id="features" className="py-6 sm:py-12 scroll-mt-6">
          <div className="bg-white/60 rounded-2xl sm:rounded-[36px] p-4 sm:p-14 border border-white/60 shadow-sm">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 25, filter: "blur(10px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="text-center space-y-1 sm:space-y-2 mb-6 sm:mb-12"
            >
              <span className="text-neutral-600 text-[10px] sm:text-sm font-bold uppercase tracking-wider">
                Built for Growth
              </span>
              <h2 className="text-xl sm:text-3xl lg:text-4xl font-extrabold text-neutral-900 max-w-2xl mx-auto tracking-tight">
                Everything You Need to Build Stronger Relationships
              </h2>
            </motion.div>

            {/* Feature Cards Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              {/* Card 1 */}
              <motion.div
                initial={{ opacity: 0, y: 30, filter: "blur(12px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-6 shadow-sm border border-neutral-100 hover:shadow-md transition-shadow"
              >
                <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-neutral-100 text-neutral-900 flex items-center justify-center mb-2.5 sm:mb-4">
                  <Users className="w-4 h-4 sm:w-6 sm:h-6" />
                </div>
                <h3 className="text-xs sm:text-base font-bold text-neutral-900 mb-1 sm:mb-2">
                  Boost Retention
                </h3>
                <p className="text-neutral-500 text-[11px] sm:text-sm leading-tight sm:leading-relaxed">
                  Turn one-time visits into lasting relationships with loyalty programs that work.
                </p>
              </motion.div>

              {/* Card 2 */}
              <motion.div
                initial={{ opacity: 0, y: 30, filter: "blur(12px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-6 shadow-sm border border-neutral-100 hover:shadow-md transition-shadow"
              >
                <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-neutral-100 text-neutral-900 flex items-center justify-center mb-2.5 sm:mb-4">
                  <Gift className="w-4 h-4 sm:w-6 sm:h-6" />
                </div>
                <h3 className="text-xs sm:text-base font-bold text-neutral-900 mb-1 sm:mb-2">
                  Reward What Matters
                </h3>
                <p className="text-neutral-500 text-[11px] sm:text-sm leading-tight sm:leading-relaxed">
                  Create points, tiers, and rewards that motivate your clients to engage more.
                </p>
              </motion.div>

              {/* Card 3 */}
              <motion.div
                initial={{ opacity: 0, y: 30, filter: "blur(12px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-6 shadow-sm border border-neutral-100 hover:shadow-md transition-shadow"
              >
                <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-neutral-100 text-neutral-900 flex items-center justify-center mb-2.5 sm:mb-4">
                  <Send className="w-4 h-4 sm:w-6 sm:h-6" />
                </div>
                <h3 className="text-xs sm:text-base font-bold text-neutral-900 mb-1 sm:mb-2">
                  Smart Automation
                </h3>
                <p className="text-neutral-500 text-[11px] sm:text-sm leading-tight sm:leading-relaxed">
                  Automate offers and reminders so you can focus on what you do best.
                </p>
              </motion.div>

              {/* Card 4 */}
              <motion.div
                initial={{ opacity: 0, y: 30, filter: "blur(12px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.7, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="bg-white rounded-xl sm:rounded-2xl p-3.5 sm:p-6 shadow-sm border border-neutral-100 hover:shadow-md transition-shadow"
              >
                <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-neutral-100 text-neutral-900 flex items-center justify-center mb-2.5 sm:mb-4">
                  <BarChart3 className="w-4 h-4 sm:w-6 sm:h-6" />
                </div>
                <h3 className="text-xs sm:text-base font-bold text-neutral-900 mb-1 sm:mb-2">
                  Track & Grow
                </h3>
                <p className="text-neutral-500 text-[11px] sm:text-sm leading-tight sm:leading-relaxed">
                  Powerful analytics to understand client behavior and grow your business faster.
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* All-in-One Platform Section */}
        <section className="py-12">
          <div className="bg-white/60 rounded-[36px] p-8 sm:p-14 border border-white/60 shadow-sm overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
              {/* Left Column */}
              <motion.div
                initial={{ opacity: 0, x: -30, filter: "blur(12px)" }}
                whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="lg:col-span-5 space-y-6"
              >
                <span className="text-neutral-600 text-xs sm:text-sm font-bold uppercase tracking-wider">
                  All-in-One Platform
                </span>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-neutral-900 tracking-tight leading-tight">
                  Run Your Loyalty Program Like a Pro
                </h2>

                {/* Bullet List */}
                <div className="space-y-3 pt-2">
                  {[
                    "Easy membership management",
                    "Points, rewards & tier system",
                    "Personalized offers & promotions",
                    "Automated notifications",
                    "Real-time analytics & insights",
                    "Seamless branding for your clinic",
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-5 h-5 rounded-full bg-neutral-900 text-white flex items-center justify-center flex-shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                      <span className="text-neutral-700 text-sm font-medium">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-4">
                  <Link
                    href="#features"
                    className="inline-flex items-center gap-3 border border-neutral-300 hover:border-neutral-400 bg-white text-neutral-900 font-semibold pl-6 pr-2 py-2 rounded-full text-sm transition-all duration-200 group"
                  >
                    <span>Explore All Features</span>
                    <span className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  </Link>
                </div>
              </motion.div>

              {/* Right Column: Clean Vertically Stacked Cards Showcase */}
              <motion.div
                initial={{ opacity: 0, x: 30, filter: "blur(12px)" }}
                whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="lg:col-span-7 relative flex flex-col items-center justify-center pt-6 pb-2 w-full"
              >
                {/* Vertically Stacked Cards Container */}
                <div
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                  onClick={() => setIsLightboxOpen(true)}
                  className="relative w-full h-[280px] sm:h-[380px] md:h-[420px] flex items-center justify-center cursor-pointer select-none group"
                >
                  {/* Centered Expand Icon on Card Hover (No Black Background) */}
                  <AnimatePresence>
                    {isHovered && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none"
                      >
                        <div className="w-10 h-10 rounded-full bg-white/90 text-neutral-900 flex items-center justify-center shadow-xl border border-neutral-200/80 backdrop-blur-md">
                          <Maximize2 className="w-4.5 h-4.5 text-neutral-900" />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {adminImages.map((src, idx) => {
                    // Calculate position relative to active stack index (0 = front top, 1 = middle, 2 = back)
                    const position = (idx - stackIndex + adminImages.length) % adminImages.length;

                    // Vertical Y offsets, reduced transparency, and gradual depth blur
                    const yOffset = position === 0 ? 40 : position === 1 ? 20 : 0;
                    const scale = position === 0 ? 1 : position === 1 ? 0.96 : 0.92;
                    const opacity = position === 0 ? 1 : position === 1 ? 0.92 : 0.82;
                    const blur = position === 0 ? "blur(0px)" : position === 1 ? "blur(2px)" : "blur(4px)";
                    const zIndex = 30 - position * 10;

                    return (
                      <motion.div
                        key={src}
                        animate={{
                          y: yOffset,
                          scale,
                          opacity,
                          filter: blur,
                          zIndex,
                        }}
                        transition={{
                          duration: 0.7,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                        className="absolute inset-x-0 top-0 bg-white rounded-2xl sm:rounded-3xl border border-neutral-200/90 shadow-2xl overflow-hidden p-1.5 sm:p-2.5 origin-top"
                      >
                        <img
                          src={src}
                          alt={`Admin Dashboard View ${idx + 1}`}
                          className="w-full h-auto object-contain rounded-xl sm:rounded-2xl"
                        />
                      </motion.div>
                    );
                  })}
                </div>

                {/* Super Minimal Timer Bar (Reduced gap mt-3 / mt-4) */}
                <div className="w-full max-w-[90px] sm:max-w-[110px] mx-auto mt-3 sm:mt-4">
                  <div className="w-full h-[3px] bg-neutral-200/80 rounded-full overflow-hidden">
                    <motion.div
                      key={`${stackIndex}-${isPaused}`}
                      initial={{ width: "0%" }}
                      animate={{ width: isPaused ? "50%" : "100%" }}
                      transition={isPaused ? { duration: 0 } : { duration: 5, ease: "linear" }}
                      className="h-full bg-neutral-900 rounded-full"
                    />
                  </div>
                </div>
              </motion.div>

              {/* Full-Screen Site-Matched Modal Lightbox Overlay */}
              <AnimatePresence>
                {isLightboxOpen && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    onClick={() => setIsLightboxOpen(false)}
                    className="fixed inset-0 z-[200] bg-neutral-950/40 backdrop-blur-2xl flex flex-col items-center justify-center p-4 sm:p-8 select-none"
                  >
                    {/* Lightbox Modal Card Container */}
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="relative max-w-5xl w-full bg-white rounded-3xl border border-neutral-200/90 shadow-2xl overflow-hidden flex flex-col"
                    >
                      {/* Top Header Row */}
                      <div className="w-full px-6 py-3.5 flex items-center justify-between border-b border-neutral-100 bg-white">
                        <span className="text-sm font-black text-neutral-900 tracking-tight">
                          Admin Panel
                        </span>
                        <button
                          onClick={() => setIsLightboxOpen(false)}
                          className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 flex items-center justify-center transition-colors border border-neutral-200/80"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Main Image Viewport with Integrated White Gradient Controls (Shown ONLY on Hover) */}
                      <div
                        onMouseEnter={() => setIsModalHovered(true)}
                        onMouseLeave={() => setIsModalHovered(false)}
                        className="relative w-full aspect-[16/9.5] sm:aspect-[16/9] bg-neutral-50 overflow-hidden group"
                      >
                        <AnimatePresence mode="wait">
                          <motion.img
                            key={adminImages[stackIndex]}
                            src={adminImages[stackIndex]}
                            alt="Admin Panel"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                            className="w-full h-full object-contain"
                          />
                        </AnimatePresence>

                        {/* Integrated White Linear Gradient Controls (Gradient & Timer Bar Always Visible, Icons Hover-Only) */}
                        <div className="absolute bottom-0 inset-x-0 p-4 pt-14 bg-gradient-to-t from-white/95 via-white/80 to-transparent flex flex-col items-center gap-2.5 z-20 pointer-events-auto">
                          {/* 3 Small Minimal Icons (Fades in ONLY on Hover) */}
                          <AnimatePresence>
                            {isModalHovered && (
                              <motion.div
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 6 }}
                                transition={{ duration: 0.18 }}
                                className="flex items-center gap-4"
                              >
                                {/* 1. Prev Icon */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setStackIndex((prev) => (prev - 1 + adminImages.length) % adminImages.length);
                                  }}
                                  className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-900 flex items-center justify-center transition-all active:scale-95 shadow-2xs border border-neutral-200/80"
                                  title="Previous Image"
                                >
                                  <ChevronLeft className="w-4 h-4" />
                                </button>

                                {/* 2. Pause / Play Icon */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsPaused((prev) => !prev);
                                  }}
                                  className="w-9 h-9 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white flex items-center justify-center transition-all active:scale-95 shadow-md"
                                  title={isPaused ? "Play Timer" : "Pause Timer"}
                                >
                                  {isPaused ? (
                                    <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                                  ) : (
                                    <Pause className="w-4 h-4 fill-white text-white" />
                                  )}
                                </button>

                                {/* 3. Next Icon */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setStackIndex((prev) => (prev + 1) % adminImages.length);
                                  }}
                                  className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-900 flex items-center justify-center transition-all active:scale-95 shadow-2xs border border-neutral-200/80"
                                  title="Next Image"
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Minimal Progress Timer Bar (Always Visible) */}
                          <div className="w-full max-w-[110px] h-[3px] bg-neutral-200 rounded-full overflow-hidden">
                            <motion.div
                              key={`${stackIndex}-${isPaused}`}
                              initial={{ width: "0%" }}
                              animate={{ width: isPaused ? "50%" : "100%" }}
                              transition={isPaused ? { duration: 0 } : { duration: 5, ease: "linear" }}
                              className="h-full bg-neutral-900 rounded-full"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* How It Works - 3 Step Process Section */}
        <section id="how-it-works" className="py-12 scroll-mt-6">
          <div className="relative rounded-[36px] bg-gradient-to-b from-white/40 via-white/60 to-white/80 p-8 sm:p-14 border border-white/60 shadow-sm">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="text-center space-y-2 mb-12"
            >
              <span className="text-neutral-600 text-xs sm:text-sm font-bold uppercase tracking-wider">
                How It Works
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-neutral-900 tracking-tight">
                Launch Your App in 3 Steps
              </h2>
              <p className="text-neutral-500 text-xs sm:text-sm max-w-lg mx-auto font-normal">
                From website brand import to a live client application delivered in 24 hours.
              </p>
            </motion.div>

            {/* 3 Step Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch max-w-5xl mx-auto">
              {/* Step 1 Card */}
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
                className="bg-white rounded-3xl p-5 sm:p-6 border border-neutral-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300 group"
              >
                <div className="space-y-4">
                  <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-neutral-100/60 border border-neutral-100">
                    <Image
                      src={stepImg1}
                      alt="Website Brand Import"
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-neutral-900">
                      Website Brand Import
                    </h3>
                    <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">
                      Aurwell automatically imports your brand design, logo, colors, and fonts directly from your clinic website.
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Step 2 Card */}
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
                className="bg-white rounded-3xl p-5 sm:p-6 border border-neutral-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300 group"
              >
                <div className="space-y-4">
                  <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-neutral-100/60 border border-neutral-100">
                    <Image
                      src={stepImg2}
                      alt="Customize & Configure"
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-neutral-900">
                      Customize & Configure
                    </h3>
                    <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">
                      Your app is ready in 24 hours. Easily configure themes, membership tiers, and reward plans from your admin portal.
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Step 3 Card */}
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
                className="bg-white rounded-3xl p-5 sm:p-6 border border-neutral-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300 group"
              >
                <div className="space-y-4">
                  <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-neutral-100/60 border border-neutral-100">
                    <Image
                      src={stepImg3}
                      alt="Start Passive Earning"
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-neutral-900">
                      Start Passive Earning
                    </h3>
                    <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">
                      Launch your app to patients to generate automated recurring membership revenue and repeat clinic appointments.
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>


        {/* Bottom Call to Action Banner */}
        <section className="py-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, filter: "blur(12px)" }}
            whileInView={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="bg-gradient-to-r from-[#1D4ED8] via-[#2563EB] to-[#06B6D4] text-white rounded-[32px] p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-6 shadow-md"
          >
            <div className="space-y-2 text-center md:text-left">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Ready to Build Loyalty That Lasts?
              </h2>
              <p className="text-neutral-100 text-xs sm:text-sm max-w-xl font-normal">
                Join clinics and salons that trust Aurwell to grow relationships and revenue.
              </p>
            </div>
            <div>
              <Link
                href={`${adminUrl}/signup`}
                className="inline-flex items-center gap-3 bg-white text-neutral-900 font-bold pl-6 pr-2 py-2.5 rounded-full text-xs sm:text-sm shadow-lg hover:bg-slate-100 transition-all duration-200 group whitespace-nowrap"
              >
                <span>Get Started for Free</span>
                <span className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                  <ArrowRight className="w-4 h-4" />
                </span>
              </Link>
            </div>
          </motion.div>
        </section>
      </div>

      {/* Footer Section (Full Width, with centered links and edge-to-edge typography inside) */}
      <footer id="about" className="w-full bg-[#F3F4F6] border-t border-neutral-200/60 mt-12 pt-12 overflow-hidden scroll-mt-6">
        <motion.div
          initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-7xl mx-auto px-6 sm:px-12 lg:px-20 grid grid-cols-1 md:grid-cols-12 gap-8 items-start mb-0"
        >
          {/* Logo Column */}
          <div className="md:col-span-4 space-y-4">
            <div className="flex items-center gap-3">
              <Image
                src="/logo-black.png"
                alt="Aurwell Logo"
                width={130}
                height={36}
                className="h-7 sm:h-8 w-auto object-contain"
              />
              <Image
                src="/typo.png"
                alt="Aurwell Typography"
                width={120}
                height={32}
                className="h-5 sm:h-6 w-auto object-contain transform translate-y-[1px]"
              />
            </div>
          </div>

          {/* Product Column */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
              Product
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-neutral-500">
              <li>
                <Link href="#overview" className="hover:text-neutral-900 transition-colors">
                  Overview
                </Link>
              </li>
              <li>
                <Link href="#features" className="hover:text-neutral-900 transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="#how-it-works" className="hover:text-neutral-900 transition-colors">
                  How It Works
                </Link>
              </li>
            </ul>
          </div>

          {/* Company Column */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
              Company
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm text-neutral-500">
              <li>
                <Link href="/contact" className="hover:text-neutral-900 transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-neutral-900 transition-colors">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Follow Us Column */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
              Follow Us
            </h4>
            <div className="flex items-center gap-3">
              <a
                href="#"
                aria-label="Facebook"
                className="w-8 h-8 rounded-full border border-neutral-200 text-neutral-600 flex items-center justify-center hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
                </svg>
              </a>
              <a
                href="#"
                aria-label="Instagram"
                className="w-8 h-8 rounded-full border border-neutral-200 text-neutral-600 flex items-center justify-center hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
              >
                <svg className="w-4 h-4 fill-none stroke-current stroke-2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </a>
              <a
                href="#"
                aria-label="LinkedIn"
                className="w-8 h-8 rounded-full border border-neutral-200 text-neutral-600 flex items-center justify-center hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                  <rect x="2" y="9" width="4" height="12" />
                  <circle cx="4" cy="4" r="2" />
                </svg>
              </a>
            </div>
          </div>
        </motion.div>

        {/* Section-Width Typography Inside Footer Section (With Bottom Fade Gradient) */}
        <motion.div
          initial={{ opacity: 0, y: 40, filter: "blur(15px)" }}
          whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
          className="relative max-w-7xl mx-auto px-6 sm:px-12 lg:px-20 -mt-4 sm:-mt-6 lg:-mt-10 pb-2 sm:pb-4 overflow-hidden flex items-center justify-center select-none pointer-events-none"
        >
          <Image
            src="/typo-full.png"
            alt="Aurwell Typography Wordmark"
            width={1200}
            height={300}
            className="w-full h-auto object-contain object-center opacity-95 select-none"
            draggable={false}
          />
          {/* White linear gradient overlay causing typography to disappear at the bottom */}
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[#F3F4F6] via-[#F3F4F6]/75 to-transparent pointer-events-none" />
        </motion.div>

        <div className="max-w-7xl mx-auto px-6 sm:px-12 lg:px-20 py-6 border-t border-neutral-100 text-xs text-neutral-400">
          © 2026 Aurwell. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
