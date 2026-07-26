"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, collection, query, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";
import StatCard from "@/components/StatCard";
import { StatCardSkeleton, TableSkeleton } from "@/components/Loader";
import { formatCurrency } from "@/lib/utils/currency";
import { Users, DollarSign, AlertCircle, ShieldCheck } from "lucide-react";

interface ActiveMembership {
  id: string;
  clientName: string;
  email: string;
  membershipName: string;
  price: number;
  nextBilling: any;
  status: "Active" | "Failed" | "Cancelled";
}

export default function MembershipsPage() {
  const [currency, setCurrency] = useState("EUR");
  const [memberships, setMemberships] = useState<ActiveMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeMembers: "0",
    failedBilling: "0",
    mrrContribution: "€0.00",
  });

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

          // 1. Fetch Clinic profile for Currency
          let clinicCurr = "EUR";
          const clinicDoc = await getDoc(doc(db, "clinics", clinicId));
          if (clinicDoc.exists()) {
            clinicCurr = clinicDoc.data().currency || "EUR";
            setCurrency(clinicCurr);
          }

          // 2. Fetch Active Memberships subcollection
          const q = query(collection(db, "clinics", clinicId, "active_memberships"));
          const snapshot = await getDocs(q);
          const loadedMemberships: ActiveMembership[] = [];

          snapshot.forEach((d) => {
            const data = d.data();
            loadedMemberships.push({
              id: d.id,
              clientName: data.clientName || data.userName || "Subscriber",
              email: data.email || "N/A",
              membershipName: data.membershipName || data.title || "VIP Membership Tier",
              price: Number(data.price || 0),
              nextBilling: data.nextBilling || data.createdAt,
              status: data.status || "Active",
            } as ActiveMembership);
          });

          // Sort memberships by status (Active first) then by name
          loadedMemberships.sort((a, b) => {
            if (a.status === "Active" && b.status !== "Active") return -1;
            if (a.status !== "Active" && b.status === "Active") return 1;
            return a.clientName.localeCompare(b.clientName);
          });

          setMemberships(loadedMemberships);

          const activeList = loadedMemberships.filter((m) => m.status === "Active");
          const failedList = loadedMemberships.filter((m) => m.status === "Failed");
          const mrrSum = activeList.reduce((acc, curr) => acc + Number(curr.price || 0), 0);

          setStats({
            activeMembers: String(activeList.length),
            failedBilling: String(failedList.length),
            mrrContribution: formatCurrency(mrrSum, clinicCurr),
          });
        }
      } catch (err) {
        console.error("Error loading memberships:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="space-y-4">
      {/* Overview Stat Grid Dynamic with Clinic Currency */}
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
              title="Active Subscribers"
              value={stats.activeMembers}
              change="Subscribed"
              changeType="increase"
              period="active plan members"
              icon={<Users className="w-5 h-5 stroke-[1.75]" />}
            />
            <StatCard
              title="MRR Contribution"
              value={stats.mrrContribution}
              change="Monthly"
              changeType="increase"
              period="recurring revenue"
              icon={<DollarSign className="w-5 h-5 stroke-[1.75]" />}
            />
            <StatCard
              title="Failed Dunning Queue"
              value={stats.failedBilling}
              change={Number(stats.failedBilling) > 0 ? "Requires Attention" : "All Clear"}
              changeType={Number(stats.failedBilling) > 0 ? "decrease" : "neutral"}
              period="billing issues"
              icon={<AlertCircle className="w-5 h-5 stroke-[1.75]" />}
            />
          </>
        )}
      </div>

      {/* Active membership list card */}
      <div className="rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-100 overflow-hidden transition-all hover:shadow-[0_12px_40px_rgb(0,0,0,0.06)]">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-neutral-100 text-neutral-800 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 tracking-tight">Active Member Roll</h3>
              <p className="text-xs text-neutral-400 font-medium">All active client subscriptions & renewal cycles</p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-neutral-400">Loading memberships...</div>
        ) : memberships.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-neutral-50 border border-neutral-100 text-sm font-medium text-neutral-400">
            No active memberships recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-100">
              <thead>
                <tr className="text-left text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  <th className="pb-3 px-4">Member</th>
                  <th className="pb-3 px-4">Tier</th>
                  <th className="pb-3 px-4">Price</th>
                  <th className="pb-3 px-4">Renewal Date</th>
                  <th className="pb-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-sm">
                {memberships.map((memb) => (
                  <tr key={memb.id} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="font-semibold text-neutral-900">{memb.clientName}</div>
                      <div className="text-xs text-neutral-400">{memb.email}</div>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap font-medium text-neutral-800">
                      {memb.membershipName}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap font-semibold text-neutral-900">
                      {formatCurrency(memb.price, currency)}/mo
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap text-neutral-500 text-xs">
                      {memb.nextBilling && typeof memb.nextBilling.toDate === "function"
                        ? memb.nextBilling.toDate().toLocaleDateString()
                        : typeof memb.nextBilling === "number"
                        ? new Date(memb.nextBilling).toLocaleDateString()
                        : String(memb.nextBilling || "N/A")}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap text-right">
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${
                        memb.status === "Active"
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                          : memb.status === "Failed"
                          ? "bg-rose-50 text-rose-600 border-rose-100"
                          : "bg-neutral-100 text-neutral-600 border-neutral-200"
                      }`}>
                        {memb.status}
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
