"use client";

import { useEffect, useState } from "react";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { ref, get } from "firebase/database";
import { auth, db, rtdb } from "@/lib/firebase/client";

interface ClientProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  joinedAt: string;
  visitsCount: number;
  loyaltyBalance: number;
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const clinicId = userDoc.data().clinicId;

          // Load clients registered for this clinicId from database.
          const q = query(collection(db, "clinics", clinicId, "patients"));
          const snapshot = await getDocs(q);
          
          // Fetch loyalty points from Realtime Database under this specific clinicId
          const loyaltySnapshot = await get(ref(rtdb, `loyalty_points/${clinicId}`));
          const loyaltyMap = loyaltySnapshot.exists() ? (loyaltySnapshot.val() || {}) : {};

          const loadedClients: ClientProfile[] = [];
          snapshot.forEach((d) => {
            const data = d.data();
            const rtdbLoyalty = loyaltyMap[d.id] !== undefined ? loyaltyMap[d.id] : 0;
            loadedClients.push({
              id: d.id,
              ...data,
              loyaltyBalance: rtdbLoyalty,
            } as ClientProfile);
          });
          setClients(loadedClients);
        }
      } catch (err) {
        console.error("Error fetching clients:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      {/* Search and control bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by name, email, or phone..."
          className="max-w-md w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-black shadow-sm placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
        />
        <div className="text-sm font-medium text-neutral-500">
          Showing {filteredClients.length} of {clients.length} clients
        </div>
      </div>

      {/* Clients directory table */}
      <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-sm text-neutral-500">Loading clients...</div>
        ) : filteredClients.length === 0 ? (
          <div className="p-8 text-center text-sm text-neutral-500">No clients found matching your search.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Contact Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Date Joined
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Visits
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Loyalty Points
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 bg-white text-sm">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-neutral-50/50 transition-colors">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="font-semibold text-neutral-900">{client.name}</div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="text-neutral-900">{client.email}</div>
                      <div className="text-xs text-neutral-500 mt-0.5">{client.phone}</div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-neutral-500">
                      {client.joinedAt}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-center text-neutral-900">
                      {client.visitsCount}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right font-semibold text-neutral-900">
                      {client.loyaltyBalance} pts
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
