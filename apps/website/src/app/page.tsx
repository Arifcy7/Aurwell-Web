"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import MotionButton from "@/components/ui/motion-button";
import AppDemoPhone from "@/components/demo/AppDemoPhone";
import { useBookingModal } from "@/components/booking/BookingProvider";
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

const featureSections = [
  {
    id: "rewards",
    tag: "Rewards",
    title: "Turn every visit into lasting loyalty",
    description:
      "Design flexible reward tiers, automated points, and exclusive member perks that clients track and redeem right inside their app. Full visibility for your front desk, effortless delight for your patients.",
    buttonText: "See rewards program",
    image: "/Rewards.png",
    imageAlt: "Rewards and loyalty system",
    imageLeft: false,
  },
  {
    id: "booking",
    tag: "Booking system",
    title: "Frictionless booking for clients & practitioners",
    description:
      "Give patients an effortless scheduling experience that syncs in real time with your clinic calendars, treatment rooms, and staff shifts. Minimize no-shows with automated calendar reminders.",
    buttonText: "Explore booking flow",
    image: "/booking.png",
    imageAlt: "Clinic booking and appointment system",
    imageLeft: true,
  },
  {
    id: "app",
    tag: "App",
    title: "Your clinic's app, seamlessly synced",
    description:
      "Empower patients to book treatments, track reward points, and access memberships on demand—all synced directly to your clinic schedule.",
    buttonText: "Preview client app",
    image: "/app.png",
    imageAlt: "Your branded clinic mobile app",
    imageLeft: false,
  },
  {
    id: "retention",
    tag: "Boost retention",
    title: "Keep clients coming back on autopilot",
    description:
      "Turn first-time treatments into recurring monthly revenue with VIP memberships, automated re-booking prompts, and personalized offers that keep your calendar full year-round.",
    buttonText: "Discover retention tools",
    image: "/Retention.png",
    imageAlt: "Client loyalty and retention system",
    imageLeft: true,
  },
];

const homeFaqs = [
  {
    q: "How fast can my clinic app be launched?",
    a: "Your custom-branded mobile app is ready within 24 to 48 hours. We import your logo, brand colors, and treatment list automatically from your website, so you have zero technical setup to worry about.",
  },
  {
    q: "Does Aurwell replace or integrate with our existing EMR / booking software?",
    a: "Aurwell is built to integrate seamlessly with your existing EMR, calendar, and patient management systems. Every client appointment, reward redemption, and profile syncs in real time without creating double-booking headaches.",
  },
  {
    q: "How does the rewards and loyalty points system work?",
    a: "Clients automatically earn points on qualifying treatments, purchases, and re-bookings. You have full control in your admin portal to set points ratios, tiers (e.g. Silver, Gold, VIP), and unlockable perks.",
  },
  {
    q: "Can we configure custom memberships and monthly subscription plans?",
    a: "Yes! You can create recurring monthly membership clubs (e.g., monthly HydraFacial or Botox bank), custom gift cards, and exclusive tier benefits directly from the admin panel to generate reliable recurring revenue.",
  },
  {
    q: "What does the client experience look like on their phone?",
    a: "Clients download a native app completely branded with your clinic's name, icon, and colors. They can browse treatments, schedule appointments, track reward points, and receive personalized push notifications.",
  },
  {
    q: "How can I see a live demo of the app and admin portal?",
    a: "Click 'Schedule a Meeting' or 'Build App' to book a live 1-on-1 personalized walkthrough. Our product team will demonstrate both the client mobile app and the clinic admin portal tailored to your aesthetic practice.",
  },
];

const launchSteps = [
  {
    step: "01",
    title: "Bring your brand to life",
    description:
      "We automatically import your clinic's design, logo, colours and content from your existing website.",
  },
  {
    step: "02",
    title: "Make it yours",
    description:
      "Configure your app, set up memberships, rewards, offers and more from a simple admin portal.",
  },
  {
    step: "03",
    title: "Go live and grow",
    description:
      "Your app is ready in 24 hours. Start engaging clients, driving repeat visits and growing your revenue.",
  },
];

