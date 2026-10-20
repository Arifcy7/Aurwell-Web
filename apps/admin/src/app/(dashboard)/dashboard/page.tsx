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
import {
  Wallet,
  Users,
  DollarSign,
  Activity,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  QrCode,
  Gift,
  CreditCard,
  Tag,
  ShoppingBag,
  Sparkles,
  UserCheck,
  Eye,
  Smartphone,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { fetchCanonicalPatients } from "@/lib/firebase/versionCache";

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
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

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

function getActivityIcon(type: string) {
  switch (type) {
    case "qr_checkin":
      return <QrCode className="w-4 h-4 text-neutral-800 stroke-[1.75]" />;
    case "reward_redeemed":
      return <Gift className="w-4 h-4 text-neutral-800 stroke-[1.75]" />;
    case "membership_subscribed":
      return <CreditCard className="w-4 h-4 text-neutral-800 stroke-[1.75]" />;
    case "treatment_purchased":
      return <ShoppingBag className="w-4 h-4 text-neutral-800 stroke-[1.75]" />;
    case "item_added_to_cart":
      return <Tag className="w-4 h-4 text-neutral-800 stroke-[1.75]" />;
    case "user_signed_in":
      return <UserCheck className="w-4 h-4 text-neutral-800 stroke-[1.75]" />;
    case "treatment_viewed":
    case "membership_viewed":
    case "rewards_viewed":
      return <Eye className="w-4 h-4 text-neutral-700 stroke-[1.75]" />;
    case "app_opened":
      return <Smartphone className="w-4 h-4 text-neutral-800 stroke-[1.75]" />;
    default:
      return <Sparkles className="w-4 h-4 text-neutral-800 stroke-[1.75]" />;
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
        // 1. Fetch user's clinicId
        let clinicId = "";
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          clinicId = userDoc.data().clinicId;
        }

        if (!clinicId) {
          setLoading(false);
          return;
        }

        setClinicId(clinicId);

        // 2. Fetch Clinic Settings & Stripe status according to FIREBASE_SCHEMA.md
        let clinicCurr = "EUR";
        const clinicDoc = await getDoc(doc(db, "clinics", clinicId));
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

        // 4. Fetch Active Customers count from patients collection with Version Cache
        const patientsList = await fetchCanonicalPatients(clinicId);
        const customerCount = patientsList.length;

        setStats({
          overviewEarnings: formatCurrency(totalEarnings, clinicCurr),
          activeCustomers: String(customerCount),
          netRevenueMTD: formatCurrency(mtdEarnings, clinicCurr),
        });

        // 5. Connect to Firebase Realtime Database for live Product Activity
        try {
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
              // Silently handle permission or connection errors
              setRtdbConnected(false);
              setActivities([]);
              setLoading(false);
            }
          );
        } catch (e) {
          setRtdbConnected(false);
          setActivities([]);
          setLoading(false);
        }
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
      {/* Overview Stat Cards Dynamic with Clinic Currency and Interactive Mini Graphs */}
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
              description="Aggregated lifetime transaction volume across completed treatments and subscriptions."
            />
            <StatCard
              title="Active Customers"
              value={stats.activeCustomers}
              change="Registered"
              changeType="increase"
              period="clinic patients"
              icon={<Users className="w-5 h-5 stroke-[1.75]" />}
              showSparkline={true}
              description="Active registered patients who have visited or booked sessions at the clinic."
            />
            <StatCard
              title="Net Revenue (MTD)"
              value={stats.netRevenueMTD}
              change="Current Month"
              changeType="increase"
              period="month-to-date sales"
              icon={<DollarSign className="w-5 h-5 stroke-[1.75]" />}
              showSparkline={true}
              description="Month-to-date collected revenue across all clinic services and product sales."
            />
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Product Activity Live Feed - Strict 2-Card Architecture with Minimal Gaps */}
        <div className="rounded-3xl bg-white p-2 flex flex-col justify-between select-none shadow-xs">
          {/* Header section inside outer card */}
          <div className="px-3.5 pt-3 pb-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Activity className="w-4 h-4 text-neutral-800 stroke-[2] shrink-0" />
              <div>
                <h3 className="text-sm sm:text-base font-bold text-neutral-900 tracking-tight">
                  Product Activity
                </h3>
                <p className="text-xs text-neutral-400 font-medium">Real-time audit log & client transactions</p>
              </div>
            </div>

            {/* Flat subtle status pill (no border stroke) */}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Feed
            </span>
          </div>

          {/* Inner card surface (Card 2 - flat #f8f9fb surface matching tables) */}
          <div className="rounded-[1.25rem] bg-[#f8f9fb] p-2 flex-1 flex flex-col min-h-[380px]">
            {loading ? (
              <div className="flex-1 flex flex-col items-center justify-center py-16 text-center text-xs font-medium text-neutral-400">
                <span className="inline-block w-4 h-4 border-2 border-neutral-300 border-t-emerald-500 rounded-full animate-spin mb-2" />
                Connecting live feed...
              </div>
            ) : activities.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-16 text-center text-xs font-medium text-neutral-400 p-6">
                <Activity className="w-6 h-6 text-neutral-300 mb-2 stroke-[1.5]" />
                <p className="font-semibold text-neutral-600 mb-0.5">No recent activity events yet</p>
                <p className="text-[11px] text-neutral-400">Real-time check-ins, purchases, and bookings will appear here.</p>
              </div>
            ) : (
              <div className="max-h-[380px] overflow-y-auto pr-1 space-y-1.5 custom-scrollbar">
                <AnimatePresence initial={false} mode="popLayout">
                  {activities.map((act) => {
                    const badgeLabel = getActivityBadgeLabel(act.type);
                    const isHighlighted = act.id === highlightedId;
                    return (
                      <motion.div
                        key={act.id}
                        layout
                        initial={{ opacity: 0, scale: 0.98, y: -8 }}
                        animate={{
                          opacity: 1,
                          scale: 1,
                          y: 0,
                        }}
                        exit={{ opacity: 0, scale: 0.98, y: -6, transition: { duration: 0.15 } }}
                        transition={{
                          layout: { type: "spring", stiffness: 350, damping: 30 },
                          opacity: { duration: 0.18 },
                          scale: { type: "spring", stiffness: 400, damping: 28 },
                          y: { type: "spring", stiffness: 400, damping: 28 },
                        }}
                        className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-colors duration-150 ${
                          isHighlighted ? "bg-emerald-100/50" : "hover:bg-neutral-200/40"
                        }`}
                      >
                        {/* High quality bare icon in grey/black with NO background container */}
                        <div className="shrink-0 flex items-center justify-center">
                          {getActivityIcon(act.type)}
                        </div>

                        {/* Content with consistent symmetrical spacing */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-neutral-200/70 text-neutral-700">
                              {badgeLabel}
                            </span>
                            <span className="text-[11px] font-medium text-neutral-400 whitespace-nowrap">
                              {formatRelativeTime(act.timestamp)}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-neutral-900 truncate">
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
        </div>

        {/* Real-Data 5 Performance Analytics Graphs Dashboard */}
        <ClinicAnalyticsDashboard clinicId={clinicId} currency={currency} />
      </div>
    </div>
  );
}
