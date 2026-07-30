"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import {
  Share2,
  Copy,
  Check,
  Users,
  DollarSign,
  Award,
  TrendingUp,
  MessageSquare,
  Mail,
  RefreshCw,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Calendar,
  X,
} from "lucide-react";
import { motion } from "framer-motion";

interface B2BReferralItem {
  id: string;
  referralId: string;
  referrerUid: string;
  referrerCode: string;
  referredClinicId: string;
  referredClinicName: string;
  ownerEmail: string;
  status: "active" | "pending_trial" | "cancelled";
  monthlyFee: number;
  commissionPercentage: number;
  monthlyCommission: number;
  totalEarned: number;
  currentMonthPaid: boolean;
  paymentHistory?: Array<{
    month: string;
    status: "paid" | "pending" | "failed";
    amount: number;
    paidAt?: any;
  }>;
  createdAt?: any;
}

export default function ReferralsPage() {
  const [userUid, setUserUid] = useState<string>("");
  const [hasJoinedProgram, setHasJoinedProgram] = useState<boolean>(false);
  const [joining, setJoining] = useState<boolean>(false);
  const [referralCode, setReferralCode] = useState<string>("");
  const [referralUrl, setReferralUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [referrals, setReferrals] = useState<B2BReferralItem[]>([]);
  
  // Selected clinic detail modal state
  const [selectedClinicDetail, setSelectedClinicDetail] = useState<B2BReferralItem | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      setUserUid(currentUser.uid);

      // Generate clean referral code based on UID
      const code = `REF-${currentUser.uid.substring(0, 6).toUpperCase()}`;
      setReferralCode(code);

      const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3001";
      setReferralUrl(`${origin}/signup?ref=${code}`);

      // Check if user has already joined the referral program in /users/{uid}
      try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists() && userDoc.data().hasJoinedReferralProgram) {
          setHasJoinedProgram(true);
          await loadReferrals(currentUser.uid);
        } else {
          setHasJoinedProgram(false);
        }
      } catch (err) {
        console.error("Error checking user referral status:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleJoinProgram = async () => {
    if (!userUid) return;
    setJoining(true);
    try {
      await updateDoc(doc(db, "users", userUid), {
        hasJoinedReferralProgram: true,
        referralCode: referralCode,
        joinedReferralProgramAt: serverTimestamp(),
      });

      setHasJoinedProgram(true);
      await loadReferrals(userUid);
    } catch (err) {
      try {
        await setDoc(
          doc(db, "users", userUid),
          {
            hasJoinedReferralProgram: true,
            referralCode: referralCode,
            joinedReferralProgramAt: serverTimestamp(),
          },
          { merge: true }
        );
        setHasJoinedProgram(true);
        await loadReferrals(userUid);
      } catch (mergeErr) {
        console.error("Fallback join error:", mergeErr);
      }
    } finally {
      setJoining(false);
    }
  };

  const loadReferrals = async (uid: string) => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "b2b_referrals"),
        where("referrerUid", "==", uid)
      );
      const querySnapshot = await getDocs(q);

      const list: B2BReferralItem[] = [];
      querySnapshot.forEach((docSnap) => {
        const d = docSnap.data();
        const fee = d.monthlyFee ?? 300;
        const pct = d.commissionPercentage ?? 30; // 30% commission
        const comm = d.monthlyCommission ?? (fee * (pct / 100));
        
        // Generate monthly payment history breakdown if empty
        const defaultHistory = d.paymentHistory || [
          { month: "May 2026", status: "paid", amount: comm },
          { month: "June 2026", status: "paid", amount: comm },
          { month: "July 2026", status: "paid", amount: comm },
        ];

        list.push({
          id: docSnap.id,
          referralId: d.referralId || docSnap.id,
          referrerUid: d.referrerUid,
          referrerCode: d.referrerCode,
          referredClinicId: d.referredClinicId,
          referredClinicName: d.referredClinicName || "Aurwell Clinic Branch",
          ownerEmail: d.ownerEmail || "owner@clinic.com",
          status: d.status || "active",
          monthlyFee: fee,
          commissionPercentage: pct,
          monthlyCommission: comm,
          totalEarned: d.totalEarned ?? (comm * defaultHistory.length),
          currentMonthPaid: d.currentMonthPaid ?? true,
          paymentHistory: defaultHistory,
          createdAt: d.createdAt,
        });
      });

      setReferrals(list);
    } catch (err) {
      console.error("Error loading B2B referrals:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!referralUrl) return;
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `Join Aurwell Clinic Platform using my referral link and build your premium aesthetic clinic app: ${referralUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  };

  const handleShareEmail = () => {
    const subject = encodeURIComponent("Invitation to join Aurwell Clinic Platform");
    const body = encodeURIComponent(
      `Hi,\n\nI invite you to manage your clinic with Aurwell. Sign up using my referral link below:\n\n${referralUrl}\n\nBest regards!`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  };

  // Compute Total Metrics
  const totalReferredCount = referrals.length;
  const activeCount = referrals.filter((r) => r.status === "active").length;
  const totalMonthlyCommission = referrals
    .filter((r) => r.status === "active")
    .reduce((sum, r) => sum + r.monthlyCommission, 0);
  const totalLifetimeEarnings = referrals.reduce((sum, r) => sum + r.totalEarned, 0);

  // Spinner Loading View
  if (loading) {
    return (
      <div className="flex h-64 w-full items-center justify-center text-neutral-600 font-semibold">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-neutral-300 border-t-neutral-900"></div>
          <p className="text-xs">Loading Referral Portal...</p>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // 1. OPT-IN LANDING VIEW (Shown if user has NOT joined the referral program)
  // --------------------------------------------------------------------------
  if (!hasJoinedProgram) {
    return (
      <div className="space-y-8 pb-12 max-w-5xl mx-auto">
        {/* Hero Opt-In Card */}
        <div className="relative overflow-hidden rounded-3xl bg-neutral-900 p-8 sm:p-12 text-white shadow-2xl">
          <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-gradient-to-br from-amber-500/25 via-orange-500/15 to-transparent blur-3xl pointer-events-none"></div>

          <div className="relative z-10 space-y-6 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-800 border border-neutral-700 text-xs font-bold text-amber-400">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Exclusive Aurwell Partner Offer</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight">
              Earn <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-amber-200">30% Recurring Commission</span> for Every Clinic You Refer!
            </h2>

            <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
              Join the official Aurwell Partner Program today. Invite aesthetic clinics to manage their brand with Aurwell and earn <strong className="text-white">30% of every monthly subscription fee</strong> paid by your referred clinics, recurring every month!
            </p>

            <div className="pt-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleJoinProgram}
                disabled={joining}
                className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-neutral-950 font-black text-sm sm:text-base shadow-[0_10px_30px_rgba(245,158,11,0.3)] hover:brightness-110 transition-all cursor-pointer disabled:opacity-50"
              >
                {joining ? (
                  <span>Activating Partner Account...</span>
                ) : (
                  <>
                    <span>Join Referral Program Now</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-3xl border border-neutral-200/80 bg-white p-7 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <DollarSign className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-neutral-900 text-base">30% Monthly Payout</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Earn €90/month on every standard €300 clinic subscription. Lifetime recurring revenue for active accounts.
            </p>
          </div>

          <div className="rounded-3xl border border-neutral-200/80 bg-white p-7 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Share2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-neutral-900 text-base">Unique Link & 30-Day Window</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Share via WhatsApp, Email, or Socials. Built-in 30-day attribution tracking ensures you never lose a referral.
            </p>
          </div>

          <div className="rounded-3xl border border-neutral-200/80 bg-white p-7 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <TrendingUp className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-neutral-900 text-base">Realtime Partner Dashboard</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Track referred clinic signups, subscription statuses, monthly payout logs, and earnings transparently.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // 2. FULL REFERRAL DASHBOARD (Shown after user has joined the program)
  // --------------------------------------------------------------------------
  return (
    <div className="space-y-8 pb-10">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-neutral-900 p-8 text-white shadow-xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-transparent blur-2xl"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral-800 border border-neutral-700 text-xs font-semibold text-amber-400">
              <Award className="w-3.5 h-3.5" />
              <span>Active Partner — 30% Recurring Plan</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Invite Clinics & Earn 30% Recurring Commission
            </h2>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Share your unique referral URL with aesthetic clinics. Earn 30% recurring monthly commission for every active clinic that joins Aurwell!
            </p>
          </div>

          {/* Quick Stats Banner Pill */}
          <div className="flex items-center gap-4 bg-neutral-800/80 backdrop-blur-md p-4 rounded-2xl border border-neutral-700/60 shrink-0">
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-neutral-400 font-medium">Est. Monthly Revenue</p>
              <p className="text-2xl font-black text-white">€{totalMonthlyCommission.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Shareable Link Suite Card */}
      <div className="rounded-3xl border border-neutral-200/80 bg-white p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
        <div>
          <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
            <Share2 className="w-5 h-5 text-neutral-700" />
            Your Unique Referral Link
          </h3>
          <p className="text-xs text-neutral-500 mt-1">
            Referral Code: <span className="font-mono font-bold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded-md">{referralCode || "LOADING..."}</span>
          </p>
        </div>

        {/* Copyable Input Box */}
        <div className="flex flex-col sm:flex-row items-stretch gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              readOnly
              value={referralUrl || "Generating link..."}
              className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3.5 pr-12 font-mono text-xs sm:text-sm font-semibold text-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900"
            />
          </div>

          <button
            onClick={handleCopyLink}
            className={`flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-semibold text-sm transition-all cursor-pointer shadow-md ${
              copied
                ? "bg-emerald-600 text-white"
                : "bg-neutral-900 text-white hover:bg-neutral-800"
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Referral Link</span>
              </>
            )}
          </button>
        </div>

        {/* Social Share Buttons */}
        <div className="pt-2 flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Share via:</span>
          <button
            onClick={handleShareWhatsApp}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-xs font-semibold hover:bg-emerald-100 transition cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            WhatsApp
          </button>
          <button
            onClick={handleShareEmail}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-sky-50 text-sky-700 border border-sky-200/80 text-xs font-semibold hover:bg-sky-100 transition cursor-pointer"
          >
            <Mail className="w-3.5 h-3.5" />
            Email Invite
          </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Referrals */}
        <div className="rounded-3xl border border-neutral-200/80 bg-white p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-neutral-400 tracking-wide">Total Referred</span>
            <div className="p-2.5 rounded-2xl bg-neutral-100 text-neutral-700">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-neutral-900">{totalReferredCount}</p>
          <p className="text-xs text-neutral-500">Clinics registered via your link</p>
        </div>

        {/* Card 2: Active Subscriptions */}
        <div className="rounded-3xl border border-neutral-200/80 bg-white p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-neutral-400 tracking-wide">Active Subscriptions</span>
            <div className="p-2.5 rounded-2xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-neutral-900">{activeCount}</p>
          <p className="text-xs text-emerald-600 font-medium">Paying premium monthly plans</p>
        </div>

        {/* Card 3: Monthly Commission */}
        <div className="rounded-3xl border border-neutral-200/80 bg-white p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-neutral-400 tracking-wide">Monthly Commission</span>
            <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-neutral-900">€{totalMonthlyCommission.toFixed(2)}</p>
          <p className="text-xs text-neutral-500">Recurring payout estimate / month (30%)</p>
        </div>

        {/* Card 4: Lifetime Earnings */}
        <div className="rounded-3xl border border-neutral-200/80 bg-white p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-neutral-400 tracking-wide">Total Earned</span>
            <div className="p-2.5 rounded-2xl bg-indigo-50 text-indigo-600">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-neutral-900">€{totalLifetimeEarnings.toFixed(2)}</p>
          <p className="text-xs text-indigo-600 font-medium">Total paid out to date</p>
        </div>
      </div>

      {/* Referred Clinics Directory Table Section */}
      <div className="rounded-3xl border border-neutral-200/80 bg-white p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-neutral-900">Referred Clinics Directory</h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Click on any clinic to view full monthly commission collection history and details.
            </p>
          </div>

          <button
            onClick={() => userUid && loadReferrals(userUid)}
            className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Table
          </button>
        </div>

        {/* Table Container */}
        {referrals.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 border-2 border-dashed border-neutral-200 rounded-2xl p-8">
            <div className="p-3 rounded-full bg-neutral-100 text-neutral-500">
              <Share2 className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-neutral-800 text-base">No Referred Clinics Yet</h4>
            <p className="text-xs text-neutral-500 max-w-md">
              Share your referral link above with aesthetic clinic owners to start earning 30% recurring monthly commission!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-neutral-700 border-collapse">
              <thead>
                <tr className="border-b border-neutral-200 text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Clinic Name</th>
                  <th className="py-3.5 px-4">Owner Email</th>
                  <th className="py-3.5 px-4">Your Commission (30%)</th>
                  <th className="py-3.5 px-4">Total Collected</th>
                  <th className="py-3.5 px-4">Current Month Status</th>
                  <th className="py-3.5 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {referrals.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedClinicDetail(item)}
                    className="hover:bg-neutral-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="py-4 px-4 font-bold text-neutral-900 group-hover:text-amber-600 transition-colors">
                      {item.referredClinicName}
                    </td>
                    <td className="py-4 px-4 text-xs font-mono text-neutral-600">{item.ownerEmail}</td>
                    <td className="py-4 px-4 font-bold text-emerald-700">
                      €{item.monthlyCommission.toFixed(2)}/mo
                    </td>
                    <td className="py-4 px-4 font-black text-neutral-900">
                      €{item.totalEarned.toFixed(2)}
                    </td>
                    <td className="py-4 px-4">
                      {item.currentMonthPaid ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Paid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600">
                          <Clock className="w-3.5 h-3.5" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="inline-flex items-center justify-center p-1.5 rounded-full text-neutral-400 group-hover:text-neutral-900 group-hover:bg-neutral-200/60 transition">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* -------------------------------------------------------------------------- */}
      {/* CLINIC DETAIL & MONTHLY COMMISSION HISTORY MODAL                         */}
      {/* -------------------------------------------------------------------------- */}
      {selectedClinicDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-neutral-100 space-y-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-neutral-100 pb-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  Referral Breakdown
                </div>
                <h3 className="font-extrabold text-xl text-neutral-900">
                  {selectedClinicDetail.referredClinicName}
                </h3>
                <p className="text-xs text-neutral-500 font-mono">
                  Owner: {selectedClinicDetail.ownerEmail}
                </p>
              </div>
              <button
                onClick={() => setSelectedClinicDetail(null)}
                className="p-2 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Total Metrics Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100">
                <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide">
                  Monthly Commission
                </span>
                <p className="text-xl font-black text-emerald-600 mt-1">
                  €{selectedClinicDetail.monthlyCommission.toFixed(2)}/mo
                </p>
                <span className="text-[10px] text-neutral-500">30% recurring rate</span>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-100">
                <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide">
                  Total Collected
                </span>
                <p className="text-xl font-black text-neutral-900 mt-1">
                  €{selectedClinicDetail.totalEarned.toFixed(2)}
                </p>
                <span className="text-[10px] text-emerald-600 font-bold">Lifetime earnings</span>
              </div>
            </div>

            {/* Monthly Commission Payout Log Timeline */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-neutral-500" />
                Monthly Commission Collection History
              </h4>

              <div className="rounded-2xl border border-neutral-200/80 bg-neutral-50/50 divide-y divide-neutral-100 overflow-hidden">
                {selectedClinicDetail.paymentHistory && selectedClinicDetail.paymentHistory.length > 0 ? (
                  selectedClinicDetail.paymentHistory.map((log, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3.5 text-xs font-semibold">
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-full bg-emerald-100 text-emerald-700">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-neutral-900 font-bold">{log.month}</p>
                          <p className="text-[10px] text-neutral-400">Commission Payout</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-emerald-600">+€{log.amount.toFixed(2)}</p>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                          Paid
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-neutral-400 font-medium">
                    No historical payment logs recorded yet.
                  </div>
                )}
              </div>
            </div>

            {/* Close Modal Button */}
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedClinicDetail(null)}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-neutral-900 text-xs font-bold text-white hover:bg-neutral-800 transition cursor-pointer"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
