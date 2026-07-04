"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, collection, query, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";

interface Transaction {
  id: string;
  clientName: string;
  treatmentName: string;
  amount: number;
  date: any; // Firestore Timestamp
  status: "Completed" | "Pending" | "Refunded";
}

export default function ShopSummaryPage() {
  const [stats, setStats] = useState({
    totalSales: "€0",
    aov: "€0",
    rewardsUnlocked: "0",
    rewardsRedeemed: "0",
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

          // Fetch real transaction logs from Firestore
          const q = query(collection(db, "clinics", clinicId, "transactions"));
          const snapshot = await getDocs(q);
          const loadedTransactions: Transaction[] = [];
          snapshot.forEach((d) => {
            loadedTransactions.push({ id: d.id, ...d.data() } as Transaction);
          });
          setTransactions(loadedTransactions);

          // Calculate actual stats dynamically
          const total = loadedTransactions.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
          const average = loadedTransactions.length > 0 ? (total / loadedTransactions.length) : 0;

          setStats({
            totalSales: `€${total.toFixed(2)}`,
            aov: `€${average.toFixed(2)}`,
            rewardsUnlocked: "0",
            rewardsRedeemed: "0",
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

  return (
    <div className="space-y-8">
      {/* Shop Stat Grid */}
      <div className="grid gap-6 md:grid-cols-4">
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-neutral-500">Total Sales</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">{stats.totalSales}</h2>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-neutral-500">Average Order Value</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">{stats.aov}</h2>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-neutral-500">Rewards Unlocked</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">{stats.rewardsUnlocked}</h2>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-neutral-500">Rewards Redeemed</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">{stats.rewardsRedeemed}</h2>
        </div>
      </div>

      {/* Rewards Redemption Rate Progress */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-sm font-bold tracking-tight text-neutral-700">Reward Redemption Rate</h3>
          <span className="text-sm font-bold text-black">
            {Math.round(
              (parseInt(stats.rewardsRedeemed) / parseInt(stats.rewardsUnlocked)) * 100
            )}
            %
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-neutral-100">
          <div
            className="h-2 rounded-full bg-black"
            style={{
              width: `${
                (parseInt(stats.rewardsRedeemed) / parseInt(stats.rewardsUnlocked)) * 100
              }%`,
            }}
          ></div>
        </div>
      </div>

      {/* Recent sales / transactions log */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold tracking-tight mb-4">Transaction History</h3>

        {loading ? (
          <div className="py-4 text-center text-sm text-neutral-500">Loading transactions...</div>
        ) : transactions.length === 0 ? (
          <p className="text-sm text-neutral-500">No shop sales recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Transaction ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Treatment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 bg-white text-sm">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="whitespace-nowrap px-6 py-4 font-mono font-medium text-neutral-900">
                      {tx.id}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 font-semibold text-neutral-950">
                      {tx.clientName}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-neutral-600">
                      {tx.treatmentName}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-neutral-500">
                      {tx.date && typeof tx.date.toDate === "function"
                        ? tx.date.toDate().toLocaleString()
                        : String(tx.date)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right font-semibold text-neutral-900">
                      €{Number(tx.amount || 0).toFixed(2)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
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
