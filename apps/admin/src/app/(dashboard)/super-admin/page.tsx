"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";
import { checkIsSuperAdmin } from "@/lib/firebase/booking";
import {
  ShieldAlert,
  ShieldCheck,
  Building2,
  Calendar,
  Globe,
  Settings,
  Search,
  X,
  Filter,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  Users,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  UserPlus,
  Lock,
  MoreVertical,
} from "lucide-react";
import Link from "next/link";

interface ClinicItem {
  id: string;
  clinicId?: string;
  merchantName?: string;
  ownerUid?: string;
  email?: string;
  phone?: string;
  bookingConfig?: {
    systemType?: string;
    subdomain?: string;
    customDomain?: string | null;
    externalBooking?: {
      provider?: string;
      url?: string;
    };
    settings?: any;
  };
  createdAt?: any;
}

interface SuperAdminDoc {
  id: string;
  uid: string;
  email?: string;
  createdAt?: any;
}

export default function SuperAdminPage() {
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean | null>(null);
  const [currentUid, setCurrentUid] = useState<string>("");
  const [clinics, setClinics] = useState<ClinicItem[]>([]);
  const [superAdmins, setSuperAdmins] = useState<SuperAdminDoc[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTypeFilter, setSelectedTypeFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});

  const toggleSelectAll = () => {
    if (Object.keys(selectedIds).length === filteredClinics.length && filteredClinics.length > 0) {
      setSelectedIds({});
    } else {
      const all: Record<string, boolean> = {};
      filteredClinics.forEach((c) => {
        all[c.id] = true;
      });
      setSelectedIds(all);
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
      } else {
        next[id] = true;
      }
      return next;
    });
  };

  // Edit Clinic Booking Modal State
  const [editingClinic, setEditingClinic] = useState<ClinicItem | null>(null);
  const [editSystemType, setEditSystemType] = useState<string>("aurwell_custom");
  const [editSubdomain, setEditSubdomain] = useState<string>("");
  const [initialSubdomain, setInitialSubdomain] = useState<string>("");
  const [editCustomDomain, setEditCustomDomain] = useState<string>("");
  const [editExternalProvider, setEditExternalProvider] = useState<string>("fresha");
  const [editExternalUrl, setEditExternalUrl] = useState<string>("");
  const [savingClinic, setSavingClinic] = useState(false);
  const [modalFeedback, setModalFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Super Admin Management Modal State
  const [isAdminListOpen, setIsAdminListOpen] = useState(false);
  const [newAdminUid, setNewAdminUid] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [savingAdmin, setSavingAdmin] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setIsSuperAdmin(false);
        setLoading(false);
        return;
      }

      setCurrentUid(user.uid);
      const isSuper = await checkIsSuperAdmin(user.uid);
      setIsSuperAdmin(isSuper);

      if (isSuper) {
        await loadAllClinics();
        await loadSuperAdminsList();
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const loadAllClinics = async () => {
    try {
      const snap = await getDocs(collection(db, "clinics"));
      const list: ClinicItem[] = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      setClinics(list);
    } catch (err) {
      console.error("Error loading all clinics:", err);
    }
  };

  const loadSuperAdminsList = async () => {
    try {
      const snap = await getDocs(collection(db, "admin"));
      const list: SuperAdminDoc[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          uid: data.uid || d.id,
          email: data.email || "N/A",
          createdAt: data.createdAt,
        };
      });
      setSuperAdmins(list);
    } catch (err) {
      console.error("Error loading super admins list:", err);
    }
  };

  const openClinicEditor = (clinic: ClinicItem) => {
    setEditingClinic(clinic);
    const cfg = clinic.bookingConfig;
    const sys = cfg?.systemType === "custom" ? "aurwell_custom" : cfg?.systemType || "disabled";
    setEditSystemType(sys);
    const sub = cfg?.subdomain || "";
    setEditSubdomain(sub);
    setInitialSubdomain(sub);
    setEditCustomDomain(cfg?.customDomain || "");
    setEditExternalProvider(cfg?.externalBooking?.provider || "fresha");
    setEditExternalUrl(cfg?.externalBooking?.url || "");
    setModalFeedback(null);
  };

  const handleSaveClinicBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClinic) return;

    setSavingClinic(true);
    setModalFeedback(null);

    const cleanSubdomain = editSubdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");

    try {
      // Check subdomain uniqueness if provided and changed
      if (cleanSubdomain && cleanSubdomain !== initialSubdomain) {
        const subSnap = await getDoc(doc(db, "subdomains", cleanSubdomain));
        if (subSnap.exists() && subSnap.data().clinicId !== editingClinic.id) {
          setModalFeedback({
            type: "error",
            text: `Subdomain "${cleanSubdomain}.aurwell.app" is already owned by another clinic.`,
          });
          setSavingClinic(false);
          return;
        }
      }

      const batch = writeBatch(db);

      // Clean old subdomain lookup if changed
      if (initialSubdomain && initialSubdomain !== cleanSubdomain) {
        batch.delete(doc(db, "subdomains", initialSubdomain));
      }

      // If valid subdomain, save to /subdomains
      if (cleanSubdomain) {
        batch.set(doc(db, "subdomains", cleanSubdomain), {
          subdomain: cleanSubdomain,
          clinicId: editingClinic.id,
          isActive: editSystemType !== "disabled",
          updatedAt: serverTimestamp(),
        });
      }

      // Update /clinics/{clinicId}
      const existingSettings = editingClinic.bookingConfig?.settings || {
        requirePaymentUpfront: false,
        depositType: "percentage",
        depositAmount: 50,
        slotIntervalMinutes: 15,
        minNoticeHours: 2,
        maxAdvanceDays: 60,
        cancellationHours: 24,
        holdDurationMinutes: 10,
      };

      batch.update(doc(db, "clinics", editingClinic.id), {
        bookingConfig: {
          systemType: editSystemType,
          subdomain: cleanSubdomain || null,
          customDomain: editCustomDomain.trim() || null,
          externalBooking: {
            provider: editExternalProvider,
            url: editExternalUrl.trim(),
          },
          settings: existingSettings,
        },
      });

      await batch.commit();

      setModalFeedback({
        type: "success",
        text: "Clinic booking engine configuration updated successfully!",
      });

      await loadAllClinics();

      setTimeout(() => {
        setEditingClinic(null);
      }, 1500);
    } catch (err) {
      console.error("Error updating clinic booking config:", err);
      setModalFeedback({
        type: "error",
        text: "Failed to update configuration. Check permissions.",
      });
    } finally {
      setSavingClinic(false);
    }
  };

  const handleAddSuperAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminUid) return;

    setSavingAdmin(true);
    try {
      const cleanUid = newAdminUid.trim();
      await setDoc(doc(db, "admin", cleanUid), {
        uid: cleanUid,
        email: newAdminEmail.trim() || "admin@aurwell.app",
        createdAt: serverTimestamp(),
      });

      setNewAdminUid("");
      setNewAdminEmail("");
      await loadSuperAdminsList();
    } catch (err) {
      console.error("Error adding super admin:", err);
      alert("Failed to add super admin.");
    } finally {
      setSavingAdmin(false);
    }
  };

  const handleDeleteSuperAdmin = async (adminId: string, uid: string) => {
    if (uid === currentUid) {
      alert("You cannot remove your own Super Admin access.");
      return;
    }

    if (confirm(`Remove Super Admin access for UID "${uid}"?`)) {
      try {
        await deleteDoc(doc(db, "admin", adminId));
        await loadSuperAdminsList();
      } catch (err) {
        console.error("Error deleting super admin:", err);
        alert("Failed to delete super admin.");
      }
    }
  };

  if (loading) {
    return (
      <div className="text-center py-24 text-neutral-400 text-sm animate-pulse">
        Verifying Super Admin permissions...
      </div>
    );
  }

  // Access Denied Screen if user UID is not in /admin
  if (!isSuperAdmin) {
    return (
      <div className="admin-card max-w-lg mx-auto my-12 text-center p-6 sm:p-8 space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
          <Lock className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-neutral-900 tracking-tight">Access Restricted</h2>
          <p className="text-xs text-neutral-500 mt-1.5 max-w-sm mx-auto leading-relaxed">
            Your user UID (<code className="font-mono bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-800">{currentUid || "Not Signed In"}</code>) is not authorized in the Firestore <strong className="text-neutral-900">/admin</strong> collection.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/dashboard"
            className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-white" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  // Filtered Clinics
  const filteredClinics = clinics.filter((clinic) => {
    const nameMatch =
      (clinic.merchantName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      clinic.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (clinic.bookingConfig?.subdomain || "").toLowerCase().includes(searchTerm.toLowerCase());

    const sysType = clinic.bookingConfig?.systemType || "disabled";
    const typeMatch =
      selectedTypeFilter === "all" ||
      (selectedTypeFilter === "aurwell_custom" && (sysType === "aurwell_custom" || sysType === "custom")) ||
      (selectedTypeFilter === "external_sdk" && sysType === "external_sdk") ||
      (selectedTypeFilter === "disabled" && sysType === "disabled");

    return nameMatch && typeMatch;
  });

  const customCount = clinics.filter(
    (c) => c.bookingConfig?.systemType === "aurwell_custom" || c.bookingConfig?.systemType === "custom"
  ).length;

  const externalCount = clinics.filter((c) => c.bookingConfig?.systemType === "external_sdk").length;

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-12">
      {/* Super Admin Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 text-white p-5 sm:p-6 rounded-2xl ">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-neutral-300" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Super Admin Portal</h1>
            <span className="px-2 py-0.5 rounded-md bg-white/10 text-white text-[10px] font-bold uppercase tracking-wider border border-white/20">
              Root Level
            </span>
          </div>
          <p className="text-xs text-neutral-300 max-w-xl">
            Global management of all registered Aurwell clinics, booking system configurations, and assigned subdomains.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsAdminListOpen(true)}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/15 text-white border border-white/20 px-3.5 py-2 rounded-2xl text-xs font-medium transition cursor-pointer backdrop-blur-xs"
          >
            <Users className="w-4 h-4 text-neutral-300" /> Manage Admins ({superAdmins.length})
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="admin-card p-4 sm:p-5 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Total Clinics</span>
            <h3 className="text-2xl font-bold text-neutral-900 mt-0.5 tracking-tight">{clinics.length}</h3>
          </div>
          <div className="w-9 h-9 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-700">
            <Building2 className="w-4 h-4" />
          </div>
        </div>

        <div className="admin-card p-4 sm:p-5 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">Native Custom Booking</span>
            <h3 className="text-2xl font-bold text-neutral-900 mt-0.5 tracking-tight">{customCount}</h3>
          </div>
          <div className="w-9 h-9 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-900">
            <Calendar className="w-4 h-4" />
          </div>
        </div>

        <div className="admin-card p-4 sm:p-5 flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">External Redirects</span>
            <h3 className="text-2xl font-bold text-blue-600 mt-0.5 tracking-tight">{externalCount}</h3>
          </div>
          <div className="w-9 h-9 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Globe className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="admin-card p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search clinics by name, ID, or subdomain..."
            className="input-modern pl-9 py-1.5 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider text-[11px]">Engine:</span>
          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="select-modern text-xs py-1.5 font-medium"
          >
            <option value="all">All Booking Modes</option>
            <option value="aurwell_custom">Native Aurwell Booking</option>
            <option value="external_sdk">External Redirect</option>
            <option value="disabled">Disabled / Inactive</option>
          </select>
        </div>
      </div>

      {/* Clinics Table */}
      <div className="table-card-outer">
        <div className="px-3.5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-neutral-100 text-neutral-800 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4 text-neutral-800" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900 tracking-tight">Registered Clinics</h3>
              <p className="text-xs text-neutral-400 font-normal">Manage clinic booking engines, domains and identifiers</p>
            </div>
          </div>
        </div>

        {filteredClinics.length === 0 ? (
          <div className="py-12 text-center text-xs text-neutral-400">
            No clinics match the current filter.
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
                        checked={filteredClinics.length > 0 && Object.keys(selectedIds).length === filteredClinics.length}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded-md border-neutral-300 text-neutral-900 focus:ring-0 cursor-pointer accent-neutral-900"
                      />
                    </th>
                    <th>Clinic / Merchant</th>
                    <th>Booking Engine</th>
                    <th>Subdomain / Domain</th>
                    <th>Owner UID</th>
                    <th className="w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClinics.map((clinic) => {
                    const cfg = clinic.bookingConfig;
                    const isNative = cfg?.systemType === "aurwell_custom" || cfg?.systemType === "custom";
                    const isExt = cfg?.systemType === "external_sdk";
                    const isDisabled = !isNative && !isExt;
                    const isSelected = Boolean(selectedIds[clinic.id]);

                    return (
                      <tr
                        key={clinic.id}
                        onClick={() => openClinicEditor(clinic)}
                        className={`cursor-pointer group ${isSelected ? "bg-neutral-50/90" : ""}`}
                      >
                        <td className="text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(clinic.id)}
                            className="w-4 h-4 rounded-md border-neutral-300 text-neutral-900 focus:ring-0 cursor-pointer accent-neutral-900"
                          />
                        </td>
                        <td>
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-neutral-100 text-neutral-800 flex items-center justify-center font-bold text-[11px] shrink-0 border border-neutral-200/60">
                              {clinic.merchantName ? clinic.merchantName[0] : "C"}
                            </div>
                            <div>
                              <div className="font-semibold text-neutral-900 text-xs sm:text-[13px] group-hover:text-black">
                                {clinic.merchantName || "Unnamed Clinic"}
                              </div>
                              <div className="text-[11px] font-mono text-neutral-400">{clinic.id}</div>
                            </div>
                          </div>
                        </td>

                        <td>
                          {isNative && (
                            <span className="badge-status-progress">
                              Native Custom
                            </span>
                          )}
                          {isExt && (
                            <span className="badge-status-review">
                              {cfg?.externalBooking?.provider || "External"}
                            </span>
                          )}
                          {isDisabled && (
                            <span className="badge-status-pending">
                              Disabled
                            </span>
                          )}
                        </td>

                        <td>
                          {cfg?.subdomain ? (
                            <div>
                              <span className="font-mono font-medium text-neutral-800 text-xs">
                                {cfg.subdomain}.aurwell.app
                              </span>
                              {cfg.customDomain && (
                                <div className="text-[10px] font-mono text-neutral-400 mt-0.5">
                                  CNAME: {cfg.customDomain}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-neutral-400 italic text-xs">No subdomain</span>
                          )}
                        </td>

                        <td>
                          <span className="font-mono text-xs text-neutral-600 truncate block max-w-[140px]">
                            {clinic.ownerUid || clinic.id.replace("clinic_", "")}
                          </span>
                        </td>

                        <td className="text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => openClinicEditor(clinic)}
                            className="p-1 rounded-md text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer inline-flex items-center justify-center"
                            title="Configure"
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
      </div>

      {/* Edit Clinic Booking Engine Modal */}
      {editingClinic && (
        <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <form
            onSubmit={handleSaveClinicBooking}
            className="admin-card max-w-lg w-full p-5 sm:p-6 space-y-4  my-8"
          >
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-neutral-900 tracking-tight">Configure Clinic Booking</h2>
                <span className="text-[11px] font-mono bg-neutral-100 px-2 py-0.5 rounded-md text-neutral-600">
                  {editingClinic.id}
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                Set active booking mode, public subdomain, and external URL for <strong>{editingClinic.merchantName}</strong>.
              </p>
            </div>

            {modalFeedback && (
              <div
                className={`p-3 rounded-2xl text-xs font-medium flex items-center gap-2 ${
                  modalFeedback.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-rose-50 text-rose-800 border border-rose-200"
                }`}
              >
                {modalFeedback.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{modalFeedback.text}</span>
              </div>
            )}

            <div className="space-y-3.5">
              {/* Engine Mode */}
              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1.5">Booking Engine Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "aurwell_custom", label: "Native Custom" },
                    { id: "external_sdk", label: "External Link" },
                    { id: "disabled", label: "Disabled" },
                  ].map((mode) => (
                    <label
                      key={mode.id}
                      className={`p-2.5 rounded-2xl text-center cursor-pointer transition text-xs ${
                        editSystemType === mode.id
                          ? "bg-neutral-950 text-white font-semibold"
                          : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                      }`}
                    >
                      <input
                        type="radio"
                        name="editSystemType"
                        value={mode.id}
                        checked={editSystemType === mode.id}
                        onChange={(e) => setEditSystemType(e.target.value)}
                        className="sr-only"
                      />
                      <span>{mode.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Subdomain Input */}
              <div>
                <label className="text-xs font-semibold text-neutral-700">Subdomain Identifier</label>
                <div className="flex items-center mt-1">
                  <input
                    type="text"
                    value={editSubdomain}
                    onChange={(e) => setEditSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    placeholder="clinicname"
                    className="input-modern rounded-r-none py-1.5 text-xs font-mono font-medium w-44"
                  />
                  <span className="bg-neutral-100 border border-l-0 border-neutral-200/80 rounded-r-xl px-3 py-2 text-xs text-neutral-600 font-mono font-medium">
                    .aurwell.app
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Controls the <code className="font-mono">/subdomains/{editSubdomain || "..."}</code> route mapping.
                </p>
              </div>

              {/* Custom Domain */}
              <div>
                <label className="text-xs font-semibold text-neutral-700">Custom Domain CNAME (Optional)</label>
                <input
                  type="text"
                  value={editCustomDomain}
                  onChange={(e) => setEditCustomDomain(e.target.value.toLowerCase())}
                  placeholder="e.g. booking.clinicname.com"
                  className="input-modern mt-1 py-1.5 text-xs"
                />
              </div>

              {/* External URL if external_sdk */}
              {editSystemType === "external_sdk" && (
                <div className="p-3 bg-neutral-50/80 rounded-2xl  space-y-2.5">
                  <div>
                    <label className="text-xs font-semibold text-neutral-700">External Provider Name</label>
                    <input
                      type="text"
                      value={editExternalProvider}
                      onChange={(e) => setEditExternalProvider(e.target.value)}
                      placeholder="Fresha, Phorest, Jane App"
                      className="input-modern mt-1 py-1.5 text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-neutral-700">External Booking URL</label>
                    <input
                      type="url"
                      value={editExternalUrl}
                      onChange={(e) => setEditExternalUrl(e.target.value)}
                      placeholder="https://fresha.com/a/..."
                      className="input-modern mt-1 py-1.5 text-xs bg-white"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setEditingClinic(null)}
                className="btn-outline text-xs px-4 py-2"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={savingClinic}
                className="btn-primary text-xs px-4 py-2 disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                <span>{savingClinic ? "Updating..." : "Save Clinic Booking"}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Super Admins Management Drawer / Modal */}
      {isAdminListOpen && (
        <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="admin-card max-w-xl w-full p-5 sm:p-6 space-y-4  my-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-neutral-900 tracking-tight">Super Admin Authorization</h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Users registered in Firestore <strong className="font-mono">/admin</strong> collection have root portal access.
                </p>
              </div>
              <button
                onClick={() => setIsAdminListOpen(false)}
                className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Add New Admin UID Form */}
            <form onSubmit={handleAddSuperAdmin} className="p-3.5 bg-neutral-50/80 rounded-2xl  space-y-2.5">
              <h4 className="text-xs font-semibold text-neutral-800 uppercase tracking-wider text-[11px]">Authorize New Super Admin</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <input
                    type="text"
                    required
                    value={newAdminUid}
                    onChange={(e) => setNewAdminUid(e.target.value)}
                    placeholder="Firebase Auth User UID *"
                    className="input-modern py-1.5 text-xs bg-white"
                  />
                </div>
                <div>
                  <input
                    type="email"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    placeholder="Admin Email (optional)"
                    className="input-modern py-1.5 text-xs bg-white"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={savingAdmin}
                className="btn-primary w-full py-2 text-xs disabled:opacity-50"
              >
                <UserPlus className="w-3.5 h-3.5 text-white" />
                <span>{savingAdmin ? "Authorizing..." : "Add Super Admin UID"}</span>
              </button>
            </form>

            {/* Existing Super Admins List */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-neutral-800 uppercase tracking-wider text-[11px]">Authorized Super Admins ({superAdmins.length})</h4>
              <div className="divide-y divide-neutral-100 max-h-60 overflow-y-auto  rounded-2xl">
                {superAdmins.map((admin) => {
                  const isCurrent = admin.uid === currentUid;
                  return (
                    <div key={admin.id} className="p-3 flex items-center justify-between gap-3 text-xs bg-white">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium text-neutral-900 truncate">{admin.uid}</span>
                          {isCurrent && (
                            <span className="notion-pill bg-neutral-100 text-neutral-800 ">
                              YOU
                            </span>
                          )}
                        </div>
                        {admin.email && <div className="text-[11px] text-neutral-400 mt-0.5">{admin.email}</div>}
                      </div>

                      {!isCurrent && (
                        <button
                          onClick={() => handleDeleteSuperAdmin(admin.id, admin.uid)}
                          className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                          title="Revoke Admin Access"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => setIsAdminListOpen(false)}
                className="btn-secondary text-xs px-4 py-2"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
