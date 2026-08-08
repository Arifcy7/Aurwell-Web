"use client";

import React from "react";
import {
  Star,
  CheckCircle2,
  UserPlus,
  QrCode,
} from "lucide-react";

interface RewardsScreenProps {
  clinicName?: string;
  brandColor?: string;
  currency?: { symbol: string; code: string };
}

export default function RewardsScreen({
  clinicName = "Luxe Aesthetics",
  brandColor = "#111827",
  currency = { symbol: "$", code: "USD" },
}: RewardsScreenProps) {
  return (
    <div className="w-full bg-[#F9FAFB] min-h-full pb-8 text-neutral-900 font-sans select-none">
      {/* Page Header */}
      <div className="px-3 pt-2.5 pb-1.5 space-y-0.5">
        <h2 className="text-[14px] font-black text-neutral-900 tracking-tight">
          My Rewards
        </h2>
        <p className="text-[9.5px] text-neutral-500 font-medium">
          Redeem points for exclusive clinic benefits
        </p>
      </div>

      {/* 3D Wave Loyalty Card */}
      <div className="px-2.5">
        <div
          className="relative w-full h-[140px] rounded-[20px] p-3.5 flex flex-col justify-between shadow-lg border border-white/10 overflow-hidden transition-colors duration-300"
          style={{
            background: `linear-gradient(135deg, ${brandColor} 0%, #3b0764 60%, #09090b 100%)`,
          }}
        >
          {/* Subtle Ambient Waves */}
          <div className="absolute -top-10 -right-10 w-28 h-28 rounded-full bg-purple-400/20 blur-xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-28 h-28 rounded-full bg-amber-400/20 blur-xl pointer-events-none" />

          {/* Card Top Row: Small Logo + Clinic Name */}
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-md bg-[#F5F2EC]/90 flex items-center justify-center text-amber-900 font-serif font-bold text-[10px]">
                L
              </div>
              <span className="text-[9.5px] font-extrabold text-white tracking-wider uppercase truncate max-w-[150px]">
                {clinicName}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/35 text-amber-300 text-[7.5px] font-extrabold tracking-wider uppercase">
              VIP GOLD
            </span>
          </div>

          {/* Points Balance Row */}
          <div className="relative z-10 space-y-0.5 my-auto">
            <span className="text-[8px] font-bold text-white/70 uppercase tracking-widest block">
              Available Balance
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-white tracking-tight">
                2,450
              </span>
              <span className="text-[10px] font-bold text-amber-300">PTS</span>
            </div>
          </div>

          {/* Card Bottom Row: Member Name + Glass Member Badge */}
          <div className="relative z-10 flex items-center justify-between border-t border-white/15 pt-1.5">
            <div>
              <span className="text-[7.5px] text-white/60 block uppercase font-bold">MEMBER NAME</span>
              <span className="text-[9.5px] font-extrabold text-white">Sarah Jenkins</span>
            </div>
            <div className="bg-white/20 backdrop-blur-md border border-white/30 px-2.5 py-0.5 rounded-full text-[8px] font-extrabold text-white flex items-center gap-1 shadow-2xs">
              <CheckCircle2 className="w-2.5 h-2.5 text-white" />
              <span>MEMBER</span>
            </div>
          </div>
        </div>
      </div>

      {/* Available Rewards Grid */}
      <div className="mt-3.5 px-2.5">
        <h4 className="font-extrabold text-[12px] text-neutral-900 mb-1.5">
          Available Rewards
        </h4>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {/* Reward 1 */}
          <div className="min-w-[125px] w-[125px] bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-2xs flex-shrink-0">
            <div className="w-full h-[65px] bg-neutral-100 relative overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?auto=format&fit=crop&w=400&q=80"
                alt="Treatment Reward"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-1.5 space-y-0.5">
              <p className="font-bold text-[9.5px] text-neutral-900 truncate">
                {currency.symbol}50 Off Treatment
              </p>
              <p className="text-[8px] text-neutral-500 line-clamp-1">
                Valid for facial or laser
              </p>
              <div className="flex items-center justify-between pt-1">
                <span className="font-extrabold text-[8.5px] text-neutral-900">
                  500 Pts
                </span>
                <button
                  style={{ backgroundColor: brandColor }}
                  className="px-1.5 py-0.5 rounded-md text-white font-bold text-[8px] hover:opacity-90 transition-all"
                >
                  Redeem
                </button>
              </div>
            </div>
          </div>

          {/* Reward 2 */}
          <div className="min-w-[125px] w-[125px] bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-2xs flex-shrink-0">
            <div className="w-full h-[65px] bg-neutral-100 relative overflow-hidden">
              <img
                src="https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=400&q=80"
                alt="LED Light Therapy"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-1.5 space-y-0.5">
              <p className="font-bold text-[9.5px] text-neutral-900 truncate">
                LED Light Therapy
              </p>
              <p className="text-[8px] text-neutral-500 line-clamp-1">
                15 min soothing session
              </p>
              <div className="flex items-center justify-between pt-1">
                <span className="font-extrabold text-[8.5px] text-neutral-900">
                  350 Pts
                </span>
                <button
                  style={{ backgroundColor: brandColor }}
                  className="px-1.5 py-0.5 rounded-md text-white font-bold text-[8px] hover:opacity-90 transition-all"
                >
                  Redeem
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Get More Points Section */}
      <div className="mt-3.5 px-2.5 space-y-1.5">
        <h4 className="font-extrabold text-[12px] text-neutral-900">Get More Points</h4>
        <div className="space-y-1.5">
          {/* Option 1 */}
          <div className="bg-white rounded-xl border border-neutral-200 p-2 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-neutral-100 text-neutral-900 flex items-center justify-center">
                <UserPlus className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="font-bold text-[10px] text-neutral-900">
                  Refer a Friend
                </p>
                <p className="text-[8.5px] text-neutral-500">
                  Share code REF-SARAH24
                </p>
              </div>
            </div>
            <span className="font-black text-[9px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
              +500 Pts
            </span>
          </div>

          {/* Option 2 */}
          <div className="bg-white rounded-xl border border-neutral-200 p-2 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-neutral-100 text-neutral-900 flex items-center justify-center">
                <Star className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="font-bold text-[10px] text-neutral-900">
                  Google Review
                </p>
                <p className="text-[8.5px] text-neutral-500">
                  Leave feedback for {clinicName}
                </p>
              </div>
            </div>
            <span className="font-black text-[9px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
              +300 Pts
            </span>
          </div>

          {/* Option 3 */}
          <div className="bg-white rounded-xl border border-neutral-200 p-2 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-neutral-100 text-neutral-900 flex items-center justify-center">
                <QrCode className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="font-bold text-[10px] text-neutral-900">
                  First Visit Points
                </p>
                <p className="text-[8.5px] text-neutral-500">
                  Scan QR code at desk
                </p>
              </div>
            </div>
            <span className="font-black text-[9px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
              +250 Pts
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
