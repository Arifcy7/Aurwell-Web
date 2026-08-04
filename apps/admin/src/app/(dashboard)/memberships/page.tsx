"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, collection, query, getDocs, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";
import { getDocsCacheFirst } from "@/lib/firebase/logger";
import StatCard from "@/components/StatCard";
import { StatCardSkeleton } from "@/components/Loader";
import { formatCurrency } from "@/lib/utils/currency";
import {
  Users,
  DollarSign,
  AlertCircle,
  ShieldCheck,
  Search,
  X,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  Calendar,
  FileText,
  AlertTriangle,
  ChevronRight,
  CheckSquare,
  Square,
  Sparkles,
} from "lucide-react";

export interface IncludedTreatmentItem {
  treatmentId: string;
  treatmentTitle: string;
  sessionsCount: number;
  status: "not started" | "ongoing" | "completed";
}

export interface MonthlyRecord {
  yearMonth: string;
  monthName: string;
  billingPeriodStart?: number;
  billingPeriodEnd?: number;
  isPaid?: boolean;
  paymentStatus?: string;
  overallStatus: "not started" | "ongoing" | "completed";
  treatments: IncludedTreatmentItem[];
  notes: string;
}

export interface ActiveMembership {
  id: string;
  clientName: string;
  email: string;
  membershipId?: string;
  membershipName: string;
  price: number;
  startDate?: any;
  nextBilling: any;
  status: "Active" | "Paused" | "Failed" | "Cancelled";
  subscriptionId?: string;
  monthlyRecords?: MonthlyRecord[];
}

export interface ClinicTreatmentOption {
  id: string;
  title: string;
}

