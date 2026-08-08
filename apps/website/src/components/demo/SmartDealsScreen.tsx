"use client";

import React from "react";
import {
  Star,
  ChevronRight,
  Sparkles,
  MapPin,
  Phone,
} from "lucide-react";

interface SmartDealsScreenProps {
  clinicName?: string;
  brandColor?: string;
  currency?: { symbol: string; code: string };
}

export default function SmartDealsScreen({
  clinicName = "Luxe Aesthetics",
  brandColor = "#111827",
  currency = { symbol: "$", code: "USD" },
}: SmartDealsScreenProps) {
  // Extract first word of clinic name (e.g. "Luxe" from "Luxe Aesthetics")
  const shortName = clinicName.trim().split(" ")[0] || "Clinic";

  return (
    <div className="w-full bg-[#F9FAFB] min-h-full pb-8 text-neutral-900 font-sans select-none">
      {/* 1. Ultra-Aesthetic Hero Welcome Banner Attached Flush Edge-to-Edge */}
      <div className="px-0 pt-0 pb-0">
        <div className="relative w-full h-[170px] rounded-t-none rounded-b-[24px] overflow-hidden p-3.5 flex flex-col justify-between shadow-md">
          {/* Ultra-Aesthetic Luxury Spa Treatment Photo */}
          <img
            src="https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80"
            alt="Hero Banner"
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Luxury Gradient Scrim Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/25 pointer-events-none" />

          {/* Top Welcome Content */}
          <div className="relative z-10 space-y-0.5">
            <span className="text-[8px] font-extrabold tracking-widest text-white/80 uppercase block">
              WELCOME BACK
            </span>
            <h3 className="text-sm font-black text-white tracking-tight leading-tight">
              Sarah Jenkins
            </h3>
            <p className="text-[9.5px] font-medium text-white/85 truncate max-w-[180px]">
              {clinicName}
            </p>
          </div>

          {/* High-Contrast Loyalty Capsule Pill: "Luxe Points" */}
          <div className="relative z-10 w-full h-[32px] rounded-full bg-neutral-900/90 backdrop-blur-md border border-neutral-700/80 px-3 flex items-center justify-between shadow-md text-white">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-4 h-4 rounded-full bg-amber-400/20 border border-amber-400/40 flex items-center justify-center flex-shrink-0">
                <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
              </div>
              <span className="text-[9px] font-extrabold tracking-tight text-white truncate">
                {shortName} Points
              </span>
            </div>
            <div className="flex items-center gap-0.5 font-black text-amber-300 flex-shrink-0 pl-1">
              <span className="text-[11px]">2,450</span>
              <span className="text-[8px] text-white/80">PTS</span>
              <ChevronRight className="w-3.5 h-3.5 text-white/90" />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Recently Viewed Section */}
      <div className="mt-3.5 px-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <h4 className="font-black text-[14px] text-neutral-900 tracking-tight">
            Recently Viewed
          </h4>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {/* Card 1 */}
          <div className="bg-white rounded-xl border border-neutral-200/90 overflow-hidden shadow-2xs">
            <div className="w-full h-[90px] bg-neutral-100 relative overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=600&q=80"
                alt="Botox Anti-Wrinkle Injections"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-2 space-y-0.5">
              <p className="font-extrabold text-[10px] text-neutral-900 truncate">
                Botox Anti-Wrinkl...
              </p>
              <p className="text-[9px] font-semibold text-neutral-500">
                {currency.symbol}140 / month
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-xl border border-neutral-200/90 overflow-hidden shadow-2xs">
            <div className="w-full h-[90px] bg-neutral-100 relative overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80"
                alt="PRP Hair Restoration"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-2 space-y-0.5">
              <p className="font-extrabold text-[10px] text-neutral-900 truncate">
                PRP Hair Restorati...
              </p>
              <p className="text-[9px] font-semibold text-neutral-500">
                {currency.symbol}308 / month
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Spring Special Promo Banner */}
      <div className="mt-3.5 px-2.5">
        <div className="bg-white rounded-xl border border-neutral-200 p-3 shadow-2xs text-center space-y-1.5">
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[8px] font-extrabold border border-amber-200/60">
            <Sparkles className="w-2.5 h-2.5 text-amber-500" />
            <span>SPRING SPECIAL</span>
          </div>
          <h5 className="font-extrabold text-[11px] text-neutral-900 leading-snug">
            Special Spring Refresh Offer - 20% Off All Facials
          </h5>
          <button
            style={{ backgroundColor: brandColor }}
            className="w-full py-1.5 rounded-xl text-white font-bold text-[9px] hover:opacity-90 transition-all shadow-2xs"
          >
            Claim Offer Now
          </button>
        </div>
      </div>

      {/* 4. Available Rewards Section (Matches uniform grid & heading) */}
      <div className="mt-3.5 px-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <h4 className="font-black text-[14px] text-neutral-900 tracking-tight">
            Available Rewards
          </h4>
          <span className="text-[10px] font-bold text-neutral-700 cursor-pointer hover:text-neutral-900 transition-colors">
            See All →
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {/* Reward 1 */}
          <div className="bg-white rounded-xl border border-neutral-200/90 overflow-hidden shadow-2xs">
            <div className="w-full h-[90px] bg-neutral-100 relative overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=400&q=80"
                alt="$50 Off Treatment"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-2 space-y-0.5">
              <p className="font-extrabold text-[10px] text-neutral-900 truncate">
                {currency.symbol}50 Off Treatment
              </p>
              <p className="text-[9px] font-bold text-neutral-500">
                500 pts
              </p>
            </div>
          </div>

          {/* Reward 2 */}
          <div className="bg-white rounded-xl border border-neutral-200/90 overflow-hidden shadow-2xs">
            <div className="w-full h-[90px] bg-neutral-100 relative overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=400&q=80"
                alt="Free LED Session"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-2 space-y-0.5">
              <p className="font-extrabold text-[10px] text-neutral-900 truncate">
                Free LED Session
              </p>
              <p className="text-[9px] font-bold text-neutral-500">
                350 pts
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Shop Essentials Section (Matches uniform grid & heading) */}
      <div className="mt-3.5 px-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <h4 className="font-black text-[14px] text-neutral-900 tracking-tight">
            Shop Essentials
          </h4>
          <span className="text-[10px] font-bold text-neutral-700 cursor-pointer hover:text-neutral-900 transition-colors">
            Store →
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {/* Service Card 1 */}
          <div className="bg-white rounded-xl border border-neutral-200/90 overflow-hidden shadow-2xs">
            <div className="w-full h-[90px] bg-neutral-100 relative overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=600&q=80"
                alt="Botox Anti-Wrinkle Injections"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-2 space-y-0.5">
              <p className="font-extrabold text-[10px] text-neutral-900 truncate">
                Botox Anti-Wrinkl...
              </p>
              <p className="text-[9px] font-semibold text-neutral-500">
                {currency.symbol}140 / month
              </p>
            </div>
          </div>

          {/* Service Card 2 */}
          <div className="bg-white rounded-xl border border-neutral-200/90 overflow-hidden shadow-2xs">
            <div className="w-full h-[90px] bg-neutral-100 relative overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80"
                alt="PRP Hair Restoration"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-2 space-y-0.5">
              <p className="font-extrabold text-[10px] text-neutral-900 truncate">
                PRP Hair Restorati...
              </p>
              <p className="text-[9px] font-semibold text-neutral-500">
                {currency.symbol}308 / month
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 6. About Clinic Section */}
      <div className="mt-4 px-2.5">
        <div className="bg-white rounded-2xl border border-neutral-200/90 p-3.5 space-y-1.5 shadow-2xs">
          <h3 className="font-black text-[14px] text-neutral-900 tracking-tight">
            About {clinicName}
          </h3>
          <p className="text-[10px] text-neutral-600 leading-relaxed font-normal">
            {clinicName} is London's premier medical-grade aesthetics clinic, specialising in advanced skin treatments, anti-ageing injectables, and bespoke wellness programmes. Our expert practitioners combine science with artistry to help every client reveal their most confident self.
          </p>
        </div>
      </div>

      {/* 7. Location Map & Contact Card Section */}
      <div className="mt-3.5 px-2.5">
        <div className="bg-white rounded-2xl border border-neutral-200/90 overflow-hidden shadow-2xs p-0 space-y-0">
          {/* Map Graphic Header */}
          <div className="w-full h-[110px] bg-[#E2F0D9] relative overflow-hidden border-b border-neutral-100 flex items-center justify-center">
            <svg
              className="absolute inset-0 w-full h-full opacity-60"
              viewBox="0 0 300 120"
              fill="none"
              stroke="#D2E4C4"
              strokeWidth="4"
            >
              <path d="M-10 30 Q 100 40 310 10" stroke="#FCE9BD" strokeWidth="8" />
              <path d="M 120 -10 L 220 130" stroke="#FCE9BD" strokeWidth="6" />
              <path d="M 40 130 Q 150 70 280 130" stroke="#FFFFFF" strokeWidth="5" />
            </svg>

            {/* Red Location Pin Drop Marker */}
            <div className="relative z-10 flex flex-col items-center animate-bounce">
              <div className="w-6 h-6 rounded-full bg-rose-500 border-2 border-white shadow-md flex items-center justify-center text-white">
                <MapPin className="w-3.5 h-3.5 fill-white text-rose-500" />
              </div>
              <div className="w-2 h-1 bg-black/20 rounded-full blur-[1px] mt-0.5" />
            </div>
          </div>

          {/* Location Info & Action Buttons */}
          <div className="p-3 space-y-2.5">
            <div>
              <h4 className="font-extrabold text-[13px] text-neutral-900 leading-tight">
                {clinicName}
              </h4>
              <p className="text-[9.5px] font-medium text-neutral-500 mt-0.5">
                47 Harley Street, Marylebone
              </p>
            </div>

            {/* Action Buttons Row */}
            <div className="flex items-center gap-2">
              <button className="flex-1 py-1.5 px-3 rounded-full border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800 text-[9.5px] font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs">
                <MapPin className="w-3 h-3 text-neutral-700" />
                <span>Direction</span>
              </button>

              <button
                style={{ backgroundColor: brandColor }}
                className="flex-1 py-1.5 px-3 rounded-full text-white text-[9.5px] font-bold flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity shadow-2xs"
              >
                <Phone className="w-3 h-3 text-white" />
                <span>Call Now</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
