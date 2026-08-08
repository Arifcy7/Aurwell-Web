"use client";

import React, { useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Lock,
  SlidersHorizontal,
} from "lucide-react";

interface MembershipScreenProps {
  clinicName?: string;
  brandColor?: string;
  currency?: { symbol: string; code: string };
}

export default function MembershipScreen({
  clinicName = "Luxe Aesthetics",
  brandColor = "#111827",
  currency = { symbol: "$", code: "USD" },
}: MembershipScreenProps) {
  const [showDetail, setShowDetail] = useState(false);

  // IF USER IS VIEWING MEMBERSHIP DETAIL POPUP VIEW
  if (showDetail) {
    return (
      <div className="w-full bg-white min-h-full pb-16 text-neutral-900 font-sans select-none relative animate-in fade-in slide-in-from-right-4 duration-300">
        {/* Top Banner Image Header */}
        <div className="relative w-full h-[135px] overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=1000&q=80"
            alt="VIP Membership"
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/30 pointer-events-none" />

          {/* Back Button */}
          <div className="absolute top-2.5 left-2.5 z-20">
            <button
              onClick={() => setShowDetail(false)}
              className="px-2 py-1 rounded-full bg-white/90 backdrop-blur-md flex items-center gap-1 text-neutral-900 shadow-sm hover:bg-white transition-all text-[9.5px] font-extrabold"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Back</span>
            </button>
          </div>

          {/* Title Badge */}
          <div className="absolute bottom-2.5 left-2.5 right-2.5 z-10 flex items-end justify-between">
            <div>
              <span className="text-[8px] font-extrabold text-amber-400 uppercase tracking-wider block">
                PREMIUM TIER
              </span>
              <h2 className="text-[13px] font-black text-white leading-tight">
                VIP Diamond Membership
              </h2>
            </div>
          </div>
        </div>

        {/* Main Detail Content Area */}
        <div className="p-2.5 space-y-3">
          {/* Pricing Header Row */}
          <div className="bg-neutral-50 rounded-2xl p-2.5 border border-neutral-100 flex items-center justify-between shadow-2xs">
            <div>
              <span className="text-[9px] font-medium text-neutral-500 block">
                Monthly Subscription
              </span>
              <div className="flex items-baseline gap-0.5 mt-0.5">
                <span className="text-base font-black text-neutral-900">
                  {currency.symbol}299
                </span>
                <span className="text-[9px] font-bold text-neutral-500">/mo</span>
              </div>
            </div>
            <div className="text-right">
              <span
                style={{ backgroundColor: brandColor }}
                className="inline-block px-2 py-0.5 rounded-full text-white font-extrabold text-[8px]"
              >
                6 Mo. Commitment
              </span>
            </div>
          </div>

          {/* About Description */}
          <div className="space-y-0.5">
            <h4 className="font-extrabold text-[11px] text-neutral-900">
              About this Membership
            </h4>
            <p className="text-[9.5px] text-neutral-600 leading-relaxed">
              Exclusive {clinicName} membership tier featuring monthly complimentary treatments, priority booking, and member-only discounts.
            </p>
          </div>

          {/* Included Treatments & Services */}
          <div className="space-y-1.5">
            <div>
              <h4 className="font-extrabold text-[11px] text-neutral-900">
                Included Treatments & Services
              </h4>
              <p className="text-[8.5px] text-neutral-500 font-medium">
                Bundled sessions included with your membership
              </p>
            </div>

            <div className="space-y-1.5">
              {/* Treatment Card 1 */}
              <div className="bg-white rounded-xl border border-neutral-200/90 p-2 flex items-center gap-2 shadow-2xs">
                <div className="w-9 h-9 rounded-lg bg-neutral-100 overflow-hidden flex-shrink-0">
                  <img
                    src="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=200&q=80"
                    alt="Laser Removal"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[10px] text-neutral-900 truncate">
                    Full Body Laser Removal
                  </p>
                  <p className="text-[8.5px] font-medium text-neutral-500">
                    1 session / month
                  </p>
                </div>
                <span className="text-[8px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md flex-shrink-0">
                  {currency.symbol}150 Value
                </span>
              </div>

              {/* Treatment Card 2 */}
              <div className="bg-white rounded-xl border border-neutral-200/90 p-2 flex items-center gap-2 shadow-2xs">
                <div className="w-9 h-9 rounded-lg bg-neutral-100 overflow-hidden flex-shrink-0">
                  <img
                    src="https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=200&q=80"
                    alt="Hydrafacial"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[10px] text-neutral-900 truncate">
                    Custom Hydrafacial Glow
                  </p>
                  <p className="text-[8.5px] font-medium text-neutral-500">
                    1 session / month
                  </p>
                </div>
                <span className="text-[8px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md flex-shrink-0">
                  {currency.symbol}180 Value
                </span>
              </div>

              {/* Treatment Card 3 */}
              <div className="bg-white rounded-xl border border-neutral-200/90 p-2 flex items-center gap-2 shadow-2xs">
                <div className="w-9 h-9 rounded-lg bg-neutral-100 overflow-hidden flex-shrink-0">
                  <img
                    src="https://images.unsplash.com/photo-1608248597263-0057e05b3b13?auto=format&fit=crop&w=200&q=80"
                    alt="Botox"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[10px] text-neutral-900 truncate">
                    Botox / Dysport Treatment
                  </p>
                  <p className="text-[8.5px] font-medium text-neutral-500">
                    20 Units / quarter
                  </p>
                </div>
                <span className="text-[8px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md flex-shrink-0">
                  {currency.symbol}240 Value
                </span>
              </div>
            </div>
          </div>

          {/* Member Benefits Checklist */}
          <div className="space-y-1 bg-neutral-50 rounded-2xl p-2.5 border border-neutral-100 shadow-2xs">
            <h4 className="font-extrabold text-[11px] text-neutral-900 mb-1">
              Exclusive Member Benefits
            </h4>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-neutral-900 flex-shrink-0" />
                <span className="text-[9px] font-medium text-neutral-700">
                  15% off all retail skincare products
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-neutral-900 flex-shrink-0" />
                <span className="text-[9px] font-medium text-neutral-700">
                  Priority booking window (7 days early access)
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3 h-3 text-neutral-900 flex-shrink-0" />
                <span className="text-[9px] font-medium text-neutral-700">
                  Exclusive invitations to VIP clinic events
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Sticky Action Button */}
          <div className="pt-2">
            <button
              style={{ backgroundColor: brandColor }}
              className="w-full py-2.5 rounded-xl text-white font-extrabold text-[10px] hover:opacity-90 transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              <Lock className="w-3 h-3" />
              <span>Join VIP Membership - {currency.symbol}299/mo</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // MEMBERSHIPS PAGE VIEW: MATCHES EXACT SCREENSHOT FORMAT WITH BEAUTIFUL IMAGES
  return (
    <div className="w-full bg-[#F9FAFB] min-h-full pb-8 text-neutral-900 font-sans select-none">
      {/* Tab Switcher Header Row */}
      <div className="bg-white px-3 pt-2.5 pb-1.5 border-b border-neutral-100 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-4 text-[11px]">
          <div className="relative pb-1">
            <span className="font-extrabold text-neutral-900 cursor-pointer">
              Memberships
            </span>
            <div
              className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full"
              style={{ backgroundColor: brandColor }}
            />
          </div>
          <span className="font-semibold text-neutral-400 cursor-pointer">
            Treatments
          </span>
        </div>
        <div className="bg-neutral-100/90 border border-neutral-200/80 px-2.5 py-1 rounded-full flex items-center gap-1 text-[9.5px] font-bold text-neutral-800 shadow-2xs">
          <SlidersHorizontal className="w-2.5 h-2.5 text-neutral-700" />
          <span>Filter</span>
        </div>
      </div>

      {/* Cards List matching exact visual screenshot format */}
      <div className="p-2.5 space-y-3">
        {/* Card 1: Botox Anti-Wrinkle Injections (Matches screenshot) */}
        <div
          onClick={() => setShowDetail(true)}
          className="bg-white rounded-2xl border border-neutral-200/90 overflow-hidden shadow-2xs cursor-pointer hover:border-neutral-400 transition-all"
        >
          {/* Real Facial Treatment Cover Image */}
          <div className="w-full h-[125px] bg-neutral-100 relative overflow-hidden border-b border-neutral-100">
            <img
              src="https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=600&q=80"
              alt="Botox Anti-Wrinkle Injections"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Card Body matching exact layout in attached user image */}
          <div className="p-2.5 space-y-1.5">
            {/* Category Pills */}
            <div className="flex items-center gap-1">
              <span className="bg-neutral-100 text-neutral-600 rounded-md px-2 py-0.5 text-[8.5px] font-medium">
                Face
              </span>
              <span className="bg-neutral-100 text-neutral-600 rounded-md px-2 py-0.5 text-[8.5px] font-medium">
                Wrinkles
              </span>
              <span className="bg-neutral-100 text-neutral-600 rounded-md px-2 py-0.5 text-[8.5px] font-medium">
                Frown lines
              </span>
            </div>

            {/* Title */}
            <h4 className="font-extrabold text-[12px] text-neutral-900 leading-tight">
              Botox Anti-Wrinkle Injections
            </h4>

            {/* Subtitle / Description */}
            <p className="text-[9px] text-neutral-500 leading-relaxed line-clamp-2">
              Our medical-grade botulinum toxin injections relax overactive facial muscles to smooth expression lines ...
            </p>

            {/* Price Tag */}
            <div className="pt-0.5">
              <span className="text-[11px] font-extrabold text-neutral-900">
                Starting from {currency.symbol}140
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Custom Hydrafacial Glow Session */}
        <div
          onClick={() => setShowDetail(true)}
          className="bg-white rounded-2xl border border-neutral-200/90 overflow-hidden shadow-2xs cursor-pointer hover:border-neutral-400 transition-all"
        >
          <div className="w-full h-[125px] bg-neutral-100 relative overflow-hidden border-b border-neutral-100">
            <img
              src="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80"
              alt="Hydrafacial Glow"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="p-2.5 space-y-1.5">
            <div className="flex items-center gap-1">
              <span className="bg-neutral-100 text-neutral-600 rounded-md px-2 py-0.5 text-[8.5px] font-medium">
                Skincare
              </span>
              <span className="bg-neutral-100 text-neutral-600 rounded-md px-2 py-0.5 text-[8.5px] font-medium">
                Facials
              </span>
            </div>
            <h4 className="font-extrabold text-[12px] text-neutral-900 leading-tight">
              Custom Hydrafacial Glow Session
            </h4>
            <p className="text-[9px] text-neutral-500 leading-relaxed line-clamp-2">
              Deep cleansing, extraction, and hydration treatment infused with super-serums ...
            </p>
            <div className="pt-0.5">
              <span className="text-[11px] font-extrabold text-neutral-900">
                Starting from {currency.symbol}180
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
