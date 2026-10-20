"use client";

import React, { useState, useMemo } from "react";
import { HelpCircle, TrendingUp, TrendingDown, Maximize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { bentoItemVariants } from "@/components/ui/motion-container";
import MetricDetailModal, { createSmoothPath } from "@/components/MetricDetailModal";

export interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "increase" | "decrease" | "neutral";
  period?: string;
  icon?: React.ReactNode;
  showSparkline?: boolean;
  description?: string;
  sparklineData?: number[];
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
  sparklineData,
}: StatCardProps) {
  const isIncrease = changeType === "increase";
  const isDecrease = changeType === "decrease";
  const [showTooltip, setShowTooltip] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const tooltipText =
    description ||
    `Metric for ${title}: ${value} ${change ? `(${change} ${period})` : ""}`;

  // Generate dynamic, unique sparkline data points tailored to each metric
  const points = useMemo(() => {
    let rawVals = sparklineData;
    if (!rawVals || rawVals.length === 0) {
      // Deterministic seed based on title characters
      const seed = title.split("").reduce((acc, c, i) => acc + c.charCodeAt(0) * (i + 1), 0);
      const count = 7;
      const base = 20;
      rawVals = [];

      for (let i = 0; i < count; i++) {
        const trend = isIncrease ? i * 2.2 : isDecrease ? -i * 1.8 : 0;
        const wave = Math.sin((seed + i) * 1.5) * 4.5 + Math.cos(i * 1.2) * 2;
        rawVals.push(Math.max(4, Math.round(base + trend + wave)));
      }
    }

    const svgW = 88;
    const svgH = 34;
    const pad = 4;
    const min = Math.min(...rawVals);
    const max = Math.max(...rawVals);
    const range = max - min || 1;

    return rawVals.map((v, idx) => ({
      x: pad + (idx / Math.max(rawVals.length - 1, 1)) * (svgW - pad * 2),
      y: svgH - pad - ((v - min) / range) * (svgH - pad * 2),
    }));
  }, [sparklineData, title, isIncrease, isDecrease]);

  const sparklineLinePath = useMemo(() => createSmoothPath(points), [points]);
  const sparklineAreaPath = useMemo(() => {
    if (points.length === 0) return "";
    return `${sparklineLinePath} L ${points[points.length - 1].x} 34 L ${points[0].x} 34 Z`;
  }, [sparklineLinePath, points]);

  // Unique gradient ID per card title
  const gradientId = useMemo(
    () => `sparkline-grad-${title.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
    [title]
  );

  return (
    <>
      <motion.div
        variants={bentoItemVariants}
        whileHover={{ y: -2.5, transition: { duration: 0.2, ease: "easeOut" } }}
        style={{ willChange: "transform, opacity" }}
        className="group relative overflow-visible rounded-3xl bg-white p-5 sm:p-6 transition-all select-none shadow-xs hover:shadow-md"
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

        {/* Value and Interactive Mini Graph row */}
        <div className="mt-3.5 flex items-end justify-between gap-3">
          <div>
            <div className="text-2xl sm:text-[30px] font-bold tracking-tight text-neutral-900 leading-none">
              {value}
            </div>
          </div>

          {showSparkline && (
            <div
              onClick={() => setIsDetailOpen(true)}
              title="Click to view detailed graph overlay"
              className="relative w-22 h-10 shrink-0 pb-0.5 cursor-pointer rounded-xl p-1 hover:bg-neutral-50 transition-colors group/sparkline flex items-center justify-center"
            >
              <svg
                className="w-full h-full overflow-visible"
                viewBox="0 0 88 34"
                fill="none"
              >
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor={isDecrease ? "#e11d48" : isIncrease ? "#10b981" : "#0f0f11"}
                      stopOpacity="0.22"
                    />
                    <stop
                      offset="100%"
                      stopColor={isDecrease ? "#e11d48" : isIncrease ? "#10b981" : "#0f0f11"}
                      stopOpacity="0.0"
                    />
                  </linearGradient>
                </defs>

                {/* Gradient area */}
                {sparklineAreaPath && (
                  <path d={sparklineAreaPath} fill={`url(#${gradientId})`} />
                )}

                {/* Animated bezier curve */}
                {sparklineLinePath && (
                  <motion.path
                    d={sparklineLinePath}
                    fill="none"
                    stroke={isDecrease ? "#e11d48" : isIncrease ? "#10b981" : "#0f0f11"}
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0, opacity: 0.2 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                  />
                )}

                {/* Latest value dot */}
                {points.length > 0 && (
                  <circle
                    cx={points[points.length - 1].x}
                    cy={points[points.length - 1].y}
                    r={2.5}
                    className={`${
                      isDecrease ? "fill-rose-600" : isIncrease ? "fill-emerald-500" : "fill-neutral-900"
                    } stroke-white stroke-1`}
                  />
                )}
              </svg>

              {/* Floating Expand Icon Hint on Hover (stroke-free flat pill) */}
              <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-2xs rounded-xl opacity-0 group-hover/sparkline:opacity-100 transition-opacity duration-200">
                <div className="flex items-center gap-1 text-[10px] font-bold text-neutral-800 bg-white px-2 py-0.5 rounded-full shadow-xs">
                  <Maximize2 className="w-2.5 h-2.5 text-neutral-600" />
                  <span>View</span>
                </div>
              </div>
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

      {/* Metric Detail Overlay Modal */}
      <MetricDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={title}
        value={value}
        change={change}
        changeType={changeType}
        period={period}
        icon={icon}
        description={description}
        sparklineData={sparklineData}
      />
    </>
  );
}
