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
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";
import ImageUploader from "@/components/ImageUploader";
import { uploadImageFile, deleteImageFile } from "@/lib/firebase/upload";
import { CardGridSkeleton } from "@/components/Loader";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import { Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Treatment {
  id: string;
  title: string;
}

interface IncludedTreatment {
  treatmentId: string;
  sessionsCount: number;
}

interface MembershipTier {
  id: string;
  title: string;
  description: string;
  monthlyPrice: number;
  annualPrice?: number | null;
  benefits: string[];
  includedTreatments: IncludedTreatment[];
  imageUrl?: string;
  terms?: string;
  isActive?: boolean;
}

export default function MembershipPage() {
  const [tiers, setTiers] = useState<MembershipTier[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [clinicId, setClinicId] = useState("");

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [monthlyPrice, setMonthlyPrice] = useState("");
  const [annualPrice, setAnnualPrice] = useState("");
  const [benefitsInput, setBenefitsInput] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [originalImageUrl, setOriginalImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [terms, setTerms] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<MembershipTier | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // Selected included treatments in tier form
  const [includedItems, setIncludedItems] = useState<{ treatmentId: string; sessionsCount: number }[]>([]);

  const loadData = async (cId: string) => {
    try {
      // 1. Fetch available treatments
      const treatSnapshot = await getDocs(collection(db, "clinics", cId, "treatments"));
      const loadedTreatments: Treatment[] = [];
      treatSnapshot.forEach((d) => {
        loadedTreatments.push({ id: d.id, title: d.data().title } as Treatment);
      });
      setTreatments(loadedTreatments);

      // 2. Fetch membership tiers
      const tierSnapshot = await getDocs(collection(db, "clinics", cId, "membership_tiers"));
      const loadedTiers: MembershipTier[] = [];
      tierSnapshot.forEach((d) => {
        const data = d.data();
        loadedTiers.push({
          id: d.id,
          isActive: data.isActive !== false,
          ...data,
        } as MembershipTier);
      });
      setTiers(loadedTiers);
    } catch (err) {
      console.error("Error loading membership page data:", err);
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

  const handleAddTreatmentRow = () => {
    if (treatments.length === 0) return;
    setIncludedItems((prev) => [...prev, { treatmentId: treatments[0].id, sessionsCount: 1 }]);
  };

  const handleRemoveTreatmentRow = (index: number) => {
    setIncludedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveTier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !monthlyPrice || !clinicId) return;

    setIsSaving(true);
    try {
      let finalImageUrl = imageUrl;
      let shouldDeleteOriginal = false;

      if (imageFile) {
        finalImageUrl = await uploadImageFile(imageFile, "memberships");
        shouldDeleteOriginal = true;
      } else if (!imageUrl && originalImageUrl) {
        shouldDeleteOriginal = true;
      }

      const benefitsList = benefitsInput
        .split("\n")
        .map((b) => b.trim())
        .filter(Boolean);

      const tierData = {
        title,
        description,
        monthlyPrice: Number(monthlyPrice),
        annualPrice: annualPrice ? Number(annualPrice) : null,
        benefits: benefitsList,
        includedTreatments: includedItems,
        imageUrl: finalImageUrl || "",
        terms,
      };

      if (editId) {
        // Update existing tier
        await updateDoc(doc(db, "clinics", clinicId, "membership_tiers", editId), tierData);
        setTiers((prev) =>
          prev.map((t) => (t.id === editId ? { ...t, ...tierData } : t))
        );
      } else {
        // Create new tier
        const fullData = { ...tierData, isActive: true, createdAt: serverTimestamp() };
        const docRef = await addDoc(
          collection(db, "clinics", clinicId, "membership_tiers"),
          fullData
        );
        setTiers((prev) => [{ id: docRef.id, ...fullData } as any, ...prev]);
      }

      if (shouldDeleteOriginal && originalImageUrl) {
        await deleteImageFile(originalImageUrl);
      }

      // Reset form
      setTitle("");
      setDescription("");
      setMonthlyPrice("");
      setAnnualPrice("");
      setBenefitsInput("");
      setIncludedItems([]);
      setImageUrl("");
      setOriginalImageUrl("");
      setImageFile(null);
      setTerms("");
      setEditId(null);
      setShowForm(false);
    } catch (err) {
      console.error("Error saving membership tier:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditClick = (tier: MembershipTier) => {
    setEditId(tier.id);
    setTitle(tier.title);
    setDescription(tier.description || "");
    setMonthlyPrice(String(tier.monthlyPrice || ""));
    setAnnualPrice(tier.annualPrice ? String(tier.annualPrice) : "");
    setBenefitsInput((tier.benefits || []).join("\n"));
    setIncludedItems(tier.includedTreatments || []);
    setImageUrl(tier.imageUrl || "");
    setOriginalImageUrl(tier.imageUrl || "");
    setImageFile(null);
    setTerms(tier.terms || "");
    setShowForm(true);
  };

  const handleToggleActive = async (tier: MembershipTier) => {
    if (!clinicId) return;
    const newStatus = tier.isActive === false ? true : false;
    try {
      await updateDoc(doc(db, "clinics", clinicId, "membership_tiers", tier.id), {
        isActive: newStatus,
      });
      setTiers((prev) =>
        prev.map((t) => (t.id === tier.id ? { ...t, isActive: newStatus } : t))
      );
    } catch (err) {
      console.error("Error toggling active state:", err);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteTarget || !clinicId) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.imageUrl) {
        await deleteImageFile(deleteTarget.imageUrl).catch(() => {});
      }
      await deleteDoc(doc(db, "clinics", clinicId, "membership_tiers", deleteTarget.id));
      setTiers((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error("Error deleting membership tier:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8 w-full">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Membership Tier Configuration</h2>
          <p className="text-sm text-neutral-500">Design recurring subscription plans and bundled session perks for your clinic patients</p>
        </div>
        <button
          onClick={() => {
            setEditId(null);
            setTitle("");
            setDescription("");
            setMonthlyPrice("");
            setAnnualPrice("");
            setBenefitsInput("");
            setIncludedItems([]);
            setImageUrl("");
            setOriginalImageUrl("");
            setImageFile(null);
            setTerms("");
            setShowForm(!showForm);
          }}
          className="rounded-full bg-neutral-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-neutral-800 shadow-sm transition self-start cursor-pointer"
        >
          {showForm ? "Cancel" : "Create Membership Tier"}
        </button>
      </div>

      {/* New / Edit Tier Form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            onSubmit={handleSaveTier}
            className="rounded-3xl border border-neutral-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4 w-full overflow-hidden"
          >
            <h3 className="text-md font-bold tracking-tight">
              {editId ? "Edit Membership Tier" : "New Membership Tier"}
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Tier Name</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="input-modern"
                    placeholder="e.g. VIP Glow Membership"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Monthly Price (€)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={monthlyPrice}
                    onChange={(e) => setMonthlyPrice(e.target.value)}
                    className="input-modern"
                    placeholder="e.g. 99"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    Annual Price (€) <span className="text-neutral-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={annualPrice}
                    onChange={(e) => setAnnualPrice(e.target.value)}
                    className="input-modern"
                    placeholder="e.g. 999"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Short Tagline Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="input-modern"
                    placeholder="e.g. Unlimited monthly hydrafacials & VIP perks"
                  />
                </div>
              </div>

              {/* Included Treatment Bundles Setup */}
              <div className="border border-neutral-200/80 rounded-2xl p-4 bg-neutral-50/50 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-neutral-800 uppercase tracking-wider">
                    Bundled Treatment Sessions
                  </span>
                  <button
                    type="button"
                    onClick={handleAddTreatmentRow}
                    className="text-xs text-black font-semibold hover:underline cursor-pointer"
                  >
                    + Add Treatment Session
                  </button>
                </div>

                {includedItems.length === 0 ? (
                  <p className="text-xs text-neutral-400 italic">No bundled treatments added to this tier yet.</p>
                ) : (
                  <div className="space-y-2">
                    {includedItems.map((item, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <select
                          value={item.treatmentId}
                          onChange={(e) => {
                            const val = e.target.value;
                            setIncludedItems((prev) =>
                              prev.map((it, i) => (i === idx ? { ...it, treatmentId: val } : it))
                            );
                          }}
                          className="select-modern flex-1 text-xs"
                        >
                          {treatments.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.title}
                            </option>
                          ))}
                        </select>

                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="1"
                            value={item.sessionsCount}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setIncludedItems((prev) =>
                                prev.map((it, i) => (i === idx ? { ...it, sessionsCount: val } : it))
                              );
                            }}
                            className="input-modern w-20 text-xs text-center"
                          />
                          <span className="text-xs text-neutral-500 font-medium">sessions</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveTreatmentRow(idx)}
                          className="text-xs text-red-500 hover:text-red-700 px-2 py-1 cursor-pointer font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  Included Benefits (One per line)
                </label>
                <textarea
                  rows={3}
                  value={benefitsInput}
                  onChange={(e) => setBenefitsInput(e.target.value)}
                  className="textarea-modern"
                  placeholder="10% Off all skincare products&#10;Priority booking window&#10;Free quarterly skin analysis"
                />
              </div>

              <ImageUploader
                file={imageFile}
                onChange={setImageFile}
                imageUrl={imageUrl}
                onClearImage={() => setImageUrl("")}
                label="Tier Cover Image (Optional)"
              />

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  Membership Terms & Conditions <span className="text-neutral-400 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={terms}
                  onChange={(e) => setTerms(e.target.value)}
                  className="textarea-modern"
                  placeholder="Refund policies, commitment period, etc..."
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-neutral-100 mt-4">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-full border border-neutral-200 bg-white px-5 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="rounded-full bg-neutral-900 px-6 py-2.5 text-xs font-bold text-white hover:bg-neutral-800 transition disabled:bg-neutral-300 disabled:text-neutral-500 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {editId ? "Updating Bundle..." : "Creating Bundle..."}
                  </>
                ) : (
                  editId ? "Update Bundle" : "Create Bundle"
                )}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Tiers Listing Cards with Simple Fade Animation */}
      {loading ? (
        <CardGridSkeleton count={2} />
      ) : tiers.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-neutral-300 p-12 text-center bg-white/50">
          <p className="text-sm text-neutral-500 font-medium mb-1">No membership tiers established yet</p>
          <p className="text-xs text-neutral-400">Click "Create Membership Tier" to offer recurring patient subscriptions.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {tiers.map((t, idx) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: idx * 0.04 }}
              className={`rounded-3xl border bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between space-y-6 transition-all hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)] ${
                t.isActive === false ? "border-neutral-200 opacity-60" : "border-neutral-100"
              }`}
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-neutral-900">{t.title}</h3>
                    <p className="text-xs text-neutral-500 mt-0.5">{t.description}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-black text-neutral-900">€{t.monthlyPrice}</span>
                    <span className="text-xs text-neutral-400 font-medium">/mo</span>
                    {t.annualPrice && (
                      <div className="text-[10px] text-neutral-400">€{t.annualPrice}/yr</div>
                    )}
                  </div>
                </div>

                {t.imageUrl && (
                  <div
                    className="h-36 rounded-2xl bg-cover bg-center border border-neutral-100"
                    style={{ backgroundImage: `url(${t.imageUrl})` }}
                  />
                )}

                {/* Included Treatments Badge List */}
                {t.includedTreatments && t.includedTreatments.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-neutral-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                      Bundled Monthly Treatments
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {t.includedTreatments.map((inc, i) => {
                        const tr = treatments.find((item) => item.id === inc.treatmentId);
                        return (
                          <span
                            key={i}
                            className="bg-neutral-100 text-neutral-800 text-xs font-semibold px-2.5 py-1 rounded-full border border-neutral-200"
                          >
                            {inc.sessionsCount}x {tr ? tr.title : "Treatment"}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Additional Perks */}
                {t.benefits && t.benefits.length > 0 && (
                  <div className="space-y-1.5 pt-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                      Member Perks
                    </span>
                    <ul className="text-xs text-neutral-600 space-y-1">
                      {t.benefits.map((b, i) => (
                        <li key={i} className="flex items-center gap-1.5">
                          <span className="text-emerald-500 font-bold">✓</span> {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Status Toggle & Edit */}
              <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={t.isActive !== false}
                    onChange={() => handleToggleActive(t)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-black"></div>
                  <span className="ml-2 text-xs font-medium text-neutral-500">
                    {t.isActive !== false ? "Active Tier" : "Inactive"}
                  </span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditClick(t)}
                    className="rounded-full border border-neutral-200 bg-white px-4 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteTarget(t)}
                    className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirmed}
        isDeleting={isDeleting}
        title="Delete Membership Tier"
        description="This membership tier will be permanently removed. Any active subscribers will not be affected but no new subscriptions can be started."
        itemName={deleteTarget?.title}
      />
    </div>
  );
}
