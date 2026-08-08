"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wifi,
  ShoppingBag,
  Home as HomeIcon,
  Gift,
  User,
  Sparkles,
  X,
} from "lucide-react";
import MembershipScreen from "./MembershipScreen";
import RewardsScreen from "./RewardsScreen";
import SmartDealsScreen from "./SmartDealsScreen";

interface AppDemoPhoneProps {
  activeTab: string;
  clinicName?: string;
  brandColor?: string;
  currency?: { symbol: string; code: string };
  onSelectTab?: (tab: string) => void;
}

export default function AppDemoPhone({
  activeTab,
  clinicName = "Luxe Aesthetics",
  brandColor = "#111827",
  currency = { symbol: "$", code: "USD" },
  onSelectTab,
}: AppDemoPhoneProps) {
  const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:3001";
  const [showPrototypeToast, setShowPrototypeToast] = useState(false);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerPrototypeToast = () => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setShowPrototypeToast(true);
    toastTimeoutRef.current = setTimeout(() => {
      setShowPrototypeToast(false);
    }, 3500);
  };

  // Map active tab to bottom nav state
  const navState =
    activeTab === "Smart Deals"
      ? "home"
      : activeTab === "Membership"
      ? "shop"
      : activeTab === "Rewards"
      ? "rewards"
      : "home";

  return (
    <div
      onClick={triggerPrototypeToast}
      className="w-full h-full bg-white flex flex-col relative overflow-hidden select-none cursor-pointer"
    >
      {/* 1. Top Phone Status Bar with Realistic Dynamic Island & Full Battery */}
      <div className="w-full h-8 bg-white px-5 flex items-center justify-between z-40 flex-shrink-0 text-neutral-900 font-semibold text-[10.5px] select-none pt-1.5 relative">
        <span className="font-black tracking-tight ml-0.5">9:41</span>

        {/* Improved Dynamic Island matching reference image */}
        <div className="w-[84px] h-[22px] bg-black rounded-full absolute left-1/2 transform -translate-x-1/2 top-1.5 flex items-center justify-end pr-2 shadow-xs pointer-events-none">
          {/* Front Camera Lens Detail */}
          <div className="w-2.5 h-2.5 rounded-full bg-[#12161f] border border-[#2d3748] flex items-center justify-center shadow-inner">
            <div className="w-1 h-1 rounded-full bg-[#1e3a8a]/80" />
          </div>
        </div>

        {/* Status Bar Icons: 4-Bar Signal, Wifi, Full Charge Battery */}
        <div className="flex items-center gap-1.5 text-neutral-900 mr-0.5">
          {/* 4 Cellular Signal Bars */}
          <div className="flex items-end gap-[1.5px] h-3">
            <div className="w-[2px] h-[4px] bg-neutral-900 rounded-[0.5px]" />
            <div className="w-[2px] h-[6px] bg-neutral-900 rounded-[0.5px]" />
            <div className="w-[2px] h-[8px] bg-neutral-900 rounded-[0.5px]" />
            <div className="w-[2px] h-[10px] bg-neutral-900 rounded-[0.5px]" />
          </div>

          {/* Wi-Fi Icon */}
          <Wifi className="w-3.5 h-3.5 text-neutral-900 stroke-[2.5]" />

          {/* Solid Full Charge Battery Icon */}
          <div className="flex items-center ml-0.5">
            <div className="w-[19px] h-[10px] rounded-[3px] border border-neutral-900 p-[1px] flex items-center">
              <div className="w-full h-full bg-neutral-900 rounded-[1.5px]" />
            </div>
            <div className="w-[1.5px] h-[5px] bg-neutral-900 rounded-r-[1px] -ml-[0.5px]" />
          </div>
        </div>
      </div>

      {/* 2. App Top Header Bar (Fixed) matching native screenshots */}
      <div className="w-full px-3 py-1.5 flex items-center justify-between bg-white border-b border-neutral-100 z-30 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[#F5F2EC] border border-amber-200/50 flex items-center justify-center text-amber-900 font-serif font-bold text-xs flex-shrink-0 shadow-2xs">
            L
          </div>
          <h3 className="font-extrabold text-[12.5px] text-neutral-900 truncate tracking-tight">
            {clinicName}
          </h3>
        </div>
        <div
          onClick={(e) => {
            e.stopPropagation();
            triggerPrototypeToast();
          }}
          className="relative p-0.5 cursor-pointer"
        >
          <ShoppingBag className="w-4 h-4 text-neutral-900" />
          <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-500 text-white text-[7.5px] font-black flex items-center justify-center shadow-2xs">
            1
          </div>
        </div>
      </div>

      {/* 3. Smooth Scrollable Viewport Content Area */}
      <div className="flex-1 w-full overflow-y-auto overflow-x-hidden relative scrollbar-none scroll-smooth touch-pan-y">
        <AnimatePresence mode="wait">
          {activeTab === "Membership" && (
            <motion.div
              key="membership"
              initial={{ opacity: 0, x: 15, filter: "blur(4px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, x: -15, filter: "blur(4px)" }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="w-full min-h-full"
            >
              <MembershipScreen
                clinicName={clinicName}
                brandColor={brandColor}
                currency={currency}
              />
            </motion.div>
          )}

          {activeTab === "Rewards" && (
            <motion.div
              key="rewards"
              initial={{ opacity: 0, x: 15, filter: "blur(4px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, x: -15, filter: "blur(4px)" }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="w-full min-h-full"
            >
              <RewardsScreen
                clinicName={clinicName}
                brandColor={brandColor}
                currency={currency}
              />
            </motion.div>
          )}

          {activeTab === "Smart Deals" && (
            <motion.div
              key="smart-deals"
              initial={{ opacity: 0, x: 15, filter: "blur(4px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, x: -15, filter: "blur(4px)" }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="w-full min-h-full"
            >
              <SmartDealsScreen
                clinicName={clinicName}
                brandColor={brandColor}
                currency={currency}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Prototype Toast Pop-up Notification Banner */}
      <AnimatePresence>
        {showPrototypeToast && (
          <motion.div
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-12 left-3 right-3 z-[100] bg-neutral-900/95 text-white p-2.5 rounded-2xl shadow-2xl backdrop-blur-md border border-neutral-700/80 flex items-center justify-between gap-2 text-left select-none"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-full bg-amber-400/20 border border-amber-400/30 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold text-white leading-tight">
                  Interactive Prototype Demo
                </p>
                <p className="text-[8.5px] text-neutral-300 font-medium leading-tight mt-0.5 truncate">
                  Click "Build my app" to create your live app!
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Link
                href={`${adminUrl}/signup`}
                className="px-2.5 py-1 rounded-full bg-white hover:bg-neutral-100 text-neutral-900 text-[9px] font-black flex-shrink-0 transition-colors shadow-2xs"
              >
                Build my app
              </Link>
              <button
                onClick={() => setShowPrototypeToast(false)}
                className="p-1 rounded-full text-neutral-400 hover:text-white transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Interactive Bottom Navigation Bar (Synchronized with Feature Slider) */}
      <div className="w-full bg-white/95 backdrop-blur-md border-t border-neutral-200/80 px-2 py-1.5 flex items-center justify-around z-30 flex-shrink-0">
        {/* Home Tab */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            onSelectTab?.("Smart Deals");
          }}
          className="flex flex-col items-center gap-0.5 cursor-pointer group"
        >
          <HomeIcon
            className="w-4 h-4 transition-all group-hover:scale-110"
            style={{ color: navState === "home" ? brandColor : "#A3A3A3" }}
          />
          <span
            className={`text-[8.5px] ${
              navState === "home"
                ? "font-extrabold text-neutral-900"
                : "font-medium text-neutral-400"
            }`}
          >
            Home
          </span>
        </div>

        {/* Shop / Membership Tab */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            onSelectTab?.("Membership");
          }}
          className="flex flex-col items-center gap-0.5 cursor-pointer group"
        >
          <ShoppingBag
            className="w-4 h-4 transition-all group-hover:scale-110"
            style={{ color: navState === "shop" ? brandColor : "#A3A3A3" }}
          />
          <span
            className={`text-[8.5px] ${
              navState === "shop"
                ? "font-extrabold text-neutral-900"
                : "font-medium text-neutral-400"
            }`}
          >
            Shop
          </span>
        </div>

        {/* Rewards Tab */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            onSelectTab?.("Rewards");
          }}
          className="flex flex-col items-center gap-0.5 cursor-pointer group"
        >
          <Gift
            className="w-4 h-4 transition-all group-hover:scale-110"
            style={{ color: navState === "rewards" ? brandColor : "#A3A3A3" }}
          />
          <span
            className={`text-[8.5px] ${
              navState === "rewards"
                ? "font-extrabold text-neutral-900"
                : "font-medium text-neutral-400"
            }`}
          >
            Rewards
          </span>
        </div>

        {/* Profile Tab */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            onSelectTab?.("Smart Deals");
          }}
          className="flex flex-col items-center gap-0.5 cursor-pointer text-neutral-400 group"
        >
          <User className="w-4 h-4 transition-all group-hover:scale-110" />
          <span className="text-[8.5px] font-medium">Profile</span>
        </div>
      </div>

      {/* 5. Fixed iOS Home Indicator Bar */}
      <div className="w-full h-3.5 bg-white flex items-center justify-center z-40 flex-shrink-0 pb-0.5 pointer-events-none">
        <div className="w-24 h-1 bg-neutral-900/40 rounded-full" />
      </div>
    </div>
  );
}
