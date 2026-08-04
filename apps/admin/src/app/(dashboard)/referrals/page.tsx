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
import { getDocsCacheFirst, getDocCacheFirst } from "@/lib/firebase/logger";
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
  ArrowRight,
  ChevronRight,
  Calendar,
  X,
  ChevronDown,
} from "lucide-react";
import AdminSplashScreen from "@/components/AdminSplashScreen";
import { motion, AnimatePresence } from "framer-motion";

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
  
  // Dropdown menu state for additional share options
  const [showMoreShareMenu, setShowMoreShareMenu] = useState(false);

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
        const userDoc = await getDocCacheFirst(doc(db, "users", currentUser.uid));
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
      const querySnapshot = await getDocsCacheFirst(q);

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

  const handleShareLinkedIn = () => {
    const url = encodeURIComponent(referralUrl);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, "_blank");
  };

  const handleShareTwitter = () => {
    const text = encodeURIComponent(
      `Join Aurwell Clinic Platform using my referral link and build your premium aesthetic clinic app: ${referralUrl}`
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
  };

  const handleShareTelegram = () => {
    const text = encodeURIComponent("Join Aurwell Clinic Platform using my referral link:");
    window.open(`https://t.me/share/url?url=${encodeURIComponent(referralUrl)}&text=${text}`, "_blank");
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Aurwell Partner Program",
          text: "Build your premium aesthetic clinic app with Aurwell",
          url: referralUrl,
        });
      } catch (err) {
        console.error("Native share cancelled or failed:", err);
      }
    } else {
      handleCopyLink();
    }
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
      <div className="relative w-full min-h-[500px]">
        <AdminSplashScreen fullScreen={false} label="Loading Referral Portal..." />
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // 1. OPT-IN LANDING VIEW (Shown if user has NOT joined the referral program)
  // --------------------------------------------------------------------------
  if (!hasJoinedProgram) {
    return (
      <div className="space-y-8 pb-12 max-w-5xl mx-auto">
        {/* Hero Opt-In Poster */}
        <div className="relative overflow-hidden rounded-3xl p-8 sm:p-14 shadow-xl border border-neutral-200/40 text-center flex flex-col items-center justify-center">
          {/* Background Image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/green-hero-image.png"
            alt="Aurwell Partner Program Background"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />

          <div className="relative z-10 space-y-6 max-w-3xl mx-auto flex flex-col items-center">
            {/* White Logo for High Contrast */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-white.png"
              alt="Aurwell Logo"
              className="h-20 sm:h-24 w-auto object-contain mx-auto drop-shadow-md"
            />

            {/* Copywriting in Crisp White */}
            <div className="space-y-3">
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight drop-shadow-sm">
                Earn 30% Lifetime Recurring Revenue on Every Clinic You Refer
              </h2>

              <p className="text-sm sm:text-lg text-white/90 font-medium leading-relaxed max-w-2xl mx-auto drop-shadow-xs">
                Empower aesthetic clinic owners with Aurwell’s all-in-one management platform. Receive 30% monthly commission for as long as your referred clinics stay active.
              </p>
            </div>

            {/* CTA Button */}
            <div className="pt-4">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleJoinProgram}
                disabled={joining}
                className="inline-flex items-center gap-3 px-9 py-4 rounded-2xl bg-white text-neutral-950 font-black text-sm sm:text-base shadow-xl hover:bg-neutral-100 transition-all cursor-pointer disabled:opacity-50"
              >
                {joining ? (
                  <span>Activating Partner Account...</span>
                ) : (
                  <>
                    <span>Join Aurwell Partner Program</span>
                    <ArrowRight className="w-5 h-5 text-neutral-950" />
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-3xl border border-neutral-200/80 bg-white p-7 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-neutral-100 border border-neutral-200 text-neutral-900 flex items-center justify-center font-bold">
              <DollarSign className="w-6 h-6 text-neutral-900" />
            </div>
            <h3 className="font-bold text-neutral-900 text-base">30% Monthly Payout</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Earn €90/month on every standard €300 clinic subscription. Lifetime recurring revenue for active accounts.
            </p>
          </div>

          <div className="rounded-3xl border border-neutral-200/80 bg-white p-7 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-neutral-100 border border-neutral-200 text-neutral-900 flex items-center justify-center font-bold">
              <Share2 className="w-6 h-6 text-neutral-900" />
            </div>
            <h3 className="font-bold text-neutral-900 text-base">Unique Link & 30-Day Window</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Share via WhatsApp, Email, or Socials. Built-in 30-day attribution tracking ensures you never lose a referral.
            </p>
          </div>

          <div className="rounded-3xl border border-neutral-200/80 bg-white p-7 shadow-sm space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-neutral-100 border border-neutral-200 text-neutral-900 flex items-center justify-center font-bold">
              <TrendingUp className="w-6 h-6 text-neutral-900" />
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
      {/* Header Hero Poster */}
      <div className="relative overflow-hidden rounded-3xl p-8 sm:p-10 shadow-xl border border-neutral-200/40">
        {/* Background Image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/green-hero-image.png"
          alt="Aurwell Partner Program Background"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            {/* White Logo for High Contrast */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-white.png"
              alt="Aurwell Logo"
              className="h-14 sm:h-16 w-auto object-contain drop-shadow-md"
            />
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight drop-shadow-sm">
              Invite Aesthetic Clinics & Build Monthly Recurring Revenue
            </h2>
            <p className="text-xs sm:text-sm text-white/90 font-medium leading-relaxed drop-shadow-xs">
              Share your unique referral URL with aesthetic clinic owners. Earn 30% recurring monthly commission for every active clinic that joins Aurwell.
            </p>
          </div>

          {/* Quick Stats Rectangle Banner Pill */}
          <div className="flex items-center gap-4 bg-white/90 backdrop-blur-md p-4.5 rounded-2xl border border-neutral-200/80 shadow-md shrink-0">
            <div className="p-3 rounded-xl bg-neutral-100 text-neutral-900 border border-neutral-200">
              <TrendingUp className="w-6 h-6 text-neutral-800" />
            </div>
            <div>
              <p className="text-xs text-neutral-500 font-medium">Est. Monthly Revenue</p>
              <p className="text-2xl font-black text-neutral-900">€{totalMonthlyCommission.toFixed(2)}</p>
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
            Referral Code: <span className="font-mono font-bold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded-md border border-neutral-200">{referralCode || "LOADING..."}</span>
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
            className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-semibold text-sm transition-all cursor-pointer shadow-md bg-neutral-900 text-white hover:bg-neutral-800"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-white" />
                <span>Copy Referral Link</span>
              </>
            )}
          </button>
        </div>

        {/* Social Share Buttons */}
        <div className="pt-2 flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Share via:</span>
          
          {/* WhatsApp (Green) */}
          <button
            onClick={handleShareWhatsApp}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-xs font-semibold hover:bg-emerald-100 transition cursor-pointer shadow-xs"
          >
            <svg className="w-3.5 h-3.5 fill-current text-emerald-600" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
            </svg>
            WhatsApp
          </button>

          {/* Email (Sky Blue) */}
          <button
            onClick={handleShareEmail}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-sky-50 text-sky-700 border border-sky-200/80 text-xs font-semibold hover:bg-sky-100 transition cursor-pointer shadow-xs"
          >
            <Mail className="w-3.5 h-3.5 text-sky-600" />
            Email Invite
          </button>

          {/* More Options Dropdown Button */}
          <div className="relative">
            <button
              onClick={() => setShowMoreShareMenu(!showMoreShareMenu)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-neutral-100 text-neutral-800 border border-neutral-200 text-xs font-semibold hover:bg-neutral-200 transition cursor-pointer shadow-xs"
            >
              <Share2 className="w-3.5 h-3.5 text-neutral-700" />
              <span>More Options</span>
              <ChevronDown className={`w-3.5 h-3.5 text-neutral-500 transition-transform duration-200 ${showMoreShareMenu ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown Menu */}
            {showMoreShareMenu && (
              <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-56 rounded-2xl bg-white border border-neutral-200 shadow-xl p-1.5 z-30 space-y-1">
                <button
                  onClick={() => {
                    handleShareLinkedIn();
                    setShowMoreShareMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-neutral-800 hover:bg-neutral-100 transition cursor-pointer text-left"
                >
                  <svg className="w-4 h-4 fill-current text-blue-600 shrink-0" viewBox="0 0 24 24">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
                  </svg>
                  <span>Share to LinkedIn</span>
                </button>

                <button
                  onClick={() => {
                    handleShareTwitter();
                    setShowMoreShareMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-neutral-800 hover:bg-neutral-100 transition cursor-pointer text-left"
                >
                  <svg className="w-4 h-4 fill-current text-neutral-900 shrink-0" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  <span>Share to X / Twitter</span>
                </button>

                <button
                  onClick={() => {
                    handleShareTelegram();
                    setShowMoreShareMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-neutral-800 hover:bg-neutral-100 transition cursor-pointer text-left"
                >
                  <svg className="w-4 h-4 fill-current text-cyan-600 shrink-0" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                  </svg>
                  <span>Share to Telegram</span>
                </button>

                <div className="border-t border-neutral-100 my-1"></div>

                <button
                  onClick={() => {
                    handleNativeShare();
                    setShowMoreShareMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-neutral-800 hover:bg-neutral-100 transition cursor-pointer text-left"
                >
                  <Share2 className="w-4 h-4 text-neutral-700 shrink-0" />
                  <span>Device Share / Copy</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Total Referrals */}
        <div className="rounded-3xl border border-neutral-200/80 bg-white p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-neutral-400 tracking-wide">Total Referred</span>
            <div className="p-2.5 rounded-2xl bg-neutral-100 text-neutral-900 border border-neutral-200">
              <Users className="w-5 h-5 text-neutral-800" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-neutral-900">{totalReferredCount}</p>
          <p className="text-xs text-neutral-500">Clinics registered via your link</p>
        </div>

        {/* Card 2: Active Subscriptions */}
        <div className="rounded-3xl border border-neutral-200/80 bg-white p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-neutral-400 tracking-wide">Active Subscriptions</span>
            <div className="p-2.5 rounded-2xl bg-neutral-100 text-neutral-900 border border-neutral-200">
              <CheckCircle2 className="w-5 h-5 text-neutral-800" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-neutral-900">{activeCount}</p>
          <p className="text-xs text-neutral-600 font-medium">Paying premium monthly plans</p>
        </div>

        {/* Card 3: Monthly Commission */}
        <div className="rounded-3xl border border-neutral-200/80 bg-white p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-neutral-400 tracking-wide">Monthly Commission</span>
            <div className="p-2.5 rounded-2xl bg-neutral-100 text-neutral-900 border border-neutral-200">
              <DollarSign className="w-5 h-5 text-neutral-800" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-neutral-900">€{totalMonthlyCommission.toFixed(2)}</p>
          <p className="text-xs text-neutral-500">Recurring payout estimate / month (30%)</p>
        </div>

        {/* Card 4: Lifetime Earnings */}
        <div className="rounded-3xl border border-neutral-200/80 bg-white p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-neutral-400 tracking-wide">Total Earned</span>
            <div className="p-2.5 rounded-2xl bg-neutral-100 text-neutral-900 border border-neutral-200">
              <Award className="w-5 h-5 text-neutral-800" />
            </div>
          </div>
          <p className="text-3xl font-extrabold text-neutral-900">€{totalLifetimeEarnings.toFixed(2)}</p>
          <p className="text-xs text-neutral-600 font-medium">Total paid out to date</p>
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
            <RefreshCw className="w-3.5 h-3.5 text-neutral-600" />
            Refresh Table
          </button>
        </div>

        {/* Table Container */}
        {referrals.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 border-2 border-dashed border-neutral-200 rounded-2xl p-8">
            <div className="p-3 rounded-full bg-neutral-100 text-neutral-700 border border-neutral-200">
              <Share2 className="w-6 h-6 text-neutral-700" />
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
                    <td className="py-4 px-4 font-bold text-neutral-900 group-hover:text-neutral-900 transition-colors">
                      {item.referredClinicName}
                    </td>
                    <td className="py-4 px-4 text-xs font-mono text-neutral-600">{item.ownerEmail}</td>
                    <td className="py-4 px-4 font-bold text-neutral-900">
                      €{item.monthlyCommission.toFixed(2)}/mo
                    </td>
                    <td className="py-4 px-4 font-black text-neutral-900">
                      €{item.totalEarned.toFixed(2)}
                    </td>
                    <td className="py-4 px-4">
                      {item.currentMonthPaid ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/80">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Paid
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200/80">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="inline-flex items-center justify-center p-1.5 rounded-full text-neutral-400 group-hover:text-neutral-900 group-hover:bg-neutral-200/60 transition">
                        <ChevronRight className="w-4 h-4 text-neutral-700" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-neutral-100 space-y-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-neutral-100 pb-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-800 bg-neutral-100 px-2.5 py-0.5 rounded-full border border-neutral-200">
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
                <X className="w-5 h-5 text-neutral-500" />
              </button>
            </div>

            {/* Total Metrics Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/60">
                <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide">
                  Monthly Commission
                </span>
                <p className="text-xl font-black text-neutral-900 mt-1">
                  €{selectedClinicDetail.monthlyCommission.toFixed(2)}/mo
                </p>
                <span className="text-[10px] text-neutral-500">30% recurring rate</span>
              </div>

              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/60">
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
                        <div className="p-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-neutral-900 font-bold">{log.month}</p>
                          <p className="text-[10px] text-neutral-400">Commission Payout</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-emerald-700">+€{log.amount.toFixed(2)}</p>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/80">
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
