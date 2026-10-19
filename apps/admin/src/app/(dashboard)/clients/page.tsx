"use client";

import { useEffect, useState } from "react";
import { collection, query, getDocs, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { ref, get } from "firebase/database";
import { auth, db, rtdb } from "@/lib/firebase/client";
import { fetchCanonicalPatients } from "@/lib/firebase/versionCache";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Users,
  MoreVertical,
  X,
  Mail,
  Phone,
  Calendar,
  Award,
  Sparkles,
  Download,
  Copy,
  Check,
  Send,
} from "lucide-react";
import { TableSkeleton } from "@/components/Loader";
import { MotionContainer, MotionCard } from "@/components/ui/motion-container";
import Link from "next/link";

interface ClientProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  joinedAt: string;
  visitsCount: number;
  loyaltyBalance: number;
}

function formatJoinedDate(joinedAt: any): string {
  if (!joinedAt) return "N/A";

  try {
    // 1. Firestore Timestamp
    if (typeof joinedAt === "object" && joinedAt !== null && typeof joinedAt.toDate === "function") {
      return joinedAt.toDate().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }

    // 2. Epoch timestamp in seconds or milliseconds
    if (typeof joinedAt === "number") {
      const ms = joinedAt < 10000000000 ? joinedAt * 1000 : joinedAt;
      return new Date(ms).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }

    // 3. String that might be numeric epoch string or ISO date string
    if (typeof joinedAt === "string") {
      const trimmed = joinedAt.trim();
      if (!isNaN(Number(trimmed)) && trimmed.length >= 9) {
        const num = Number(trimmed);
        const ms = num < 10000000000 ? num * 1000 : num;
        return new Date(ms).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      }

      const parsedDate = new Date(trimmed);
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
      }
      return trimmed;
    }
  } catch (err) {
    console.error("Error formatting joined date:", err);
  }

  return String(joinedAt);
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [selectedClient, setSelectedClient] = useState<ClientProfile | null>(null);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const clinicId = userDoc.data().clinicId;

          const loadedClients = await fetchCanonicalPatients(clinicId);

          setClients(loadedClients);
          setLoading(false);

          // Non-blocking background sync for live RTDB loyalty points
          try {
            const loyaltyRef = ref(rtdb, `loyalty_points/${clinicId}`);
            get(loyaltyRef)
              .then((loyaltySnapshot) => {
                if (loyaltySnapshot.exists()) {
                  const loyaltyMap = loyaltySnapshot.val() || {};
                  setClients((prev) =>
                    prev.map((c) => ({
                      ...c,
                      loyaltyBalance: loyaltyMap[c.id] ?? c.loyaltyBalance,
                    }))
                  );
                }
              })
              .catch(() => {});
          } catch (e) {
            // Silently ignore
          }
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
      (c.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.email || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.phone || "").includes(searchTerm)
  );

  const toggleSelectAll = () => {
    if (Object.keys(selectedIds).length === filteredClients.length && filteredClients.length > 0) {
      setSelectedIds({});
    } else {
      const all: Record<string, boolean> = {};
      filteredClients.forEach((c) => {
        all[c.id] = true;
      });
      setSelectedIds(all);
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = true;
      return next;
    });
  };

  const handleCopyEmail = (email: string) => {
    if (!email) return;
    navigator.clipboard.writeText(email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleCopyPhone = (phone: string) => {
    if (!phone) return;
    navigator.clipboard.writeText(phone);
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  };

  const handleExportSelectedCSV = () => {
    const selectedClientsList = clients.filter((c) => selectedIds[c.id]);
    if (selectedClientsList.length === 0) return;

    const headers = ["Name", "Email", "Phone", "Date Joined", "Visits", "Loyalty Points"];
    const rows = selectedClientsList.map((c) => [
      `"${(c.name || "").replace(/"/g, '""')}"`,
      `"${(c.email || "").replace(/"/g, '""')}"`,
      `"${(c.phone || "").replace(/"/g, '""')}"`,
      `"${formatJoinedDate(c.joinedAt)}"`,
      c.visitsCount || 0,
      c.loyaltyBalance || 0,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `aurwell_clients_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const selectedCount = Object.keys(selectedIds).length;

  return (
    <MotionContainer className="space-y-3.5 sm:space-y-4" staggerDelay={0.08}>
      {/* Search Bar & Header Card */}
      <MotionCard className="rounded-3xl bg-white p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 z-10 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search clients by name, email, or phone..."
            className="input-modern input-search"
          />
        </div>

        <div className="flex items-center gap-3">
          {selectedCount > 0 && (
            <div className="flex items-center gap-2 bg-neutral-900 text-white px-3.5 py-1.5 rounded-full text-xs font-semibold animate-fadeIn">
              <span>{selectedCount} selected</span>
              <button
                type="button"
                onClick={handleExportSelectedCSV}
                className="hover:underline flex items-center gap-1 cursor-pointer pl-1 border-l border-white/20 text-neutral-200 hover:text-white"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds({})}
                className="hover:underline cursor-pointer pl-1 text-neutral-400 hover:text-white"
              >
                Clear
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs font-medium text-neutral-600 bg-neutral-100 px-4 py-2 rounded-full shrink-0">
            <Users className="w-4 h-4 text-neutral-500" />
            <span>
              Showing <strong className="font-semibold text-neutral-900">{filteredClients.length}</strong> of{" "}
              {clients.length} clients
            </span>
          </div>
        </div>
      </MotionCard>

      {/* Clients directory table */}
      {loading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : (
        <MotionCard className="table-card-outer" hoverLift={false}>
          {filteredClients.length === 0 ? (
            <div className="py-16 text-center text-xs font-medium text-neutral-400">
              No client records found matching your query.
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
                          checked={filteredClients.length > 0 && Object.keys(selectedIds).length === filteredClients.length}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded-md border-neutral-300 text-neutral-900 focus:ring-0 cursor-pointer accent-neutral-900"
                        />
                      </th>
                      <th>Client Name</th>
                      <th>Contact Details</th>
                      <th>Date Joined</th>
                      <th className="text-center">Visits</th>
                      <th className="text-right">Loyalty Balance</th>
                      <th className="w-12 text-center"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients.map((client) => {
                      const isSelected = Boolean(selectedIds[client.id]);
                      return (
                        <tr
                          key={client.id}
                          onClick={() => setSelectedClient(client)}
                          className={`cursor-pointer ${isSelected ? "bg-neutral-50/90" : undefined}`}
                        >
                          <td className="text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectRow(client.id)}
                              className="w-4 h-4 rounded-md border-neutral-300 text-neutral-900 focus:ring-0 cursor-pointer accent-neutral-900"
                            />
                          </td>
                          <td>
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-neutral-100 text-neutral-800 flex items-center justify-center font-bold text-[11px] shrink-0 border border-neutral-200/60">
                                {client.name ? client.name[0] : "C"}
                              </div>
                              <span className="font-semibold text-neutral-900 text-xs sm:text-[13px]">
                                {client.name || "Valued Client"}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div className="text-neutral-900 font-medium text-xs">{client.email || "N/A"}</div>
                            <div className="text-[11px] text-neutral-400 mt-0.5">{client.phone || "N/A"}</div>
                          </td>
                          <td className="text-neutral-500 text-xs">
                            {formatJoinedDate(client.joinedAt)}
                          </td>
                          <td className="text-center">
                            <span className="badge-status-progress">
                              {client.visitsCount || 0} visits
                            </span>
                          </td>
                          <td className="text-right font-bold text-neutral-900 text-xs sm:text-[13px]">
                            {client.loyaltyBalance} pts
                          </td>
                          <td className="text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => setSelectedClient(client)}
                              aria-label={`View options for ${client.name || "client"}`}
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors mx-auto cursor-pointer"
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
      )}

      {/* Client Detail Modal */}
      <AnimatePresence>
        {selectedClient && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-950/45 backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget) setSelectedClient(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0, y: 8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-neutral-100 space-y-5"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-neutral-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-neutral-100 text-neutral-800 border border-neutral-200/80 flex items-center justify-center font-bold text-lg shadow-2xs">
                    {selectedClient.name ? selectedClient.name[0].toUpperCase() : "C"}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-neutral-900">
                      {selectedClient.name || "Valued Client"}
                    </h3>
                    <span className="text-[11px] font-semibold text-neutral-400">
                      Patient Profile #{selectedClient.id.substring(0, 8)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedClient(null)}
                  aria-label="Close client modal"
                  className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-500 hover:text-neutral-900 flex items-center justify-center transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Metrics Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-neutral-50 rounded-2xl p-3.5 border border-neutral-100">
                  <div className="flex items-center gap-1.5 text-neutral-500 text-xs font-medium">
                    <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Total Visits</span>
                  </div>
                  <div className="text-xl font-bold text-neutral-900 mt-1">
                    {selectedClient.visitsCount || 0}
                  </div>
                </div>

                <div className="bg-neutral-50 rounded-2xl p-3.5 border border-neutral-100">
                  <div className="flex items-center gap-1.5 text-neutral-500 text-xs font-medium">
                    <Award className="w-3.5 h-3.5 text-amber-500" />
                    <span>Loyalty Balance</span>
                  </div>
                  <div className="text-xl font-bold text-neutral-900 mt-1">
                    {selectedClient.loyaltyBalance || 0} <span className="text-xs font-normal text-neutral-500">pts</span>
                  </div>
                </div>
              </div>

              {/* Contact Details List */}
              <div className="space-y-2.5 bg-neutral-50/70 p-4 rounded-2xl border border-neutral-100 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-neutral-600">
                    <Mail className="w-3.5 h-3.5 text-neutral-400" />
                    <span className="font-mono">{selectedClient.email || "No email registered"}</span>
                  </div>
                  {selectedClient.email && (
                    <button
                      type="button"
                      onClick={() => handleCopyEmail(selectedClient.email)}
                      className="p-1 rounded text-neutral-500 hover:text-neutral-900 transition cursor-pointer"
                      title="Copy Email"
                    >
                      {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-neutral-600">
                    <Phone className="w-3.5 h-3.5 text-neutral-400" />
                    <span>{selectedClient.phone || "No phone registered"}</span>
                  </div>
                  {selectedClient.phone && (
                    <button
                      type="button"
                      onClick={() => handleCopyPhone(selectedClient.phone)}
                      className="p-1 rounded text-neutral-500 hover:text-neutral-900 transition cursor-pointer"
                      title="Copy Phone"
                    >
                      {copiedPhone ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 text-neutral-500 pt-1 border-t border-neutral-200/50">
                  <span>Date Joined:</span>
                  <span className="font-medium text-neutral-800">{formatJoinedDate(selectedClient.joinedAt)}</span>
                </div>
              </div>

              {/* Quick Action Navigation */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <Link
                  href="/notifications"
                  className="btn-secondary py-2.5 text-xs inline-flex items-center justify-center gap-2"
                  onClick={() => setSelectedClient(null)}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Push Alert</span>
                </Link>
                <Link
                  href="/bookings"
                  className="btn-primary py-2.5 text-xs inline-flex items-center justify-center gap-2"
                  onClick={() => setSelectedClient(null)}
                >
                  <Calendar className="w-3.5 h-3.5 text-white" />
                  <span>Bookings</span>
                </Link>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MotionContainer>
  );
}
