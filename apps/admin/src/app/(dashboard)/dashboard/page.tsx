"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs, limit, doc, getDoc } from "firebase/firestore";
import { ref, onValue, off } from "firebase/database";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db, rtdb } from "@/lib/firebase/client";
import StatCard from "@/components/StatCard";
import ClinicAnalyticsDashboard from "@/components/ClinicAnalyticsDashboard";
import { StatCardSkeleton, PageSpinner } from "@/components/Loader";
import { formatCurrency } from "@/lib/utils/currency";
import { Wallet, Users, DollarSign, Activity, CheckCircle2, ArrowRight, ShieldCheck, AlertCircle } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { getDocsCacheFirst, getDocCacheFirst } from "@/lib/firebase/logger";

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
  const [clinicId, setClinicId] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [stripeConnected, setStripeConnected] = useState(false);
  const [stats, setStats] = useState({
    overviewEarnings: "€0.00",
    activeCustomers: "0",
    netRevenueMTD: "€0.00",
  });
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [rtdbConnected, setRtdbConnected] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // Automatically clear high-visibility highlight 2 seconds (2000ms) after a new event arrives
  useEffect(() => {
    if (activities.length > 0) {
      const newestId = activities[0].id;
      setHighlightedId(newestId);

      const timer = setTimeout(() => {
        setHighlightedId((current) => (current === newestId ? null : current));
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [activities]);

  useEffect(() => {
    let rtdbRef: any = null;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // 1. Fetch user's clinicId (Cache-First)
        let clinicId = "";
        const userDoc = await getDocsCacheFirst(
          query(collection(db, "users"), where("uid", "==", user.uid), limit(1))
        );
        if (!userDoc.empty) {
          clinicId = userDoc.docs[0].data().clinicId;
        } else {
          // Fallback check doc directly
          const d = await getDocCacheFirst(doc(db, "users", user.uid));
          if (d.exists()) {
            clinicId = d.data().clinicId;
          }
        }

        if (!clinicId) {
          setLoading(false);
          return;
        }

        setClinicId(clinicId);

        // 2. Fetch Clinic Settings & Stripe status according to FIREBASE_SCHEMA.md
        let clinicCurr = "EUR";
        const clinicDoc = await getDocCacheFirst(doc(db, "clinics", clinicId));
        if (clinicDoc.exists()) {
          const cData = clinicDoc.data();
          clinicCurr = cData.currency || "EUR";
          setCurrency(clinicCurr);

          const hasStripe = Boolean(
            cData.stripe &&
              typeof cData.stripe === "object" &&
              Object.keys(cData.stripe).length > 0 &&
              cData.stripe.enabled !== false
          );
          setStripeConnected(hasStripe);
        }

        // 3. Fetch Transactions for Financial Stats (Cache-First)
        const txQuery = query(collection(db, "clinics", clinicId, "transactions"));
        const txSnapshot = await getDocsCacheFirst(txQuery);

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

        // 4. Fetch Active Customers count from patients collection (Cache-First)
        const patientsSnapshot = await getDocsCacheFirst(
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
        {/* Product Activity Live Feed */}
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
              <AnimatePresence initial={false} mode="popLayout">
                {activities.map((act) => {
                  const badgeLabel = getActivityBadgeLabel(act.type);
                  const isHighlighted = act.id === highlightedId;
                  return (
                    <motion.div
                      key={act.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9, y: -24 }}
                      animate={{
                        opacity: 1,
                        scale: 1,
                        y: 0,
                        backgroundColor: isHighlighted ? "rgba(236, 253, 245, 0.95)" : "rgba(249, 250, 251, 0.7)",
                        borderColor: isHighlighted ? "rgba(167, 243, 208, 0.9)" : "rgba(243, 244, 246, 0.8)",
                      }}
                      exit={{ opacity: 0, scale: 0.9, y: -10, transition: { duration: 0.2 } }}
                      transition={{
                        layout: { type: "spring", stiffness: 350, damping: 30 },
                        opacity: { duration: 0.35 },
                        scale: { type: "spring", stiffness: 400, damping: 28 },
                        y: { type: "spring", stiffness: 400, damping: 28 },
                        backgroundColor: { duration: 0.85 },
                        borderColor: { duration: 0.85 },
                      }}
                      className={`flex items-start gap-3.5 p-3.5 rounded-2xl border transition-shadow duration-300 ${
                        isHighlighted ? "shadow-md shadow-emerald-500/10 ring-1 ring-emerald-400/30" : "hover:bg-neutral-50"
                      }`}
                    >
                      <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-[10px] font-bold text-neutral-800 shadow-xs border border-neutral-100 flex-shrink-0 uppercase tracking-tight">
                        {badgeLabel.substring(0, 3)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-200/80">
                              {badgeLabel}
                            </span>
                            {isHighlighted && (
                              <motion.span
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="text-[9px] font-extrabold uppercase tracking-widest text-emerald-600 bg-emerald-200/70 px-1.5 py-0.5 rounded-md animate-pulse"
                              >
                              </motion.span>
                            )}
                          </div>
                          <span className="text-xs font-medium text-neutral-400 whitespace-nowrap">
                            {formatRelativeTime(act.timestamp)}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-neutral-900 mt-1 leading-snug">
                          {act.message}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Real-Data 5 Performance Analytics Graphs Dashboard */}
        <ClinicAnalyticsDashboard clinicId={clinicId} currency={currency} />
      </div>
    </div>
  );
}
