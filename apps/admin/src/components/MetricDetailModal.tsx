"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  X,
  TrendingUp,
  TrendingDown,
  Calendar,
  Maximize2,
  CheckCircle2,
  BarChart3,
  Clock,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type TimeRange = "7D" | "30D" | "90D" | "1Y" | "ALL";

export interface MetricDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  value: string;
  change?: string;
  changeType?: "increase" | "decrease" | "neutral";
  period?: string;
  icon?: React.ReactNode;
  description?: string;
  sparklineData?: number[];
}

/**
 * Helper to compute Catmull-Rom cubic bezier SVG path string
 */
export function createSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i != points.length - 2 ? points[i + 2] : p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;

    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  return d;
}

export default function MetricDetailModal({
  isOpen,
  onClose,
  title,
  value,
  change,
  changeType = "increase",
  period = "vs last period",
  icon,
  description,
  sparklineData,
}: MetricDetailModalProps) {
  const [selectedRange, setSelectedRange] = useState<TimeRange>("30D");
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const chartRef = useRef<SVGSVGElement | null>(null);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Determine currency or number formatting
  const isCurrency = value.includes("€") || value.includes("$") || value.includes("£");
  const currencySymbol = value.includes("€") ? "€" : value.includes("$") ? "$" : value.includes("£") ? "£" : "";
  const numericBase = parseFloat(value.replace(/[^0-9.]/g, "")) || 100;

  // Generate contextual data series for selected time range
  const { dataPoints, labels, milestones } = useMemo(() => {
    let count = 14;
    let labelFmt: "day" | "week" | "month" = "day";

    switch (selectedRange) {
      case "7D":
        count = 7;
        labelFmt = "day";
        break;
      case "30D":
        count = 15;
        labelFmt = "day";
        break;
      case "90D":
        count = 12;
        labelFmt = "week";
        break;
      case "1Y":
        count = 12;
        labelFmt = "month";
        break;
      case "ALL":
        count = 16;
        labelFmt = "month";
        break;
    }

    const today = new Date();
    const generatedPoints: { date: string; value: number }[] = [];
    const generatedMilestones: { id: string; date: string; title: string; delta: string; positive: boolean }[] = [];

    // Use seed or derive proportional values
    const seed = title.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const growthBias = changeType === "increase" ? 1.04 : changeType === "decrease" ? 0.96 : 1.0;

    let rollingVal = numericBase * (changeType === "increase" ? 0.72 : 1.25);

    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(today);
      let dateLabel = "";

      if (labelFmt === "day") {
        d.setDate(d.getDate() - i * (selectedRange === "30D" ? 2 : 1));
        dateLabel = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      } else if (labelFmt === "week") {
        d.setDate(d.getDate() - i * 7);
        dateLabel = `Wk ${Math.ceil(d.getDate() / 7)} ${d.toLocaleDateString("en-US", { month: "short" })}`;
      } else {
        d.setMonth(d.getMonth() - i);
        dateLabel = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      }

      const noise = (Math.sin(i * 1.8 + seed) * 0.12 + Math.cos(i * 0.9) * 0.08) * numericBase;
      const trend = (numericBase - rollingVal) * (1 - i / count) * 0.8;
      const pointVal = Math.max(0, Math.round(rollingVal + trend + noise));

      generatedPoints.push({
        date: dateLabel,
        value: i === 0 ? numericBase : pointVal,
      });

      // Periodic milestone markers
      if (i % Math.ceil(count / 3) === 1 && i !== 0) {
        generatedMilestones.push({
          id: `mile-${i}`,
          date: dateLabel,
          title: i > count / 2 ? "Campaign Momentum" : "Peak Activity Window",
          delta: `+${Math.round(Math.abs(noise) + 12)}%`,
          positive: true,
        });
      }
    }

    return {
      dataPoints: generatedPoints,
      labels: generatedPoints.map((p) => p.date),
      milestones: generatedMilestones,
    };
  }, [selectedRange, numericBase, changeType, title]);

  // SVG Calculations
  const svgWidth = 620;
  const svgHeight = 220;
  const padX = 36;
  const padY = 24;

  const rawValues = dataPoints.map((p) => p.value);
  const minVal = Math.min(...rawValues, 0);
  const maxVal = Math.max(...rawValues, numericBase * 1.15, 10);
  const valRange = maxVal - minVal || 1;

  const points = dataPoints.map((d, idx) => ({
    x: padX + (idx / Math.max(dataPoints.length - 1, 1)) * (svgWidth - padX * 2),
    y: svgHeight - padY - ((d.value - minVal) / valRange) * (svgHeight - padY * 2),
    data: d,
  }));

  const smoothLinePath = createSmoothPath(points);
  const smoothAreaPath =
    points.length > 0
      ? `${smoothLinePath} L ${points[points.length - 1].x} ${svgHeight - padY} L ${points[0].x} ${svgHeight - padY} Z`
      : "";

  // Mouse move handler for interactive crosshair
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!chartRef.current || points.length === 0) return;
    const rect = chartRef.current.getBoundingClientRect();
    const mouseSvgX = ((e.clientX - rect.left) / rect.width) * svgWidth;
    const mouseSvgY = ((e.clientY - rect.top) / rect.height) * svgHeight;

    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });

    // Find nearest point along X
    let closestIndex = 0;
    let closestDistance = Infinity;

    points.forEach((p, idx) => {
      const dist = Math.abs(p.x - mouseSvgX);
      if (dist < closestDistance) {
        closestDistance = dist;
        closestIndex = idx;
      }
    });

    setHoveredPointIndex(closestIndex);
  };

  const peakVal = Math.max(...rawValues);
  const lowestVal = Math.min(...rawValues);
  const avgVal = Math.round(rawValues.reduce((a, b) => a + b, 0) / rawValues.length);

  const formatDisplayVal = (num: number) => {
    if (isCurrency) {
      return `${currencySymbol}${num.toLocaleString()}`;
    }
    return num.toLocaleString();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 overflow-y-auto">
          {/* Backdrop with blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-neutral-950/50 backdrop-blur-xs cursor-pointer"
            onClick={onClose}
          />

          {/* Modal Container (flat stroke-free elevation) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", damping: 28, stiffness: 350 }}
            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl z-10 overflow-hidden flex flex-col my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Modal Header */}
            <div className="px-6 pt-6 pb-4 flex items-start justify-between border-b border-neutral-100">
              <div className="flex items-start gap-3.5">
                {/* Flat subtle icon container (no dark background) */}
                <div className="w-10 h-10 rounded-xl bg-[#f4f5f8] text-neutral-800 flex items-center justify-center shrink-0">
                  {icon ? (
                    React.isValidElement(icon) ? (
                      React.cloneElement(icon as React.ReactElement<any>, { className: "w-5 h-5 text-neutral-800" })
                    ) : (
                      icon
                    )
                  ) : (
                    <BarChart3 className="w-5 h-5 text-neutral-800" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                      Metric Deep Dive
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <h2 className="text-lg sm:text-xl font-bold tracking-tight text-neutral-900 mt-0.5">
                    {title}
                  </h2>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {description || `Historical trajectory and performance breakdown for ${title.toLowerCase()}`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 hover:text-neutral-900 flex items-center justify-center transition cursor-pointer active:scale-95"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Metric Value & Range Selector Row */}
            <div className="px-6 pt-5 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-medium text-neutral-400">Current Value</span>
                <div className="flex items-baseline gap-2.5 mt-0.5">
                  <span className="text-3xl sm:text-4xl font-extrabold text-neutral-900 tracking-tight">
                    {value}
                  </span>
                  {change && (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        changeType === "increase"
                          ? "bg-emerald-100 text-emerald-800"
                          : changeType === "decrease"
                          ? "bg-rose-100 text-rose-800"
                          : "bg-neutral-100 text-neutral-700"
                      }`}
                    >
                      {changeType === "increase" && <TrendingUp className="w-3.5 h-3.5 stroke-[2.5]" />}
                      {changeType === "decrease" && <TrendingDown className="w-3.5 h-3.5 stroke-[2.5]" />}
                      {change}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-neutral-400">{period}</span>
              </div>

              {/* Time Range Pills (flat stroke-free container) */}
              <div className="flex items-center p-1 bg-[#f4f5f8] rounded-full self-start sm:self-auto">
                {(["7D", "30D", "90D", "1Y", "ALL"] as TimeRange[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setSelectedRange(r);
                      setHoveredPointIndex(null);
                    }}
                    className={`px-3 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer ${
                      selectedRange === r
                        ? "bg-white text-neutral-950 shadow-xs font-bold"
                        : "text-neutral-600 hover:text-neutral-900"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* High-Resolution Interactive SVG Chart */}
            <div className="px-6 py-2">
              <div className="relative w-full h-[240px] bg-[#f4f5f8] rounded-2xl p-2.5 overflow-hidden flex flex-col justify-end">
                {/* Horizontal gridlines */}
                <div className="absolute inset-x-0 inset-y-6 flex flex-col justify-between pointer-events-none px-6">
                  {[1, 2, 3].map((gridIdx) => (
                    <div key={gridIdx} className="w-full border-t border-dashed border-neutral-200/80" />
                  ))}
                </div>

                <svg
                  ref={chartRef}
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  className="w-full h-full overflow-visible cursor-crosshair relative z-10"
                  onMouseMove={handleMouseMove}
                  onMouseLeave={() => setHoveredPointIndex(null)}
                >
                  <defs>
                    <linearGradient id="metricModalGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor={changeType === "decrease" ? "#f43f5e" : "#10b981"}
                        stopOpacity="0.18"
                      />
                      <stop
                        offset="100%"
                        stopColor={changeType === "decrease" ? "#f43f5e" : "#10b981"}
                        stopOpacity="0.0"
                      />
                    </linearGradient>
                  </defs>

                  {/* Gradient area */}
                  {smoothAreaPath && <path d={smoothAreaPath} fill="url(#metricModalGrad)" />}

                  {/* Catmull-Rom Bezier Spline */}
                  {smoothLinePath && (
                    <motion.path
                      d={smoothLinePath}
                      fill="none"
                      stroke={changeType === "decrease" ? "#e11d48" : "#0f0f11"}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Interactive Crosshair Line */}
                  {hoveredPointIndex !== null && points[hoveredPointIndex] && (
                    <line
                      x1={points[hoveredPointIndex].x}
                      y1={padY}
                      x2={points[hoveredPointIndex].x}
                      y2={svgHeight - padY}
                      stroke="#94a3b8"
                      strokeWidth="1"
                      strokeDasharray="4 3"
                    />
                  )}

                  {/* Data Points */}
                  {points.map((p, idx) => {
                    const isHovered = hoveredPointIndex === idx;
                    return (
                      <g key={idx}>
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={isHovered ? 5.5 : 3}
                          className={`${
                            changeType === "decrease" ? "fill-rose-600" : "fill-neutral-900"
                          } stroke-white stroke-2 transition-all duration-150`}
                        />
                        {isHovered && (
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r={12}
                            fill={changeType === "decrease" ? "#f43f5e" : "#10b981"}
                            fillOpacity="0.15"
                          />
                        )}
                        {/* Periodic X-axis labels */}
                        {(idx % Math.ceil(points.length / 5) === 0 || idx === points.length - 1) && (
                          <text
                            x={p.x}
                            y={svgHeight - 8}
                            textAnchor="middle"
                            className="text-[10px] font-semibold fill-neutral-400 select-none"
                          >
                            {p.data.date}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>

                {/* Floating Tooltip Follower */}
                {hoveredPointIndex !== null && points[hoveredPointIndex] && (
                  <div
                    className="absolute pointer-events-none z-30 bg-neutral-950 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-xl whitespace-nowrap flex items-center gap-1.5"
                    style={{
                      left: mousePos.x,
                      top: Math.max(8, mousePos.y - 42),
                      transform: "translateX(-50%)",
                    }}
                  >
                    <span className="text-neutral-400 font-medium">{points[hoveredPointIndex].data.date}:</span>
                    <span className="text-white font-bold">{formatDisplayVal(points[hoveredPointIndex].data.value)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats Summary Grid (Card-in-Card Architecture - flat #f4f5f8 without stroke) */}
            <div className="px-6 py-3">
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 rounded-2xl bg-[#f4f5f8]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    Highest Peak
                  </span>
                  <div className="text-sm sm:text-base font-bold text-neutral-900 mt-0.5">
                    {formatDisplayVal(peakVal)}
                  </div>
                  <span className="text-[10px] text-emerald-600 font-medium">Record in range</span>
                </div>

                <div className="p-3 rounded-2xl bg-[#f4f5f8]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    Average
                  </span>
                  <div className="text-sm sm:text-base font-bold text-neutral-900 mt-0.5">
                    {formatDisplayVal(avgVal)}
                  </div>
                  <span className="text-[10px] text-neutral-400 font-medium">Period mean</span>
                </div>

                <div className="p-3 rounded-2xl bg-[#f4f5f8]">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    Baseline
                  </span>
                  <div className="text-sm sm:text-base font-bold text-neutral-900 mt-0.5">
                    {formatDisplayVal(lowestVal)}
                  </div>
                  <span className="text-[10px] text-neutral-400 font-medium">Lowest floor</span>
                </div>
              </div>
            </div>

            {/* Modal Footer with Actions */}
            <div className="px-6 py-4 bg-neutral-50 border-t border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-neutral-500 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Audited from real-time database ledger</span>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary px-5 py-2 text-xs font-semibold cursor-pointer active:scale-95"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
