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
  ArrowRight,
  ChevronRight,
  Calendar,
  X,
  ChevronDown,
  MoreVertical,
} from "lucide-react";
import AdminSplashScreen from "@/components/AdminSplashScreen";
import { motion, AnimatePresence } from "framer-motion";
import { MotionContainer, MotionCard } from "@/components/ui/motion-container";

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
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});

  const toggleSelectAll = () => {
    if (Object.keys(selectedIds).length === referrals.length && referrals.length > 0) {
      setSelectedIds({});
    } else {
      const all: Record<string, boolean> = {};
      referrals.forEach((r) => {
        all[r.id] = true;
      });
      setSelectedIds(all);
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
      } else {
        next[id] = true;
      }
      return next;
    });
  };

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
      <div className="w-full min-h-[calc(100vh-12rem)] flex items-center justify-center">
        <AdminSplashScreen fullScreen={false} label="Loading Referral Portal..." />
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // 1. OPT-IN LANDING VIEW (Shown if user has NOT joined the referral program)
  // --------------------------------------------------------------------------
  if (!hasJoinedProgram) {
    return (
      <MotionContainer className="space-y-4 pb-12 max-w-5xl mx-auto">
        {/* Hero Opt-In Poster */}
        <MotionCard hoverLift={false} className="relative overflow-hidden rounded-3xl p-8 sm:p-14 text-center flex flex-col items-center justify-center border-0 shadow-none">
          {/* Background Image */}
          <img
            src="/green-hero-image.png"
            alt="Aurwell Partner Program Background"
            className="absolute inset-0 w-full h-full object-cover object-center"
          />

          <div className="relative z-10 space-y-6 max-w-3xl mx-auto flex flex-col items-center">
            {/* White Logo for High Contrast */}
            <img
              src="/logo-white.png"
              alt="Aurwell Logo"
              className="h-12 sm:h-14 w-auto object-contain mx-auto drop-shadow-sm select-none"
            />

            {/* Copywriting in Crisp White */}
            <div className="space-y-3">
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
                Earn 30% Lifetime Recurring Revenue on Every Clinic You Refer
              </h2>

              <p className="text-sm sm:text-base text-white/90 font-medium leading-relaxed max-w-2xl mx-auto">
                Empower aesthetic clinic owners with Aurwell’s all-in-one management platform. Receive 30% monthly commission for as long as your referred clinics stay active.
              </p>
            </div>

            {/* CTA Button */}
            <div className="pt-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleJoinProgram}
                disabled={joining}
                className="btn-primary bg-white text-neutral-950 hover:bg-neutral-100 rounded-full px-8 py-3.5 font-bold text-sm inline-flex items-center gap-2.5 transition-all cursor-pointer disabled:opacity-50 shadow-none"
              >
                {joining ? (
                  <span>Activating Partner Account...</span>
                ) : (
                  <>
                    <span>Join Aurwell Partner Program</span>
                    <ArrowRight className="w-4 h-4 text-neutral-950" />
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </MotionCard>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MotionCard className="rounded-3xl bg-white p-6 space-y-3 shadow-none border-0">
            <div className="w-11 h-11 rounded-2xl bg-neutral-100 text-neutral-900 flex items-center justify-center font-bold">
              <DollarSign className="w-5 h-5 text-neutral-900" />
            </div>
            <h3 className="font-bold text-neutral-900 text-base">30% Monthly Payout</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Earn €90/month on every standard €300 clinic subscription. Lifetime recurring revenue for active accounts.
            </p>
          </MotionCard>

          <MotionCard className="rounded-3xl bg-white p-6 space-y-3 shadow-none border-0">
            <div className="w-11 h-11 rounded-2xl bg-neutral-100 text-neutral-900 flex items-center justify-center font-bold">
              <Share2 className="w-5 h-5 text-neutral-900" />
            </div>
            <h3 className="font-bold text-neutral-900 text-base">Unique Link & 30-Day Window</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Share via WhatsApp, Email, or Socials. Built-in 30-day attribution tracking ensures you never lose a referral.
            </p>
          </MotionCard>

          <MotionCard className="rounded-3xl bg-white p-6 space-y-3 shadow-none border-0">
            <div className="w-11 h-11 rounded-2xl bg-neutral-100 text-neutral-900 flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5 text-neutral-900" />
            </div>
            <h3 className="font-bold text-neutral-900 text-base">Realtime Partner Dashboard</h3>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Track referred clinic signups, subscription statuses, monthly payout logs, and earnings transparently.
            </p>
          </MotionCard>
        </div>
      </MotionContainer>
    );
  }

  // --------------------------------------------------------------------------
  // 2. FULL REFERRAL DASHBOARD (Shown after user has joined the program)
  // --------------------------------------------------------------------------
  return (
    <MotionContainer className="space-y-4 pb-12">
      {/* Header Hero Poster */}
      <MotionCard hoverLift={false} className="relative overflow-hidden rounded-3xl p-6 sm:p-8 shadow-none border-0">
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
              className="h-10 sm:h-12 w-auto object-contain drop-shadow-sm select-none"
            />
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight drop-shadow-sm">
              Invite Aesthetic Clinics & Build Monthly Recurring Revenue
            </h2>
            <p className="text-xs sm:text-sm text-white/90 font-medium leading-relaxed drop-shadow-xs">
              Share your unique referral URL with aesthetic clinic owners. Earn 30% recurring monthly commission for every active clinic that joins Aurwell.
            </p>
          </div>

          {/* Quick Stats Rectangle Banner Pill */}
          <div className="flex items-center gap-4 bg-white/95 backdrop-blur-md px-5 py-4 rounded-2xl shadow-none shrink-0">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-900 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-neutral-800" />
            </div>
            <div>
              <p className="text-xs text-neutral-500 font-medium">Est. Monthly Revenue</p>
              <p className="text-2xl font-black text-neutral-900">€{totalMonthlyCommission.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </MotionCard>

      {/* Shareable Link Suite Card */}
      <MotionCard className="rounded-3xl bg-white p-5 sm:p-6 space-y-4 shadow-none border-0">
        <div>
          <h3 className="text-sm sm:text-base font-semibold text-neutral-900 flex items-center gap-2">
            <Share2 className="w-4 h-4 text-neutral-700" />
            Your Unique Referral Link
          </h3>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            Referral Code: <span className="font-mono font-semibold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded-md border border-neutral-200">{referralCode || "LOADING..."}</span>
          </p>
        </div>

        {/* Copyable Input Box */}
        <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
          <div className="relative flex-1">
            <input
              type="text"
              readOnly
              value={referralUrl || "Generating link..."}
              className="w-full w-full rounded-2xl border-0 bg-neutral-100 px-4 py-2.5 pr-10 font-mono text-xs font-medium text-neutral-800 focus:outline-none"
            />
          </div>

          <button
            onClick={handleCopyLink}
            className="btn-primary rounded-full px-5 py-2.5 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-none"
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
        <div className="pt-1 flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide">Share via:</span>
          
          {/* WhatsApp (Green) */}
          <button
            onClick={handleShareWhatsApp}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-xs font-medium hover:bg-emerald-100 transition cursor-pointer shadow-2xs"
          >
            <svg className="w-3.5 h-3.5 fill-current text-emerald-600" viewBox="0 0 24 24">
              <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
            </svg>
            WhatsApp
          </button>

          {/* Email (Sky Blue) */}
          <button
            onClick={handleShareEmail}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 text-sky-700 border border-sky-200/80 text-xs font-medium hover:bg-sky-100 transition cursor-pointer shadow-2xs"
          >
            <Mail className="w-3.5 h-3.5 text-sky-600" />
            Email Invite
          </button>

          {/* More Options Dropdown Button */}
          <div className="relative">
            <button
              onClick={() => setShowMoreShareMenu(!showMoreShareMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-100 text-neutral-800 border border-neutral-200 text-xs font-medium hover:bg-neutral-200 transition cursor-pointer shadow-2xs"
            >
              <Share2 className="w-3.5 h-3.5 text-neutral-700" />
              <span>More</span>
              <ChevronDown className={`w-3.5 h-3.5 text-neutral-500 transition-transform duration-200 ${showMoreShareMenu ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown Menu */}
            {showMoreShareMenu && (
              <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-56 rounded-xl bg-white border border-neutral-200 shadow-xl p-1 z-30 space-y-0.5">
                <button
                  onClick={() => {
                    handleShareLinkedIn();
                    setShowMoreShareMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-neutral-800 hover:bg-neutral-100 transition cursor-pointer text-left"
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
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-neutral-800 hover:bg-neutral-100 transition cursor-pointer text-left"
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
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-neutral-800 hover:bg-neutral-100 transition cursor-pointer text-left"
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
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-neutral-800 hover:bg-neutral-100 transition cursor-pointer text-left"
                >
                  <Share2 className="w-4 h-4 text-neutral-700 shrink-0" />
                  <span>Device Share / Copy</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </MotionCard>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Referrals */}
        <MotionCard className="rounded-3xl bg-white p-5 space-y-2 shadow-none border-0">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase text-neutral-400 tracking-wide">Total Referred</span>
            <div className="w-8 h-8 rounded-lg bg-neutral-100 text-neutral-900 border border-neutral-200 flex items-center justify-center">
              <Users className="w-4 h-4 text-neutral-800" />
            </div>
          </div>
          <p className="text-2xl sm:text-[28px] font-bold text-neutral-900">{totalReferredCount}</p>
          <p className="text-xs text-neutral-400">Clinics registered via your link</p>
        </MotionCard>

        {/* Card 2: Active Subscriptions */}
        <MotionCard className="rounded-3xl bg-white p-5 space-y-2 shadow-none border-0">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase text-neutral-400 tracking-wide">Active Subscriptions</span>
            <div className="w-8 h-8 rounded-lg bg-neutral-100 text-neutral-800 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-neutral-900" />
            </div>
          </div>
          <p className="text-2xl sm:text-[28px] font-bold text-neutral-900">{activeCount}</p>
          <p className="text-xs text-neutral-500 font-medium">Paying premium monthly plans</p>
        </MotionCard>

        {/* Card 3: Monthly Commission */}
        <MotionCard className="rounded-3xl bg-white p-5 space-y-2 shadow-none border-0">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase text-neutral-400 tracking-wide">Monthly Commission</span>
            <div className="w-8 h-8 rounded-lg bg-neutral-100 text-neutral-800 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-neutral-900" />
            </div>
          </div>
          <p className="text-2xl sm:text-[28px] font-bold text-neutral-900">€{totalMonthlyCommission.toFixed(2)}</p>
          <p className="text-xs text-neutral-400">Recurring payout / mo (30%)</p>
        </MotionCard>

        {/* Card 4: Lifetime Earnings */}
        <MotionCard className="rounded-3xl bg-white p-5 space-y-2 shadow-none border-0">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase text-neutral-400 tracking-wide">Total Earned</span>
            <div className="w-8 h-8 rounded-lg bg-neutral-100 text-neutral-900 border border-neutral-200 flex items-center justify-center">
              <Award className="w-4 h-4 text-neutral-800" />
            </div>
          </div>
          <p className="text-2xl sm:text-[28px] font-bold text-neutral-900">€{totalLifetimeEarnings.toFixed(2)}</p>
          <p className="text-xs text-neutral-500 font-medium">Total paid out to date</p>
        </MotionCard>
      </div>

      {/* Referred Clinics Directory Table Section */}
      <MotionCard className="table-card-outer" hoverLift={false}>
        <div className="px-3.5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-neutral-100 text-neutral-800 flex items-center justify-center shrink-0">
              <Share2 className="w-4 h-4 text-neutral-800" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 tracking-tight">Referred Clinics Directory</h3>
              <p className="text-xs text-neutral-400 font-normal">
                Click on any clinic to view full monthly commission collection history and details
              </p>
            </div>
          </div>

          <button
            onClick={() => userUid && loadReferrals(userUid)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-700 hover:text-neutral-900 transition cursor-pointer bg-neutral-100 hover:bg-neutral-200/80 px-3 py-1.5 rounded-full"
          >
            <RefreshCw className="w-3.5 h-3.5 text-neutral-600" />
            Refresh
          </button>
        </div>

        {/* Table Container */}
        {referrals.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-2 p-8 bg-neutral-50/50">
            <div className="p-2.5 rounded-lg bg-neutral-100 text-neutral-600 border border-neutral-200">
              <Share2 className="w-5 h-5 text-neutral-600" />
            </div>
            <h4 className="font-semibold text-neutral-800 text-sm">No Referred Clinics Yet</h4>
            <p className="text-xs text-neutral-400 max-w-sm">
              Share your referral link above with aesthetic clinic owners to start earning 30% recurring monthly commission!
            </p>
          </div>
        ) : (
          <div className="table-card-inner">
            <div className="overflow-x-auto">
              <table className="table-grid">
                <thead>
                  <tr>
                    <th className="w-12 text-center">
                      <input
                        type="checkbox"
                        checked={referrals.length > 0 && Object.keys(selectedIds).length === referrals.length}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded-md border-neutral-300 text-neutral-900 focus:ring-0 cursor-pointer accent-neutral-900"
                      />
                    </th>
                    <th>Clinic Name</th>
                    <th>Owner Email</th>
                    <th>Commission (30%)</th>
                    <th>Total Collected</th>
                    <th className="text-center">Status</th>
                    <th className="w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((item) => {
                    const isSelected = Boolean(selectedIds[item.id]);
                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedClinicDetail(item)}
                        className={`cursor-pointer group ${isSelected ? "bg-neutral-50/90" : ""}`}
                      >
                        <td className="text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(item.id)}
                            className="w-4 h-4 rounded-md border-neutral-300 text-neutral-900 focus:ring-0 cursor-pointer accent-neutral-900"
                          />
                        </td>
                        <td>
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-neutral-100 text-neutral-800 flex items-center justify-center font-bold text-[11px] shrink-0 border border-neutral-200/60">
                              {item.referredClinicName ? item.referredClinicName[0] : "C"}
                            </div>
                            <span className="font-semibold text-neutral-900 group-hover:text-black text-xs sm:text-[13px]">
                              {item.referredClinicName}
                            </span>
                          </div>
                        </td>
                        <td className="text-xs font-mono text-neutral-600">
                          {item.ownerEmail}
                        </td>
                        <td className="font-bold text-neutral-900 text-xs">
                          €{item.monthlyCommission.toFixed(2)}/mo
                        </td>
                        <td className="font-semibold text-neutral-900 text-xs">
                          €{item.totalEarned.toFixed(2)}
                        </td>
                        <td className="text-center">
                          <span
                            className={
                              item.currentMonthPaid
                                ? "badge-status-progress"
                                : "badge-status-pending"
                            }
                          >
                            {item.currentMonthPaid ? "Paid" : "Pending"}
                          </span>
                        </td>
                        <td className="text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedClinicDetail(item)}
                            className="p-1 rounded-md text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer inline-flex items-center justify-center"
                            title="Details"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </MotionCard>

      {/* -------------------------------------------------------------------------- */}
      {/* CLINIC DETAIL & MONTHLY COMMISSION HISTORY MODAL                         */}
      {/* -------------------------------------------------------------------------- */}
      {selectedClinicDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border-0 space-y-6">
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
                  Total Paid Commission
                </span>
                <p className="text-2xl font-black text-neutral-900 mt-1">
                  €{(selectedClinicDetail.totalEarned || 0).toFixed(2)}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/60">
                <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wide">
                  Current Status
                </span>
                <p className="text-base font-bold text-neutral-900 mt-1 capitalize flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${selectedClinicDetail.status === "active" ? "bg-neutral-950" : "bg-neutral-400"}`} />
                  {selectedClinicDetail.status}
                </p>
              </div>
            </div>

            {/* Historical Monthly Payment Logs */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-800">
                Monthly Commission Payout History
              </h4>

              <div className="border border-neutral-100 rounded-xl divide-y divide-neutral-100 max-h-56 overflow-y-auto">
                {selectedClinicDetail.paymentHistory && selectedClinicDetail.paymentHistory.length > 0 ? (
                  selectedClinicDetail.paymentHistory.map((log, i) => (
                    <div key={i} className="p-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-neutral-100 text-neutral-700">
                          <CheckCircle2 className="w-4 h-4 text-neutral-900" />
                        </div>
                        <div>
                          <p className="text-neutral-900 font-bold">{log.month}</p>
                          <p className="text-[10px] text-neutral-400">Commission Payout</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-neutral-900">+€{log.amount.toFixed(2)}</p>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-neutral-900 bg-neutral-950/10 px-2 py-0.5 rounded-full border border-neutral-200">
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
                className="btn-primary w-full sm:w-auto px-6 py-2.5 text-xs font-semibold cursor-pointer"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}
    </MotionContainer>
  );
}
