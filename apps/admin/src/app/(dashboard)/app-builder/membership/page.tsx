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
import {
  fetchCanonicalTreatments,
  fetchCanonicalMembershipTiers,
  incrementCollectionVersion,
  updateLocalCache,
} from "@/lib/firebase/versionCache";
import ImageUploader from "@/components/ImageUploader";
import { uploadImageFile, deleteImageFile } from "@/lib/firebase/upload";
import { CardGridSkeleton } from "@/components/Loader";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import Modal from "@/components/Modal";
import { Trash2, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface IncludedItem {
  treatmentId: string;
  sessionsCount: number;
}

interface MembershipTier {
  id: string;
  title: string;
  description: string;
  monthlyPrice: number;
  annualPrice?: number | null;
  minCommitmentMonths?: number | null;
  benefits: string[];
  includedTreatments?: IncludedItem[];
  imageUrl?: string;
  terms?: string;
  isActive?: boolean;
  createdAt?: any;
}

interface Treatment {
  id: string;
  title: string;
}

export default function MembershipTiersPage() {
  const [clinicId, setClinicId] = useState("");
  const [tiers, setTiers] = useState<MembershipTier[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [monthlyPrice, setMonthlyPrice] = useState("");
  const [annualPrice, setAnnualPrice] = useState("");
  const [minCommitmentMonths, setMinCommitmentMonths] = useState("");
  const [benefitsList, setBenefitsList] = useState<string[]>([""]);
  const [terms, setTerms] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [originalImageUrl, setOriginalImageUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<MembershipTier | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // Selected included treatments in tier form
  const [includedItems, setIncludedItems] = useState<{ treatmentId: string; sessionsCount: number }[]>([]);

  const loadData = async (cId: string) => {
    try {
      // 1. Fetch available treatments with canonical Version Cache
      const loadedTreatments = await fetchCanonicalTreatments(cId);
      setTreatments(loadedTreatments);

      // 2. Fetch membership tiers with canonical Version Cache
      const loadedTiers = await fetchCanonicalMembershipTiers(cId);
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

  const handleAddBenefit = () => {
    setBenefitsList((prev) => [...prev, ""]);
  };

  const handleRemoveBenefit = (index: number) => {
    setBenefitsList((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      return updated.length === 0 ? [""] : updated;
    });
  };

  const handleBenefitChange = (index: number, value: string) => {
    setBenefitsList((prev) =>
      prev.map((item, i) => (i === index ? value : item))
    );
  };

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

      const cleanBenefits = benefitsList
        .map((b) => b.trim())
        .filter(Boolean);

      const tierData = {
        title,
        description,
        monthlyPrice: Number(monthlyPrice),
        annualPrice: annualPrice ? Number(annualPrice) : null,
        minCommitmentMonths: minCommitmentMonths ? Number(minCommitmentMonths) : null,
        benefits: cleanBenefits,
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
        updateLocalCache<MembershipTier>(clinicId, "membership_tiers", (prev) =>
          prev.map((t) => (t.id === editId ? { ...t, ...tierData } : t))
        );
      } else {
        // Create new tier
        const fullData = { ...tierData, isActive: true, createdAt: serverTimestamp() };
        const docRef = await addDoc(
          collection(db, "clinics", clinicId, "membership_tiers"),
          fullData
        );
        const newTier = { id: docRef.id, ...fullData } as any;
        setTiers((prev) => [newTier, ...prev]);
        updateLocalCache<MembershipTier>(clinicId, "membership_tiers", (prev) => [newTier, ...prev]);
      }

      await incrementCollectionVersion(clinicId, "membership_tiers");

      if (shouldDeleteOriginal && originalImageUrl) {
        await deleteImageFile(originalImageUrl);
      }

      // Reset form
      setTitle("");
      setDescription("");
      setMonthlyPrice("");
      setAnnualPrice("");
      setMinCommitmentMonths("");
      setBenefitsList([""]);
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
    setMinCommitmentMonths(tier.minCommitmentMonths ? String(tier.minCommitmentMonths) : "");
    setBenefitsList(tier.benefits && tier.benefits.length > 0 ? [...tier.benefits] : [""]);
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
      updateLocalCache<MembershipTier>(clinicId, "membership_tiers", (prev) =>
        prev.map((t) => (t.id === tier.id ? { ...t, isActive: newStatus } : t))
      );
      await incrementCollectionVersion(clinicId, "membership_tiers");
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
      updateLocalCache<MembershipTier>(clinicId, "membership_tiers", (prev) =>
        prev.filter((t) => t.id !== deleteTarget.id)
      );
      await incrementCollectionVersion(clinicId, "membership_tiers");
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
            setMinCommitmentMonths("");
            setBenefitsList([""]);
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

      {/* New / Edit Tier Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editId ? "Edit Membership Tier" : "New Membership Tier"}
        subtitle="Membership Configuration"
        maxWidth="max-w-6xl"
      >
        <form onSubmit={handleSaveTier} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column (7 cols): Plan Pricing & Text Details */}
            <div className="lg:col-span-7 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    Min Commitment (Months)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={minCommitmentMonths}
                    onChange={(e) => setMinCommitmentMonths(e.target.value)}
                    className="input-modern"
                    placeholder="e.g. 3, 6, 12"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Short Tagline Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="input-modern"
                    placeholder="e.g. Unlimited monthly hydrafacials"
                  />
                </div>
              </div>

              {/* Dynamic Included Benefits Input Boxes */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-neutral-700">
                    Included Benefits
                  </label>
                  <button
                    type="button"
                    onClick={handleAddBenefit}
                    className="text-xs text-neutral-900 font-bold hover:underline cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Benefit</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {benefitsList.map((benefit, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={benefit}
                        onChange={(e) => handleBenefitChange(index, e.target.value)}
                        className="input-modern flex-1 text-xs"
                        placeholder={
                          index === 0
                            ? "e.g. 10% Off all skincare products"
                            : index === 1
                            ? "e.g. Priority booking window"
                            : index === 2
                            ? "e.g. Free quarterly skin analysis"
                            : "e.g. Additional member benefit"
                        }
                      />
                      {benefitsList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveBenefit(index)}
                          className="p-2 rounded-xl text-neutral-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer shrink-0"
                          title="Remove benefit"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

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

            {/* Right Column (5 cols): Bundled Treatments & 16:9 Image Uploader */}
            <div className="lg:col-span-5 space-y-5">
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
                    + Add Session
                  </button>
                </div>

                {includedItems.length === 0 ? (
                  <p className="text-xs text-neutral-400 italic">No bundled treatments added to this tier yet.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
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
                            className="input-modern w-16 text-xs text-center"
                          />
                          <span className="text-xs text-neutral-500 font-medium">x</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveTreatmentRow(idx)}
                          className="text-xs text-red-500 hover:text-red-700 px-1.5 py-1 cursor-pointer font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Cover Image Card */}
              <div className="bg-neutral-50/60 border border-neutral-200/60 rounded-2xl p-4">
                <ImageUploader
                  file={imageFile}
                  onChange={setImageFile}
                  imageUrl={imageUrl}
                  onClearImage={() => setImageUrl("")}
                  label="Tier Cover Image"
                  heightClass="aspect-[16/9] h-auto w-full"
                />
              </div>
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
                    <span>{editId ? "Updating Bundle..." : "Creating Bundle..."}</span>
                  </>
                ) : (
                  editId ? "Update Bundle" : "Create Bundle"
                )}
              </button>
            </div>
          </form>
        </Modal>

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
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              className={`rounded-3xl border bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_16px_40px_rgba(0,0,0,0.08)] flex flex-col justify-between overflow-hidden transition-all duration-300 ${
                t.isActive === false ? "border-neutral-200 opacity-60" : "border-neutral-100"
              }`}
            >
              <div>
                {/* Card Cover Header Banner */}
                <div className="relative h-44 sm:h-48 w-full bg-neutral-900 overflow-hidden">
                  {t.imageUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={t.imageUrl}
                      alt={t.title}
                      className="w-full h-full object-cover object-center transition-transform duration-500 hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-950 p-6 flex flex-col justify-end">
                      <span className="text-white/40 font-mono text-xs uppercase tracking-widest">Aurwell Luxury Membership</span>
                    </div>
                  )}

                  {/* Dark overlay gradient for contrast */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/30 pointer-events-none" />

                  {/* Badges on Top of Cover Image */}
                  <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-2 z-10">
                    {Boolean(t.minCommitmentMonths) && Number(t.minCommitmentMonths) > 0 ? (
                      <span className="inline-flex items-center gap-1.5 bg-white/95 backdrop-blur-md text-neutral-900 text-[11px] font-bold px-3 py-1 rounded-full shadow-md border border-white/40">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        {t.minCommitmentMonths}-Month Minimum
                      </span>
                    ) : (
                      <div />
                    )}

                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full backdrop-blur-md shadow-md ${
                      t.isActive !== false
                        ? "bg-emerald-500/90 text-white"
                        : "bg-neutral-800/90 text-neutral-300"
                    }`}>
                      {t.isActive !== false ? "Active Tier" : "Inactive"}
                    </span>
                  </div>

                  {/* Price & Title Overlay on Cover Header */}
                  <div className="absolute bottom-4 left-6 right-6 flex justify-between items-end z-10 text-white">
                    <div>
                      <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow-md">
                        {t.title}
                      </h3>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl sm:text-3xl font-black text-white drop-shadow-md">€{t.monthlyPrice}</span>
                        <span className="text-xs font-semibold text-white/80">/mo</span>
                      </div>
                      {t.annualPrice && (
                        <span className="text-[11px] font-semibold text-white/80 block">
                          €{t.annualPrice} / year
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Content Body */}
                <div className="p-6 sm:p-7 space-y-5">
                  {/* Tagline Description */}
                  {t.description && (
                    <p className="text-xs text-neutral-600 font-medium leading-relaxed">
                      {t.description}
                    </p>
                  )}

                  {/* Included Treatments Badge List */}
                  {t.includedTreatments && t.includedTreatments.length > 0 && (
                    <div className="space-y-2.5 pt-1 border-t border-neutral-100">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block">
                        Bundled Monthly Treatments
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {t.includedTreatments.map((inc, i) => {
                          const tr = treatments.find((item) => item.id === inc.treatmentId);
                          return (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1.5 bg-neutral-900 text-white text-xs font-semibold px-3 py-1.5 rounded-full shadow-xs"
                            >
                              <span className="text-emerald-400 font-bold">{inc.sessionsCount}x</span>
                              <span>{tr ? tr.title : "Treatment"}</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Member Perks */}
                  {t.benefits && t.benefits.length > 0 && (
                    <div className="space-y-2.5 pt-1 border-t border-neutral-100">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block">
                        Member Perks & Benefits
                      </span>
                      <div className="grid grid-cols-1 gap-2">
                        {t.benefits.map((b, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-neutral-700 font-medium">
                            <div className="w-4 h-4 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 border border-emerald-200/80">
                              ✓
                            </div>
                            <span className="leading-snug">{b}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Actions Bar */}
              <div className="px-6 py-4 bg-neutral-50/50 border-t border-neutral-100 flex items-center justify-between gap-3">
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={t.isActive !== false}
                    onChange={() => handleToggleActive(t)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-neutral-900"></div>
                  <span className="ml-2.5 text-xs font-semibold text-neutral-700">
                    {t.isActive !== false ? "Active Tier" : "Inactive"}
                  </span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditClick(t)}
                    className="rounded-full border border-neutral-200 bg-white px-4 py-1.5 text-xs font-semibold text-neutral-800 hover:bg-neutral-100 transition cursor-pointer shadow-2xs"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteTarget(t)}
                    className="rounded-full border border-red-200 bg-red-50 px-3.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
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
