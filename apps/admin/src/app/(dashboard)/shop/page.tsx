"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, collection, query, getDocs, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";
import { fetchCanonicalRewards, fetchCanonicalPatients } from "@/lib/firebase/versionCache";
import StatCard from "@/components/StatCard";
import { StatCardSkeleton } from "@/components/Loader";
import { formatCurrency } from "@/lib/utils/currency";
import {
  ShoppingBag,
  TrendingUp,
  Gift,
  Award,
  Receipt,
  Search,
  X,
  Copy,
  Check,
  AlertTriangle,
  RotateCcw,
  ChevronRight,
  CreditCard,
  Calendar,
  User,
  Mail,
  CheckCircle2,
} from "lucide-react";

export interface TransactionItem {
  id: string;
  title: string;
  typeTitle?: string;
  price: number;
  quantity?: number;
  status?: "not started" | "ongoing" | "completed";
}

export interface Transaction {
  id: string;
  clientName: string;
  email?: string;
  userUid?: string;
  paymentIntentId?: string;
  treatmentName: string;
  type?: string;
  amount: number;
  subtotal?: number;
  discountAmount?: number;
  status: "Completed" | "Pending" | "Refunded";
  date: any;
  appliedRewardId?: string;
  items?: TransactionItem[];
}

export default function ShopSummaryPage() {
  const [currency, setCurrency] = useState("EUR");
  const [clinicId, setClinicId] = useState("");
  const [stats, setStats] = useState({
    totalSales: "€0.00",
    aov: "€0.00",
    rewardsUnlocked: 0,
    rewardsRedeemed: 0,
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Transaction Detail Modal State
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [copiedTxId, setCopiedTxId] = useState(false);
  const [copiedPiId, setCopiedPiId] = useState(false);

  // Refund Confirmation Modal State
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundInput, setRefundInput] = useState("");
  const [refunding, setRefunding] = useState(false);
  const [refundError, setRefundError] = useState("");
  const [refundSuccess, setRefundSuccess] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const cId = userDoc.data().clinicId;
          setClinicId(cId);

          // 1. Fetch Clinic details for Currency
          let clinicCurr = "EUR";
          const clinicDoc = await getDoc(doc(db, "clinics", cId));
          if (clinicDoc.exists()) {
            clinicCurr = clinicDoc.data().currency || "EUR";
            setCurrency(clinicCurr);
          }

          // 2. Fetch Rewards with Version Cache to count unlocked/available rewards
          const rewardsList = await fetchCanonicalRewards(cId);
          const totalRewardsUnlocked = rewardsList.length;

          // 3. Fetch patients with Version Cache for fallback name & email lookup
          const patientsList = await fetchCanonicalPatients(cId);
          const patientMap = new Map<string, { name: string; email: string }>();
          patientsList.forEach((p) => patientMap.set(p.id, { name: p.name || "", email: p.email || "" }));

          // 4. Fetch Transactions collection
          const txQuery = query(collection(db, "clinics", cId, "transactions"));
          const txSnapshot = await getDocs(txQuery);

          const loadedTransactions: Transaction[] = [];
          let totalSalesVal = 0;
          let redeemedCount = 0;

          for (const d of txSnapshot.docs) {
            const data = d.data();
            let clientName = (data.clientName || data.userName || "").trim();
            let email = (data.email || "").trim();
            const uUid = (data.userUid || "").trim();

            const isGenericName =
              !clientName ||
              clientName.toLowerCase() === "valued patient" ||
              clientName.toLowerCase() === "patient" ||
              clientName.toLowerCase() === "client" ||
              clientName.toLowerCase() === "subscriber";

            if ((isGenericName || !email) && uUid) {
              if (patientMap.has(uUid)) {
                const pInfo = patientMap.get(uUid)!;
                if (isGenericName && pInfo.name) clientName = pInfo.name;
                if (!email && pInfo.email) email = pInfo.email;
              }

              if ((isGenericName && (!clientName || clientName.toLowerCase() === "valued patient")) || !email) {
                try {
                  const uDoc = await getDoc(doc(db, "users", uUid));
                  if (uDoc.exists()) {
                    const uData = uDoc.data();
                    if ((!clientName || clientName.toLowerCase() === "valued patient") && (uData.name || uData.clientName)) {
                      clientName = uData.name || uData.clientName;
                    }
                    if (!email && uData.email) {
                      email = uData.email;
                    }
                  }
                } catch (err) {
                  console.error("Error fetching user profile fallback:", err);
                }
              }
            }

            if (!clientName || clientName.toLowerCase() === "valued patient" || clientName.toLowerCase() === "patient") {
              clientName = "Valued Patient";
            }

            const tx: Transaction = {
              id: d.id,
              clientName,
              email,
              userUid: uUid,
              paymentIntentId: data.paymentIntentId || "",
              treatmentName: data.treatmentName || "Treatment Service",
              type: data.type || "treatment",
              amount: Number(data.amount || 0),
              subtotal: data.subtotal !== undefined ? Number(data.subtotal) : Number(data.amount || 0),
              discountAmount: data.discountAmount !== undefined ? Number(data.discountAmount) : 0,
              date: data.date || data.createdAt,
              status: data.status || "Completed",
              appliedRewardId: data.appliedRewardId,
              items: Array.isArray(data.items) ? data.items : [],
            };

            loadedTransactions.push(tx);

            if (tx.status !== "Refunded") {
              totalSalesVal += tx.amount;
            }

            if (data.appliedRewardId || data.type === "reward_redeemed") {
              redeemedCount++;
            }
          }

          // Sort transactions by date descending (newest first)
          loadedTransactions.sort((a, b) => {
            const timeA = typeof a.date === "number" ? a.date : a.date?.toDate ? a.date.toDate().getTime() : 0;
            const timeB = typeof b.date === "number" ? b.date : b.date?.toDate ? b.date.toDate().getTime() : 0;
            return timeB - timeA;
          });

          setTransactions(loadedTransactions);

          const validTxList = loadedTransactions.filter((t) => t.status !== "Refunded");
          const avgOrderValue =
            validTxList.length > 0 ? totalSalesVal / validTxList.length : 0;

          setStats({
            totalSales: formatCurrency(totalSalesVal, clinicCurr),
            aov: formatCurrency(avgOrderValue, clinicCurr),
            rewardsUnlocked: totalRewardsUnlocked,
            rewardsRedeemed: redeemedCount,
          });
        }
      } catch (err) {
        console.error("Error loading shop summary:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Filter transactions based on search query
  const filteredTransactions = transactions.filter((tx) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      tx.id.toLowerCase().includes(q) ||
      tx.clientName.toLowerCase().includes(q) ||
      (tx.email && tx.email.toLowerCase().includes(q)) ||
      (tx.paymentIntentId && tx.paymentIntentId.toLowerCase().includes(q)) ||
      tx.treatmentName.toLowerCase().includes(q) ||
      tx.status.toLowerCase().includes(q)
    );
  });

  // Open detail modal
  const handleOpenDetailModal = (tx: Transaction) => {
    setSelectedTx(tx);
    setCopiedTxId(false);
    setCopiedPiId(false);
    setRefundError("");
    setRefundSuccess("");
  };

  // Copy to Clipboard
  const handleCopyText = (text: string, isPi: boolean = false) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (isPi) {
      setCopiedPiId(true);
      setTimeout(() => setCopiedPiId(false), 2000);
    } else {
      setCopiedTxId(true);
      setTimeout(() => setCopiedTxId(false), 2000);
    }
  };

  // Open Refund Modal
  const handleOpenRefundModal = () => {
    setRefundInput("");
    setRefundError("");
    setShowRefundModal(true);
  };

  // Execute Refund via Backend API
  const handleExecuteRefund = async () => {
    if (refundInput.trim().toLowerCase() !== "refund" || !selectedTx || !clinicId) return;

    setRefunding(true);
    setRefundError("");

    try {
      // Get Firebase Auth ID Token to pass in Authorization header
      const idToken = await auth.currentUser?.getIdToken();

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (idToken) {
        headers["Authorization"] = `Bearer ${idToken}`;
      }

      // Use exact refund endpoint from STRIPE_INTEGRATION_GUIDE.md
      const pId = selectedTx.paymentIntentId || selectedTx.id;
      const res = await fetch("https://api-guexeyftta-uc.a.run.app/payments/refund", {
        method: "POST",
        headers,
        body: JSON.stringify({
          clinicId: clinicId,
          paymentIntentId: pId,
          amount: selectedTx.amount,
          reason: "requested_by_customer",
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        const errorMsg =
          data?.message ||
          data?.error ||
          (data && typeof data === "object" ? JSON.stringify(data) : `Server responded with status ${res.status}`);
        throw new Error(errorMsg);
      }

      // Update Firestore document status to "Refunded"
      const txDocRef = doc(db, "clinics", clinicId, "transactions", selectedTx.id);
      await updateDoc(txDocRef, { status: "Refunded" });

      // Update local state lists
      const updatedStatus: "Refunded" = "Refunded";
      setTransactions((prev) =>
        prev.map((t) => (t.id === selectedTx.id ? { ...t, status: updatedStatus } : t))
      );
      setSelectedTx((prev) => (prev ? { ...prev, status: updatedStatus } : null));

      setRefundSuccess("Transaction refunded successfully via Stripe!");
      setShowRefundModal(false);
      setTimeout(() => setRefundSuccess(""), 4000);
    } catch (err: any) {
      console.error("Refund Execution Error:", err);
      const displayErr = typeof err === "object" && err?.message ? err.message : String(err);
      setRefundError(displayErr || "Failed to process refund. Please check Stripe connection.");
    } finally {
      setRefunding(false);
    }
  };

  const redemptionRate =
    stats.rewardsUnlocked > 0
      ? Math.min(100, Math.round((stats.rewardsRedeemed / stats.rewardsUnlocked) * 100))
      : stats.rewardsRedeemed > 0
      ? 100
      : 0;

  return (
    <div className="space-y-4">
      {/* Shop Stat Grid Dynamic with Clinic Currency */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              title="Total Sales"
              value={stats.totalSales}
              change="Completed"
              changeType="increase"
              period="all sales transactions"
              icon={<ShoppingBag className="w-5 h-5 stroke-[1.75]" />}
            />
            <StatCard
              title="Avg Order Value"
              value={stats.aov}
              change="Per Order"
              changeType="increase"
              period="average ticket size"
              icon={<TrendingUp className="w-5 h-5 stroke-[1.75]" />}
            />
            <StatCard
              title="Rewards Available"
              value={String(stats.rewardsUnlocked)}
              change="Active"
              changeType="increase"
              period="unlocked reward tiers"
              icon={<Award className="w-5 h-5 stroke-[1.75]" />}
            />
            <StatCard
              title="Rewards Redeemed"
              value={String(stats.rewardsRedeemed)}
              change="Claimed"
              changeType="increase"
              period="redeemed vouchers"
              icon={<Gift className="w-5 h-5 stroke-[1.75]" />}
            />
          </>
        )}
      </div>

      {/* Rewards Redemption Progress Card */}
      <div className="rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-100 transition-all hover:shadow-[0_12px_40px_rgb(0,0,0,0.06)]">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Gift className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 tracking-tight">
                Reward Redemption Conversion Rate
              </h3>
              <p className="text-xs text-neutral-400 font-medium">
                Percentage of unlocked reward vouchers redeemed by clients
              </p>
            </div>
          </div>
          <span className="text-xl font-extrabold text-neutral-900">{redemptionRate}%</span>
        </div>

        <div className="h-3 w-full rounded-full bg-neutral-100/90 overflow-hidden p-0.5 border border-neutral-200/50">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
            style={{ width: `${redemptionRate}%` }}
          ></div>
        </div>
      </div>

      {/* Transaction Log Table Card */}
      <div className="rounded-3xl bg-white p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-100 overflow-hidden transition-all hover:shadow-[0_12px_40px_rgb(0,0,0,0.06)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-neutral-100 text-neutral-800 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 tracking-tight">Transaction History</h3>
              <p className="text-xs text-neutral-400 font-medium">Recent shop purchases, client payments and refunds</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ID, client, email, treatment..."
              className="w-full pl-9 pr-8 py-2 rounded-full bg-neutral-50 border border-neutral-200 text-xs text-neutral-800 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-neutral-400">Loading transactions...</div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-neutral-50 border border-neutral-100 text-sm font-medium text-neutral-400">
            {searchQuery ? `No transactions found matching "${searchQuery}".` : "No sales transactions recorded yet."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-100">
              <thead>
                <tr className="text-left text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  <th className="pb-3 px-4">Client</th>
                  <th className="pb-3 px-4">Treatment</th>
                  <th className="pb-3 px-4">Date</th>
                  <th className="pb-3 px-4 text-right">Amount</th>
                  <th className="pb-3 px-4 text-center">Status</th>
                  <th className="pb-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-sm">
                {filteredTransactions.map((tx) => (
                  <tr
                    key={tx.id}
                    onClick={() => handleOpenDetailModal(tx)}
                    className="hover:bg-neutral-50/80 cursor-pointer transition-colors group"
                  >
                    <td className="py-4 px-4 font-semibold text-neutral-900">
                      <div>{tx.clientName}</div>
                      {tx.email && <div className="text-[11px] font-normal text-neutral-400">{tx.email}</div>}
                    </td>
                    <td className="py-4 px-4 text-neutral-600 font-medium max-w-xs truncate">
                      {tx.treatmentName}
                    </td>
                    <td className="py-4 px-4 text-neutral-400 text-xs whitespace-nowrap">
                      {tx.date && typeof tx.date.toDate === "function"
                        ? tx.date.toDate().toLocaleString()
                        : typeof tx.date === "number"
                        ? new Date(tx.date).toLocaleString()
                        : String(tx.date || "N/A")}
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-neutral-900">
                      {formatCurrency(tx.amount, currency)}
                    </td>
                    <td className="py-4 px-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${
                          tx.status === "Completed"
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                            : tx.status === "Pending"
                            ? "bg-amber-50 text-amber-700 border-amber-100"
                            : "bg-rose-50 text-rose-600 border-rose-100"
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetailModal(tx);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-bold text-neutral-800 hover:text-black bg-neutral-100 hover:bg-neutral-200 px-3 py-1.5 rounded-full transition-all cursor-pointer"
                      >
                        Details
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* DETAILED TRANSACTION INFO MODAL */}
      {/* ========================================================================= */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn">
          <div
            className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-neutral-100 overflow-hidden my-8 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-neutral-100 flex items-start justify-between bg-neutral-50/50">
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-lg font-bold text-neutral-900">Transaction Details</h3>
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-bold border ${
                      selectedTx.status === "Completed"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : selectedTx.status === "Pending"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-rose-50 text-rose-700 border-rose-200"
                    }`}
                  >
                    {selectedTx.status}
                  </span>
                </div>
                <p className="text-xs text-neutral-400 mt-1">Detailed summary and Stripe payment record</p>
              </div>

              <button
                onClick={() => setSelectedTx(null)}
                className="w-8 h-8 rounded-full bg-white border border-neutral-200 flex items-center justify-center text-neutral-400 hover:text-neutral-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Notification messages */}
            {refundSuccess && (
              <div className="mx-6 mt-4 rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs font-semibold text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                {refundSuccess}
              </div>
            )}

            {refundError && (
              <div className="mx-6 mt-4 rounded-2xl bg-rose-50 border border-rose-200 p-3.5 text-xs font-semibold text-rose-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                {refundError}
              </div>
            )}

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Identifiers & Copy Buttons Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  Transaction Identifiers
                </h4>

                <div className="grid grid-cols-1 gap-2.5">
                  {/* Transaction ID with Copy Button */}
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-50/80 border border-neutral-100">
                    <div className="space-y-0.5 min-w-0 pr-2">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase">Firestore Transaction ID</span>
                      <div className="font-mono text-xs font-bold text-neutral-900 truncate">
                        {selectedTx.id}
                      </div>
                    </div>
                    <button
                      onClick={() => handleCopyText(selectedTx.id, false)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-neutral-200 hover:bg-neutral-100 text-xs font-bold text-neutral-800 transition shadow-sm cursor-pointer flex-shrink-0"
                    >
                      {copiedTxId ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-600">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy ID</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Payment Intent ID with Copy Button */}
                  {selectedTx.paymentIntentId && (
                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-50/80 border border-neutral-100">
                      <div className="space-y-0.5 min-w-0 pr-2">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase">Stripe Payment Intent ID</span>
                        <div className="font-mono text-xs font-bold text-neutral-900 truncate">
                          {selectedTx.paymentIntentId}
                        </div>
                      </div>
                      <button
                        onClick={() => handleCopyText(selectedTx.paymentIntentId!, true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-neutral-200 hover:bg-neutral-100 text-xs font-bold text-neutral-800 transition shadow-sm cursor-pointer flex-shrink-0"
                      >
                        {copiedPiId ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-600">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy PI</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Customer & Timestamp Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-neutral-50/70 border border-neutral-100 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-semibold">
                    <User className="w-3.5 h-3.5 text-neutral-500" />
                    Customer Name
                  </div>
                  <div className="text-sm font-bold text-neutral-900">{selectedTx.clientName}</div>
                  {selectedTx.email && (
                    <div className="text-xs text-neutral-500 flex items-center gap-1">
                      <Mail className="w-3 h-3 text-neutral-400" />
                      {selectedTx.email}
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-neutral-50/70 border border-neutral-100 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-neutral-400 font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                    Transaction Date
                  </div>
                  <div className="text-sm font-bold text-neutral-900">
                    {selectedTx.date && typeof selectedTx.date.toDate === "function"
                      ? selectedTx.date.toDate().toLocaleString()
                      : typeof selectedTx.date === "number"
                      ? new Date(selectedTx.date).toLocaleString()
                      : String(selectedTx.date || "N/A")}
                  </div>
                  <div className="text-xs text-neutral-500">Category: {selectedTx.type || "treatment"}</div>
                </div>
              </div>

              {/* Financial Breakdown */}
              <div className="p-4 rounded-2xl bg-neutral-900 text-white space-y-2.5 shadow-sm">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Payment Breakdown</h4>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-neutral-300">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(selectedTx.subtotal || selectedTx.amount, currency)}</span>
                  </div>

                  {Boolean(selectedTx.discountAmount) && selectedTx.discountAmount! > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Discount Applied:</span>
                      <span>-{formatCurrency(selectedTx.discountAmount!, currency)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm font-extrabold text-white pt-2 border-t border-neutral-800">
                    <span>Total Amount Paid:</span>
                    <span>{formatCurrency(selectedTx.amount, currency)}</span>
                  </div>
                </div>
              </div>

              {/* Line Items & Treatment Progress Display */}
              {selectedTx.items && selectedTx.items.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                    Purchased Line Items & Treatment Progress ({selectedTx.items.length})
                  </h4>

                  <div className="space-y-2">
                    {selectedTx.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-50 border border-neutral-100"
                      >
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold text-neutral-900">{item.title}</div>
                          {item.typeTitle && (
                            <div className="text-[11px] text-neutral-500 font-medium">
                              Variant: {item.typeTitle}
                            </div>
                          )}
                          <div className="text-[11px] text-neutral-400">
                            Qty: {item.quantity || 1} × {formatCurrency(item.price, currency)}
                          </div>
                        </div>

                        {/* Read-only Treatment Progress Badge */}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase text-neutral-400">Progress:</span>
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold border ${
                              item.status === "completed"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : item.status === "ongoing"
                                ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                : "bg-neutral-100 text-neutral-700 border-neutral-200"
                            }`}
                          >
                            {item.status || "not started"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer & Actions */}
            <div className="p-4 border-t border-neutral-100 bg-neutral-50/50 flex items-center justify-between">
              {selectedTx.status !== "Refunded" ? (
                <button
                  type="button"
                  onClick={handleOpenRefundModal}
                  className="rounded-full bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 px-4 py-2 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Issue Full Refund
                </button>
              ) : (
                <span className="text-xs font-bold text-rose-600 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Transaction Refunded
                </span>
              )}

              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="rounded-full bg-neutral-900 px-6 py-2 text-xs font-bold text-white hover:bg-neutral-800 transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REFUND CONFIRMATION MODAL (PASTE DISABLED REQUIREMENT) */}
      {/* ========================================================================= */}
      {showRefundModal && selectedTx && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-neutral-100 overflow-hidden p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-neutral-900">Confirm Stripe Refund</h4>
                <p className="text-xs text-neutral-500">
                  {formatCurrency(selectedTx.amount, currency)} refund to {selectedTx.clientName}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-neutral-600 leading-relaxed bg-neutral-50 p-3 rounded-2xl border border-neutral-100">
                This action will call the Stripe Refund API and update the transaction status to <strong>"Refunded"</strong>.
                To confirm, please manually type <strong className="text-rose-600 font-mono">refund</strong> in the box below.
              </p>

              {/* Paste disabled input box as per strict prompt instructions */}
              <div>
                <label className="block text-[10px] font-bold uppercase text-neutral-400 mb-1">
                  Type 'refund' to enable confirm button:
                </label>
                <input
                  type="text"
                  value={refundInput}
                  onChange={(e) => setRefundInput(e.target.value)}
                  onPaste={(e) => {
                    e.preventDefault();
                    alert("Pasting is disabled for refund confirmation. Please type 'refund' manually.");
                  }}
                  placeholder="Type 'refund' here..."
                  className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-xs font-semibold text-neutral-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all font-mono"
                />
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowRefundModal(false)}
                className="rounded-full bg-neutral-100 px-5 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-200 transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={refundInput.trim().toLowerCase() !== "refund" || refunding}
                onClick={handleExecuteRefund}
                className="rounded-full bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white px-5 py-2 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                {refunding ? "Refunding..." : "Confirm Refund"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
