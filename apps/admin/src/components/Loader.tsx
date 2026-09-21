"use client";

import React from "react";

export function StatCardSkeleton() {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-100 animate-pulse space-y-4">
      <div className="flex items-center justify-between">
        <div className="h-4 w-28 bg-neutral-200 rounded-full"></div>
        <div className="w-10 h-10 rounded-full bg-neutral-200"></div>
      </div>
      <div className="h-8 w-36 bg-neutral-200 rounded-lg"></div>
      <div className="h-4 w-24 bg-neutral-200 rounded-full"></div>
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 5, showHeader = true }: { rows?: number; cols?: number; showHeader?: boolean }) {
  return (
    <div role="status" aria-label="Loading table" className="w-full min-w-0 overflow-x-auto rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-100 motion-safe:animate-pulse space-y-4">
      <span className="sr-only">Loading table...</span>
      {showHeader && (
        <div aria-hidden="true" className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 shrink-0 rounded-full bg-neutral-200" />
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="h-4 w-40 max-w-full bg-neutral-200 rounded-full" />
            <div className="h-3 w-60 max-w-full bg-neutral-100 rounded-full" />
          </div>
        </div>
      )}

      <div aria-hidden="true" className="space-y-3" style={{ minWidth: cols * 112 }}>
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

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading offers" className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      <span className="sr-only">Loading offers...</span>
      <div aria-hidden="true" className="divide-y divide-neutral-100 motion-safe:animate-pulse">
        {Array.from({ length: rows }, (_, index) => (
          <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:px-6 sm:py-4.5 gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="h-12 w-12 shrink-0 rounded-2xl bg-neutral-200" />
              <div className="w-48 max-w-full space-y-2">
                <div className="h-4 w-3/4 rounded-full bg-neutral-200" />
                <div className="h-3 w-full rounded-full bg-neutral-100" />
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-6 pt-2 sm:pt-0 border-t sm:border-0 border-neutral-100">
              <div className="h-4 w-24 rounded-full bg-neutral-100" />
              <div className="h-8 w-24 rounded-full bg-neutral-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardGridSkeleton({
  count = 3,
  variant = "treatment",
}: {
  count?: number;
  variant?: "treatment" | "membership" | "reward" | "banner" | "blog";
}) {
  const layouts = {
    treatment: { grid: "gap-5 sm:grid-cols-2 lg:grid-cols-3", image: "h-36", body: "p-5" },
    membership: { grid: "gap-6 md:grid-cols-2", image: "h-44 sm:h-48", body: "p-6 sm:p-7" },
    reward: { grid: "gap-5 grid-cols-1 md:grid-cols-3", image: "", body: "p-6" },
    banner: { grid: "gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3", image: "aspect-[16/9]", body: "p-5" },
    blog: { grid: "gap-5 md:grid-cols-2", image: "h-44", body: "p-6" },
  };
  const layout = layouts[variant];

  return (
    <div role="status" aria-label="Loading cards" className={`grid ${layout.grid}`}>
      <span className="sr-only">Loading cards...</span>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className="min-w-0 overflow-hidden rounded-2xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-100 motion-safe:animate-pulse"
        >
          {layout.image && <div className={`w-full bg-neutral-200 ${layout.image}`} />}
          <div className={`space-y-4 ${layout.body}`}>
            {variant === "reward" && (
              <div className="flex justify-between gap-4">
                <div className="h-6 w-24 bg-neutral-200 rounded-full" />
                <div className="h-6 w-16 bg-neutral-200 rounded-full" />
              </div>
            )}
            <div className="space-y-2">
              <div className="h-4 w-3/4 bg-neutral-200 rounded-full" />
              <div className="h-3 w-full bg-neutral-100 rounded-full" />
              <div className="h-3 w-2/3 bg-neutral-100 rounded-full" />
            </div>
            {variant !== "banner" && (
              <div className="space-y-2 border-t border-neutral-100 pt-4">
                <div className="h-3 w-1/3 bg-neutral-200 rounded-full" />
                <div className="h-3 w-full bg-neutral-100 rounded-full" />
                <div className="h-3 w-2/3 bg-neutral-100 rounded-full" />
              </div>
            )}
          </div>
          <div className="flex justify-between items-center border-t border-neutral-100 px-5 py-3.5">
            <div className="h-5 w-16 bg-neutral-200 rounded-full" />
            <div className="h-7 w-28 bg-neutral-200 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

import AdminSplashScreen from "./AdminSplashScreen";

export function PageSpinner({ label = "Loading data..." }: { label?: string }) {
  return (
    <div className="relative w-full min-h-[480px]">
      <AdminSplashScreen fullScreen={false} label={label} />
    </div>
  );
}
