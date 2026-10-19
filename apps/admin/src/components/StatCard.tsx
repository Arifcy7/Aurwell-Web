"use client";

import React, { useState } from "react";
import { HelpCircle, TrendingUp, TrendingDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { bentoItemVariants } from "@/components/ui/motion-container";

export interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "increase" | "decrease" | "neutral";
  period?: string;
  icon?: React.ReactNode;
  showSparkline?: boolean;
  description?: string;
}

export default function StatCard({
  title,
  value,
  change,
  changeType = "increase",
  period = "vs last year",
  icon,
  showSparkline = true,
  description,
}: StatCardProps) {
  const isIncrease = changeType === "increase";
  const isDecrease = changeType === "decrease";
  const [showTooltip, setShowTooltip] = useState(false);

  const tooltipText =
    description ||
    `Metric for ${title}: ${value} ${change ? `(${change} ${period})` : ""}`;

  return (
    <motion.div
      variants={bentoItemVariants}
      whileHover={{ y: -2.5, transition: { duration: 0.2, ease: "easeOut" } }}
      style={{ willChange: "transform, opacity" }}
      className="group relative overflow-visible rounded-3xl bg-white p-5 sm:p-6 transition-colors select-none"
    >
      {/* Header section with title and icon container */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 min-w-0 relative">
          <span className="text-xs sm:text-[13px] font-medium text-neutral-500 truncate">{title}</span>
          <button
            type="button"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onClick={() => setShowTooltip(!showTooltip)}
            aria-label={`Learn more about ${title}`}
            className="relative cursor-pointer text-neutral-300 hover:text-neutral-600 transition-colors focus:outline-none p-0.5 rounded-full"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>

          {/* Interactive Tooltip Popover */}
          <AnimatePresence>
            {showTooltip && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute left-0 bottom-full mb-1.5 z-30 max-w-xs w-52 rounded-xl bg-neutral-900 text-white p-2.5 text-[11px] leading-tight shadow-xl pointer-events-none"
              >
                {tooltipText}
                <div className="absolute left-3 top-full w-0 h-0 border-x-4 border-x-transparent border-t-4 border-t-neutral-900" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="w-9 h-9 rounded-full bg-neutral-100 text-neutral-800 flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105">
          {icon ? (
            React.isValidElement(icon) ? (
              React.cloneElement(icon as React.ReactElement<any>, {
                className: "w-4 h-4",
              })
            ) : (
              icon
            )
          ) : (
            <svg
              className="w-4 h-4"
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
      <div className="mt-3.5 flex items-end justify-between gap-3">
        <div>
          <div className="text-2xl sm:text-[30px] font-bold tracking-tight text-neutral-900 leading-none">
            {value}
          </div>
        </div>

        {showSparkline && (
          <div className="w-20 h-9 shrink-0 pb-0.5">
            <svg
              className="w-full h-full text-neutral-900 overflow-visible"
              viewBox="0 0 100 40"
              fill="none"
            >
              <motion.path
                d="M 5,30 Q 25,32 45,15 T 75,8 Q 85,25 95,28"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0.2 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
              />
            </svg>
          </div>
        )}
      </div>

      {/* Change percentage badge row */}
      {change && (
        <div className="mt-3.5 flex items-center gap-2">
          <motion.span
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
              isIncrease
                ? "bg-emerald-100/80 text-emerald-800"
                : isDecrease
                ? "bg-rose-100 text-rose-800"
                : "bg-neutral-100 text-neutral-700"
            }`}
          >
            {isIncrease && <TrendingUp className="w-3 h-3 stroke-[2.5]" />}
            {isDecrease && <TrendingDown className="w-3 h-3 stroke-[2.5]" />}
            {change}
          </motion.span>
          <span className="text-[11px] font-medium text-neutral-400">{period}</span>
        </div>
      )}
    </motion.div>
  );
}
