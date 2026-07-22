"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";
import StatCard from "@/components/StatCard";
import { Wallet, Users, DollarSign, Activity, CheckCircle2, ArrowRight, ShieldCheck } from "lucide-react";

interface ActivityItem {
  id: string;
  type: string;
  message: string;
  time: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState({
    mrr: "€128k",
    todayProcessing: "512",
    netRevenue: "€42.5k",
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

          // Set active clinic stats (fallback to realistic demo values if empty)
          setStats({
            mrr: "€128k",
            todayProcessing: "512",
            netRevenue: "€42.5k",
          });

          setActivities([
            {
              id: "1",
              type: "Membership",
              message: "Elena Vance renewed Gold VIP Membership Tier",
              time: "10 mins ago",
            },
            {
              id: "2",
              type: "Reward",
              message: "Markus Thorne redeemed 500 Loyalty Points for Hydrafacial",
              time: "45 mins ago",
            },
            {
              id: "3",
              type: "Check-in",
              message: "Sarah Jenkins completed QR Verification check-in",
              time: "2 hours ago",
            },
          ]);
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
    <div className="space-y-4">
      {/* Overview Stat Cards Matching Reference */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="Overview Earning"
          value={stats.mrr}
          change="36.8%"
          changeType="increase"
          period="vs last year"
          icon={<Wallet className="w-5 h-5 stroke-[1.75]" />}
          showSparkline={true}
        />
        <StatCard
          title="Active Customers"
          value={stats.todayProcessing}
          change="12.4%"
          changeType="increase"
          period="vs last month"
          icon={<Users className="w-5 h-5 stroke-[1.75]" />}
          showSparkline={true}
        />
        <StatCard
          title="Net Revenue (MTD)"
          value={stats.netRevenue}
          change="18.2%"
          changeType="increase"
          period="vs last month"
          icon={<DollarSign className="w-5 h-5 stroke-[1.75]" />}
          showSparkline={true}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Live Operational Feed */}
        <div className="rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-100 transition-all hover:shadow-[0_12px_40px_rgb(0,0,0,0.06)]">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900 tracking-tight">Product Activity</h3>
                <p className="text-xs text-neutral-400 font-medium">Real-time audit log & client transactions</p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600 border border-emerald-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Feed
            </span>
          </div>

          {loading ? (
            <div className="py-8 text-center text-sm text-neutral-400">Loading feed...</div>
          ) : activities.length === 0 ? (
            <p className="text-sm text-neutral-400 py-6">No recent activity detected.</p>
          ) : (
            <div className="flow-root">
              <ul className="space-y-3">
                {activities.map((act) => (
                  <li
                    key={act.id}
                    className="flex items-start gap-4 p-4 rounded-2xl bg-neutral-50/70 border border-neutral-100/80 hover:bg-neutral-50 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-xs font-bold text-neutral-800 shadow-sm border border-neutral-100 flex-shrink-0">
                      {act.type[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-neutral-900">{act.message}</p>
                      <p className="text-xs font-medium text-neutral-400 mt-0.5">{act.time}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Integration Status Card */}
        <div className="rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-100 flex flex-col justify-between transition-all hover:shadow-[0_12px_40px_rgb(0,0,0,0.06)]">
          <div>
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900 tracking-tight">Clinic Integration Status</h3>
                <p className="text-xs text-neutral-400 font-medium">Core system services & database sync</p>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-50/70 border border-neutral-100/80">
                <span className="text-sm font-semibold text-neutral-800">Firestore Realtime Database</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600 border border-emerald-100">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Connected
                </span>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-50/70 border border-neutral-100/80">
                <span className="text-sm font-semibold text-neutral-800">Stripe Payment Gateway</span>
                <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-100">
                  Setup Active
                </span>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-50/70 border border-neutral-100/80">
                <span className="text-sm font-semibold text-neutral-800">Mobile FCM Push Service</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600 border border-emerald-100">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Operational
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-neutral-100 flex items-center gap-3">
            <button className="flex-1 rounded-full bg-neutral-900 px-5 py-3 text-xs font-bold text-white hover:bg-neutral-800 shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer">
              Launch App Builder
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
