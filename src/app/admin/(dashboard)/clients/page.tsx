"use client";

import { useEffect, useState } from "react";
import { collection, query, getDocs, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { ref, get } from "firebase/database";
import { auth, db, rtdb } from "@/lib/firebase/client";
import { Search, Users, Phone, Mail, Award, Calendar } from "lucide-react";

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

          const q = query(collection(db, "clinics", clinicId, "patients"));
          const snapshot = await getDocs(q);

          const loyaltySnapshot = await get(ref(rtdb, `loyalty_points/${clinicId}`));
          const loyaltyMap = loyaltySnapshot.exists() ? loyaltySnapshot.val() || {} : {};

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
    <div className="space-y-4">
      {/* Search Bar & Header Card */}
      <div className="rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all hover:shadow-[0_12px_40px_rgb(0,0,0,0.06)]">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search clients by name, email, or phone..."
            className="input-modern pl-11"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-500 bg-neutral-100/70 px-4 py-2 rounded-full border border-neutral-200/60">
          <Users className="w-4 h-4 text-neutral-700" />
          Showing {filteredClients.length} of {clients.length} registered clients
        </div>
      </div>

      {/* Clients directory table */}
      <div className="rounded-3xl bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-100 overflow-hidden transition-all hover:shadow-[0_12px_40px_rgb(0,0,0,0.06)]">
        {loading ? (
          <div className="py-8 text-center text-sm text-neutral-400">Loading client directory...</div>
        ) : filteredClients.length === 0 ? (
          <div className="py-12 text-center rounded-2xl bg-neutral-50 border border-neutral-100 text-sm font-medium text-neutral-400">
            No client records found matching your query.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-100">
              <thead>
                <tr className="text-left text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  <th className="pb-3 px-4">Client Name</th>
                  <th className="pb-3 px-4">Contact Details</th>
                  <th className="pb-3 px-4">Date Joined</th>
                  <th className="pb-3 px-4 text-center">Visits</th>
                  <th className="pb-3 px-4 text-right">Loyalty Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-sm">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-neutral-100 text-neutral-700 flex items-center justify-center font-bold text-xs">
                          {client.name[0]}
                        </div>
                        <div className="font-semibold text-neutral-900">{client.name}</div>
                      </div>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="text-neutral-900 font-medium">{client.email}</div>
                      <div className="text-xs text-neutral-400 mt-0.5">{client.phone}</div>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap text-neutral-500 text-xs">
                      {client.joinedAt || "Jan 2026"}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-neutral-100 text-neutral-800 border border-neutral-200/80">
                        {client.visitsCount || 0} visits
                      </span>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap text-right font-bold text-emerald-600">
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
