"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs, limit, doc, getDoc } from "firebase/firestore";
import { ref, onValue, off } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db, rtdb } from "@/lib/firebase/client";
import StatCard from "@/components/StatCard";
import { StatCardSkeleton, PageSpinner } from "@/components/Loader";
import { formatCurrency } from "@/lib/utils/currency";
import { Wallet, Users, DollarSign, Activity, CheckCircle2, ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";

interface ActivityItem {
  id: string;
  type: string;
  message: string;
  timestamp: number;
  userName?: string;
  userUid?: string;
}

function formatRelativeTime(timestamp: number): string {
  if (!timestamp) return "Just now";
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "Just now";
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getActivityBadgeLabel(type: string): string {
  switch (type) {
    case "qr_checkin":
      return "Check-in";
    case "reward_redeemed":
      return "Reward";
    case "membership_subscribed":
      return "Membership";
    case "treatment_purchased":
      return "Purchase";
    case "user_signed_in":
      return "Login";
    case "app_opened":
      return "App Visit";
    case "item_added_to_cart":
      return "Cart";
    case "treatment_viewed":
    case "membership_viewed":
    case "rewards_viewed":
      return "Browse";
    default:
      return type ? type.replace("_", " ") : "Activity";
  }
}

export default function DashboardPage() {
  const [currency, setCurrency] = useState("EUR");
  const [stats, setStats] = useState({
    overviewEarnings: "€0.00",
    activeCustomers: "0",
    netRevenueMTD: "€0.00",
  });
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [rtdbConnected, setRtdbConnected] = useState(false);

  useEffect(() => {
    let rtdbRef: any = null;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // 1. Fetch user's clinicId
        let clinicId = "";
        const userDoc = await getDocs(
          query(collection(db, "users"), where("uid", "==", user.uid), limit(1))
        );
        if (!userDoc.empty) {
          clinicId = userDoc.docs[0].data().clinicId;
        } else {
          // Fallback check doc directly
          const d = await getDoc(doc(db, "users", user.uid));
          if (d.exists()) {
            clinicId = d.data().clinicId;
          }
        }

        if (!clinicId) {
          setLoading(false);
          return;
        }

        // 2. Fetch Clinic Settings (Currency)
        let clinicCurr = "EUR";
        const clinicDoc = await getDoc(doc(db, "clinics", clinicId));
        if (clinicDoc.exists()) {
          clinicCurr = clinicDoc.data().currency || "EUR";
          setCurrency(clinicCurr);
        }

        // 3. Fetch Transactions for Financial Stats
        const txQuery = query(collection(db, "clinics", clinicId, "transactions"));
        const txSnapshot = await getDocs(txQuery);

        let totalEarnings = 0;
        let mtdEarnings = 0;

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

        txSnapshot.forEach((docSnap) => {
          const tx = docSnap.data();
          const amt = Number(tx.amount || 0);

          // Calculate total completed/valid revenue
          if (tx.status !== "Refunded") {
            totalEarnings += amt;

            // Check if transaction is in current month
            let txTime = 0;
            if (typeof tx.date === "number") {
              txTime = tx.date;
            } else if (tx.date && typeof tx.date.toDate === "function") {
              txTime = tx.date.toDate().getTime();
            }

            if (txTime >= startOfMonth) {
              mtdEarnings += amt;
            }
          }
        });

        // 4. Fetch Active Customers count from patients collection
        const patientsSnapshot = await getDocs(
          collection(db, "clinics", clinicId, "patients")
        );
        const customerCount = patientsSnapshot.size;

        setStats({
          overviewEarnings: formatCurrency(totalEarnings, clinicCurr),
          activeCustomers: String(customerCount),
          netRevenueMTD: formatCurrency(mtdEarnings, clinicCurr),
        });

        // 5. Connect to Firebase Realtime Database for live Product Activity
        rtdbRef = ref(rtdb, `activity_events/${clinicId}`);
        onValue(
          rtdbRef,
          (snapshot) => {
            setRtdbConnected(true);
            const val = snapshot.val();
            if (val) {
              const eventList: ActivityItem[] = Object.keys(val).map((key) => {
                const item = val[key];
                return {
                  id: item.id || key,
                  type: item.type || "activity",
                  message: item.message || "User activity recorded",
                  timestamp: Number(item.timestamp || Date.now()),
                  userName: item.userName,
                  userUid: item.userUid,
                };
              });

              // Sort newest first
              eventList.sort((a, b) => b.timestamp - a.timestamp);
              setActivities(eventList);
            } else {
              setActivities([]);
            }
            setLoading(false);
          },
          (error) => {
            console.error("RTDB Activity feed subscription error:", error);
            setRtdbConnected(false);
            setLoading(false);
          }
        );
      } catch (err) {
        console.error("Error loading dashboard data:", err);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (rtdbRef) {
        off(rtdbRef);
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* Overview Stat Cards Dynamic with Clinic Currency */}
      <div className="grid gap-4 md:grid-cols-3">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              title="Overview Earning"
              value={stats.overviewEarnings}
              change="Completed"
              changeType="increase"
              period="all-time transactions"
              icon={<Wallet className="w-5 h-5 stroke-[1.75]" />}
              showSparkline={true}
            />
            <StatCard
              title="Active Customers"
              value={stats.activeCustomers}
              change="Registered"
              changeType="increase"
              period="clinic patients"
              icon={<Users className="w-5 h-5 stroke-[1.75]" />}
              showSparkline={true}
            />
            <StatCard
              title="Net Revenue (MTD)"
              value={stats.netRevenueMTD}
              change="Current Month"
              changeType="increase"
              period="month-to-date sales"
              icon={<DollarSign className="w-5 h-5 stroke-[1.75]" />}
              showSparkline={true}
            />
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Live Operational Feed - Realtime DB activity_events */}
        <div className="rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-100 transition-all hover:shadow-[0_12px_40px_rgb(0,0,0,0.06)] flex flex-col">
          <div className="flex items-center justify-between mb-4">
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
            <div className="py-12 text-center text-sm text-neutral-400">
              <span className="inline-block w-4 h-4 border-2 border-neutral-300 border-t-emerald-500 rounded-full animate-spin mr-2" />
              Connecting live feed...
            </div>
          ) : activities.length === 0 ? (
            <div className="py-12 text-center rounded-2xl bg-neutral-50/70 border border-neutral-100 text-sm font-medium text-neutral-400">
              No recent activity events recorded yet.
            </div>
          ) : (
            <div className="max-h-[380px] overflow-y-auto pr-1.5 space-y-3 custom-scrollbar">
              {activities.map((act) => {
                const badgeLabel = getActivityBadgeLabel(act.type);
                return (
                  <div
                    key={act.id}
                    className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-neutral-50/70 border border-neutral-100/80 hover:bg-neutral-50 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-[10px] font-bold text-neutral-800 shadow-sm border border-neutral-100 flex-shrink-0 uppercase tracking-tight">
                      {badgeLabel.substring(0, 3)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100/80">
                          {badgeLabel}
                        </span>
                        <span className="text-xs font-medium text-neutral-400 whitespace-nowrap">
                          {formatRelativeTime(act.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-neutral-900 mt-1 leading-snug">
                        {act.message}
                      </p>
                    </div>
                  </div>
                );
              })}
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
                <span className="text-sm font-semibold text-neutral-800">Realtime DB Live Listener</span>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${rtdbConnected ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-amber-50 text-amber-700 border border-amber-100"}`}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {rtdbConnected ? "Live Connected" : "Initializing..."}
                </span>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-50/70 border border-neutral-100/80">
                <span className="text-sm font-semibold text-neutral-800">Clinic Currency ({currency})</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600 border border-emerald-100">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Active
                </span>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-50/70 border border-neutral-100/80">
                <span className="text-sm font-semibold text-neutral-800">Stripe Payment Gateway</span>
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600 border border-emerald-100">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Connected
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-neutral-100 flex items-center gap-3">
            <Link
              href="/admin/app-builder/treatments"
              className="flex-1 rounded-full bg-neutral-900 px-5 py-3 text-xs font-bold text-white hover:bg-neutral-800 shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              Launch App Builder
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