function getCurrentYearMonth(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getCurrentMonthName(): string {
  const d = new Date();
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function formatYearMonthToName(ym: string): string {
  if (!ym) return "Current Month";
  const [y, m] = ym.split("-");
  if (!y || !m) return ym;
  const date = new Date(parseInt(y), parseInt(m) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default function MembershipsPage() {
  const [currency, setCurrency] = useState("EUR");
  const [clinicId, setClinicId] = useState("");
  const [memberships, setMemberships] = useState<ActiveMembership[]>([]);
  const [availableTreatments, setAvailableTreatments] = useState<ClinicTreatmentOption[]>([]);
  const [treatmentsMap, setTreatmentsMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [stats, setStats] = useState({
    activeMembers: "0",
    failedBilling: "0",
    mrrContribution: "€0.00",
  });

  // Modal / Detail Section State
  const [selectedMembership, setSelectedMembership] = useState<ActiveMembership | null>(null);
  const [selectedYearMonth, setSelectedYearMonth] = useState<string>(getCurrentYearMonth());
  const [editingRecords, setEditingRecords] = useState<MonthlyRecord[]>([]);
  const [editingStatus, setEditingStatus] = useState<"Active" | "Paused" | "Failed" | "Cancelled">("Active");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState("");

  // Helper to resolve treatment display title (replaces "Included Treatment" with actual treatment title from clinic catalog)
  const getDisplayTreatmentTitle = (tr: IncludedTreatmentItem): string => {
    const rawTitle = (tr.treatmentTitle || "").trim();
    if (
      !rawTitle ||
      rawTitle.toLowerCase() === "included treatment" ||
      rawTitle.toLowerCase() === "treatment"
    ) {
      if (tr.treatmentId && treatmentsMap[tr.treatmentId]) {
        return treatmentsMap[tr.treatmentId];
      }
    }
    return rawTitle || "Treatment";
  };

  // New Treatment Form state inside detail modal
  const [showAddTreatmentForm, setShowAddTreatmentForm] = useState(false);
  const [newTreatmentTitle, setNewTreatmentTitle] = useState("");
  const [newTreatmentSessions, setNewTreatmentSessions] = useState(1);
  const [newTreatmentStatus, setNewTreatmentStatus] = useState<"not started" | "ongoing" | "completed">("not started");

  // Confirmation Modal State (with checkbox tick requirement)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: "add" | "delete";
    treatmentTitle: string;
    treatmentId?: string;
    sessionsCount?: number;
    treatmentStatus?: "not started" | "ongoing" | "completed";
    deleteIndex?: number;
    isChecked: boolean;
  }>({
    isOpen: false,
    type: "add",
    treatmentTitle: "",
    isChecked: false,
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
          const cId = userDoc.data().clinicId;
          setClinicId(cId);

          // 1. Fetch Clinic profile for Currency
          let clinicCurr = "EUR";
          const clinicDoc = await getDoc(doc(db, "clinics", cId));
          if (clinicDoc.exists()) {
            clinicCurr = clinicDoc.data().currency || "EUR";
            setCurrency(clinicCurr);
          }

          // 2. Fetch Available Clinic Treatments for selection and name resolution (Cache-First)
          const trQuery = query(collection(db, "clinics", cId, "treatments"));
          const trSnap = await getDocsCacheFirst(trQuery);
          const trList: ClinicTreatmentOption[] = [];
          const trMap: Record<string, string> = {};
          trSnap.forEach((tDoc) => {
            const title = tDoc.data().title || tDoc.data().name || tDoc.data().treatmentName || "Treatment";
            trList.push({
              id: tDoc.id,
              title: title,
            });
            trMap[tDoc.id] = title;
          });
          setAvailableTreatments(trList);
          setTreatmentsMap(trMap);

          // 3. Fetch membership_tiers for price fallbacks if price is 0 (Cache-First)
          const tiersQuery = query(collection(db, "clinics", cId, "membership_tiers"));
          const tiersSnap = await getDocsCacheFirst(tiersQuery);
          const tierPricesMap = new Map<string, number>();
          tiersSnap.forEach((tDoc) => {
            const tData = tDoc.data();
            const p = Number(tData.monthlyPrice || tData.price || 0);
            tierPricesMap.set(tDoc.id, p);
          });

          // 4. Fetch Active Memberships subcollection (Cache-First)
          const q = query(collection(db, "clinics", cId, "active_memberships"));
          const snapshot = await getDocsCacheFirst(q);
          const loadedMemberships: ActiveMembership[] = [];

          for (const d of snapshot.docs) {
            const data = d.data();
            let price = Number(data.price || 0);
            const mId = data.membershipId || "";

            // Fallback price from membership_tiers if subscription price is 0
            if (price === 0 && mId && tierPricesMap.has(mId)) {
              price = tierPricesMap.get(mId) || 0;
            }

            loadedMemberships.push({
              id: d.id,
              clientName: data.clientName || data.userName || "Subscriber",
              email: data.email || "N/A",
              membershipId: mId,
              membershipName: data.membershipName || data.title || "VIP Membership Tier",
              price: price,
              startDate: data.startDate || data.createdAt,
              nextBilling: data.nextBilling || data.createdAt,
              status: data.status || "Active",
              subscriptionId: data.subscriptionId || data.stripeSubscriptionId || d.id,
              monthlyRecords: Array.isArray(data.monthlyRecords) ? data.monthlyRecords : [],
            } as ActiveMembership);
          }

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

  // Filtered memberships based on search query
  const filteredMemberships = memberships.filter((m) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      m.clientName.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.membershipName.toLowerCase().includes(q) ||
      m.status.toLowerCase().includes(q)
    );
  });

  // Open Membership Detail Modal
  const handleOpenDetailModal = (memb: ActiveMembership) => {
    setSelectedMembership(memb);
    setEditingStatus(memb.status);
    setSaveSuccess("");
    setShowAddTreatmentForm(false);

    let recs = memb.monthlyRecords ? [...memb.monthlyRecords] : [];
    const currentYM = getCurrentYearMonth();

    // Resolve any "Included Treatment" titles using treatmentId lookup
    recs = recs.map((r) => ({
      ...r,
      treatments: (r.treatments || []).map((tr) => ({
        ...tr,
        treatmentTitle: getDisplayTreatmentTitle(tr),
      })),
    }));

    // If no record exists for the current month, create a default record
    let hasCurrent = recs.some((r) => r.yearMonth === currentYM);
    if (!hasCurrent) {
      const newRec: MonthlyRecord = {
        yearMonth: currentYM,
        monthName: getCurrentMonthName(),
        overallStatus: "not started",
        treatments: [],
        notes: "",
        isPaid: true,
        paymentStatus: "paid",
      };
      recs = [newRec, ...recs];
    }

    setEditingRecords(recs);
    setSelectedYearMonth(recs[0]?.yearMonth || currentYM);
  };

  const handleCloseDetailModal = () => {
    setSelectedMembership(null);
    setShowAddTreatmentForm(false);
  };

  // Get active record being edited in modal
  const activeRecord = editingRecords.find((r) => r.yearMonth === selectedYearMonth) || {
    yearMonth: selectedYearMonth,
    monthName: formatYearMonthToName(selectedYearMonth),
    overallStatus: "not started",
    treatments: [],
    notes: "",
  };

  // Update field in activeRecord
  const handleUpdateActiveRecord = (updatedFields: Partial<MonthlyRecord>) => {
    setEditingRecords((prev) => {
      const idx = prev.findIndex((r) => r.yearMonth === selectedYearMonth);
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], ...updatedFields };
        return copy;
      } else {
        const newRec: MonthlyRecord = {
          yearMonth: selectedYearMonth,
          monthName: formatYearMonthToName(selectedYearMonth),
          overallStatus: "not started",
          treatments: [],
          notes: "",
          ...updatedFields,
        };
        return [newRec, ...prev];
      }
    });
  };

  // Update specific treatment in activeRecord
  const handleUpdateTreatment = (
    treatmentIdx: number,
    updatedField: Partial<IncludedTreatmentItem>
  ) => {
    const currentTreatments = [...activeRecord.treatments];
    currentTreatments[treatmentIdx] = {
      ...currentTreatments[treatmentIdx],
      ...updatedField,
    };
    handleUpdateActiveRecord({ treatments: currentTreatments });
  };

  // Request Add Treatment -> triggers Confirmation Modal with Checkbox
  const handleRequestAddTreatment = () => {
    if (!newTreatmentTitle.trim()) return;

    setConfirmModal({
      isOpen: true,
      type: "add",
      treatmentTitle: newTreatmentTitle.trim(),
      sessionsCount: newTreatmentSessions,
      treatmentStatus: newTreatmentStatus,
      isChecked: false,
    });
  };

  // Request Delete Treatment -> triggers Confirmation Modal with Checkbox
  const handleRequestDeleteTreatment = (index: number, title: string) => {
    setConfirmModal({
      isOpen: true,
      type: "delete",
      treatmentTitle: title,
      deleteIndex: index,
      isChecked: false,
    });
  };

  // Execute Confirmed Add or Delete
  const handleExecuteConfirmedAction = () => {
    if (!confirmModal.isChecked) return;

    if (confirmModal.type === "add") {
      const newTreatmentItem: IncludedTreatmentItem = {
        treatmentId: confirmModal.treatmentId || `tr_custom_${Date.now()}`,
        treatmentTitle: confirmModal.treatmentTitle,
        sessionsCount: confirmModal.sessionsCount || 1,
        status: confirmModal.treatmentStatus || "not started",
      };

      const updatedList = [...activeRecord.treatments, newTreatmentItem];
      handleUpdateActiveRecord({ treatments: updatedList });

      // Reset form
      setNewTreatmentTitle("");
      setNewTreatmentSessions(1);
      setNewTreatmentStatus("not started");
      setShowAddTreatmentForm(false);
    } else if (confirmModal.type === "delete" && typeof confirmModal.deleteIndex === "number") {
      const updatedList = activeRecord.treatments.filter((_, i) => i !== confirmModal.deleteIndex);
      handleUpdateActiveRecord({ treatments: updatedList });
    }

    // Close confirm modal
    setConfirmModal({
      isOpen: false,
      type: "add",
      treatmentTitle: "",
      isChecked: false,
    });
  };

  // Save all membership edits to Firestore
  const handleSaveMembershipDetails = async () => {
    if (!selectedMembership || !clinicId) return;

    setSaving(true);
    setSaveSuccess("");

    try {
      const docRef = doc(db, "clinics", clinicId, "active_memberships", selectedMembership.id);
      await updateDoc(docRef, {
        status: editingStatus,
        monthlyRecords: editingRecords,
      });

      // Update local state list
      setMemberships((prev) =>
        prev.map((m) => {
          if (m.id === selectedMembership.id) {
            return {
              ...m,
              status: editingStatus,
              monthlyRecords: editingRecords,
            };
          }
          return m;
        })
      );

      // Update selected membership reference
      setSelectedMembership((prev) =>
        prev
          ? {
              ...prev,
              status: editingStatus,
              monthlyRecords: editingRecords,
            }
          : null
      );

      setSaveSuccess("Subscription details & treatment sessions updated successfully!");
      setTimeout(() => setSaveSuccess(""), 4000);
    } catch (err) {
      console.error("Error saving membership changes:", err);
    } finally {
      setSaving(false);
    }
  };

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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-neutral-100 text-neutral-800 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 tracking-tight">Active Member Roll</h3>
              <p className="text-xs text-neutral-400 font-medium">All active client subscriptions & treatment session progress</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search member, email or tier..."
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
          <div className="py-8 text-center text-sm text-neutral-400">Loading memberships...</div>
        ) : filteredMemberships.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-neutral-50 border border-neutral-100 text-sm font-medium text-neutral-400">
            {searchQuery ? `No members found matching "${searchQuery}".` : "No active memberships recorded yet."}
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
                  <th className="pb-3 px-4 text-center">Status</th>
                  <th className="pb-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-sm">
                {filteredMemberships.map((memb) => (
                  <tr
                    key={memb.id}
                    onClick={() => handleOpenDetailModal(memb)}
                    className="hover:bg-neutral-50/80 cursor-pointer transition-colors group"
                  >
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="font-semibold text-neutral-900 group-hover:text-black">{memb.clientName}</div>
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
                    <td className="py-4 px-4 whitespace-nowrap text-center">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${
                          memb.status === "Active"
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                            : memb.status === "Failed"
                            ? "bg-rose-50 text-rose-600 border-rose-100"
                            : memb.status === "Paused"
                            ? "bg-amber-50 text-amber-600 border-amber-100"
                            : "bg-neutral-100 text-neutral-600 border-neutral-200"
                        }`}
                      >
                        {memb.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetailModal(memb);
                        }}
                        className="inline-flex items-center gap-1 text-xs font-bold text-neutral-800 hover:text-black bg-neutral-100 hover:bg-neutral-200 px-3 py-1.5 rounded-full transition-all cursor-pointer"
                      >
                        View & Edit
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
      {/* MEMBERSHIP DETAIL MODAL */}
      {/* ========================================================================= */}
      {selectedMembership && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto animate-fadeIn">
          <div
            className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-neutral-100 overflow-hidden my-8 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-neutral-100 flex items-start justify-between bg-neutral-50/50">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-neutral-900">{selectedMembership.clientName}</h3>
                  <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-neutral-200/80 text-neutral-700">
                    {selectedMembership.membershipName}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-1">{selectedMembership.email}</p>
              </div>

              <div className="flex items-center gap-3">
                {/* Subscription Status Switcher */}
                <select
                  value={editingStatus}
                  onChange={(e: any) => setEditingStatus(e.target.value)}
                  className="rounded-full bg-white border border-neutral-200 px-3 py-1.5 text-xs font-bold text-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 cursor-pointer shadow-sm"
                >
                  <option value="Active">Active</option>
                  <option value="Paused">Paused</option>
                  <option value="Failed">Failed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>

                <button
                  onClick={handleCloseDetailModal}
                  className="w-8 h-8 rounded-full bg-white border border-neutral-200 flex items-center justify-center text-neutral-400 hover:text-neutral-800 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Success message banner */}
            {saveSuccess && (
              <div className="mx-6 mt-4 rounded-2xl bg-emerald-50 border border-emerald-200 p-3.5 text-xs font-semibold text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                {saveSuccess}
              </div>
            )}

            {/* Body - Scrollable */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {/* Billing Cycle / Month Tab Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
                  Billing Cycle & Monthly Treatment Records
                </label>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                  {editingRecords.map((rec) => (
                    <button
                      key={rec.yearMonth}
                      onClick={() => setSelectedYearMonth(rec.yearMonth)}
                      className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                        selectedYearMonth === rec.yearMonth
                          ? "bg-neutral-900 text-white border-neutral-900 shadow-sm"
                          : "bg-neutral-50 text-neutral-600 border-neutral-200/80 hover:bg-neutral-100"
                      }`}
                    >
                      {rec.monthName || formatYearMonthToName(rec.yearMonth)}
                      {rec.overallStatus === "completed" && " ✓"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Monthly Overview & Overall Status */}
              <div className="rounded-2xl bg-neutral-50/70 border border-neutral-100 p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-neutral-500" />
                    <span className="text-xs font-bold text-neutral-900">
                      Cycle: {activeRecord.monthName || formatYearMonthToName(selectedYearMonth)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-neutral-600">Overall Month Status:</label>
                    <select
                      value={activeRecord.overallStatus || "not started"}
                      onChange={(e: any) => handleUpdateActiveRecord({ overallStatus: e.target.value })}
                      className="rounded-full bg-white border border-neutral-200 px-3 py-1 text-xs font-bold text-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 cursor-pointer shadow-sm"
                    >
                      <option value="not started">Not Started</option>
                      <option value="ongoing">Ongoing</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Included Treatments List Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-800">
                    Included Treatments & Session Progress ({activeRecord.treatments?.length || 0})
                  </h4>

                  {!showAddTreatmentForm && (
                    <button
                      onClick={() => setShowAddTreatmentForm(true)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-neutral-900 hover:text-black bg-neutral-100 hover:bg-neutral-200 px-3 py-1.5 rounded-full transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Treatment
                    </button>
                  )}
                </div>

                {/* Add Treatment Form inline card */}
                {showAddTreatmentForm && (
                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50/90 p-4 space-y-3 animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-neutral-700" />
                        Add Treatment to Subscription
                      </span>
                      <button
                        onClick={() => setShowAddTreatmentForm(false)}
                        className="text-neutral-400 hover:text-neutral-600 text-xs font-semibold"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">
                          Select or Type Treatment
                        </label>
                        {availableTreatments.length > 0 ? (
                          <div className="space-y-1.5">
                            <select
                              value={newTreatmentTitle}
                              onChange={(e) => setNewTreatmentTitle(e.target.value)}
                              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-800 focus:outline-none"
                            >
                              <option value="">-- Choose from Clinic Treatments --</option>
                              {availableTreatments.map((tr) => (
                                <option key={tr.id} value={tr.title}>
                                  {tr.title}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              placeholder="Or enter custom treatment name..."
                              value={newTreatmentTitle}
                              onChange={(e) => setNewTreatmentTitle(e.target.value)}
                              className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-800 focus:outline-none"
                            />
                          </div>
                        ) : (
                          <input
                            type="text"
                            placeholder="e.g. Laser Hair Removal Full Face"
                            value={newTreatmentTitle}
                            onChange={(e) => setNewTreatmentTitle(e.target.value)}
                            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-800 focus:outline-none"
                          />
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">
                            Sessions
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={newTreatmentSessions}
                            onChange={(e) => setNewTreatmentSessions(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-bold text-neutral-800 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">
                            Initial Status
                          </label>
                          <select
                            value={newTreatmentStatus}
                            onChange={(e: any) => setNewTreatmentStatus(e.target.value)}
                            className="w-full rounded-xl border border-neutral-200 bg-white px-2 py-2 text-xs font-semibold text-neutral-800 focus:outline-none"
                          >
                            <option value="not started">Not Started</option>
                            <option value="ongoing">Ongoing</option>
                            <option value="completed">Completed</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={handleRequestAddTreatment}
                        disabled={!newTreatmentTitle.trim()}
                        className="rounded-full bg-neutral-900 px-4 py-2 text-xs font-bold text-white hover:bg-neutral-800 disabled:opacity-50 transition cursor-pointer"
                      >
                        Proceed to Add...
                      </button>
                    </div>
                  </div>
                )}

                {/* Treatment Items List */}
                {!activeRecord.treatments || activeRecord.treatments.length === 0 ? (
                  <div className="p-6 text-center rounded-2xl bg-neutral-50 border border-neutral-100 text-xs font-medium text-neutral-400">
                    No individual treatments registered for this month's cycle yet. Click "Add Treatment" above.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {activeRecord.treatments.map((tr, index) => (
                      <div
                        key={index}
                        className="rounded-2xl border border-neutral-100 bg-white p-3.5 shadow-sm hover:border-neutral-200 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-xs text-neutral-900 truncate">
                            {getDisplayTreatmentTitle(tr)}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end sm:self-auto">
                          {/* Session Count Input */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold uppercase text-neutral-400">Sessions:</span>
                            <input
                              type="number"
                              min={0}
                              value={tr.sessionsCount !== undefined ? tr.sessionsCount : 0}
                              onChange={(e) =>
                                handleUpdateTreatment(index, {
                                  sessionsCount: Math.max(0, parseInt(e.target.value) || 0),
                                })
                              }
                              className="w-14 rounded-lg border border-neutral-200 px-2 py-1 text-xs font-bold text-center text-neutral-900 focus:outline-none"
                            />
                          </div>

                          {/* Individual Status Selector */}
                          <select
                            value={tr.status || "not started"}
                            onChange={(e: any) =>
                              handleUpdateTreatment(index, {
                                status: e.target.value,
                              })
                            }
                            className={`rounded-full px-3 py-1 text-xs font-bold border focus:outline-none cursor-pointer ${
                              tr.status === "completed"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : tr.status === "ongoing"
                                ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                : "bg-neutral-100 text-neutral-700 border-neutral-200"
                            }`}
                          >
                            <option value="not started">Not Started</option>
                            <option value="ongoing">Ongoing</option>
                            <option value="completed">Completed</option>
                          </select>

                          {/* Delete Treatment Button */}
                          <button
                            onClick={() => handleRequestDeleteTreatment(index, tr.treatmentTitle)}
                            title="Delete treatment from subscription"
                            className="w-8 h-8 rounded-full bg-rose-50 text-rose-600 hover:bg-rose-100 flex items-center justify-center transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Clinic Admin Notes */}
              <div className="space-y-2 pt-2">
                <label className="block text-xs font-bold text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-neutral-500" />
                  Admin Notes for {activeRecord.monthName || formatYearMonthToName(selectedYearMonth)}
                </label>
                <textarea
                  rows={3}
                  value={activeRecord.notes || ""}
                  onChange={(e) => handleUpdateActiveRecord({ notes: e.target.value })}
                  placeholder="Record treatment progress, patient observations, appointment preferences or clinic notes..."
                  className="w-full rounded-2xl border border-neutral-200 bg-neutral-50/50 p-3 text-xs text-neutral-800 placeholder-neutral-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-neutral-100 bg-neutral-50/50 flex items-center justify-end">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCloseDetailModal}
                  className="rounded-full bg-neutral-100 px-5 py-2.5 text-xs font-bold text-neutral-700 hover:bg-neutral-200 transition cursor-pointer"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={handleSaveMembershipDetails}
                  disabled={saving}
                  className="rounded-full bg-neutral-900 px-6 py-2.5 text-xs font-bold text-white hover:bg-neutral-800 transition cursor-pointer shadow-sm"
                >
                  {saving ? "Saving Changes..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* CUSTOM CONFIRMATION POPUP MODAL (WITH MANDATORY CHECKBOX TICK) */}
      {/* ========================================================================= */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-neutral-100 overflow-hidden p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                  confirmModal.type === "delete"
                    ? "bg-rose-100 text-rose-600"
                    : "bg-emerald-100 text-emerald-600"
                }`}
              >
                {confirmModal.type === "delete" ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
              </div>
              <div>
                <h4 className="text-base font-bold text-neutral-900">
                  {confirmModal.type === "delete" ? "Confirm Delete Treatment" : "Confirm Add Treatment"}
                </h4>
                <p className="text-xs text-neutral-500">Subscription modification request</p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed bg-neutral-50 p-3.5 rounded-2xl border border-neutral-100">
              {confirmModal.type === "delete" ? (
                <>
                  Are you sure you want to remove <strong>"{confirmModal.treatmentTitle}"</strong> from this subscriber's cycle?
                </>
              ) : (
                <>
                  Are you sure you want to add <strong>"{confirmModal.treatmentTitle}"</strong> ({confirmModal.sessionsCount} session(s)) to this subscriber's cycle?
                </>
              )}
            </p>

            {/* Custom Checkbox Requirement */}
            <div
              onClick={() => setConfirmModal((prev) => ({ ...prev, isChecked: !prev.isChecked }))}
              className="flex items-center gap-3 p-3 rounded-2xl border border-neutral-200/80 bg-neutral-50/70 hover:bg-neutral-100/60 transition cursor-pointer select-none"
            >
              {confirmModal.isChecked ? (
                <CheckSquare className="w-5 h-5 text-neutral-900 flex-shrink-0" />
              ) : (
                <Square className="w-5 h-5 text-neutral-400 flex-shrink-0" />
              )}
              <span className="text-xs font-semibold text-neutral-800">
                I confirm I want to {confirmModal.type === "delete" ? "delete" : "add"} this treatment for this subscriber.
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() =>
                  setConfirmModal({
                    isOpen: false,
                    type: "add",
                    treatmentTitle: "",
                    isChecked: false,
                  })
                }
                className="rounded-full bg-neutral-100 px-5 py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-200 transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!confirmModal.isChecked}
                onClick={handleExecuteConfirmedAction}
                className={`rounded-full px-5 py-2 text-xs font-bold text-white transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm ${
                  confirmModal.type === "delete"
                    ? "bg-rose-600 hover:bg-rose-700"
                    : "bg-neutral-900 hover:bg-neutral-800"
                }`}
              >
                {confirmModal.type === "delete" ? "Confirm Delete" : "Confirm Add"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
