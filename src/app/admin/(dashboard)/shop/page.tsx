"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, collection, query, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";
import StatCard from "@/components/StatCard";
import { ShoppingBag, TrendingUp, Gift, Award, Receipt } from "lucide-react";

interface Transaction {
  id: string;
  clientName: string;
  treatmentName: string;
  amount: number;
  date: any;
  status: "Completed" | "Pending" | "Refunded";
}

export default function ShopSummaryPage() {
  const [stats, setStats] = useState({
    totalSales: "€18,450.00",
    aov: "€125.00",
    rewardsUnlocked: "142",
    rewardsRedeemed: "98",
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const clinicId = userDoc.data().clinicId;

          const q = query(collection(db, "clinics", clinicId, "transactions"));
          const snapshot = await getDocs(q);
          const loadedTransactions: Transaction[] = [];
          snapshot.forEach((d) => {
            loadedTransactions.push({ id: d.id, ...d.data() } as Transaction);
          });
          setTransactions(loadedTransactions);

          if (loadedTransactions.length > 0) {
            const total = loadedTransactions.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
            const average = loadedTransactions.length > 0 ? total / loadedTransactions.length : 0;

            setStats({
              totalSales: `€${total.toFixed(2)}`,
              aov: `€${average.toFixed(2)}`,
              rewardsUnlocked: "142",
              rewardsRedeemed: "98",
            });
          }
        }
      } catch (err) {
        console.error("Error loading shop summary:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const redemptionRate = Math.round(
    (parseInt(stats.rewardsRedeemed) / (parseInt(stats.rewardsUnlocked) || 1)) * 100
  );

  return (
    <div className="space-y-4">
      {/* Shop Stat Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Sales"
          value={stats.totalSales}
          change="24.2%"
          changeType="increase"
          period="vs last month"
          icon={<ShoppingBag className="w-5 h-5 stroke-[1.75]" />}
        />
        <StatCard
          title="Avg Order Value"
          value={stats.aov}
          change="6.8%"
          changeType="increase"
          period="vs last month"
          icon={<TrendingUp className="w-5 h-5 stroke-[1.75]" />}
        />
        <StatCard
          title="Rewards Unlocked"
          value={stats.rewardsUnlocked}
          change="15%"
          changeType="increase"
          period="vs last month"
          icon={<Award className="w-5 h-5 stroke-[1.75]" />}
        />
        <StatCard
          title="Rewards Redeemed"
          value={stats.rewardsRedeemed}
          change="9%"
          changeType="increase"
          period="vs last month"
          icon={<Gift className="w-5 h-5 stroke-[1.75]" />}
        />
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
              <p className="text-xs text-neutral-400 font-medium">Percentage of earned rewards redeemed by clients</p>
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
                      {tx.id}
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
                        : String(tx.date)}
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-neutral-900">
                      €{Number(tx.amount || 0).toFixed(2)}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600 border border-emerald-100">
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
