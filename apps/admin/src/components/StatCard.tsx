"use client";

import React from "react";
import { HelpCircle, TrendingUp, TrendingDown } from "lucide-react";

export interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "increase" | "decrease" | "neutral";
  period?: string;
  icon?: React.ReactNode;
  showSparkline?: boolean;
}

export default function StatCard({
  title,
  value,
  change,
  changeType = "increase",
  period = "vs last year",
  icon,
  showSparkline = true,
}: StatCardProps) {
  const isIncrease = changeType === "increase";
  const isDecrease = changeType === "decrease";

  return (
    <div className="relative overflow-hidden rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-100 transition-all hover:shadow-[0_12px_40px_rgb(0,0,0,0.06)]">
      {/* Header section with title and circular icon container */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-neutral-800">{title}</span>
          <div className="group relative cursor-pointer text-neutral-400 hover:text-neutral-600 transition-colors">
            <HelpCircle className="w-4 h-4" />
          </div>
        </div>

        <div className="w-11 h-11 rounded-full bg-neutral-100/80 flex items-center justify-center text-neutral-700 flex-shrink-0 shadow-inner">
          {icon ? (
            icon
          ) : (
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.75}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
              />
            </svg>
          )}
        </div>
      </div>

      {/* Value and Sparkline graphic row */}
      <div className="mt-4 flex items-end justify-between gap-4">
        <div>
          <div className="text-3xl sm:text-4xl font-bold tracking-tight text-neutral-900">
            {value}
          </div>
        </div>

        {showSparkline && (
          <div className="w-24 h-12 flex-shrink-0 pb-1">
            <svg
              className="w-full h-full text-emerald-500 overflow-visible"
              viewBox="0 0 100 40"
              fill="none"
            >
              <path
                d="M 5,30 Q 25,32 45,15 T 75,8 Q 85,25 95,28"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Change percentage badge row */}
      {change && (
        <div className="mt-4 flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold border ${
              isIncrease
                ? "bg-emerald-50 text-emerald-600 border-emerald-100/80"
                : isDecrease
                ? "bg-rose-50 text-rose-600 border-rose-100/80"
                : "bg-neutral-50 text-neutral-600 border-neutral-200/80"
            }`}
          >
            {isIncrease && <TrendingUp className="w-3 h-3 stroke-[2.5]" />}
            {isDecrease && <TrendingDown className="w-3 h-3 stroke-[2.5]" />}
            {change}
          </span>
          <span className="text-xs font-medium text-neutral-400">{period}</span>
        </div>
      )}
    </div>
  );
}
