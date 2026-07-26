"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import MotionButton from "@/components/ui/motion-button";
import {
  ArrowRight,
  Check,
  Users,
  Gift,
  Send,
  BarChart3,
  Lock,
  Star,
  ChevronDown,
  LayoutDashboard,
  Tag,
  CreditCard,
  Settings,
  Sparkles,
} from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState("Membership");
  const [showSplash, setShowSplash] = useState(true);
  const [loadProgress, setLoadProgress] = useState(15);

  useEffect(() => {
    let outerInstance: any = null;
    let innerInstance: any = null;
    let isMounted = true;

    const preloadAsset = (src: string) =>
      new Promise<void>((resolve) => {
        const img = new window.Image();
        img.src = src;
        if (img.complete) {
          resolve();
        } else {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        }
      });

    const minSplashDuration = new Promise((resolve) => setTimeout(resolve, 1800));

    const loadAppResources = async () => {
      // Step 1: Preload high-res page imagery
      setLoadProgress(30);
      await Promise.all(["/hero-image.png", "/logo-black.png", "/typo.png", "/typo-full.png"].map(preloadAsset));
      if (!isMounted) return;
      setLoadProgress(65);

      // Step 2: Pre-initialize WebGL shaders and LiquidGlass background canvases
      try {
        const { LiquidGlass } = await import("@ybouane/liquidglass");
        const rootEl = document.getElementById("hero-glass-root");
        const outerEl = document.getElementById("outer-glass-track");
        const innerEl = document.getElementById("inner-glass-slider");

        if (rootEl && outerEl && isMounted) {
          outerInstance = await LiquidGlass.init({
            root: rootEl,
            glassElements: [outerEl],
          });
        }

        if (outerEl && innerEl && isMounted) {
          innerInstance = await LiquidGlass.init({
            root: outerEl,
            glassElements: [innerEl],
          });
        }
      } catch (err) {
        console.error("LiquidGlass pre-init error:", err);
      }
      if (!isMounted) return;
      setLoadProgress(88);

      // Step 3: Ensure custom typography & web fonts are ready
      if (typeof document !== "undefined" && document.fonts) {
        await document.fonts.ready;
      }
      if (!isMounted) return;
      setLoadProgress(100);

      // Step 4: Complete splash reveal after minimum smooth animation duration
      await minSplashDuration;
      if (!isMounted) return;

      setShowSplash(false);

      // Refresh WebGL canvases once landing page layout unveils
      setTimeout(() => {
        if (outerInstance && typeof outerInstance.markChanged === "function") outerInstance.markChanged();
        if (innerInstance && typeof innerInstance.markChanged === "function") innerInstance.markChanged();
      }, 400);
    };

    loadAppResources();

    return () => {
      isMounted = false;
      if (innerInstance && typeof innerInstance.destroy === "function") {
        innerInstance.destroy();
      }
      if (outerInstance && typeof outerInstance.destroy === "function") {
        outerInstance.destroy();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-neutral-900 font-sans selection:bg-neutral-900 selection:text-white">
      {/* Full-Screen Animated Flash / Splash Screen */}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            key="splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.04, filter: "blur(16px)" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-50 bg-[#F3F4F6] flex flex-col items-center justify-center overflow-hidden select-none"
          >
            {/* Ambient Background Glow Aura */}
            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 0.7, scale: 1.2 }}
              transition={{ duration: 1.8, ease: "easeOut" }}
              className="absolute w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-blue-200/40 via-purple-200/30 to-amber-200/30 blur-3xl pointer-events-none"
            />

            {/* Brand Logo & Typography Lockup */}
            <div className="relative z-10 flex items-center gap-4 sm:gap-6">
              {/* Logo Icon Reveal */}
              <motion.div
                initial={{ opacity: 0, scale: 0.75, filter: "blur(16px)", y: 12 }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)", y: 0 }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                className="relative"
              >
                <Image
                  src="/logo-black.png"
                  alt="Aurwell Logo"
                  width={160}
                  height={44}
                  className="h-12 sm:h-16 w-auto object-contain drop-shadow-sm"
                  priority
                />
              </motion.div>

              {/* Vertical Shimmer Divider */}
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "40px", opacity: 0.3 }}
                transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
                className="w-[1.5px] bg-neutral-900 rounded-full"
              />

              {/* Typography Wordmark Reveal */}
              <motion.div
                initial={{ opacity: 0, x: -18, filter: "blur(12px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              >
                <Image
                  src="/typo.png"
                  alt="Aurwell Typography"
                  width={180}
                  height={48}
                  className="h-9 sm:h-12 w-auto object-contain transform translate-y-[2px]"
                  priority
                />
              </motion.div>
            </div>

            {/* Dynamic Asset Loading Progress Bar */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="absolute bottom-16 flex flex-col items-center"
            >
              <div className="w-40 sm:w-48 h-[3px] bg-neutral-200/80 rounded-full overflow-hidden p-[0.5px]">
                <motion.div
                  initial={{ width: "15%" }}
                  animate={{ width: `${loadProgress}%` }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="h-full bg-neutral-900 rounded-full shadow-sm"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Container (Centered in middle) */}
      <div className="max-w-6xl mx-auto px-6 sm:px-10">
        {/* Header / Navbar */}
        <motion.header
          initial={{ opacity: 0, y: -20, filter: "blur(10px)" }}
          animate={!showSplash ? { opacity: 1, y: 0, filter: "blur(0px)" } : { opacity: 0, y: -20, filter: "blur(10px)" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="py-5 flex items-center justify-between gap-4"
        >
          {/* Left Group: Logo and Nav Links */}
          <div className="flex items-center gap-8 lg:gap-12">
            <Link href="/" className="flex items-center gap-3 flex-shrink-0">
              <Image
                src="/logo-black.png"
                alt="Aurwell Logo"
                width={140}
                height={36}
                className="h-8 sm:h-9 w-auto object-contain select-none"
                draggable={false}
                priority
              />
              <Image
                src="/typo.png"
                alt="Aurwell Typography Wordmark"
                width={120}
                height={32}
                className="h-5 sm:h-6 w-auto object-contain select-none transform translate-y-[1px]"
                draggable={false}
                priority
              />
            </Link>

            <nav className="hidden md:flex items-center gap-1.5 lg:gap-3 text-xs sm:text-sm font-semibold text-neutral-700">
              <Link
                href="#overview"
                className="bg-neutral-100 text-neutral-900 px-3.5 py-1.5 rounded-full font-semibold hover:bg-neutral-200/80 transition-colors"
              >
                Overview
              </Link>
              <Link
                href="#features"
                className="text-neutral-600 hover:text-neutral-900 px-3.5 py-1.5 rounded-full hover:bg-neutral-50 transition-all"
              >
                Features
              </Link>
              <Link
                href="#pricing"
                className="text-neutral-600 hover:text-neutral-900 px-3.5 py-1.5 rounded-full hover:bg-neutral-50 transition-all"
              >
                Pricing
              </Link>
              <Link
                href="#about"
                className="text-neutral-600 hover:text-neutral-900 px-3.5 py-1.5 rounded-full hover:bg-neutral-50 transition-all"
              >
                About
              </Link>
            </nav>
          </div>

          {/* Right Group: Action Buttons (Login & Build app) */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-shrink-0">
            <Link
              href="/admin/login"
              className="bg-neutral-100 hover:bg-neutral-200/80 text-neutral-900 font-semibold px-4 py-2 rounded-full text-xs sm:text-sm transition-all"
            >
              Login
            </Link>
            <Link
              href="/admin/signup"
              className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold px-4.5 py-2 rounded-full text-xs sm:text-sm shadow-sm transition-all flex items-center gap-1.5"
            >
              <span>Build app</span>
            </Link>
          </div>
        </motion.header>
      </div>

      {/* Hero Section Container (Reduced padding, closer to screen edges) */}
      <div className="w-full max-w-[1640px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <section id="overview" className="py-4 lg:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center">
            {/* Left Content Column (Moved slightly to the right) */}
            <div className="lg:col-span-4 space-y-6 pl-4 sm:pl-8 lg:pl-12">
              <motion.h1
                initial={{ opacity: 0, y: 30, filter: "blur(12px)" }}
                animate={!showSplash ? { opacity: 1, y: 0, filter: "blur(0px)" } : { opacity: 0, y: 30, filter: "blur(12px)" }}
                transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="text-3xl sm:text-4xl lg:text-[42px] font-bold text-neutral-900 tracking-tight leading-[1.15]"
              >
                Loyalty That Keeps Clients Coming Back
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 25, filter: "blur(10px)" }}
                animate={!showSplash ? { opacity: 1, y: 0, filter: "blur(0px)" } : { opacity: 0, y: 25, filter: "blur(10px)" }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="text-neutral-600 text-sm sm:text-base leading-relaxed max-w-sm font-normal"
              >
                Create memorable client experiences with rewards, personalized offers, and automated engagement—all from one platform.
              </motion.p>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
                animate={!showSplash ? { opacity: 1, y: 0, filter: "blur(0px)" } : { opacity: 0, y: 20, filter: "blur(8px)" }}
                transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-wrap items-center gap-3 pt-2"
              >
                <Link
                  href="/admin/signup"
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

            {/* Right Visual Hero Container (Majority ~67% width, Exact Proportions) */}
            <motion.div
              initial={{ opacity: 0, y: 35, filter: "blur(12px)" }}
              animate={!showSplash ? { opacity: 1, y: 0, filter: "blur(0px)" } : { opacity: 0, y: 35, filter: "blur(12px)" }}
              transition={{ duration: 0.9, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="lg:col-span-8"
            >
              <div id="hero-glass-root" className="relative w-full h-[520px] sm:h-[600px] lg:h-[650px] rounded-[44px] overflow-hidden flex items-center justify-center p-4 sm:p-6 lg:p-8">
                {/* Background Hero Gradient Image (NON-DRAGGABLE, NO SHADOW) */}
                <Image
                  src="/hero-image.png"
                  alt="Gradient Hero Background"
                  fill
                  className="object-cover pointer-events-none select-none"
                  draggable={false}
                  priority
                />

                {/* "Try demo!" handwritten text with curved arch arrow pointing to the slider */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, filter: "blur(6px)" }}
                  animate={!showSplash ? { opacity: 1, scale: 1, filter: "blur(0px)" } : { opacity: 0, scale: 0.8, filter: "blur(6px)" }}
                  transition={{ duration: 0.7, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute top-10 sm:top-14 left-6 sm:left-12 z-30 flex flex-col items-start select-none pointer-events-none"
                >
                  <span
                    className="text-neutral-900 text-lg sm:text-xl font-bold italic transform -rotate-12 translate-x-1"
                    style={{ fontFamily: "'Caveat', 'Comic Sans MS', cursive, sans-serif" }}
                  >
                    Try demo!
                  </span>
                  {/* Curved Arch Arrow */}
                  <svg
                    className="w-12 h-10 text-neutral-900 -mt-1 ml-6 transform rotate-12"
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

                {/* Remade WebGL Liquid Glass Demo Slider (Outer Rectangle Track + Animated Frosted Inner Square) */}
                <div
                  id="outer-glass-track"
                  className="absolute left-6 sm:left-12 lg:left-16 top-28 sm:top-32 z-20 flex flex-col items-center p-2 rounded-[36px] w-[100px] sm:w-[110px] gap-1.5 cursor-pointer select-none border border-white/30 shadow-[0_8px_25px_rgba(0,0,0,0.05)] text-white"
                  data-config={JSON.stringify({
                    blurAmount: 0.15,
                    refraction: 0.75,
                    chromAberration: 0.15,
                    edgeHighlight: 0.2,
                    specular: 0.15,
                    fresnel: 1,
                    cornerRadius: 36,
                    zRadius: 14,
                    brightness: -0.02,
                    shadowOpacity: 0.1,
                    floating: true,
                  })}
                >
                  {/* High Frosted Animated Inner Glass Square (Slides onto clicked button) */}
                  <div
                    id="inner-glass-slider"
                    className="absolute left-2 right-2 aspect-square rounded-[28px] transition-transform duration-300 ease-out pointer-events-none z-10 border border-white/50 shadow-[0_4px_12px_rgba(0,0,0,0.04)]"
                    style={{
                      transform: `translateY(calc(${activeTab === "Membership" ? 0 : activeTab === "Rewards" ? 1 : 2
                        } * (100% + 6px)))`,
                    }}
                    data-config={JSON.stringify({
                      blurAmount: 0.22, // Frosted translucent liquid without turning white/opaque!
                      refraction: 0.75,
                      chromAberration: 0.1,
                      edgeHighlight: 0.2,
                      specular: 0.15,
                      fresnel: 1,
                      cornerRadius: 28,
                      zRadius: 10,
                      brightness: -0.04, // Neutral/translucent instead of white/opaque
                      shadowOpacity: 0.06,
                    })}
                  />

                  {/* Slider Item 1: Membership (Square, No separate box for icon) */}
                  <div
                    onClick={() => setActiveTab("Membership")}
                    className="w-full aspect-square flex flex-col items-center justify-center gap-1 rounded-[28px] relative z-20 cursor-pointer group select-none py-1"
                  >
                    <Lock
                      className={`w-5 h-5 sm:w-6 sm:h-6 transition-all duration-300 ${activeTab === "Membership"
                        ? "text-white scale-110 drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
                        : "text-white/75 group-hover:text-white group-hover:scale-105"
                        }`}
                    />
                    <span
                      className={`font-semibold text-[11px] sm:text-xs tracking-tight transition-all duration-300 ${activeTab === "Membership"
                        ? "text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]"
                        : "text-white/80 group-hover:text-white"
                        }`}
                    >
                      Membership
                    </span>
                  </div>

                  {/* Slider Item 2: Rewards (Square, No separate box for icon) */}
                  <div
                    onClick={() => setActiveTab("Rewards")}
                    className="w-full aspect-square flex flex-col items-center justify-center gap-1 rounded-[28px] relative z-20 cursor-pointer group select-none py-1"
                  >
                    <Gift
                      className={`w-5 h-5 sm:w-6 sm:h-6 transition-all duration-300 ${activeTab === "Rewards"
                        ? "text-white scale-110 drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
                        : "text-white/75 group-hover:text-white group-hover:scale-105"
                        }`}
                    />
                    <span
                      className={`font-semibold text-[11px] sm:text-xs tracking-tight transition-all duration-300 ${activeTab === "Rewards"
                        ? "text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]"
                        : "text-white/80 group-hover:text-white"
                        }`}
                    >
                      Rewards
                    </span>
                  </div>

                  {/* Slider Item 3: Smart Deals (Square, No separate box for icon) */}
                  <div
                    onClick={() => setActiveTab("Smart Deals")}
                    className="w-full aspect-square flex flex-col items-center justify-center gap-1 rounded-[28px] relative z-20 cursor-pointer group select-none py-1"
                  >
                    <Star
                      className={`w-5 h-5 sm:w-6 sm:h-6 transition-all duration-300 ${activeTab === "Smart Deals"
                        ? "text-white scale-110 drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
                        : "text-white/75 group-hover:text-white group-hover:scale-105"
                        }`}
                    />
                    <span
                      className={`font-semibold text-[11px] sm:text-xs tracking-tight transition-all duration-300 ${activeTab === "Smart Deals"
                        ? "text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.6)]"
                        : "text-white/80 group-hover:text-white"
                        }`}
                    >
                      Smart Deals
                    </span>
                  </div>
                </div>

                {/* Mobile Phone Mockup Frame (Centered in the middle of hero image, Exact 2532 x 1170 px aspect ratio) */}
                <div
                  className="relative z-10 mx-auto h-[460px] sm:h-[550px] lg:h-[590px] bg-white rounded-[46px] shadow-[0_30px_80px_-15px_rgba(0,0,0,0.35)] border-[8px] border-white flex flex-col items-center justify-center overflow-hidden select-none"
                  style={{ aspectRatio: "1170 / 2532" }}
                >
                  {/* Side button detail */}
                  <div className="absolute -right-[11px] top-32 w-[3px] h-16 bg-neutral-200 rounded-r-md" />

                  {/* Screen Container with Dynamic Interactive Content */}
                  <div className="w-full h-full bg-white rounded-[38px] flex flex-col items-center justify-center border border-neutral-100 relative overflow-hidden p-4">
                    {/* Background Grid Pattern */}
                    <div
                      className="absolute inset-0 opacity-30"
                      style={{
                        backgroundImage: `linear-gradient(#d1d5db 1px, transparent 1px), linear-gradient(90deg, #d1d5db 1px, transparent 1px)`,
                        backgroundSize: "32px 32px",
                      }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </div>

      {/* Remaining Sections Container (Centered with normal padding) */}
      <div className="max-w-7xl mx-auto px-6 sm:px-12 lg:px-20">
        {/* Built for Growth Section */}
        <section id="features" className="py-12">
          <div className="bg-white/60 rounded-[36px] p-8 sm:p-14 border border-white/60 shadow-sm">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 25, filter: "blur(10px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="text-center space-y-2 mb-12"
            >
              <span className="text-neutral-600 text-xs sm:text-sm font-bold uppercase tracking-wider">
                Built for Growth
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-neutral-900 max-w-2xl mx-auto tracking-tight">
                Everything You Need to Build Stronger Relationships
              </h2>
            </motion.div>

            {/* Feature Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Card 1 */}
              <motion.div
                initial={{ opacity: 0, y: 30, filter: "blur(12px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-100 hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 rounded-xl bg-neutral-100 text-neutral-900 flex items-center justify-center mb-4">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-neutral-900 mb-2">
                  Boost Retention
                </h3>
                <p className="text-neutral-500 text-xs sm:text-sm leading-relaxed">
                  Turn one-time visits into lasting relationships with loyalty programs that work.
                </p>
              </motion.div>

              {/* Card 2 */}
              <motion.div
                initial={{ opacity: 0, y: 30, filter: "blur(12px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-100 hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 rounded-xl bg-neutral-100 text-neutral-900 flex items-center justify-center mb-4">
                  <Gift className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-neutral-900 mb-2">
                  Reward What Matters
                </h3>
                <p className="text-neutral-500 text-xs sm:text-sm leading-relaxed">
                  Create points, tiers, and rewards that motivate your clients to engage more.
                </p>
              </motion.div>

              {/* Card 3 */}
              <motion.div
                initial={{ opacity: 0, y: 30, filter: "blur(12px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-100 hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 rounded-xl bg-neutral-100 text-neutral-900 flex items-center justify-center mb-4">
                  <Send className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-neutral-900 mb-2">
                  Smart Automation
                </h3>
                <p className="text-neutral-500 text-xs sm:text-sm leading-relaxed">
                  Automate offers and reminders so you can focus on what you do best.
                </p>
              </motion.div>

              {/* Card 4 */}
              <motion.div
                initial={{ opacity: 0, y: 30, filter: "blur(12px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.7, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="bg-white rounded-2xl p-6 shadow-sm border border-neutral-100 hover:shadow-md transition-shadow"
              >
                <div className="w-12 h-12 rounded-xl bg-neutral-100 text-neutral-900 flex items-center justify-center mb-4">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold text-neutral-900 mb-2">
                  Track & Grow
                </h3>
                <p className="text-neutral-500 text-xs sm:text-sm leading-relaxed">
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

              {/* Right Column: Dashboard + Mobile App Showcase */}
              <motion.div
                initial={{ opacity: 0, x: 30, filter: "blur(12px)" }}
                whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="lg:col-span-7 relative flex justify-center items-center py-6 min-h-[380px]"
              >
                {/* Desktop Dashboard Preview Card */}
                <div className="w-full bg-white rounded-2xl shadow-xl border border-neutral-200/80 p-4 sm:p-5 space-y-4">
                  {/* Dashboard Header */}
                  <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Image
                        src="/logo-black.png"
                        alt="Aurwell"
                        width={90}
                        height={24}
                        className="h-5 w-auto"
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <div className="text-xs font-bold text-neutral-800">
                          Welcome back, Clinic!
                        </div>
                        <div className="text-[10px] text-neutral-400">
                          Here's what's happening today.
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-neutral-600 bg-neutral-100 px-2.5 py-1 rounded-md border border-neutral-200">
                        <span>May 20 - May 26</span>
                        <ChevronDown className="w-3 h-3 text-neutral-400" />
                      </div>
                    </div>
                  </div>

                  {/* Main Dashboard Layout */}
                  <div className="grid grid-cols-12 gap-3">
                    {/* Side Nav mini */}
                    <div className="col-span-3 hidden sm:flex flex-col gap-1 text-[11px] border-r border-neutral-100 pr-2">
                      <div className="flex items-center gap-2 bg-neutral-900 text-white font-semibold px-2 py-1.5 rounded-lg">
                        <LayoutDashboard className="w-3.5 h-3.5" />
                        <span>Dashboard</span>
                      </div>
                      <div className="flex items-center gap-2 text-neutral-500 px-2 py-1.5 rounded-lg hover:bg-neutral-50">
                        <Users className="w-3.5 h-3.5" />
                        <span>Members</span>
                      </div>
                      <div className="flex items-center gap-2 text-neutral-500 px-2 py-1.5 rounded-lg hover:bg-neutral-50">
                        <Gift className="w-3.5 h-3.5" />
                        <span>Rewards</span>
                      </div>
                      <div className="flex items-center gap-2 text-neutral-500 px-2 py-1.5 rounded-lg hover:bg-neutral-50">
                        <Tag className="w-3.5 h-3.5" />
                        <span>Offers</span>
                      </div>
                      <div className="flex items-center gap-2 text-neutral-500 px-2 py-1.5 rounded-lg hover:bg-neutral-50">
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>Transactions</span>
                      </div>
                      <div className="flex items-center gap-2 text-neutral-500 px-2 py-1.5 rounded-lg hover:bg-neutral-50">
                        <BarChart3 className="w-3.5 h-3.5" />
                        <span>Analytics</span>
                      </div>
                      <div className="flex items-center gap-2 text-neutral-500 px-2 py-1.5 rounded-lg hover:bg-neutral-50">
                        <Settings className="w-3.5 h-3.5" />
                        <span>Settings</span>
                      </div>
                    </div>

                    {/* Stats & Charts */}
                    <div className="col-span-12 sm:col-span-9 space-y-3">
                      {/* Stat KPI Row */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-left">
                        <div className="bg-neutral-50/80 p-2.5 rounded-xl border border-neutral-100">
                          <div className="text-[10px] text-neutral-500">
                            Total Members
                          </div>
                          <div className="text-xs sm:text-sm font-bold text-neutral-900 mt-0.5">
                            1,250
                          </div>
                          <div className="text-[9px] font-semibold text-emerald-600 mt-0.5">
                            +12%
                          </div>
                        </div>
                        <div className="bg-neutral-50/80 p-2.5 rounded-xl border border-neutral-100">
                          <div className="text-[10px] text-neutral-500">
                            Active Members
                          </div>
                          <div className="text-xs sm:text-sm font-bold text-neutral-900 mt-0.5">
                            980
                          </div>
                          <div className="text-[9px] font-semibold text-emerald-600 mt-0.5">
                            +8%
                          </div>
                        </div>
                        <div className="bg-neutral-50/80 p-2.5 rounded-xl border border-neutral-100">
                          <div className="text-[10px] text-neutral-500">
                            Points Redeemed
                          </div>
                          <div className="text-xs sm:text-sm font-bold text-neutral-900 mt-0.5">
                            4,560
                          </div>
                          <div className="text-[9px] font-semibold text-emerald-600 mt-0.5">
                            +15%
                          </div>
                        </div>
                        <div className="bg-neutral-50/80 p-2.5 rounded-xl border border-neutral-100">
                          <div className="text-[10px] text-neutral-500">
                            Revenue Impact
                          </div>
                          <div className="text-xs sm:text-sm font-bold text-neutral-900 mt-0.5">
                            ₹2,45,000
                          </div>
                          <div className="text-[9px] font-semibold text-emerald-600 mt-0.5">
                            +18%
                          </div>
                        </div>
                      </div>

                      {/* Chart + Top Rewards */}
                      <div className="grid grid-cols-12 gap-3">
                        {/* Line Chart box */}
                        <div className="col-span-7 bg-neutral-50/60 p-3 rounded-xl border border-neutral-100">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-neutral-800">
                              Member Activity
                            </span>
                            <span className="text-[9px] text-neutral-500 bg-white px-1.5 py-0.5 rounded border border-neutral-200 flex items-center gap-0.5">
                              This Week <ChevronDown className="w-2.5 h-2.5" />
                            </span>
                          </div>
                          {/* SVG Wave Line */}
                          <div className="h-16 w-full flex items-end">
                            <svg
                              className="w-full h-full text-[#2563EB]"
                              viewBox="0 0 200 60"
                              fill="none"
                              preserveAspectRatio="none"
                            >
                              <path
                                d="M0,50 Q25,20 50,38 T100,25 T150,15 T200,35"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                              />
                            </svg>
                          </div>
                          <div className="flex justify-between text-[8px] text-neutral-400 mt-1">
                            <span>Mon</span>
                            <span>Tue</span>
                            <span>Wed</span>
                            <span>Thu</span>
                            <span>Fri</span>
                            <span>Sat</span>
                            <span>Sun</span>
                          </div>
                        </div>

                        {/* Top Rewards box */}
                        <div className="col-span-5 bg-neutral-50/60 p-3 rounded-xl border border-neutral-100 space-y-2">
                          <span className="text-[10px] font-bold text-neutral-800 block">
                            Top Rewards
                          </span>
                          <div className="space-y-1.5 text-[9px]">
                            <div className="flex items-center justify-between bg-white p-1 rounded border border-neutral-100">
                              <span className="font-semibold text-neutral-800">
                                HydraFacial
                              </span>
                              <span className="text-neutral-500">520</span>
                            </div>
                            <div className="flex items-center justify-between bg-white p-1 rounded border border-neutral-100">
                              <span className="font-semibold text-neutral-800">
                                Laser Session
                              </span>
                              <span className="text-neutral-500">410</span>
                            </div>
                            <div className="flex items-center justify-between bg-white p-1 rounded border border-neutral-100">
                              <span className="font-semibold text-neutral-800">
                                Skincare Kit
                              </span>
                              <span className="text-neutral-500">320</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Overlapping Mobile App Card (Positioned to the left bottom) */}
                <div className="absolute -left-3 sm:-left-6 bottom-2 w-44 sm:w-52 bg-white rounded-3xl shadow-2xl border-[5px] border-white p-3 space-y-2 z-20 hidden xs:block">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-neutral-900">
                      aurwell
                    </span>
                    <Sparkles className="w-3 h-3 text-amber-500" />
                  </div>
                  <div className="bg-gradient-to-r from-neutral-900 to-neutral-800 rounded-xl p-2.5 text-white space-y-1">
                    <div className="text-[9px] opacity-80">Hi, Ananya 👋</div>
                    <div className="text-[9px] font-medium">You have</div>
                    <div className="text-sm font-extrabold">1,250 <span className="text-[9px] font-normal">Points</span></div>
                    <div className="w-full bg-white/20 h-1 rounded-full mt-1.5 overflow-hidden">
                      <div className="w-3/4 h-full bg-amber-400 rounded-full" />
                    </div>
                    <div className="text-[8px] opacity-90 flex justify-between pt-0.5">
                      <span>Gold Member</span>
                      <span>1,250 / 2,000 pts</span>
                    </div>
                  </div>
                  <div className="space-y-1 pt-1">
                    <div className="text-[9px] font-bold text-neutral-800">
                      Available Rewards
                    </div>
                    <div className="bg-neutral-50 p-1.5 rounded-lg border border-neutral-100 flex items-center justify-between">
                      <div>
                        <div className="text-[9px] font-bold text-neutral-900">
                          HydraFacial
                        </div>
                        <div className="text-[8px] text-neutral-500">
                          1,500 pts
                        </div>
                      </div>
                      <div className="bg-neutral-900 text-white text-[8px] font-semibold px-2 py-0.5 rounded-md">
                        Redeem
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-12">
          <div className="relative rounded-[36px] bg-gradient-to-b from-white/40 via-white/60 to-white/80 p-8 sm:p-14 border border-white/60">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 25, filter: "blur(10px)" }}
              whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="text-center space-y-2 mb-12"
            >
              <span className="text-neutral-600 text-xs sm:text-sm font-bold uppercase tracking-wider">
                Simple Pricing
              </span>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-neutral-900 tracking-tight">
                Plans That Grow With You
              </h2>
            </motion.div>

            {/* Pricing Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch max-w-5xl mx-auto">
              {/* Starter Card */}
              <motion.div
                initial={{ opacity: 0, y: 35, filter: "blur(12px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div>
                  <h3 className="text-lg font-bold text-neutral-900">Starter</h3>
                  <p className="text-xs text-neutral-500 mt-1 min-h-[32px]">
                    Perfect for small clinics getting started.
                  </p>
                  <div className="mt-4 mb-6">
                    <span className="text-3xl font-extrabold text-neutral-900">
                      ₹2,999
                    </span>
                    <span className="text-xs text-neutral-500"> / month</span>
                  </div>
                  <ul className="space-y-3 text-xs sm:text-sm text-neutral-600">
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-neutral-900" />
                      <span>Up to 500 members</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-neutral-900" />
                      <span>Basic rewards</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-neutral-900" />
                      <span>Email support</span>
                    </li>
                  </ul>
                </div>
                <div className="mt-8">
                  <Link
                    href="/admin/signup"
                    className="w-full block text-center border border-neutral-300 hover:border-neutral-400 text-neutral-800 font-semibold py-2.5 rounded-full text-xs sm:text-sm transition-colors"
                  >
                    Get Started
                  </Link>
                </div>
              </motion.div>

              {/* Growth Card (Featured / Most Popular) */}
              <motion.div
                initial={{ opacity: 0, y: 35, filter: "blur(12px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-neutral-900 shadow-xl relative flex flex-col justify-between transform md:-translate-y-2"
              >
                {/* Most Popular Badge */}
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-[11px] font-bold px-4 py-1 rounded-full uppercase tracking-wider shadow-md">
                  Most Popular
                </div>

                <div>
                  <h3 className="text-lg font-bold text-neutral-900 mt-1">
                    Growth
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1 min-h-[32px]">
                    Ideal for growing clinics and salons.
                  </p>
                  <div className="mt-4 mb-6">
                    <span className="text-3xl font-extrabold text-neutral-900">
                      ₹5,999
                    </span>
                    <span className="text-xs text-neutral-500"> / month</span>
                  </div>
                  <ul className="space-y-3 text-xs sm:text-sm text-neutral-600">
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-neutral-900" />
                      <span>Up to 2,000 members</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-neutral-900" />
                      <span>Advanced rewards & tiers</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-neutral-900" />
                      <span>Automations & reminders</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-neutral-900" />
                      <span>Priority support</span>
                    </li>
                  </ul>
                </div>
                <div className="mt-8">
                  <Link
                    href="/admin/signup"
                    className="w-full block text-center bg-neutral-900 hover:bg-neutral-800 text-white font-semibold py-2.5 rounded-full text-xs sm:text-sm shadow-md transition-colors"
                  >
                    Get Started
                  </Link>
                </div>
              </motion.div>

              {/* Pro Card */}
              <motion.div
                initial={{ opacity: 0, y: 35, filter: "blur(12px)" }}
                whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="bg-white rounded-3xl p-6 sm:p-8 border border-neutral-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div>
                  <h3 className="text-lg font-bold text-neutral-900">Pro</h3>
                  <p className="text-xs text-neutral-500 mt-1 min-h-[32px]">
                    For large clinics with advanced needs.
                  </p>
                  <div className="mt-4 mb-6">
                    <span className="text-3xl font-extrabold text-neutral-900">
                      ₹9,999
                    </span>
                    <span className="text-xs text-neutral-500"> / month</span>
                  </div>
                  <ul className="space-y-3 text-xs sm:text-sm text-neutral-600">
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-neutral-900" />
                      <span>Unlimited members</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-neutral-900" />
                      <span>Custom rewards & offers</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-neutral-900" />
                      <span>Advanced analytics</span>
                    </li>
                    <li className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-neutral-900" />
                      <span>Dedicated account manager</span>
                    </li>
                  </ul>
                </div>
                <div className="mt-8">
                  <Link
                    href="/admin/signup"
                    className="w-full block text-center border border-neutral-300 hover:border-neutral-400 text-neutral-800 font-semibold py-2.5 rounded-full text-xs sm:text-sm transition-colors"
                  >
                    Get Started
                  </Link>
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
            className="bg-gradient-to-r from-[#1D4ED8] via-[#2563EB] to-[#06B6D4] text-white rounded-[32px] p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl"
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
                href="/admin/signup"
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
      <footer id="about" className="w-full bg-[#F3F4F6] border-t border-neutral-200/60 mt-12 pt-12 overflow-hidden">
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
                <Link href="#pricing" className="hover:text-neutral-900 transition-colors">
                  Pricing
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
                <Link href="#about" className="hover:text-neutral-900 transition-colors">
                  About Us
                </Link>
              </li>
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
              <li>
                <Link href="/terms" className="hover:text-neutral-900 transition-colors">
                  Terms of Service
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
          © 2024 Aurwell. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
