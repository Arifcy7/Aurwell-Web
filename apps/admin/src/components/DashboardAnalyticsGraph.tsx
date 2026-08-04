"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  BarChart3,
  PieChart,
  Users,
  DollarSign,
  ChevronDown,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Calendar,
} from "lucide-react";

type GraphViewType = "revenue" | "clients" | "treatments" | "memberships";

interface AnalyticsDataPoint {
  label: string;
  revenue: number;
  newClients: number;
  returningClients: number;
}

const monthlyData: AnalyticsDataPoint[] = [
  { label: "Jan", revenue: 4200, newClients: 18, returningClients: 32 },
  { label: "Feb", revenue: 5800, newClients: 24, returningClients: 41 },
  { label: "Mar", revenue: 7400, newClients: 31, returningClients: 53 },
  { label: "Apr", revenue: 9200, newClients: 38, returningClients: 64 },
  { label: "May", revenue: 12600, newClients: 49, returningClients: 78 },
  { label: "Jun", revenue: 15800, newClients: 62, returningClients: 95 },
];

const topTreatments = [
  { name: "Profhilo Skin Booster", sessions: 142, revenue: "€49,700", share: 38, color: "bg-emerald-500" },
  { name: "HydraFacial Platinum", sessions: 118, revenue: "€29,500", share: 26, color: "bg-teal-500" },
  { name: "Microneedling (CIT)", sessions: 84, revenue: "€18,480", share: 20, color: "bg-indigo-500" },
  { name: "Dermal Fillers (Lip/Cheek)", sessions: 56, revenue: "€19,600", share: 16, color: "bg-purple-500" },
];

const membershipTiers = [
  { name: "Prestige Elite VIP", activeCount: 68, monthlyRevenue: "€30,532", growth: "+14%", color: "bg-neutral-900" },
  { name: "Lumière Glow Club", activeCount: 124, monthlyRevenue: "€24,676", growth: "+22%", color: "bg-emerald-600" },
  { name: "Essentials Skincare", activeCount: 89, monthlyRevenue: "€8,811", growth: "+9%", color: "bg-teal-600" },
];

interface DashboardAnalyticsGraphProps {
  currency?: string;
}

