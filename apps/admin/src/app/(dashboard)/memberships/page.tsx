"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  getDocs,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";
import { formatCurrency } from "@/lib/utils/currency";
import StatCard from "@/components/StatCard";
import { motion, AnimatePresence } from "framer-motion";
import { MotionContainer, MotionCard } from "@/components/ui/motion-container";
import { StatCardSkeleton } from "@/components/Loader";
import {
  Users,
  CreditCard,
  AlertCircle,
  ShieldCheck,
  Search,
  ChevronRight,
  X,
  Plus,
  Trash2,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  CheckSquare,
  Square,
  Sparkles,
  FileText,
  MoreVertical,
} from "lucide-react";

interface TreatmentTrackingItem {
  treatmentId?: string;
  treatmentTitle?: string;
  sessionsCount?: number;
  status?: "not started" | "ongoing" | "completed";
}

interface MonthlyTreatmentRecord {
  yearMonth: string; // e.g. "2026-03"
  monthName?: string; // e.g. "March 2026"
  overallStatus?: "not started" | "ongoing" | "completed";
  treatments?: TreatmentTrackingItem[];
  notes?: string;
}

interface MembershipProfile {
  id: string;
  clientName: string;
  email: string;
  membershipName: string;
  price: number;
  status: "Active" | "Cancelled" | "Paused" | "Failed";
  nextBilling?: any;
  joinedAt?: any;
  treatmentRecords?: MonthlyTreatmentRecord[];
  includedTreatments?: TreatmentTrackingItem[];
}

function getDisplayTreatmentTitle(tr: TreatmentTrackingItem): string {
  if (tr.treatmentTitle && tr.treatmentTitle.trim().length > 0) {
    return tr.treatmentTitle;
  }
  if (tr.treatmentId && tr.treatmentId.trim().length > 0) {
    return tr.treatmentId;
  }
  return "Standard Treatment Session";
}

function formatYearMonthToName(ym: string): string {
  try {
    const [year, month] = ym.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  } catch (e) {
    return ym;
  }
}

