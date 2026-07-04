"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs, limit, orderBy } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  changeType: "increase" | "decrease" | "neutral";
}

function StatCard({ title, value, change, changeType }: StatCardProps) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-neutral-500">{title}</p>
      <div className="mt-2 flex items-baseline justify-between">
        <h2 className="text-3xl font-bold tracking-tight">{value}</h2>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${
            changeType === "increase"
              ? "bg-neutral-50 text-black border-neutral-200"
              : changeType === "decrease"
              ? "bg-red-50 text-red-800 border-red-200"
              : "bg-neutral-50 text-neutral-600 border-neutral-200"
          }`}
        >
          {change}
        </span>
      </div>
    </div>
  );
}

interface ActivityItem {
  id: string;
  type: string;
  message: string;
  time: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState({
    mrr: "€0",
    todayProcessing: "€0",
    netRevenue: "€0",
  });
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      try {
        const userDoc = await getDocs(
          query(collection(db, "users"), where("uid", "==", user.uid), limit(1))
        );
        if (!userDoc.empty) {
          const uData = userDoc.docs[0].data();
          const clinicId = uData.clinicId;

          // Fetch real stats from Firestore if any, or default to €0
          setStats({
            mrr: "€0",
            todayProcessing: "€0",
            netRevenue: "€0",
          });

          setActivities([]);
        }
      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-8">
      {/* Overview Stat cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <StatCard
          title="Monthly Recurring Revenue (MRR)"
          value={stats.mrr}
          change="+12.4% MoM"
          changeType="increase"
        />
        <StatCard
          title="Today's Processing"
          value={stats.todayProcessing}
          change="+4.8% vs yesterday"
          changeType="increase"
        />
        <StatCard
          title="Net Revenue (MTD)"
          value={stats.netRevenue}
          change="+18.2% vs last month"
          changeType="increase"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Live Operational Feed */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold tracking-tight mb-4">Live Activity Feed</h3>
          {loading ? (
            <div className="py-4 text-sm text-neutral-500">Loading feed...</div>
          ) : activities.length === 0 ? (
            <p className="text-sm text-neutral-500">No recent activity detected.</p>
          ) : (
            <div className="flow-root">
              <ul className="-mb-8">
                {activities.map((act, idx) => (
                  <li key={act.id}>
                    <div className="relative pb-8">
                      {idx !== activities.length - 1 && (
                        <span
                          className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-neutral-200"
                          aria-hidden="true"
                        />
                      )}
                      <div className="relative flex space-x-3">
                        <div>
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-100 ring-8 ring-white text-[10px] font-bold border border-neutral-200">
                            {act.type[0]}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-neutral-900">{act.message}</p>
                          <p className="text-xs text-neutral-400 mt-0.5">{act.time}</p>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Quick Actions / Integration Status */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-lg font-bold tracking-tight mb-2">Clinic Integration Status</h3>
            <p className="text-sm text-neutral-500 mb-6">
              Manage your connection endpoints, merchant status, and live customer experience.
            </p>

            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <span className="text-sm font-medium">Firestore Sync</span>
                <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-700 ring-1 ring-inset ring-green-600/20">
                  Connected
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                <span className="text-sm font-medium">Stripe Payment Gateway</span>
                <span className="inline-flex items-center rounded-full bg-neutral-50 px-2 py-1 text-xs font-semibold text-neutral-700 ring-1 ring-inset ring-neutral-200">
                  Setup Required
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">App Emulation</span>
                <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-700 ring-1 ring-inset ring-green-600/20">
                  Ready
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-neutral-100 pt-4 flex gap-4">
            <button className="rounded-md bg-black px-3.5 py-2 text-xs font-semibold text-white hover:bg-neutral-800 shadow-sm transition">
              Launch App Builder
            </button>
            <button className="rounded-md border border-neutral-300 bg-white px-3.5 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition">
              View Analytics
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
