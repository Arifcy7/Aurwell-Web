"use client";

import React from "react";

export function StatCardSkeleton() {
  return (
    <div className="admin-card rounded-3xl p-5 sm:p-6 space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-4 w-28 bg-neutral-200 rounded-full" />
        <div className="h-10 w-10 bg-neutral-200 rounded-full" />
      </div>
      <div className="h-8 w-36 bg-neutral-200 rounded-full" />
      <div className="flex items-center gap-2 pt-2 border-t border-neutral-100">
        <div className="h-4 w-12 bg-neutral-200 rounded-full" />
        <div className="h-3 w-20 bg-neutral-100 rounded-full" />
      </div>
    </div>
  );
}

export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="animate-pulse border-b border-neutral-100/60">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="py-4 px-4">
          <div className="h-4 bg-neutral-200 rounded-full w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  );
}

export function TableSkeleton({
  rows = 5,
  cols = 5,
  showHeader = true,
}: {
  rows?: number;
  cols?: number;
  showHeader?: boolean;
}) {
  return (
    <div className="w-full min-w-0 overflow-x-auto rounded-3xl bg-white p-6 animate-pulse space-y-4">
      {showHeader && (
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 shrink-0 rounded-full bg-neutral-200" />
          <div className="space-y-1.5 flex-1 min-w-0">
            <div className="h-4 w-40 max-w-full bg-neutral-200 rounded-full" />
            <div className="h-3 w-60 max-w-full bg-neutral-100 rounded-full" />
          </div>
        </div>
      )}
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
                className={`h-4 bg-neutral-100 rounded-full ${cIdx === 0 ? "w-28 bg-neutral-200" : "w-16"}`}
              ></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ContentGridSkeleton({
  count = 6,
  variant = "standard",
}: {
  count?: number;
  variant?: "standard" | "banner" | "treatment";
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="admin-card rounded-3xl overflow-hidden animate-pulse flex flex-col justify-between"
        >
          {variant === "banner" ? (
            <div className="aspect-[16/9] w-full bg-neutral-200" />
          ) : (
            <div className="h-44 w-full bg-neutral-200" />
          )}
          <div className="p-5 space-y-3">
            <div className="h-4 w-1/2 bg-neutral-200 rounded-full" />
            <div className="space-y-2">
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

export function CardGridSkeleton({
  count = 3,
  variant = "treatment",
}: {
  count?: number;
  variant?: "treatment" | "membership" | "reward" | "banner" | "blog";
}) {
  const layouts = {
    treatment: { grid: "gap-4 sm:grid-cols-2 lg:grid-cols-3 items-start", image: "aspect-[16/9]", body: "p-3.5" },
    membership: { grid: "gap-4 sm:grid-cols-2 lg:grid-cols-3 items-start", image: "aspect-[16/9]", body: "p-3.5" },
    reward: { grid: "gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 items-start", image: "", body: "p-3.5" },
    banner: { grid: "gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 items-start", image: "aspect-[16/9]", body: "p-3.5" },
    blog: { grid: "gap-4 sm:grid-cols-2 lg:grid-cols-3 items-start", image: "aspect-[16/9]", body: "p-3.5" },
  };
  const layout = layouts[variant];

  return (
    <div className={`grid ${layout.grid}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-3xl bg-white p-2 shadow-xs animate-pulse flex flex-col justify-between"
        >
          {/* Inner card without strokes */}
          <div className="rounded-[1.125rem] overflow-hidden bg-[#f4f5f8] flex-1 flex flex-col justify-between">
            {layout.image && <div className={`w-full bg-neutral-200 ${layout.image}`} />}
            <div className={`space-y-3 ${layout.body}`}>
              {variant === "reward" && (
                <div className="flex justify-between gap-4">
                  <div className="h-5 w-20 bg-neutral-200 rounded-full" />
                  <div className="h-5 w-14 bg-neutral-200 rounded-full" />
                </div>
              )}
              <div className="space-y-2">
                <div className="h-4 w-3/4 bg-neutral-200 rounded-full" />
                <div className="h-3 w-full bg-neutral-100 rounded-full" />
                <div className="h-3 w-2/3 bg-neutral-100 rounded-full" />
              </div>
            </div>
          </div>
          {/* Outside inner card at bottom */}
          <div className="px-2 pt-2.5 pb-1 flex items-center justify-between gap-2">
            <div className="h-4.5 w-16 bg-neutral-200 rounded-full" />
            <div className="flex gap-1.5">
              <div className="h-6 w-12 bg-neutral-200 rounded-lg" />
              <div className="h-6 w-12 bg-neutral-200 rounded-lg" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

import AdminSplashScreen from "./AdminSplashScreen";

export function PageSpinner({ label = "Loading data..." }: { label?: string }) {
  return (
    <div className="w-full min-h-[calc(100vh-12rem)] flex items-center justify-center">
      <AdminSplashScreen fullScreen={false} label={label} />
    </div>
  );
}