export default function Home() {
  const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || "https://admin.aurwell.app";
  const { openBookingModal } = useBookingModal();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
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
    { id: "emerald", name: "Olive Sage", hex: "#4a6035" },
    { id: "rose", name: "Blush Rose", hex: "#e11d48" },
    { id: "forest", name: "Forest Green", hex: "#15803d" },
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

  // Performance optimizations: IntersectionObserver for Admin Carousel & cached mouse tracking
  const adminSectionRef = useRef<HTMLDivElement>(null);
  const [isAdminVisible, setIsAdminVisible] = useState(false);
  const trackRectRef = useRef<DOMRect | null>(null);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    const el = adminSectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsAdminVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isPaused || !isAdminVisible) return;
    const timer = setInterval(() => {
      setStackIndex((prev) => (prev + 1) % adminImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [adminImages.length, isPaused, isAdminVisible]);

  const [clinicName, setClinicName] = useState("Luxe Aesthetics");
  const [selectedColor, setSelectedColor] = useState(colorOptions[1]);
  const [selectedCurrency, setSelectedCurrency] = useState(currencyOptions[0]);
  const [isColorMenuOpen, setIsColorMenuOpen] = useState(false);
  const [isCurrencyMenuOpen, setIsCurrencyMenuOpen] = useState(false);

  const updateSliderOffset = useCallback((clientX: number, clientY: number) => {
    if (!trackRectRef.current) {
      const trackEl = document.getElementById("outer-glass-track");
      if (trackEl) {
        trackRectRef.current = trackEl.getBoundingClientRect();
      } else {
        return;
      }
    }
    const trackRect = trackRectRef.current;

    // Stop slider floating when mouse is directly hovering over or near the track
    if (
      clientX >= trackRect.left - 6 &&
      clientX <= trackRect.right + 6 &&
      clientY >= trackRect.top - 6 &&
      clientY <= trackRect.bottom + 6
    ) {
      setSliderOffset({ x: 0, y: 0 });
      return;
    }

    const trackCenterX = trackRect.left + trackRect.width / 2;
    const trackCenterY = trackRect.top + trackRect.height / 2;

    const dx = clientX - trackCenterX;
    const dy = clientY - trackCenterY;
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
  }, []);

  const handleHeroMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY } = e;
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }
    rafIdRef.current = requestAnimationFrame(() => {
      updateSliderOffset(clientX, clientY);
      rafIdRef.current = null;
    });
  };

  const handleHeroMouseLeave = () => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    trackRectRef.current = null;
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
            exit={{ opacity: 0, scale: 1.03 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-50 bg-[#F3F4F6] flex flex-col items-center justify-center overflow-hidden select-none px-4"
          >
            {/* Ambient Background Glow Aura */}
            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 0.7, scale: 1.2 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="absolute w-[260px] h-[260px] sm:w-[500px] sm:h-[500px] rounded-full bg-gradient-to-tr from-emerald-200/40 via-teal-200/30 to-amber-200/30 blur-2xl sm:blur-3xl pointer-events-none"
            />

            {/* Brand Logo & Typography Lockup */}
            <div className="relative z-10 flex items-center gap-2.5 sm:gap-6">
              {/* Logo Icon Reveal */}
              <motion.div
                initial={{ opacity: 0, scale: 0.75, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
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
                initial={{ opacity: 0, x: -18 }}
                animate={{ opacity: 1, x: 0 }}
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
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
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
                    <Link
                      href="#faq"
                      className="hover:text-neutral-600 transition-colors"
                    >
                      FAQ
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
                  <button
                    onClick={openBookingModal}
                    className="bg-neutral-900 hover:bg-neutral-800 text-white font-semibold px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-full text-[11px] sm:text-xs shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <span>Build app</span>
                  </button>
                </div>
              </motion.header>

              {/* Center Group: Hero Heading, Subheading & CTAs */}
              <div className="my-auto py-6 sm:py-10 space-y-5 max-w-md">
                <motion.h1
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                  className="text-3xl sm:text-4xl lg:text-[40px] font-extrabold text-neutral-900 tracking-tight leading-[1.14]"
                >
                  Loyalty That Keeps Clients Coming Back
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0, y: 25 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="text-neutral-600 text-sm sm:text-base leading-relaxed font-normal"
                >
                  Create memorable client experiences with rewards, personalized offers, and automated engagement—all from one platform.
                </motion.p>

                {/* Action Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-wrap items-center gap-3 pt-2"
                >
                  <button
                    onClick={openBookingModal}
                    className="px-5 py-2.5 rounded-full border border-neutral-900 bg-white text-neutral-900 text-xs sm:text-sm font-semibold hover:bg-neutral-50 transition-colors shadow-sm cursor-pointer"
                  >
                    Schedule a Meeting
                  </button>
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
              initial={{ opacity: 0, y: 35 }}
              animate={{ opacity: 1, y: 0 }}
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
                    src="/green-hero-image.png"
                    alt="Gradient Hero Background"
                    fill
                    sizes="(max-width: 1024px) 100vw, 67vw"
                    decoding="async"
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
                        initial={{ opacity: 0, scale: 0.7, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
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
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{
                          opacity: 1,
                          scale: 1,
                          x: sliderOffset.x,
                          y: sliderOffset.y,
                        }}
                        transition={{
                          opacity: { duration: 0.8, delay: 0.95, ease: [0.16, 1, 0.3, 1] },
                          scale: { duration: 0.8, delay: 0.95, ease: [0.16, 1, 0.3, 1] },
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
                          className={`absolute rounded-[20px] sm:rounded-[24px] pointer-events-none z-10 bg-[#242426] shadow-[0_4px_14px_rgba(0,0,0,0.15)] ${isMobile
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

                    {/* Center: Mobile Phone Mockup Frame (Ultra-Thin iPhone Bezel & Titanium Edge) */}
                    <div
                      className="relative z-10 h-[570px] xs:h-[610px] sm:h-[620px] lg:h-[610px] flex flex-col items-center justify-center select-none flex-shrink-0"
                      style={{ aspectRatio: "1170 / 2532" }}
                    >
                      {/* Hardware Buttons (Outside the clipped bezel) */}
                      {/* Left: Action Button & Volume Buttons */}
                      <div className="absolute -left-[3px] top-24 w-[3px] h-6 bg-[#2a2b30] rounded-l-xs pointer-events-none" />
                      <div className="absolute -left-[3px] top-34 w-[3px] h-11 bg-[#2a2b30] rounded-l-xs pointer-events-none" />
                      <div className="absolute -left-[3px] top-48 w-[3px] h-11 bg-[#2a2b30] rounded-l-xs pointer-events-none" />

                      {/* Right: Power / Side Button */}
                      <div className="absolute -right-[3px] top-30 w-[3px] h-14 bg-[#2a2b30] rounded-r-xs pointer-events-none" />

                      {/* Ultra-Thin iPhone Bezel Frame with strict overflow clip */}
                      <div className="w-full h-full bg-[#0a0a0c] p-[3px] sm:p-[4px] rounded-[40px] sm:rounded-[44px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35),0_10px_25px_-8px_rgba(0,0,0,0.25)] ring-1 ring-white/10 border-[2px] border-[#2a2b30] overflow-hidden flex flex-col">
                        {/* Screen Container with Dynamic Content */}
                        <div className="w-full h-full bg-white rounded-[36px] sm:rounded-[40px] relative overflow-hidden isolate ring-1 ring-black/30">
                          <AppDemoPhone
                            activeTab={activeTab === "Configure" ? previousTab : activeTab}
                            clinicName={clinicName}
                            brandColor={selectedColor.hex}
                            currency={selectedCurrency}
                            onSelectTab={(tab) => handleTabClick(tab)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Desktop App Configurator Card (lg only - exact original desktop layout & animation) */}
                    <AnimatePresence>
                      {activeTab === "Configure" && (
                        <motion.div
                          key="configure-card-desktop"
                          initial={{ opacity: 0, scale: 0.92, x: -20 }}
                          animate={{
                            opacity: 1,
                            scale: 1,
                            x: 0,
                          }}
                          exit={{ opacity: 0, scale: 0.92, x: -20 }}
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
                                      className={`flex items-center justify-between px-3 py-1.5 rounded-full cursor-pointer transition-colors ${selectedColor.id === color.id
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
                                      className={`flex items-center justify-between px-3 py-1.5 rounded-full cursor-pointer transition-colors ${selectedCurrency.code === curr.code
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
                            <button
                              onClick={openBookingModal}
                              className="w-full py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold transition-all shadow-xs flex items-center justify-center text-center cursor-pointer"
                            >
                              Build my app
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Mobile App Configurator Overlay Card (< lg only) */}
                    <AnimatePresence>
                      {activeTab === "Configure" && (
                        <motion.div
                          key="configure-card-mobile"
                          initial={{ opacity: 0, scale: 0.92, y: -10 }}
                          animate={{
                            opacity: 1,
                            scale: 1,
                            y: 0,
                          }}
                          exit={{ opacity: 0, scale: 0.92, y: -10 }}
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
                                      className={`flex items-center justify-between px-2.5 py-1 rounded-full cursor-pointer transition-colors ${selectedColor.id === color.id
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
                                      className={`flex items-center justify-between px-2.5 py-1 rounded-full cursor-pointer transition-colors ${selectedCurrency.code === curr.code
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
        <section id="features" className="py-10 sm:py-16 lg:py-24 scroll-mt-6">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="text-center space-y-2 sm:space-y-3 mb-12 sm:mb-20 lg:mb-28"
          >
            <span className="text-neutral-600 text-xs sm:text-sm font-bold uppercase tracking-wider">
              Built for Growth
            </span>
            <h2 className="text-2xl sm:text-4xl lg:text-[44px] font-extrabold text-neutral-900 max-w-3xl mx-auto tracking-tight leading-tight">
              Everything You Need to Build Stronger Relationships
            </h2>
            <p className="text-neutral-500 text-xs sm:text-base max-w-xl mx-auto font-normal">
              A modern loyalty and clinic management suite crafted to elevate client satisfaction and recurring revenue.
            </p>
          </motion.div>

          {/* 4 Alternating Minimal Feature Sections (All-around soft shadow, responsive mobile sizing) */}
          <div className="space-y-16 sm:space-y-24 lg:space-y-32">
            {featureSections.map((feature) => (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, y: 35 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: isMobile ? 0.25 : 0.55 }}
                transition={{ duration: 0.8, delay: isMobile ? 0.05 : 0.15, ease: [0.16, 1, 0.3, 1] }}
                className={`flex flex-col ${
                  feature.imageLeft ? "lg:flex-row-reverse" : "lg:flex-row"
                } items-center justify-between gap-8 sm:gap-12 lg:gap-16 transform-gpu`}
              >
                {/* Text Content Column */}
                <div className="w-full lg:w-1/2 space-y-3.5 sm:space-y-5 text-left">
                  <span className="text-xs sm:text-sm font-bold uppercase tracking-widest text-neutral-500">
                    {feature.tag}
                  </span>
                  <h3 className="text-2xl sm:text-3xl lg:text-[40px] font-bold text-neutral-900 tracking-tight leading-[1.15]">
                    {feature.title}
                  </h3>
                  <p className="text-neutral-600 text-xs sm:text-sm lg:text-base leading-relaxed max-w-lg font-normal">
                    {feature.description}
                  </p>
                  <div className="pt-2">
                    <button
                      onClick={openBookingModal}
                      className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full border border-neutral-300 text-xs sm:text-sm font-semibold text-neutral-800 bg-white hover:border-neutral-900 hover:text-neutral-950 hover:bg-neutral-50 transition-all duration-200 cursor-pointer shadow-2xs group/btn"
                    >
                      <span>{feature.buttonText}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-neutral-500 group-hover/btn:text-neutral-950 group-hover/btn:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>

                {/* Image Column with High-Performance Progressive Edge Blur (Zero Backdrop-Filter GPU Overhead) */}
                <div className="w-full lg:w-1/2 flex items-center justify-center p-2 sm:p-5">
                  <div className="relative w-full aspect-square max-w-[340px] xs:max-w-[400px] sm:max-w-[460px] lg:max-w-[540px] rounded-[28px] sm:rounded-[36px] overflow-hidden bg-[#F5F5F7]">
                    {/* Background Blurred Base Layer (Optical Edge Blur) */}
                    <div className="absolute inset-0 overflow-hidden select-none pointer-events-none">
                      <Image
                        src={feature.image}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 540px"
                        quality={50}
                        className="object-cover scale-105 filter blur-xl opacity-90 select-none pointer-events-none"
                        draggable={false}
                      />
                    </div>

                    {/* Foreground Sharp Image with 4-Sided Feathered Perimeter Mask */}
                    <div
                      className="relative w-full h-full rounded-[28px] sm:rounded-[36px] overflow-hidden"
                      style={{
                        maskImage:
                          "radial-gradient(ellipse at center, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 94%)",
                        WebkitMaskImage:
                          "radial-gradient(ellipse at center, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 94%)",
                      }}
                    >
                      <Image
                        src={feature.image}
                        alt={feature.imageAlt}
                        fill
                        sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 540px"
                        quality={85}
                        decoding="async"
                        className="object-cover select-none pointer-events-none"
                        draggable={false}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* All-in-One Platform Section */}
        <section className="py-12">
          <div className="bg-white/60 rounded-[36px] p-8 sm:p-14 border border-white/60 shadow-sm overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
              {/* Left Column */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
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
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="lg:col-span-7 relative flex flex-col items-center justify-center -mt-4 lg:-mt-8 pb-2 w-full"
              >
                {/* Vertically Stacked Cards Container (Zoom disabled for now) */}
                <div
                  ref={adminSectionRef}
                  className="relative w-full h-[280px] sm:h-[380px] md:h-[430px] flex items-center justify-center select-none"
                >
                  {adminImages.map((src, idx) => {
                    // Calculate position relative to active stack index (0 = front top, 1 = middle, 2 = back)
                    const position = (idx - stackIndex + adminImages.length) % adminImages.length;

                    // Vertical Y offsets, reduced transparency, and gradual depth blur (increased offset)
                    const yOffset = position === 0 ? 30 : position === 1 ? 15 : 0;
                    const scale = position === 0 ? 1 : position === 1 ? 0.96 : 0.92;
                    const opacity = position === 0 ? 1 : position === 1 ? 0.94 : 0.85;
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
                          loading="lazy"
                          decoding="async"
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
        <section id="how-it-works" className="py-12 sm:py-20 lg:py-24 scroll-mt-6">
          <div className="relative max-w-6xl mx-auto">
            {/* Header matching reference design */}
            <motion.div
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: isMobile ? 0.25 : 0.5 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="text-center space-y-2.5 sm:space-y-3 mb-14 sm:mb-18 lg:mb-20"
            >
              <span className="text-[#9E8265] text-xs sm:text-sm font-bold uppercase tracking-[0.2em]">
                HOW IT WORKS
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-neutral-900 tracking-tight leading-tight">
                Launch Your App in <span className="text-[#476332]">3 Steps</span>
              </h2>
              <p className="text-neutral-500 text-xs sm:text-base max-w-lg mx-auto font-normal">
                From your website to a live client application in just 24 hours.
              </p>
            </motion.div>

            {/* 3 Step Cards Grid with one-by-one stagger animation */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: isMobile ? 0.25 : 0.55 }}
              variants={{
                hidden: {},
                visible: {
                  transition: {
                    staggerChildren: 0.32,
                    delayChildren: 0.15,
                  },
                },
              }}
              className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8 lg:gap-12 text-center"
            >
              {launchSteps.map((item) => (
                <motion.div
                  key={item.step}
                  variants={{
                    hidden: { opacity: 0, y: 35, scale: 0.95 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      scale: 1,
                      transition: {
                        duration: 0.7,
                        ease: [0.22, 1, 0.36, 1],
                      },
                    },
                  }}
                  className="flex flex-col items-center text-center group cursor-default"
                >
                  {/* Circle Number Badge */}
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-[#EEF4E8] group-hover:bg-[#E3EEDC] group-hover:scale-105 transition-all duration-300 flex items-center justify-center mb-4 text-[#476332] font-semibold text-xs sm:text-sm tracking-wide shadow-[0_2px_8px_rgba(71,99,50,0.06)]">
                    {item.step}
                  </div>

                  {/* Step Title */}
                  <h3 className="text-lg sm:text-xl font-bold text-neutral-900 tracking-tight mb-2.5 group-hover:text-[#476332] transition-colors duration-300">
                    {item.title}
                  </h3>

                  {/* Step Description */}
                  <p className="text-neutral-500 text-xs sm:text-sm leading-relaxed max-w-[270px] sm:max-w-[300px] mx-auto font-normal">
                    {item.description}
                  </p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* FAQ Section (Just Above the Footer) */}
        <section id="faq" className="py-12 sm:py-20 lg:py-24 scroll-mt-6">
          <div className="max-w-3xl mx-auto space-y-10 sm:space-y-14">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: isMobile ? 0.25 : 0.5 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="text-center space-y-2 sm:space-y-3"
            >
              <span className="text-neutral-600 text-xs sm:text-sm font-bold uppercase tracking-wider">
                Common Questions
              </span>
              <h2 className="text-2xl sm:text-4xl lg:text-[42px] font-extrabold text-neutral-900 tracking-tight leading-tight">
                Frequently Asked Questions
              </h2>
              <p className="text-neutral-500 text-xs sm:text-base max-w-lg mx-auto font-normal">
                Everything you need to know about building your clinic&apos;s custom mobile app, loyalty programs, and patient retention.
              </p>
            </motion.div>

            {/* Accordion Cards List */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: isMobile ? 0.2 : 0.4 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-3 sm:space-y-4"
            >
              {homeFaqs.map((faq, idx) => {
                const isOpen = openFaqIndex === idx;
                return (
                  <div
                    key={idx}
                    className={`rounded-2xl sm:rounded-3xl border transition-all duration-300 overflow-hidden ${
                      isOpen
                        ? "bg-white border-neutral-300 shadow-md"
                        : "bg-white/70 hover:bg-white border-neutral-200/80 hover:border-neutral-300 shadow-2xs"
                    }`}
                  >
                    <button
                      onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                      className="w-full px-5 sm:px-7 py-4 sm:py-5 flex items-center justify-between text-left gap-4 cursor-pointer select-none transition-colors"
                    >
                      <span className="text-sm sm:text-base font-bold text-neutral-900 leading-snug">
                        {faq.q}
                      </span>
                      <div
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                          isOpen
                            ? "bg-neutral-900 text-white rotate-180"
                            : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                        }`}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          key="content"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 sm:px-7 pb-5 sm:pb-6 text-xs sm:text-sm text-neutral-600 leading-relaxed font-normal border-t border-neutral-100 pt-3">
                            {faq.a}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </motion.div>

            {/* Still have questions? Help strip */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6 }}
              className="text-center pt-2"
            >
              <div className="inline-flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 p-4 sm:p-5 rounded-2xl sm:rounded-full bg-neutral-100/70 border border-neutral-200/80 text-xs sm:text-sm text-neutral-600 max-w-xl mx-auto">
                <span className="font-medium">Have questions about your specific practice?</span>
                <button
                  onClick={openBookingModal}
                  className="font-bold text-neutral-900 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Schedule a consultation</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </motion.div>
          </div>
        </section>


      </div>

      {/* Footer Section (Full Width, with centered links and edge-to-edge typography inside) */}
      <footer id="about" className="w-full bg-[#F3F4F6] border-t border-neutral-200/60 mt-12 pt-12 sm:pt-16 overflow-hidden scroll-mt-6">
        {/* Call to Action Banner */}
        <div className="max-w-7xl mx-auto px-6 sm:px-12 lg:px-20 mb-12 sm:mb-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="bg-gradient-to-r from-[#242E18] via-[#3C4E28] to-[#5B753F] text-white rounded-[32px] p-8 sm:p-12 flex flex-col md:flex-row items-center justify-between gap-6 shadow-md"
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
              <button
                onClick={openBookingModal}
                className="inline-flex items-center gap-3 bg-white text-neutral-900 font-bold pl-6 pr-2 py-2.5 rounded-full text-xs sm:text-sm shadow-lg hover:bg-slate-100 transition-all duration-200 group whitespace-nowrap cursor-pointer"
              >
                <span>Schedule a Meeting</span>
                <span className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                  <ArrowRight className="w-4 h-4" />
                </span>
              </button>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
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
              <li>
                <Link href="#faq" className="hover:text-neutral-900 transition-colors">
                  FAQ
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
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
          className="relative max-w-7xl mx-auto px-6 sm:px-12 lg:px-20 -mt-4 sm:-mt-6 lg:-mt-10 pb-2 sm:pb-4 overflow-hidden flex items-center justify-center select-none pointer-events-none"
        >
          <Image
            src="/typo-full.png"
            alt="Aurwell Typography Wordmark"
            width={1200}
            height={300}
            loading="lazy"
            decoding="async"
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
