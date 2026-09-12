"use client";

import { useState, useEffect } from "react";
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
  Lock,
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
      <div className="max-w-2xl mx-auto my-12 text-center bg-white p-8 sm:p-12 rounded-3xl border border-neutral-200/80 shadow-lg space-y-5">
        <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
          <Lock className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-neutral-900 tracking-tight">Access Restricted</h2>
          <p className="text-xs text-neutral-500 mt-2 max-w-md mx-auto leading-relaxed">
            Your user UID (<code className="font-mono bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-800">{currentUid || "Not Signed In"}</code>) is not authorized in the Firestore <strong className="text-neutral-900">/admin</strong> collection.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white px-6 py-2.5 rounded-full text-xs font-bold transition shadow-sm"
          >
            Return to Dashboard
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
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Super Admin Banner & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-[#C9A96E]" />
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Super Admin Portal</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#C9A96E]/20 text-[#e0c48e] text-[10px] font-extrabold uppercase tracking-widest border border-[#C9A96E]/40">
              Root Level
            </span>
          </div>
          <p className="text-xs text-neutral-300 max-w-xl">
            Global management of all registered Aurwell clinics, booking system configurations, and assigned subdomains.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAdminListOpen(true)}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-4 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer backdrop-blur-xs"
          >
            <Users className="w-4 h-4 text-[#C9A96E]" /> Manage Admins ({superAdmins.length})
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Total Clinics</span>
            <h3 className="text-2xl font-black text-neutral-900 mt-0.5">{clinics.length}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-700">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Native Custom Booking</span>
            <h3 className="text-2xl font-black text-[#9e7e45] mt-0.5">{customCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-[#C9A96E]/15 flex items-center justify-center text-[#9e7e45]">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">External Redirects</span>
            <h3 className="text-2xl font-black text-blue-600 mt-0.5">{externalCount}</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Globe className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search clinics by name, ID, or subdomain..."
            className="w-full pl-10 pr-4 py-2 border border-neutral-200 rounded-xl text-xs bg-neutral-50 focus:bg-white focus:outline-none focus:border-[#C9A96E]"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Engine:</span>
          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="border border-neutral-200 rounded-xl px-3 py-1.5 text-xs font-semibold bg-neutral-50 text-neutral-800 focus:outline-none"
          >
            <option value="all">All Booking Modes</option>
            <option value="aurwell_custom">Native Aurwell Booking</option>
            <option value="external_sdk">External Redirect</option>
            <option value="disabled">Disabled / Inactive</option>
          </select>
        </div>
      </div>

      {/* Clinics Table */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 border-b border-neutral-200/80 text-neutral-500 font-extrabold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-6 py-4">Clinic / Merchant</th>
                <th className="px-6 py-4">Booking Engine</th>
                <th className="px-6 py-4">Subdomain / Domain</th>
                <th className="px-6 py-4">Owner UID</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredClinics.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-neutral-400">
                    No clinics match the current filter.
                  </td>
                </tr>
              ) : (
                filteredClinics.map((clinic) => {
                  const cfg = clinic.bookingConfig;
                  const isNative = cfg?.systemType === "aurwell_custom" || cfg?.systemType === "custom";
                  const isExt = cfg?.systemType === "external_sdk";
                  const isDisabled = !isNative && !isExt;

                  return (
                    <tr key={clinic.id} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-black text-neutral-900 text-sm">{clinic.merchantName || "Unnamed Clinic"}</div>
                        <div className="text-[11px] font-mono text-neutral-400">{clinic.id}</div>
                      </td>

                      <td className="px-6 py-4">
                        {isNative && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#C9A96E]/15 text-[#9e7e45] border border-[#C9A96E]/30">
                            <Sparkles className="w-3 h-3" /> Native Custom
                          </span>
                        )}
                        {isExt && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                            <Globe className="w-3 h-3" /> {cfg?.externalBooking?.provider || "External"}
                          </span>
                        )}
                        {isDisabled && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-neutral-100 text-neutral-600 border border-neutral-200">
                            Disabled
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        {cfg?.subdomain ? (
                          <div>
                            <span className="font-mono font-bold text-neutral-800">
                              {cfg.subdomain}.aurwell.app
                            </span>
                            {cfg.customDomain && (
                              <div className="text-[10px] font-mono text-neutral-400 mt-0.5">
                                CNAME: {cfg.customDomain}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-neutral-400 italic">No subdomain</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-mono text-[11px] text-neutral-600 truncate block max-w-[140px]">
                          {clinic.ownerUid || clinic.id.replace("clinic_", "")}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => openClinicEditor(clinic)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs transition cursor-pointer shadow-2xs"
                        >
                          <Settings className="w-3.5 h-3.5 text-[#C9A96E]" /> Configure
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Clinic Booking Engine Modal */}
      {editingClinic && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <form
            onSubmit={handleSaveClinicBooking}
            className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-neutral-100 my-8"
          >
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-neutral-900 tracking-tight">Configure Clinic Booking</h2>
                <span className="text-xs font-mono bg-neutral-100 px-2 py-0.5 rounded text-neutral-600">
                  {editingClinic.id}
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                Set active booking mode, public subdomain, and external URL for <strong>{editingClinic.merchantName}</strong>.
              </p>
            </div>

            {modalFeedback && (
              <div
                className={`p-3 rounded-2xl text-xs font-bold flex items-center gap-2 ${
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

            <div className="space-y-4">
              {/* Engine Mode */}
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1.5">Booking Engine Mode</label>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: "aurwell_custom", label: "Native Custom" },
                    { id: "external_sdk", label: "External Link" },
                    { id: "disabled", label: "Disabled" },
                  ].map((mode) => (
                    <label
                      key={mode.id}
                      className={`p-3 rounded-xl border-2 text-center cursor-pointer transition ${
                        editSystemType === mode.id
                          ? "border-[#C9A96E] bg-[#C9A96E]/10 font-bold text-neutral-900"
                          : "border-neutral-200 bg-neutral-50 text-neutral-600"
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
                      <span className="text-xs">{mode.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Subdomain Input */}
              <div>
                <label className="text-xs font-bold text-neutral-700">Subdomain Identifier</label>
                <div className="flex items-center mt-1">
                  <input
                    type="text"
                    value={editSubdomain}
                    onChange={(e) => setEditSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                    placeholder="clinicname"
                    className="border border-r-0 border-neutral-200 rounded-l-xl p-2.5 text-xs font-mono font-bold w-44 bg-neutral-50 focus:bg-white focus:outline-none focus:border-[#C9A96E]"
                  />
                  <span className="bg-neutral-100 border border-neutral-200 rounded-r-xl px-3 py-2.5 text-xs text-neutral-600 font-mono font-bold">
                    .aurwell.app
                  </span>
                </div>
                <p className="text-[11px] text-neutral-400 mt-1">
                  Controls the <code className="font-mono">/subdomains/{editSubdomain || "..."}</code> route mapping.
                </p>
              </div>

              {/* Custom Domain */}
              <div>
                <label className="text-xs font-bold text-neutral-700">Custom Domain CNAME (Optional)</label>
                <input
                  type="text"
                  value={editCustomDomain}
                  onChange={(e) => setEditCustomDomain(e.target.value.toLowerCase())}
                  placeholder="e.g. booking.clinicname.com"
                  className="w-full border border-neutral-200 rounded-xl p-2.5 text-xs mt-1 bg-neutral-50 focus:bg-white focus:outline-none focus:border-[#C9A96E]"
                />
              </div>

              {/* External URL if external_sdk */}
              {editSystemType === "external_sdk" && (
                <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-3">
                  <div>
                    <label className="text-xs font-bold text-neutral-700">External Provider Name</label>
                    <input
                      type="text"
                      value={editExternalProvider}
                      onChange={(e) => setEditExternalProvider(e.target.value)}
                      placeholder="Fresha, Phorest, Jane App"
                      className="w-full border border-neutral-200 rounded-xl p-2 text-xs mt-1 bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-neutral-700">External Booking URL</label>
                    <input
                      type="url"
                      value={editExternalUrl}
                      onChange={(e) => setEditExternalUrl(e.target.value)}
                      placeholder="https://fresha.com/a/..."
                      className="w-full border border-neutral-200 rounded-xl p-2 text-xs mt-1 bg-white"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setEditingClinic(null)}
                className="px-4 py-2.5 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-700 hover:bg-neutral-50 cursor-pointer"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={savingClinic}
                className="px-6 py-2.5 bg-[#C9A96E] hover:bg-[#b5955c] text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
              >
                {savingClinic ? "Updating..." : "Save Clinic Booking"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Super Admins Management Drawer / Modal */}
      {isAdminListOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-neutral-100 my-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-neutral-900 tracking-tight">Super Admin Authorization</h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Users registered in Firestore <strong className="font-mono">/admin</strong> collection have root portal access.
                </p>
              </div>
              <button
                onClick={() => setIsAdminListOpen(false)}
                className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Add New Admin UID Form */}
            <form onSubmit={handleAddSuperAdmin} className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-3">
              <h4 className="text-xs font-black text-neutral-800 uppercase tracking-wider">Authorize New Super Admin</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <input
                    type="text"
                    required
                    value={newAdminUid}
                    onChange={(e) => setNewAdminUid(e.target.value)}
                    placeholder="Firebase Auth User UID *"
                    className="w-full border border-neutral-200 rounded-xl p-2 text-xs bg-white focus:outline-none focus:border-[#C9A96E]"
                  />
                </div>
                <div>
                  <input
                    type="email"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    placeholder="Admin Email (optional)"
                    className="w-full border border-neutral-200 rounded-xl p-2 text-xs bg-white focus:outline-none focus:border-[#C9A96E]"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={savingAdmin}
                className="w-full bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl py-2 text-xs font-bold transition cursor-pointer disabled:opacity-50"
              >
                {savingAdmin ? "Authorizing..." : "+ Add Super Admin UID"}
              </button>
            </form>

            {/* Existing Super Admins List */}
            <div className="space-y-2">
              <h4 className="text-xs font-black text-neutral-800 uppercase tracking-wider">Authorized Super Admins ({superAdmins.length})</h4>
              <div className="divide-y divide-neutral-100 max-h-60 overflow-y-auto border border-neutral-200 rounded-2xl">
                {superAdmins.map((admin) => {
                  const isCurrent = admin.uid === currentUid;
                  return (
                    <div key={admin.id} className="p-3 flex items-center justify-between gap-3 text-xs bg-white">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-neutral-900 truncate">{admin.uid}</span>
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-[#C9A96E]/20 text-[#9e7e45] border border-[#C9A96E]/40">
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

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsAdminListOpen(false)}
                className="px-5 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-bold cursor-pointer"
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
