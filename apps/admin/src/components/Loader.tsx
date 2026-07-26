"use client";

import React from "react";

export function StatCardSkeleton() {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-100 animate-pulse space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-4 w-28 bg-neutral-200 rounded-full"></div>
        <div className="w-10 h-10 rounded-full bg-neutral-200"></div>
      </div>
      <div className="h-8 w-36 bg-neutral-200 rounded-lg"></div>
      <div className="h-4 w-24 bg-neutral-200 rounded-full"></div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-100 animate-pulse space-y-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-full bg-neutral-200"></div>
        <div className="space-y-1.5 flex-1">
          <div className="h-4 w-40 bg-neutral-200 rounded-full"></div>
          <div className="h-3 w-60 bg-neutral-100 rounded-full"></div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between py-2 border-b border-neutral-100">
          {Array.from({ length: cols }).map((_, i) => (
            <div key={i} className="h-3 w-20 bg-neutral-200 rounded-full"></div>
          ))}
        </div>
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={rIdx} className="flex justify-between py-3 border-b border-neutral-50 items-center">
            {Array.from({ length: cols }).map((_, cIdx) => (
              <div
                key={cIdx}
                className={`h-4 bg-neutral-100 rounded-full ${
                  cIdx === 0 ? "w-28 bg-neutral-200" : "w-16"
                }`}
              ></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-3xl bg-white p-4.5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-100 animate-pulse space-y-3"
        >
          <div className="h-32 w-full bg-neutral-200 rounded-2xl"></div>
          <div className="space-y-2">
            <div className="h-4 w-3/4 bg-neutral-200 rounded-full"></div>
            <div className="h-3 w-full bg-neutral-100 rounded-full"></div>
            <div className="h-3 w-2/3 bg-neutral-100 rounded-full"></div>
          </div>
          <div className="flex justify-between items-center pt-2">
            <div className="h-5 w-16 bg-neutral-200 rounded-full"></div>
            <div className="h-7 w-20 bg-neutral-200 rounded-full"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function PageSpinner({ label = "Loading data..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-4">
      <div className="relative flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-neutral-200 border-t-neutral-900 animate-spin"></div>
        <div className="absolute w-3 h-3 bg-emerald-500 rounded-full animate-ping"></div>
      </div>
      <p className="text-xs font-semibold text-neutral-400 tracking-wide">{label}</p>
    </div>
  );
}
