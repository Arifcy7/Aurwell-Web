"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, collection, query, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";
import StatCard from "@/components/StatCard";
import { StatCardSkeleton, TableSkeleton } from "@/components/Loader";
import { formatCurrency } from "@/lib/utils/currency";
import { ShoppingBag, TrendingUp, Gift, Award, Receipt } from "lucide-react";

interface Transaction {
  id: string;
  clientName: string;
  treatmentName: string;
  amount: number;
  date: any;
  status: "Completed" | "Pending" | "Refunded";
  appliedRewardId?: string;
}

export default function ShopSummaryPage() {
  const [currency, setCurrency] = useState("EUR");
  const [stats, setStats] = useState({
    totalSales: "€0.00",
    aov: "€0.00",
    rewardsUnlocked: 0,
    rewardsRedeemed: 0,
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const clinicId = userDoc.data().clinicId;

          // 1. Fetch Clinic details for Currency
          let clinicCurr = "EUR";
          const clinicDoc = await getDoc(doc(db, "clinics", clinicId));
          if (clinicDoc.exists()) {
            clinicCurr = clinicDoc.data().currency || "EUR";
            setCurrency(clinicCurr);
          }

          // 2. Fetch Rewards collection to count unlocked/available rewards
          const rewardsSnapshot = await getDocs(
            collection(db, "clinics", clinicId, "rewards")
          );
          const totalRewardsUnlocked = rewardsSnapshot.size;

          // 3. Fetch Transactions collection
          const txQuery = query(collection(db, "clinics", clinicId, "transactions"));
          const txSnapshot = await getDocs(txQuery);

          const loadedTransactions: Transaction[] = [];
          let totalSalesVal = 0;
          let redeemedCount = 0;

          txSnapshot.forEach((d) => {
            const data = d.data();
            const tx: Transaction = {
              id: d.id,
              clientName: data.clientName || data.userName || "Client",
              treatmentName: data.treatmentName || "Treatment Service",
              amount: Number(data.amount || 0),
              date: data.date || data.createdAt,
              status: data.status || "Completed",
              appliedRewardId: data.appliedRewardId,
            };

            loadedTransactions.push(tx);

            if (tx.status !== "Refunded") {
              totalSalesVal += tx.amount;
            }

            if (data.appliedRewardId || data.type === "reward_redeemed") {
              redeemedCount++;
            }
          });

          // Sort transactions by date descending (newest first)
          loadedTransactions.sort((a, b) => {
            const timeA = typeof a.date === "number" ? a.date : a.date?.toDate ? a.date.toDate().getTime() : 0;
            const timeB = typeof b.date === "number" ? b.date : b.date?.toDate ? b.date.toDate().getTime() : 0;
            return timeB - timeA;
          });

          setTransactions(loadedTransactions);

          const avgOrderValue =
            loadedTransactions.length > 0
              ? totalSalesVal / loadedTransactions.length
              : 0;

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
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-9 h-9 rounded-full bg-neutral-100 text-neutral-800 flex items-center justify-center">
            <Receipt className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-bold text-neutral-900 tracking-tight">Transaction History</h3>
            <p className="text-xs text-neutral-400 font-medium">Recent shop purchases and treatment transactions</p>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-neutral-400">Loading transactions...</div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-neutral-50 border border-neutral-100 text-sm font-medium text-neutral-400">
            No sales transactions recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-100">
              <thead>
                <tr className="text-left text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  <th className="pb-3 px-4">Transaction ID</th>
                  <th className="pb-3 px-4">Client</th>
                  <th className="pb-3 px-4">Treatment</th>
                  <th className="pb-3 px-4">Date</th>
                  <th className="pb-3 px-4 text-right">Amount</th>
                  <th className="pb-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-sm">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="py-4 px-4 font-mono font-medium text-xs text-neutral-700">
                      {tx.id.substring(0, 16)}...
                    </td>
                    <td className="py-4 px-4 font-semibold text-neutral-900">
                      {tx.clientName}
                    </td>
                    <td className="py-4 px-4 text-neutral-600 font-medium">
                      {tx.treatmentName}
                    </td>
                    <td className="py-4 px-4 text-neutral-400 text-xs">
                      {tx.date && typeof tx.date.toDate === "function"
                        ? tx.date.toDate().toLocaleString()
                        : typeof tx.date === "number"
                        ? new Date(tx.date).toLocaleString()
                        : String(tx.date || "N/A")}
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-neutral-900">
                      {formatCurrency(tx.amount, currency)}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${
                        tx.status === "Completed"
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                          : tx.status === "Pending"
                          ? "bg-amber-50 text-amber-700 border-amber-100"
                          : "bg-rose-50 text-rose-600 border-rose-100"
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