export default function MembershipsPage() {
  const [clinicId, setClinicId] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [memberships, setMemberships] = useState<MembershipProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
  const [stats, setStats] = useState({
    activeCount: "0",
    monthlyRevenue: "€0.00",
    failedBilling: "0",
  });

  // Modal State for viewing/editing single subscriber
  const [selectedMembership, setSelectedMembership] = useState<MembershipProfile | null>(null);
  const [selectedYearMonth, setSelectedYearMonth] = useState<string>("");
  const [editingRecords, setEditingRecords] = useState<MonthlyTreatmentRecord[]>([]);
  const [editingStatus, setEditingStatus] = useState<string>("Active");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Clinic Treatment Templates (to allow adding standard treatments by dropdown)
  const [availableTreatments, setAvailableTreatments] = useState<{ id: string; title: string }[]>([]);

  // Add Treatment Form inline state
  const [showAddTreatmentForm, setShowAddTreatmentForm] = useState(false);
  const [newTreatmentTitle, setNewTreatmentTitle] = useState("");
  const [newTreatmentSessions, setNewTreatmentSessions] = useState(1);
  const [newTreatmentStatus, setNewTreatmentStatus] = useState<"not started" | "ongoing" | "completed">("not started");

  // Confirmation Action Popup Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: "delete" | "add";
    treatmentIndex?: number;
    treatmentTitle: string;
    sessionsCount?: number;
    status?: "not started" | "ongoing" | "completed";
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
        if (!userDoc.exists()) {
          setLoading(false);
          return;
        }

        const cId = userDoc.data().clinicId;
        if (!cId) {
          setLoading(false);
          return;
        }
        setClinicId(cId);

        // Fetch Clinic Currency
        const clinicDoc = await getDoc(doc(db, "clinics", cId));
        if (clinicDoc.exists()) {
          setCurrency(clinicDoc.data().currency || "EUR");
        }

        // Fetch Clinic Treatment catalog for dropdown
        try {
          const treatSnap = await getDocs(collection(db, "clinics", cId, "treatments"));
          const treatList: { id: string; title: string }[] = [];
          treatSnap.forEach((d) => {
            const tData = d.data();
            treatList.push({ id: d.id, title: tData.title || tData.name || "Treatment" });
          });
          setAvailableTreatments(treatList);
        } catch (e) {
          console.error("Error loading treatment catalog:", e);
        }

        // Fetch Memberships collection
        const membQuery = query(collection(db, "clinics", cId, "memberships"));
        const membSnapshot = await getDocs(membQuery);

        let active = 0;
        let revenue = 0;
        let failed = 0;
        const loaded: MembershipProfile[] = [];

        membSnapshot.forEach((docSnap) => {
          const m = docSnap.data() as any;
          const status = m.status || "Active";
          const price = Number(m.price || 0);

          if (status === "Active") {
            active += 1;
            revenue += price;
          } else if (status === "Failed") {
            failed += 1;
          }

          loaded.push({
            id: docSnap.id,
            clientName: m.clientName || m.userName || "Valued Subscriber",
            email: m.email || m.userEmail || "N/A",
            membershipName: m.membershipName || m.planName || "Membership",
            price: price,
            status: status,
            nextBilling: m.nextBilling,
            joinedAt: m.joinedAt || m.createdAt,
            treatmentRecords: m.treatmentRecords || [],
            includedTreatments: m.includedTreatments || [],
          });
        });

        setStats({
          activeCount: String(active),
          monthlyRevenue: formatCurrency(revenue, clinicDoc.data()?.currency || "EUR"),
          failedBilling: String(failed),
        });

        setMemberships(loaded);
      } catch (err) {
        console.error("Error loading memberships:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // When opening a membership for inspection
  const handleOpenDetailModal = (memb: MembershipProfile) => {
    setSelectedMembership(memb);
    setEditingStatus(memb.status);
    setSaveSuccess(null);
    setShowAddTreatmentForm(false);

    // Prepare current month cycle string (e.g. "2026-03")
    const now = new Date();
    const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Ensure treatmentRecords contains at least the current cycle
    const records = Array.isArray(memb.treatmentRecords) ? [...memb.treatmentRecords] : [];
    const existingCurrent = records.find((r) => r.yearMonth === currentYM);

    if (!existingCurrent) {
      // Seed current month cycle with subscriber's default includedTreatments if available
      const initialTreatments: TreatmentTrackingItem[] = (memb.includedTreatments || []).map((t) => ({
        treatmentId: t.treatmentId || "",
        treatmentTitle: t.treatmentTitle || "Standard Treatment",
        sessionsCount: t.sessionsCount || 1,
        status: "not started",
      }));

      records.unshift({
        yearMonth: currentYM,
        monthName: formatYearMonthToName(currentYM),
        overallStatus: "not started",
        treatments: initialTreatments,
        notes: "",
      });
    }

    setEditingRecords(records);
    setSelectedYearMonth(currentYM);
  };

  const handleCloseDetailModal = () => {
    setSelectedMembership(null);
    setShowAddTreatmentForm(false);
    setSaveSuccess(null);
  };

  const activeRecordIndex = editingRecords.findIndex((r) => r.yearMonth === selectedYearMonth);
  const activeRecord = activeRecordIndex >= 0 ? editingRecords[activeRecordIndex] : editingRecords[0] || {
    yearMonth: selectedYearMonth,
    treatments: [],
  };

  // Update a field inside the active month record
  const handleUpdateActiveRecord = (updates: Partial<MonthlyTreatmentRecord>) => {
    if (activeRecordIndex < 0) return;
    setEditingRecords((prev) => {
      const next = [...prev];
      next[activeRecordIndex] = { ...next[activeRecordIndex], ...updates };
      return next;
    });
  };

  // Update single treatment item within active month record
  const handleUpdateTreatment = (index: number, updates: Partial<TreatmentTrackingItem>) => {
    if (activeRecordIndex < 0) return;
    const currentTreatments = [...(activeRecord.treatments || [])];
    currentTreatments[index] = { ...currentTreatments[index], ...updates };
    handleUpdateActiveRecord({ treatments: currentTreatments });
  };

  // Step 1 of Delete: Open mandatory checkbox modal
  const handleRequestDeleteTreatment = (index: number, title?: string) => {
    setConfirmModal({
      isOpen: true,
      type: "delete",
      treatmentIndex: index,
      treatmentTitle: title || "this treatment",
      isChecked: false,
    });
  };

  // Step 1 of Add: Open mandatory checkbox modal
  const handleRequestAddTreatment = () => {
    if (!newTreatmentTitle.trim()) return;
    setConfirmModal({
      isOpen: true,
      type: "add",
      treatmentTitle: newTreatmentTitle.trim(),
      sessionsCount: newTreatmentSessions,
      status: newTreatmentStatus,
      isChecked: false,
    });
  };

  // Step 2 of Action: Execute confirmed operation once user ticks checkbox
  const handleExecuteConfirmedAction = () => {
    if (!confirmModal.isChecked) return;

    if (confirmModal.type === "delete" && confirmModal.treatmentIndex !== undefined) {
      if (activeRecordIndex >= 0) {
        const currentTreatments = [...(activeRecord.treatments || [])];
        currentTreatments.splice(confirmModal.treatmentIndex, 1);
        handleUpdateActiveRecord({ treatments: currentTreatments });
      }
    } else if (confirmModal.type === "add") {
      if (activeRecordIndex >= 0) {
        const currentTreatments = [...(activeRecord.treatments || [])];
        currentTreatments.push({
          treatmentTitle: confirmModal.treatmentTitle,
          sessionsCount: confirmModal.sessionsCount || 1,
          status: confirmModal.status || "not started",
        });
        handleUpdateActiveRecord({ treatments: currentTreatments });
        // Reset add form
        setNewTreatmentTitle("");
        setNewTreatmentSessions(1);
        setShowAddTreatmentForm(false);
      }
    }

    // Close Confirmation Modal
    setConfirmModal({
      isOpen: false,
      type: "add",
      treatmentTitle: "",
      isChecked: false,
    });
  };

  // Persist updated treatment tracking records to Firestore
  const handleSaveMembershipDetails = async () => {
    if (!selectedMembership || !clinicId) return;

    try {
      setSaving(true);
      setSaveSuccess(null);

      const membRef = doc(db, "clinics", clinicId, "memberships", selectedMembership.id);
      await updateDoc(membRef, {
        treatmentRecords: editingRecords,
        status: editingStatus,
        updatedAt: Date.now(),
      });

      // Update in-memory state
      setMemberships((prev) =>
        prev.map((m) =>
          m.id === selectedMembership.id
            ? { ...m, treatmentRecords: editingRecords, status: editingStatus as any }
            : m
        )
      );

      setSaveSuccess("Subscription records saved successfully!");
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err) {
      console.error("Error saving membership details:", err);
      alert("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const toggleSelectAll = () => {
    if (Object.keys(selectedIds).length === filteredMemberships.length && filteredMemberships.length > 0) {
      setSelectedIds({});
    } else {
      const all: Record<string, boolean> = {};
      filteredMemberships.forEach((m) => {
        all[m.id] = true;
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

  const filteredMemberships = memberships.filter(
    (m) =>
      m.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.membershipName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <MotionContainer className="space-y-3.5 sm:space-y-4" staggerDelay={0.07}>
      {/* Overview Stat Cards */}
      <div className="grid gap-3.5 sm:gap-4 md:grid-cols-3">
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
              value={stats.activeCount}
              change="Subscribed"
              changeType="increase"
              period="recurring plans"
              icon={<Users className="w-5 h-5 stroke-[1.75]" />}
            />
            <StatCard
              title="Monthly Recurring Revenue"
              value={stats.monthlyRevenue}
              change="MRR"
              changeType="increase"
              period="subscription sales"
              icon={<CreditCard className="w-5 h-5 stroke-[1.75]" />}
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
      <MotionCard className="table-card-outer" hoverLift={false}>
        <div className="px-3.5 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-neutral-100 text-neutral-800 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 text-neutral-800" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 tracking-tight">Active Member Roll</h3>
              <p className="text-xs text-neutral-400 font-normal">All active client subscriptions & treatment session progress</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search member, email or tier..."
              className="input-modern input-search"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-neutral-400">Loading memberships...</div>
        ) : filteredMemberships.length === 0 ? (
          <div className="py-16 text-center text-xs font-medium text-neutral-400">
            {searchQuery ? `No members found matching "${searchQuery}".` : "No active memberships recorded yet."}
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
                        checked={filteredMemberships.length > 0 && Object.keys(selectedIds).length === filteredMemberships.length}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded-md border-neutral-300 text-neutral-900 focus:ring-0 cursor-pointer accent-neutral-900"
                      />
                    </th>
                    <th>Member</th>
                    <th>Tier</th>
                    <th>Price</th>
                    <th>Renewal Date</th>
                    <th className="text-center">Status</th>
                    <th className="w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMemberships.map((memb) => {
                    const isSelected = Boolean(selectedIds[memb.id]);
                    return (
                      <tr
                        key={memb.id}
                        onClick={() => handleOpenDetailModal(memb)}
                        className={`cursor-pointer group ${isSelected ? "bg-neutral-50/90" : ""}`}
                      >
                        <td className="text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(memb.id)}
                            className="w-4 h-4 rounded-md border-neutral-300 text-neutral-900 focus:ring-0 cursor-pointer accent-neutral-900"
                          />
                        </td>
                        <td>
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-neutral-100 text-neutral-800 flex items-center justify-center font-bold text-[11px] shrink-0 border border-neutral-200/60">
                              {memb.clientName ? memb.clientName[0] : "M"}
                            </div>
                            <div>
                              <div className="font-semibold text-neutral-900 group-hover:text-black text-xs sm:text-[13px]">{memb.clientName}</div>
                              <div className="text-[11px] text-neutral-400">{memb.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="font-medium text-neutral-700 text-xs">
                          {memb.membershipName}
                        </td>
                        <td className="font-semibold text-neutral-900 text-xs">
                          {formatCurrency(memb.price, currency)}/mo
                        </td>
                        <td className="text-neutral-500 text-xs font-mono">
                          {memb.nextBilling && typeof memb.nextBilling.toDate === "function"
                            ? memb.nextBilling.toDate().toLocaleDateString()
                            : typeof memb.nextBilling === "number"
                            ? new Date(memb.nextBilling).toLocaleDateString()
                            : String(memb.nextBilling || "N/A")}
                        </td>
                        <td className="text-center">
                          <span
                            className={
                              memb.status === "Active"
                                ? "badge-status-progress"
                                : memb.status === "Failed"
                                ? "badge-status-danger"
                                : memb.status === "Paused"
                                ? "badge-status-pending"
                                : "badge-status-review"
                            }
                          >
                            {memb.status}
                          </span>
                        </td>
                        <td className="text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleOpenDetailModal(memb)}
                            className="p-1 rounded-md text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer inline-flex items-center justify-center"
                            title="Actions"
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
        )}</MotionCard>

      {/* ========================================================================= */}
      {/* MEMBERSHIP DETAIL MODAL */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {selectedMembership && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={handleCloseDetailModal}
            className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/45 backdrop-blur-sm p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="bg-white w-full max-w-3xl rounded-3xl overflow-hidden my-8 flex flex-col max-h-[90vh] shadow-2xl border border-neutral-100"
              onClick={(e) => e.stopPropagation()}
            >
            {/* Header */}
            <div className="p-6 flex items-start justify-between bg-neutral-50/70">
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="text-lg font-bold text-neutral-900">{selectedMembership.clientName}</h3>
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-neutral-200 text-neutral-800">
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
                  className="rounded-full bg-neutral-100 px-4 py-2 text-xs font-bold text-neutral-800 focus:outline-none cursor-pointer"
                >
                  <option value="Active">Active</option>
                  <option value="Paused">Paused</option>
                  <option value="Failed">Failed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>

                <button
                  onClick={handleCloseDetailModal}
                  className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-500 hover:text-neutral-900 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Success message banner */}
            {saveSuccess && (
              <div className="mx-6 mt-4 rounded-2xl bg-emerald-100 p-3.5 text-xs font-semibold text-emerald-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0" />
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
                      className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                        selectedYearMonth === rec.yearMonth
                          ? "bg-neutral-950 text-white font-semibold"
                          : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                      }`}
                    >
                      {rec.monthName || formatYearMonthToName(rec.yearMonth)}
                      {rec.overallStatus === "completed" && " ✓"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Monthly Overview & Overall Status */}
              <div className="rounded-2xl bg-neutral-50 p-4 space-y-3">
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
                      className="rounded-full bg-white px-3.5 py-1 text-xs font-bold text-neutral-800 focus:outline-none cursor-pointer"
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
                <div className="flex items-center justify-between pb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-800">
                    Included Treatments & Session Progress ({activeRecord.treatments?.length || 0})
                  </h4>

                  {!showAddTreatmentForm && (
                    <button
                      onClick={() => setShowAddTreatmentForm(true)}
                      className="btn-outline px-3.5 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Treatment
                    </button>
                  )}
                </div>

                {/* Add Treatment Form inline card */}
                {showAddTreatmentForm && (
                  <div className="rounded-2xl bg-neutral-50 p-4 space-y-3 animate-fadeIn">
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
                              className="w-full rounded-xl bg-white px-3 py-2 text-xs font-medium text-neutral-800 focus:outline-none"
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
                              className="w-full rounded-xl bg-white px-3 py-1.5 text-xs text-neutral-800 focus:outline-none"
                            />
                          </div>
                        ) : (
                          <input
                            type="text"
                            placeholder="e.g. Laser Hair Removal Full Face"
                            value={newTreatmentTitle}
                            onChange={(e) => setNewTreatmentTitle(e.target.value)}
                            className="w-full rounded-xl bg-white px-3 py-2 text-xs text-neutral-800 focus:outline-none"
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
                            className="w-full rounded-xl bg-white px-3 py-2 text-xs font-bold text-neutral-800 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold uppercase text-neutral-500 mb-1">
                            Initial Status
                          </label>
                          <select
                            value={newTreatmentStatus}
                            onChange={(e: any) => setNewTreatmentStatus(e.target.value)}
                            className="w-full rounded-xl bg-white px-2 py-2 text-xs font-semibold text-neutral-800 focus:outline-none"
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
                        className="btn-primary"
                      >
                        Proceed to Add...
                      </button>
                    </div>
                  </div>
                )}

                {/* Treatment Items List */}
                {!activeRecord.treatments || activeRecord.treatments.length === 0 ? (
                  <div className="p-6 text-center rounded-2xl bg-neutral-50 text-xs font-medium text-neutral-400">
                    No individual treatments registered for this month's cycle yet. Click "Add Treatment" above.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {activeRecord.treatments.map((tr, index) => (
                      <div
                        key={index}
                        className="rounded-2xl bg-neutral-50 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
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
                              className="w-14 rounded-lg bg-white px-2 py-1 text-xs font-bold text-center text-neutral-900 focus:outline-none"
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
                            className={`rounded-full px-3 py-1 text-xs font-bold focus:outline-none cursor-pointer ${
                              tr.status === "completed"
                                ? "bg-emerald-100 text-emerald-800"
                                : tr.status === "ongoing"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-neutral-200 text-neutral-800"
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
                            className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 hover:bg-rose-200 flex items-center justify-center transition cursor-pointer"
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
                  className="textarea-modern"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-neutral-50/70 flex items-center justify-end">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCloseDetailModal}
                  className="btn-secondary"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={handleSaveMembershipDetails}
                  disabled={saving}
                  className="btn-primary"
                >
                  {saving ? "Saving Changes..." : "Save Changes"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* CUSTOM CONFIRMATION POPUP MODAL (WITH MANDATORY CHECKBOX TICK) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={() =>
              setConfirmModal({
                isOpen: false,
                type: "add",
                treatmentTitle: "",
                isChecked: false,
              })
            }
            className="fixed inset-0 z-[60] flex items-center justify-center bg-neutral-950/45 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-md rounded-3xl overflow-hidden p-6 space-y-5 shadow-2xl border border-neutral-100"
            >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  confirmModal.type === "delete"
                    ? "bg-rose-100 text-rose-600"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {confirmModal.type === "delete" ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                )}
              </div>
              <div>
                <h4 className="text-base font-bold text-neutral-900">
                  {confirmModal.type === "delete" ? "Confirm Delete Treatment" : "Confirm Add Treatment"}
                </h4>
                <p className="text-xs text-neutral-400">Subscription modification request</p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed bg-neutral-50 p-4 rounded-2xl">
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
              className="flex items-center gap-3 p-3.5 rounded-2xl bg-neutral-50 hover:bg-neutral-100 transition cursor-pointer select-none"
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
                className="btn-secondary"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!confirmModal.isChecked}
                onClick={handleExecuteConfirmedAction}
                className={confirmModal.type === "delete" ? "btn-danger" : "btn-primary"}
              >
                {confirmModal.type === "delete" ? (
                  <>
                    <Trash2 className="w-4 h-4 text-white" />
                    <span>Confirm Delete</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>Confirm Add</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>
    </MotionContainer>
  );
}