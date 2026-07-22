"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  getDocs,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  orderBy,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";

interface Banner {
  id: string;
  title: string;
  screen: "home";
  isActive?: boolean;
  buttonText?: string;
  targetType?: string;
  targetId?: string;
}

interface TreatmentOption {
  id: string;
  title: string;
}

interface MembershipOption {
  id: string;
  title: string;
}

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [treatments, setTreatments] = useState<TreatmentOption[]>([]);
  const [memberships, setMemberships] = useState<MembershipOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [clinicId, setClinicId] = useState("");

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [screen, setScreen] = useState<"home">("home");
  const [buttonText, setButtonText] = useState("");
  const [targetType, setTargetType] = useState("");
  const [targetId, setTargetId] = useState("");

  const loadData = async (cId: string) => {
    try {
      // 1. Fetch treatments for dropdown selector
      const treatmentsSnap = await getDocs(collection(db, "clinics", cId, "treatments"));
      const loadedTreatments: TreatmentOption[] = [];
      treatmentsSnap.forEach((d) => {
        loadedTreatments.push({ id: d.id, title: d.data().title || "Untitled Treatment" });
      });
      setTreatments(loadedTreatments);

      // 2. Fetch memberships for dropdown selector
      const membershipsSnap = await getDocs(collection(db, "clinics", cId, "memberships"));
      const loadedMemberships: MembershipOption[] = [];
      membershipsSnap.forEach((d) => {
        loadedMemberships.push({ id: d.id, title: d.data().title || "Untitled Membership" });
      });
      setMemberships(loadedMemberships);

      // 3. Fetch banners list
      const q = query(
        collection(db, "clinics", cId, "banners"),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      const loadedBanners: Banner[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        loadedBanners.push({
          id: d.id,
          isActive: data.isActive !== false,
          title: data.title || "",
          screen: data.screen || "home",
          buttonText: data.buttonText || "",
          targetType: data.targetType || "",
          targetId: data.targetId || "",
        });
      });
      setBanners(loadedBanners);
    } catch (err) {
      console.error("Error loading banners data:", err);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const cId = userDoc.data().clinicId;
          setClinicId(cId);
          await loadData(cId);
        }
      } catch (err) {
        console.error("Error loading user profile:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !clinicId) return;

    setLoading(true);
    const bannerData = {
      title,
      screen,
      buttonText: buttonText || "",
      targetType: targetType || "",
      targetId: targetId || "",
    };

    try {
      if (editId) {
        // Update existing banner
        await updateDoc(doc(db, "clinics", clinicId, "banners", editId), bannerData);
        setBanners((prev) =>
          prev.map((b) => (b.id === editId ? { ...b, ...bannerData } : b))
        );
      } else {
        // Create new banner
        const fullData = { ...bannerData, isActive: true, createdAt: serverTimestamp() };
        const docRef = await addDoc(
          collection(db, "clinics", clinicId, "banners"),
          fullData
        );
        setBanners((prev) => [{ id: docRef.id, ...fullData } as any, ...prev]);
      }

      // Reset Form
      setTitle("");
      setScreen("home");
      setButtonText("");
      setTargetType("");
      setTargetId("");
      setEditId(null);
      setShowForm(false);
    } catch (err) {
      console.error("Error saving banner:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (banner: Banner) => {
    setEditId(banner.id);
    setTitle(banner.title);
    setScreen(banner.screen);
    setButtonText(banner.buttonText || "");
    setTargetType(banner.targetType || "");
    setTargetId(banner.targetId || "");
    setShowForm(true);
  };

  const handleToggleActive = async (banner: Banner) => {
    if (!clinicId) return;
    const newStatus = banner.isActive === false ? true : false;
    try {
      await updateDoc(doc(db, "clinics", clinicId, "banners", banner.id), {
        isActive: newStatus,
      });
      setBanners((prev) =>
        prev.map((b) => (b.id === banner.id ? { ...b, isActive: newStatus } : b))
      );
    } catch (err) {
      console.error("Error toggling banner status:", err);
    }
  };

  const handleDeleteBanner = async (bannerId: string) => {
    if (!clinicId) return;
    if (!confirm("Are you sure you want to delete this banner? This action cannot be undone.")) return;

    setLoading(true);
    try {
      await deleteDoc(doc(db, "clinics", clinicId, "banners", bannerId));
      setBanners((prev) => prev.filter((b) => b.id !== bannerId));
    } catch (err) {
      console.error("Error deleting banner:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && banners.length === 0) {
    return <div className="text-sm text-neutral-500">Loading banners configuration...</div>;
  }

  return (
    <div className="space-y-8 w-full">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight">App Banners Configuration</h2>
          <p className="text-sm text-neutral-500">Add text-based banner announcements with optional action buttons & deep links</p>
        </div>
        <button
          onClick={() => {
            setEditId(null);
            setTitle("");
            setScreen("home");
            setButtonText("");
            setTargetType("");
            setTargetId("");
            setShowForm(!showForm);
          }}
          className="rounded-full bg-neutral-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-neutral-800 shadow-sm transition self-start cursor-pointer"
        >
          {showForm ? "Cancel" : "Create New Banner"}
        </button>
      </div>

      {/* Add / Edit Banner Form */}
      {showForm && (
        <form
          onSubmit={handleSaveBanner}
          className="rounded-3xl border border-neutral-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4 w-full animate-fade-in"
        >
          <h3 className="text-md font-bold tracking-tight">
            {editId ? "Edit Banner Details" : "New Banner Details"}
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Banner Announcement Text</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input-modern"
                placeholder="e.g. Get 20% off on all Dermal Fillers this summer!"
              />
            </div>

            {/* Optional Call to Action Button & Navigation Link */}
            <div className="border-t border-neutral-100 pt-4 space-y-4">
              <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">Action Button & Navigation (Optional)</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Button Text</label>
                  <input
                    type="text"
                    value={buttonText}
                    onChange={(e) => setButtonText(e.target.value)}
                    className="input-modern"
                    placeholder="e.g. Learn More (leave empty for no button)"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">App Navigation Behavior (targetType)</label>
                  <select
                    value={targetType}
                    onChange={(e) => {
                      setTargetType(e.target.value);
                      setTargetId(""); // Reset targetId when type changes
                    }}
                    className="select-modern"
                  >
                    <option value="">No action / Non-clickable</option>
                    <option value="SHOP_TREATMENTS">Go to Treatments Tab</option>
                    <option value="SHOP_MEMBERSHIPS">Go to Memberships Tab</option>
                    <option value="TREATMENT_DETAIL">Open Specific Treatment Detail</option>
                    <option value="MEMBERSHIP_DETAIL">Open Specific Membership Detail</option>
                    <option value="REWARDS_PAGE">Open Rewards Page</option>
                    <option value="SCAN_PAGE">Open Scan/Check-in Tab</option>
                    <option value="URL">External Web Link (URL)</option>
                  </select>
                </div>
              </div>

              {/* Conditional inputs for targetId */}
              {targetType === "TREATMENT_DETAIL" && (
                <div className="animate-fade-in">
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Select Target Treatment</label>
                  <select
                    required
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="select-modern"
                  >
                    <option value="">-- Choose Treatment --</option>
                    {treatments.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {targetType === "MEMBERSHIP_DETAIL" && (
                <div className="animate-fade-in">
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Select Target Membership</label>
                  <select
                    required
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="select-modern"
                  >
                    <option value="">-- Choose Membership --</option>
                    {memberships.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {targetType === "URL" && (
                <div className="animate-fade-in">
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">External Web URL</label>
                  <input
                    type="url"
                    required
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="input-modern"
                    placeholder="https://example.com/promo-link"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 flex gap-3 border-t border-neutral-100 mt-4">
            <button
              type="submit"
              className="flex-1 rounded-full bg-neutral-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-neutral-800 transition cursor-pointer"
            >
              {editId ? "Update Banner" : "Save Banner"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-full border border-neutral-200 bg-white px-5 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Banners Listing */}
      {banners.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-neutral-300 p-12 text-center bg-white/50">
          <p className="text-sm text-neutral-500 font-medium mb-1">No banners configured yet</p>
          <p className="text-xs text-neutral-400">Click "Create New Banner" to add your first banner notification.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {banners.map((b) => (
            <div
              key={b.id}
              className={`overflow-hidden rounded-3xl border bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between p-6 transition ${b.isActive === false ? "border-neutral-200 opacity-60" : "border-neutral-100"
                }`}
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start gap-4">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border bg-blue-50 border-blue-200 text-blue-800">
                    Home Screen
                  </span>
                </div>

                <h3 className="text-sm font-semibold text-neutral-900 leading-snug">
                  "{b.title}"
                </h3>

                {/* Button & Deep Link Target preview details */}
                {b.buttonText && (
                  <div className="rounded-2xl bg-neutral-50/70 border border-neutral-200/60 p-3 text-[11px] text-neutral-500 space-y-1 animate-fade-in">
                    <div className="flex justify-between items-baseline">
                      <span>Button Label:</span>
                      <span className="font-bold text-neutral-900 select-all font-mono uppercase bg-neutral-200/50 px-2 py-0.5 rounded-full text-[9px]">{b.buttonText}</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                      <span>Action Type (targetType):</span>
                      <strong className="text-neutral-700 font-mono text-[10px]">{b.targetType}</strong>
                    </div>
                    {b.targetId && (
                      <div className="flex justify-between items-baseline pt-1 border-t border-neutral-200/40">
                        <span>Target Link (targetId):</span>
                        <span className="font-semibold text-neutral-700 truncate max-w-[200px]">
                          {b.targetType === "TREATMENT_DETAIL"
                            ? (treatments.find((t) => t.id === b.targetId)?.title || b.targetId)
                            : b.targetType === "MEMBERSHIP_DETAIL"
                              ? (memberships.find((m) => m.id === b.targetId)?.title || b.targetId)
                              : b.targetId}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-neutral-100 mt-6 flex items-center justify-between">
                {/* Toggle switch */}
                <div className="flex items-center gap-2">
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={b.isActive !== false}
                      onChange={() => handleToggleActive(b)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-black"></div>
                    <span className="ml-2 text-xs font-medium text-neutral-500">
                      {b.isActive !== false ? "Active" : "Inactive"}
                    </span>
                  </label>
                </div>

                {/* Edit & Delete Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditClick(b)}
                    className="rounded-full border border-neutral-200 bg-white px-4 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteBanner(b.id)}
                    className="rounded-full border border-red-200 bg-red-50 px-4 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
