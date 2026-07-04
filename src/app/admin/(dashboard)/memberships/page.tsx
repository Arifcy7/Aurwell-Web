"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, collection, query, getDocs } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";

interface ActiveMembership {
  id: string;
  clientName: string;
  email: string;
  membershipName: string;
  price: number;
  nextBilling: any; // Firestore Timestamp
  status: "Active" | "Failed" | "Cancelled";
}

export default function MembershipsPage() {
  const [memberships, setMemberships] = useState<ActiveMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeMembers: 0,
    failedBilling: 0,
    mrrContribution: "€0",
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const clinicId = userDoc.data().clinicId;

          // Fetch active memberships from Firestore
          const q = query(collection(db, "clinics", clinicId, "active_memberships"));
          const snapshot = await getDocs(q);
          const loadedMemberships: ActiveMembership[] = [];
          snapshot.forEach((d) => {
            loadedMemberships.push({ id: d.id, ...d.data() } as ActiveMembership);
          });
          setMemberships(loadedMemberships);

          // Calculate actual stats dynamically
          const active = loadedMemberships.filter((m) => m.status === "Active");
          const failed = loadedMemberships.filter((m) => m.status === "Failed");
          const mrr = active.reduce((acc, curr) => acc + Number(curr.price || 0), 0);

          setStats({
            activeMembers: active.length,
            failedBilling: failed.length,
            mrrContribution: `€${mrr.toFixed(2)}`,
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
    <div className="space-y-8">
      {/* Overview Stat Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-neutral-500">Active Subscribers</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">{stats.activeMembers}</h2>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-neutral-500">MRR Contribution</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">{stats.mrrContribution}</h2>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-neutral-500">Failed / Dunning Queue</p>
          <h2 className={`mt-2 text-3xl font-bold tracking-tight ${
            stats.failedBilling > 0 ? "text-red-600" : "text-neutral-900"
          }`}>{stats.failedBilling}</h2>
        </div>
      </div>

      {/* Active membership list */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold tracking-tight mb-4">Active Member Roll</h3>

        {loading ? (
          <div className="py-4 text-center text-sm text-neutral-500">Loading memberships...</div>
        ) : memberships.length === 0 ? (
          <p className="text-sm text-neutral-500">No active memberships found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Membership Tier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Next Renewal
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 bg-white text-sm">
                {memberships.map((memb) => (
                  <tr key={memb.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="font-semibold text-neutral-900">{memb.clientName}</div>
                      <div className="text-xs text-neutral-500">{memb.email}</div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-neutral-900 font-medium">
                      {memb.membershipName}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-neutral-600 font-medium">
                      €{Number(memb.price || 0).toFixed(2)}/mo
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-neutral-500">
                      {memb.nextBilling && typeof memb.nextBilling.toDate === "function"
                        ? memb.nextBilling.toDate().toLocaleDateString()
                        : String(memb.nextBilling)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
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