export default function DashboardAnalyticsGraph({
  currency = "EUR",
}: DashboardAnalyticsGraphProps) {
  const [graphType, setGraphType] = useState<GraphViewType>("revenue");
  const [hoveredDataIndex, setHoveredDataIndex] = useState<number | null>(null);

  // SVG Area Chart calculations
  const maxRevenue = Math.max(...monthlyData.map((d) => d.revenue));
  const svgWidth = 500;
  const svgHeight = 180;
  const paddingX = 40;
  const paddingY = 25;

  const points = monthlyData.map((d, index) => {
    const x = paddingX + (index / (monthlyData.length - 1)) * (svgWidth - paddingX * 2);
    const y = svgHeight - paddingY - (d.revenue / maxRevenue) * (svgHeight - paddingY * 2);
    return { x, y, data: d };
  });

  // SVG path string generation
  const areaPath =
    `M ${points[0].x} ${points[0].y} ` +
    points.slice(1).map((p) => `L ${p.x} ${p.y}`).join(" ") +
    ` L ${points[points.length - 1].x} ${svgHeight - paddingY} L ${points[0].x} ${svgHeight - paddingY} Z`;

  const linePath =
    `M ${points[0].x} ${points[0].y} ` +
    points.slice(1).map((p) => `L ${p.x} ${p.y}`).join(" ");

  return (
    <div className="rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-100 flex flex-col justify-between transition-all hover:shadow-[0_12px_40px_rgb(0,0,0,0.06)] min-h-[440px]">
      {/* Header & Dropdown Controls */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              {graphType === "revenue" && <TrendingUp className="w-4 h-4" />}
              {graphType === "clients" && <Users className="w-4 h-4" />}
              {graphType === "treatments" && <BarChart3 className="w-4 h-4" />}
              {graphType === "memberships" && <PieChart className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 tracking-tight flex items-center gap-2">
                Clinic Analytics
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80">
                  Live
                </span>
              </h3>
              <p className="text-xs text-neutral-400 font-medium">Performance trends & revenue distribution</p>
            </div>
          </div>

          {/* Graph View Dropdown Selector */}
          <div className="relative">
            <select
              value={graphType}
              onChange={(e) => setGraphType(e.target.value as GraphViewType)}
              className="appearance-none bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-full px-4 py-2 pr-9 text-xs font-semibold text-neutral-800 cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-black/10"
            >
              <option value="revenue">📈 Revenue Growth (€)</option>
              <option value="clients">👥 Client Acquisition</option>
              <option value="treatments">💉 Top Treatments</option>
              <option value="memberships">💳 Membership Tiers</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-neutral-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Dynamic Graph Container with Framer Motion Switcher */}
        <AnimatePresence mode="wait">
          {graphType === "revenue" && (
            <motion.div
              key="revenue"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-xs font-semibold text-neutral-400">Total H1 Revenue</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl sm:text-3xl font-black text-neutral-900">€55,000</span>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60 inline-flex items-center gap-0.5">
                      <ArrowUpRight className="w-3 h-3" /> +28.4%
                    </span>
                  </div>
                </div>
                <div className="text-right text-xs text-neutral-400 font-medium">
                  Jan – Jun 2026
                </div>
              </div>

              {/* Interactive SVG Area Chart */}
              <div className="relative w-full h-[200px] bg-neutral-50/50 border border-neutral-100 rounded-2xl p-2 flex flex-col justify-end overflow-hidden">
                <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Gradient Area Fill */}
                  <motion.path
                    initial={{ d: `M ${points[0].x} ${svgHeight - paddingY} L ${points[points.length - 1].x} ${svgHeight - paddingY} Z` }}
                    animate={{ d: areaPath }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    fill="url(#revenueGradient)"
                  />

                  {/* Line Stroke */}
                  <motion.path
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                    d={linePath}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />

                  {/* Data Points */}
                  {points.map((p, index) => (
                    <g key={index} className="cursor-pointer" onMouseEnter={() => setHoveredDataIndex(index)} onMouseLeave={() => setHoveredDataIndex(null)}>
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={hoveredDataIndex === index ? 6 : 4}
                        className={`transition-all duration-200 ${hoveredDataIndex === index ? "fill-emerald-600 stroke-white stroke-2" : "fill-neutral-900"}`}
                      />
                      {/* X Axis Labels */}
                      <text x={p.x} y={svgHeight - 5} textAnchor="middle" className="text-[10px] font-bold fill-neutral-400">
                        {p.data.label}
                      </text>
                    </g>
                  ))}
                </svg>

                {/* Tooltip Overlay */}
                {hoveredDataIndex !== null && (
                  <div className="absolute top-3 left-4 bg-neutral-900 text-white text-xs font-semibold px-3 py-1.5 rounded-xl shadow-md pointer-events-none flex items-center gap-2 animate-fadeIn">
                    <span>{monthlyData[hoveredDataIndex].label}:</span>
                    <span className="text-emerald-400 font-extrabold">€{monthlyData[hoveredDataIndex].revenue.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {graphType === "clients" && (
            <motion.div
              key="clients"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-neutral-400">Active Monthly Patients</span>
                  <div className="text-2xl font-black text-neutral-900">157 Total / Month</div>
                </div>
                <div className="flex items-center gap-3 text-xs font-medium">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> New
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-neutral-900" /> Returning
                  </span>
                </div>
              </div>

              {/* Dual Bar Comparison Chart */}
              <div className="h-[200px] bg-neutral-50/50 border border-neutral-100 rounded-2xl p-4 flex items-end justify-between gap-3">
                {monthlyData.map((d, idx) => (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group">
                    <div className="w-full flex items-end justify-center gap-1 h-[140px]">
                      {/* New Clients Bar */}
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${(d.newClients / 70) * 100}%` }}
                        transition={{ duration: 0.5, delay: idx * 0.05 }}
                        className="w-1/2 bg-emerald-500 rounded-t-lg group-hover:bg-emerald-600 transition-colors"
                        title={`New: ${d.newClients}`}
                      />
                      {/* Returning Clients Bar */}
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${(d.returningClients / 100) * 100}%` }}
                        transition={{ duration: 0.5, delay: idx * 0.05 + 0.1 }}
                        className="w-1/2 bg-neutral-900 rounded-t-lg group-hover:bg-neutral-800 transition-colors"
                        title={`Returning: ${d.returningClients}`}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-neutral-500">{d.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {graphType === "treatments" && (
            <motion.div
              key="treatments"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Treatment Volume & Revenue</span>
                <span className="text-xs font-semibold text-emerald-600">Top 4 Services</span>
              </div>

              <div className="space-y-2.5">
                {topTreatments.map((t, idx) => (
                  <div key={idx} className="p-3 bg-neutral-50/70 border border-neutral-100 rounded-2xl space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-neutral-900">{t.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-neutral-500 font-medium">{t.sessions} sessions</span>
                        <span className="font-extrabold text-neutral-900">{t.revenue}</span>
                      </div>
                    </div>
                    {/* Progress Fill Bar */}
                    <div className="w-full h-2 bg-neutral-200/80 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${t.share}%` }}
                        transition={{ duration: 0.6, delay: idx * 0.08 }}
                        className={`h-full ${t.color} rounded-full`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {graphType === "memberships" && (
            <motion.div
              key="memberships"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="space-y-3.5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-neutral-400">MRR (Monthly Recurring Revenue)</span>
                  <div className="text-2xl font-black text-neutral-900">€64,023 / mo</div>
                </div>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                  281 Active VIP Members
                </span>
              </div>

              <div className="space-y-2.5">
                {membershipTiers.map((tier, idx) => (
                  <div key={idx} className="p-3.5 bg-neutral-50/70 border border-neutral-100 rounded-2xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${tier.color}`} />
                      <div>
                        <h4 className="text-xs font-bold text-neutral-900">{tier.name}</h4>
                        <p className="text-[11px] text-neutral-500 font-medium">{tier.activeCount} active subscribers</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-extrabold text-neutral-900 block">{tier.monthlyRevenue}</span>
                      <span className="text-[10px] font-bold text-emerald-600">{tier.growth} vs last mo</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Mini Metrics Summary */}
      <div className="pt-4 mt-4 border-t border-neutral-100 grid grid-cols-3 gap-2 text-center select-none">
        <div className="p-2 rounded-xl bg-neutral-50/60 border border-neutral-100">
          <span className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider block">Peak Day</span>
          <span className="text-xs font-bold text-neutral-900">Friday</span>
        </div>
        <div className="p-2 rounded-xl bg-neutral-50/60 border border-neutral-100">
          <span className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider block">Avg Ticket</span>
          <span className="text-xs font-bold text-neutral-900">€345</span>
        </div>
        <div className="p-2 rounded-xl bg-neutral-50/60 border border-neutral-100">
          <span className="text-[10px] text-neutral-400 font-semibold uppercase tracking-wider block">Retention</span>
          <span className="text-xs font-bold text-emerald-600">84.2%</span>
        </div>
      </div>
    </div>
  );
}
