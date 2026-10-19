"use client";

import { useEffect, useState, useRef } from "react";
import { collection, query, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";
import { fetchCanonicalTreatments, incrementCollectionVersion, updateLocalCache } from "@/lib/firebase/versionCache";
import ImageUploader from "@/components/ImageUploader";
import { uploadImageFile, deleteImageFile } from "@/lib/firebase/upload";
import { CardGridSkeleton } from "@/components/Loader";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import Modal from "@/components/Modal";
import { TREATMENT_CATEGORIES } from "@/lib/constants";
import { Search, Tag, Check, X, Plus, Filter, ChevronDown, SlidersHorizontal, Trash2, Clock, Info, ExternalLink, Link as LinkIcon, Sparkles, Edit2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface TreatmentType {
  title: string;
  nonMemberPrice: number;
  memberPrice?: number | null;
}

interface Treatment {
  id: string;
  categories: string[];
  title: string;
  description: string;
  bannerUrl: string;
  featuresHeading: string;
  features: string[];
  types: TreatmentType[];
  durationMinutes?: number;
  bufferMinutes?: number;
  depositRequired?: boolean | null;
  externalBookingUrl?: string;
  isActive?: boolean;
  createdAt?: any;
}

export default function TreatmentsPage() {
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [clinicId, setClinicId] = useState("");

  // Directory View Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilterCategories, setSelectedFilterCategories] = useState<string[]>([]);
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const [filterCategorySearch, setFilterCategorySearch] = useState("");
  const [expandedCardIds, setExpandedCardIds] = useState<Record<string, boolean>>({});

  const toggleExpandCard = (id: string) => {
    setExpandedCardIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Form Reference for Auto-Scroll
  const formRef = useRef<HTMLDivElement>(null);

  // Treatment Creation / Edit Form State
  const [showTreatmentForm, setShowTreatmentForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categorySearch, setCategorySearch] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [originalBannerUrl, setOriginalBannerUrl] = useState("");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [featuresHeading, setFeaturesHeading] = useState("Key Benefits");
  const [durationMinutes, setDurationMinutes] = useState<string>("30");
  const [bufferMinutes, setBufferMinutes] = useState<string>("15");
  const [bookingConfig, setBookingConfig] = useState<any>(null);
  const [externalBookingUrl, setExternalBookingUrl] = useState("");

  const isExternalSdkClinic = bookingConfig?.systemType === "external_sdk";

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<Treatment | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [featuresListInput, setFeaturesListInput] = useState(""); // Comma separated benefits

  // Treatment Types State (multiple types)
  const [types, setTypes] = useState<any[]>([
    { title: "Standard", nonMemberPrice: "", memberPrice: "" },
  ]);

  const loadData = async (cId: string) => {
    try {
      const loadedTreatments = await fetchCanonicalTreatments(cId);
      setTreatments(loadedTreatments);
    } catch (err) {
      console.error("Error loading treatments data:", err);
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

          if (cId) {
            const clinicSnap = await getDoc(doc(db, "clinics", cId));
            if (clinicSnap.exists()) {
              setBookingConfig(clinicSnap.data().bookingConfig || null);
            }
          }

          await loadData(cId);
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleAddTypeRow = () => {
    setTypes((prev) => [...prev, { title: "", nonMemberPrice: "", memberPrice: "" }]);
  };

  const handleTypeRowChange = (index: number, field: keyof TreatmentType, value: string) => {
    setTypes((prev) =>
      prev.map((t, idx) => (idx === index ? { ...t, [field]: value } : t))
    );
  };

  const toggleCategorySelection = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const toggleFilterCategory = (cat: string) => {
    setSelectedFilterCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleSaveTreatment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || selectedCategories.length === 0 || !clinicId) return;

    setIsSaving(true);
    try {
      let finalBannerUrl = bannerUrl;
      let shouldDeleteOriginal = false;

      if (bannerFile) {
        finalBannerUrl = await uploadImageFile(bannerFile, "treatments");
        shouldDeleteOriginal = true;
      } else if (!bannerUrl && originalBannerUrl) {
        shouldDeleteOriginal = true;
      }

      const parsedDuration = Number(durationMinutes);
      const parsedBuffer = Number(bufferMinutes);

      const treatmentData = {
        categories: selectedCategories,
        title,
        description,
        bannerUrl: finalBannerUrl || "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600",
        featuresHeading,
        features: featuresListInput.split(",").map((f) => f.trim()).filter(Boolean),
        durationMinutes: parsedDuration > 0 ? parsedDuration : 30,
        bufferMinutes: !isNaN(parsedBuffer) && parsedBuffer >= 0 ? parsedBuffer : 15,
        externalBookingUrl: isExternalSdkClinic ? externalBookingUrl.trim() : "",
        types: types
          .filter((t) => t.title && t.nonMemberPrice)
          .map((t) => ({
            title: t.title,
            nonMemberPrice: Number(t.nonMemberPrice),
            memberPrice: t.memberPrice ? Number(t.memberPrice) : null,
          })),
      };

      if (editId) {
        // Update existing treatment
        await updateDoc(doc(db, "clinics", clinicId, "treatments", editId), treatmentData);
        setTreatments((prev) =>
          prev.map((t) => (t.id === editId ? { ...t, ...treatmentData } as any : t))
        );
        updateLocalCache<Treatment>(clinicId, "treatments", (prev) =>
          prev.map((t) => (t.id === editId ? { ...t, ...treatmentData } as any : t))
        );
      } else {
        // Create new treatment
        const fullData = { ...treatmentData, isActive: true, createdAt: serverTimestamp() };
        const docRef = await addDoc(
          collection(db, "clinics", clinicId, "treatments"),
          fullData
        );
        const newTreatment = { id: docRef.id, ...fullData } as any;
        setTreatments((prev) => [newTreatment, ...prev]);
        updateLocalCache<Treatment>(clinicId, "treatments", (prev) => [newTreatment, ...prev]);
      }

      await incrementCollectionVersion(clinicId, "treatments");

      if (shouldDeleteOriginal && originalBannerUrl) {
        await deleteImageFile(originalBannerUrl);
      }

      // Reset Form
      setTitle("");
      setDescription("");
      setBannerUrl("");
      setOriginalBannerUrl("");
      setBannerFile(null);
      setFeaturesHeading("Key Benefits");
      setFeaturesListInput("");
      setDurationMinutes("30");
      setBufferMinutes("15");
      setExternalBookingUrl("");
      setTypes([{ title: "Standard", nonMemberPrice: "", memberPrice: "" }]);
      setSelectedCategories([]);
      setEditId(null);
      setShowTreatmentForm(false);
    } catch (err) {
      console.error("Error saving treatment:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditClick = (treatment: Treatment) => {
    setEditId(treatment.id);
    setSelectedCategories(treatment.categories || []);
    setTitle(treatment.title || "");
    setDescription(treatment.description || "");
    setBannerUrl(treatment.bannerUrl || "");
    setOriginalBannerUrl(treatment.bannerUrl || "");
    setBannerFile(null);
    setFeaturesHeading(treatment.featuresHeading || "Key Benefits");
    setFeaturesListInput(Array.isArray(treatment.features) ? treatment.features.join(", ") : "");
    setDurationMinutes(treatment.durationMinutes !== undefined && treatment.durationMinutes !== null ? String(treatment.durationMinutes) : "30");
    setBufferMinutes(treatment.bufferMinutes !== undefined && treatment.bufferMinutes !== null ? String(treatment.bufferMinutes) : "15");
    setExternalBookingUrl(treatment.externalBookingUrl || "");
    setTypes(
      Array.isArray(treatment.types) && treatment.types.length > 0
        ? treatment.types.map((t) => ({
            title: t.title || "Standard",
            nonMemberPrice: String(t.nonMemberPrice || 0),
            memberPrice: t.memberPrice !== undefined && t.memberPrice !== null ? String(t.memberPrice) : "",
          }))
        : [{ title: "Standard", nonMemberPrice: "", memberPrice: "" }]
    );
    setShowTreatmentForm(true);

    // Smooth scroll to top where form card pops up
    setTimeout(() => {
      if (formRef.current) {
        formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 50);
  };

  const handleToggleActive = async (treatment: Treatment) => {
    if (!clinicId) return;
    const newStatus = treatment.isActive === false ? true : false;
    try {
      await updateDoc(doc(db, "clinics", clinicId, "treatments", treatment.id), {
        isActive: newStatus,
      });
      setTreatments((prev) =>
        prev.map((t) => (t.id === treatment.id ? { ...t, isActive: newStatus } : t))
      );
      updateLocalCache<Treatment>(clinicId, "treatments", (prev) =>
        prev.map((t) => (t.id === treatment.id ? { ...t, isActive: newStatus } : t))
      );
      await incrementCollectionVersion(clinicId, "treatments");
    } catch (err) {
      console.error("Error toggling active state:", err);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteTarget || !clinicId) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.bannerUrl) {
        await deleteImageFile(deleteTarget.bannerUrl).catch(() => {});
      }
      await deleteDoc(doc(db, "clinics", clinicId, "treatments", deleteTarget.id));
      setTreatments((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      updateLocalCache<Treatment>(clinicId, "treatments", (prev) =>
        prev.filter((t) => t.id !== deleteTarget.id)
      );
      await incrementCollectionVersion(clinicId, "treatments");
      setDeleteTarget(null);
    } catch (err) {
      console.error("Error deleting treatment:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredTreatments = treatments.filter((t) => {
    const cats = Array.isArray(t.categories) ? t.categories : [];
    const tTitle = t.title || "";
    const tDesc = t.description || "";

    const matchesSearch =
      !searchTerm.trim() ||
      tTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tDesc.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cats.some((c) => c.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory =
      selectedFilterCategories.length === 0 ||
      cats.some((c) => selectedFilterCategories.includes(c));

    return matchesSearch && matchesCategory;
  });

  // Category search inside form modal
  const filteredCategoryOptions = TREATMENT_CATEGORIES.filter((c) =>
    c.toLowerCase().includes(categorySearch.toLowerCase())
  );

  // Category search inside filter funnel popover
  const filteredFunnelCategories = TREATMENT_CATEGORIES.filter((c) =>
    c.toLowerCase().includes(filterCategorySearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header & Main Actions */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-neutral-900">Treatments Directory</h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Configure clinic service products and assign standard treatment categories.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              if (showTreatmentForm) {
                setShowTreatmentForm(false);
                setEditId(null);
              } else {
                setEditId(null);
                setTitle("");
                setDescription("");
                setBannerUrl("");
                setOriginalBannerUrl("");
                setBannerFile(null);
                setFeaturesHeading("Key Benefits");
                setFeaturesListInput("");
                setDurationMinutes("30");
                setBufferMinutes("15");
                setExternalBookingUrl("");
                setTypes([{ title: "Standard", nonMemberPrice: "", memberPrice: "" }]);
                setSelectedCategories([]);
                setShowTreatmentForm(true);
              }
            }}
            className="btn-primary px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer "
          >
            {showTreatmentForm ? (
              <>
                <X className="w-3.5 h-3.5" /> Close Form
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" /> Add Treatment Product
              </>
            )}
          </button>
        </div>
      </div>

      {/* Directory Filter & Search Controls */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="rounded-2xl bg-white p-3.5 sm:p-4  border border-neutral-200/80 space-y-3 relative"
      >
        <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 z-10 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search treatments by title or tag..."
              className="input-modern input-search text-xs py-1.5"
            />
          </div>

          {/* Category Funnel Filter Button */}
          <div className="relative w-full sm:w-auto">
            <button
              onClick={() => setShowFilterPopover(!showFilterPopover)}
              className={`w-full sm:w-auto px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between sm:justify-start gap-1.5 border transition cursor-pointer  ${
                selectedFilterCategories.length > 0 ? "bg-neutral-900 text-white shadow-xs"
                  : "bg-neutral-50 text-neutral-700 border-neutral-200/80 hover:bg-neutral-100"
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Filter className={`w-3.5 h-3.5 ${selectedFilterCategories.length > 0 ? "text-white" : "text-neutral-900"}`} />
                <span>
                  {selectedFilterCategories.length === 0
                    ? "Category Filter"
                    : `Category Filter (${selectedFilterCategories.length})`}
                </span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${showFilterPopover ? "rotate-180" : ""}`}
              />
            </button>

            {/* Category Funnel Popover Modal */}
            <AnimatePresence>
              {showFilterPopover && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-11 z-30 w-80 sm:w-96 rounded-2xl bg-white p-4 shadow-xl border border-neutral-200/80 space-y-3"
                >
                  <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-neutral-700" />
                      <h4 className="text-xs font-bold text-neutral-900 tracking-tight">
                        Filter by Categories
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowFilterPopover(false)}
                      className="text-neutral-400 hover:text-neutral-700 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Popover Search Bar */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 z-10 pointer-events-none" />
                    <input
                      type="text"
                      value={filterCategorySearch}
                      onChange={(e) => setFilterCategorySearch(e.target.value)}
                      placeholder="Search 58 categories..."
                      className="input-modern input-search text-xs py-1.5"
                    />
                  </div>

                  {/* Popover Category Options Grid */}
                  <div className="max-h-60 overflow-y-auto p-2 rounded-2xl bg-neutral-50 border border-neutral-100 grid grid-cols-2 gap-1.5 custom-scrollbar">
                    {filteredFunnelCategories.map((cat) => {
                      const isSelected = selectedFilterCategories.includes(cat);
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => toggleFilterCategory(cat)}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer text-left ${
                            isSelected ? "bg-neutral-900 text-white font-semibold shadow-xs"
                              : "bg-white text-neutral-700 hover:bg-neutral-100 border border-neutral-200/60"
                          }`}
                        >
                          <span className="truncate">{cat}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 flex-shrink-0 ml-1" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Popover Footer Actions */}
                  <div className="flex items-center justify-between border-t border-neutral-100 pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFilterCategories([]);
                        setFilterCategorySearch("");
                      }}
                      className="text-xs font-semibold text-neutral-500 hover:text-rose-600 transition"
                    >
                      Clear All Filters
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowFilterPopover(false)}
                      className="rounded-xl bg-neutral-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-neutral-800 transition cursor-pointer shadow-xs"
                    >
                      Apply Filter
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Selected Category Filter Chips Bar */}
        {selectedFilterCategories.length > 0 && (
          <div className="flex items-center flex-wrap gap-1.5 pt-2 border-t border-neutral-100">
            <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider mr-1">
              Active Category Filters:
            </span>
            {selectedFilterCategories.map((cat) => (
              <span
                key={cat}
                className="inline-flex items-center gap-1 bg-neutral-100 text-neutral-800 border border-neutral-300 text-xs font-semibold px-2.5 py-0.5 rounded-full"
              >
                {cat}
                <button
                  type="button"
                  onClick={() => toggleFilterCategory(cat)}
                  className="hover:text-rose-300 transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
            <button
              onClick={() => setSelectedFilterCategories([])}
              className="text-xs font-bold text-neutral-500 hover:text-neutral-900 underline ml-2 cursor-pointer"
            >
              Reset
            </button>
          </div>
        )}
      </motion.div>

      {/* Add / Edit Treatment Form Modal */}
      <Modal
        isOpen={showTreatmentForm}
        onClose={() => setShowTreatmentForm(false)}
        title={editId ? "Edit Treatment Product" : "Create New Treatment Product"}
        subtitle="Treatment Product Builder"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleSaveTreatment} className="space-y-6">

            {/* Multi-Category Selector Section */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-xs font-semibold text-neutral-700">
                  Select Standard Categories <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] font-medium text-neutral-400">
                  {selectedCategories.length} selected (Can belong to multiple categories)
                </span>
              </div>

              {/* Selected Categories Chips */}
              {selectedCategories.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-2 rounded-2xl bg-neutral-50 border border-neutral-200/80 mb-2">
                  {selectedCategories.map((cat) => (
                    <span
                      key={cat}
                      className="inline-flex items-center gap-1.5 bg-neutral-100 text-neutral-800 border border-neutral-300 text-xs font-semibold px-2.5 py-1 rounded-full"
                    >
                      {cat}
                      <button
                        type="button"
                        onClick={() => toggleCategorySelection(cat)}
                        className="hover:text-rose-300 transition"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Category Search Filter Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400 z-10 pointer-events-none" />
                <input
                  type="text"
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  placeholder="Search standard categories (e.g. Face, Lips, Wrinkles)..."
                  className="input-modern input-search text-xs py-2"
                />
              </div>

              {/* Category Selector Grid */}
              <div className="max-h-48 overflow-y-auto p-3 rounded-2xl bg-neutral-50/70 border border-neutral-100 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 custom-scrollbar">
                {filteredCategoryOptions.map((cat) => {
                  const isSelected = selectedCategories.includes(cat);
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategorySelection(cat)}
                      className={`flex items-center justify-between px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer text-left border ${
                        isSelected ? "bg-neutral-900 text-white border-neutral-900 shadow-xs"
                          : "bg-white text-neutral-700 border-neutral-200 hover:border-neutral-400"
                      }`}
                    >
                      <span className="truncate">{cat}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 flex-shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
              {selectedCategories.length === 0 && (
                <p className="text-xs text-amber-600 font-medium mt-1">
                  ⚠️ Please select at least one treatment category.
                </p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    Treatment Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Botox Cosmetic Full Face"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="input-modern"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Description</label>
                  <textarea
                    rows={3}
                    placeholder="Brief description of the service..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="textarea-modern"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Features Header</label>
                  <input
                    type="text"
                    placeholder="e.g. Key Benefits"
                    value={featuresHeading}
                    onChange={(e) => setFeaturesHeading(e.target.value)}
                    className="input-modern"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    Features List (Comma separated)
                  </label>
                  <input
                    type="text"
                    placeholder="Reduces wrinkles, Smooths skin, Fast recovery"
                    value={featuresListInput}
                    onChange={(e) => setFeaturesListInput(e.target.value)}
                    className="input-modern"
                  />
                </div>

                {/* Session Duration & Buffer Settings */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-neutral-50/80 rounded-2xl border border-neutral-100">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-neutral-700" />
                      <span>Duration (Mins) <span className="text-rose-500">*</span></span>
                    </label>
                    <input
                      type="number"
                      min="5"
                      step="5"
                      required
                      placeholder="e.g. 30"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(e.target.value)}
                      className="input-modern bg-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Buffer Prep (Mins)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="5"
                      placeholder="e.g. 15"
                      value={bufferMinutes}
                      onChange={(e) => setBufferMinutes(e.target.value)}
                      className="input-modern bg-white text-xs"
                    />
                  </div>
                </div>

                {/* Individual Treatment External Booking Link (Only shown for External SDK Clinics) */}
                {isExternalSdkClinic && (
                  <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-200/80 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                        <LinkIcon className="w-4 h-4 text-amber-600" />
                        <span>Individual Treatment Booking Link</span>
                        <span className="text-[10px] font-normal text-neutral-400">(Optional)</span>
                      </label>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                        External Booking Active
                      </span>
                    </div>

                    <input
                      type="url"
                      placeholder="https://fresha.com/a/... or https://phorest.com/..."
                      value={externalBookingUrl}
                      onChange={(e) => setExternalBookingUrl(e.target.value)}
                      className="input-modern bg-white text-xs font-mono font-medium focus:border-amber-500 focus:ring-amber-500/20"
                    />

                    {/* Note with (i) Info icon */}
                    <div className="flex items-start gap-2 text-[11px] text-amber-900/90 bg-white/90 p-3 rounded-xl border border-amber-200/70 ">
                      <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div className="leading-relaxed">
                        <strong className="font-bold">Info:</strong> Paste the direct booking URL for this specific treatment from your external software (e.g. Fresha, Phorest, Jane App). Upfront payment will be turned off for this service, and patients clicking <em>Book Now</em> will be directed to this URL.
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Product Banner Image</label>
                  <ImageUploader
                    file={bannerFile}
                    onChange={(f: File | null) => {
                      setBannerFile(f);
                      if (!f) setBannerUrl("");
                    }}
                    imageUrl={bannerUrl}
                    onClearImage={() => {
                      setBannerFile(null);
                      setBannerUrl("");
                    }}
                  />
                </div>

                {/* Treatment Pricing Types */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-neutral-700">Pricing Tier Variants</span>
                    <button
                      type="button"
                      onClick={handleAddTypeRow}
                      className="text-xs font-bold text-neutral-900 hover:underline cursor-pointer"
                    >
                      + Add Pricing Type
                    </button>
                  </div>

                  {/* Column Header Labels */}
                  <div className="grid grid-cols-3 gap-2 px-1 pt-1">
                    <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                      Variant Title / Area
                    </span>
                    <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                      Standard Price (€)
                    </span>
                    <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                      Member Price (€)
                    </span>
                  </div>

                  {types.map((type, idx) => (
                    <div key={idx} className="grid grid-cols-3 gap-2 border-b border-neutral-100 pb-2">
                      <input
                        type="text"
                        placeholder="Variant Title (e.g. Full Face)"
                        value={type.title}
                        onChange={(e) => handleTypeRowChange(idx, "title", e.target.value)}
                        className="input-modern text-xs px-3 py-1.5"
                      />
                      <input
                        type="number"
                        placeholder="Non-Member Price"
                        value={type.nonMemberPrice}
                        onChange={(e) => handleTypeRowChange(idx, "nonMemberPrice", e.target.value)}
                        className="input-modern text-xs px-3 py-1.5"
                      />
                      <input
                        type="number"
                        placeholder="Member-Only Price"
                        value={type.memberPrice}
                        onChange={(e) => handleTypeRowChange(idx, "memberPrice", e.target.value)}
                        className="input-modern text-xs px-3 py-1.5"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3 border-t border-neutral-100 mt-4">
              <button
                type="button"
                onClick={() => setShowTreatmentForm(false)}
                className="rounded-full border border-neutral-200 bg-white px-5 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving || selectedCategories.length === 0}
                className="btn-primary px-6 py-2.5 text-xs font-bold transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSaving ? (
                  <>
                    <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    {editId ? "Updating Product..." : "Saving Product..."}
                  </>
                ) : editId ? (
                  "Update Treatment Product"
                ) : (
                  "Save Treatment Product"
                )}
              </button>
            </div>
          </form>
        </Modal>

      {/* Treatments Display Grid with Card-in-Card Architecture */}
      {loading ? (
        <CardGridSkeleton count={3} />
      ) : filteredTreatments.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white border border-neutral-200/80 text-sm font-medium text-neutral-400">
          No treatment products found matching your filter criteria.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 items-start">
          {filteredTreatments.map((t, idx) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: idx * 0.03 }}
              className={`rounded-3xl bg-white p-2 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group select-none ${
                t.isActive === false ? "opacity-75" : ""
              }`}
            >
              {/* Inner Card (Holds all visual & contextual content, soft tinted surface without strokes) */}
              <div
                onClick={() => handleEditClick(t)}
                className="rounded-[1.125rem] overflow-hidden bg-[#f4f5f8] flex-1 flex flex-col justify-between cursor-pointer transition-colors hover:bg-[#edf0f4]"
              >
                {/* Treatment Banner */}
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-neutral-200">
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                    style={{ backgroundImage: `url(${t.bannerUrl || ""})` }}
                  />

                  {/* Subtle bottom shadow vignette */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />

                  {/* Categories Badge on Banner */}
                  <div className="absolute top-2.5 right-2.5 flex flex-wrap gap-1 max-w-[80%] justify-end">
                    {(t.categories || []).slice(0, 2).map((cat) => (
                      <span
                        key={cat}
                        className="bg-white/95 backdrop-blur-md text-neutral-800 text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-2xs"
                      >
                        {cat}
                      </span>
                    ))}
                    {(t.categories || []).length > 2 && (
                      <span className="bg-white/95 backdrop-blur-md text-neutral-800 text-[10px] font-semibold px-1.5 py-0.5 rounded-md shadow-2xs">
                        +{(t.categories || []).length - 2}
                      </span>
                    )}
                  </div>

                  {t.isActive === false && (
                    <div className="absolute top-2.5 left-2.5">
                      <span className="bg-white/95 backdrop-blur-md text-rose-600 text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-2xs">
                        Inactive
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-3.5 flex flex-col space-y-3">
                  <div className="space-y-2">
                    {/* Title & Duration */}
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-bold text-neutral-900 tracking-tight leading-snug line-clamp-1 group-hover:text-neutral-950" title={t.title}>
                        {t.title || "Untitled"}
                      </h4>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-500 bg-white px-2 py-0.5 rounded-md shrink-0 shadow-2xs">
                        <Clock className="w-3 h-3 text-neutral-400" /> {t.durationMinutes || 30}m
                      </span>
                    </div>

                    {/* Description */}
                    {t.description && (
                      <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed">
                        {t.description}
                      </p>
                    )}

                    {/* Features / Benefits - Clean white floating pill */}
                    {t.features && t.features.length > 0 && (
                      <div className="flex items-center gap-1.5 text-[11px] text-neutral-600 truncate bg-white px-2.5 py-1.5 rounded-lg shadow-2xs">
                        <Sparkles className="w-3 h-3 text-neutral-900 shrink-0" />
                        <span className="truncate">{t.features.join(" • ")}</span>
                      </div>
                    )}

                    {isExternalSdkClinic && t.externalBookingUrl && (
                      <div className="text-[11px] font-mono text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/70 flex items-center gap-1.5 truncate">
                        <LinkIcon className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span className="truncate">{t.externalBookingUrl}</span>
                      </div>
                    )}
                  </div>

                  {/* Pricing Row */}
                  {(() => {
                    const validTypes = t.types || [];
                    const memberPrices = validTypes.map((tp) => Number(tp.memberPrice || 0)).filter((p) => p > 0);
                    const nonMemberPrices = validTypes.map((tp) => Number(tp.nonMemberPrice || 0)).filter((p) => p > 0);
                    const minMember = memberPrices.length ? Math.min(...memberPrices) : 0;
                    const minNonMember = nonMemberPrices.length ? Math.min(...nonMemberPrices) : 0;
                    const isExpanded = !!expandedCardIds[t.id];

                    return (
                      <div className="pt-2 border-t border-neutral-200/50">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block">
                              {validTypes.length > 1 ? "Starting From" : "Pricing"}
                            </span>
                            <div className="flex items-baseline gap-1.5 mt-0.5">
                              {minMember > 0 ? (
                                <>
                                  <span className="text-sm font-bold text-neutral-900 tracking-tight">
                                    €{minMember}
                                  </span>
                                  <span className="text-[10px] font-bold text-emerald-700 bg-white shadow-2xs px-1.5 py-0.5 rounded-md">
                                    Member
                                  </span>
                                  {minNonMember > minMember && (
                                    <span className="text-xs text-neutral-400 line-through">
                                      €{minNonMember}
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="text-sm font-bold text-neutral-900 tracking-tight">
                                  €{minNonMember || 0}
                                </span>
                              )}
                            </div>
                          </div>

                          {validTypes.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpandCard(t.id);
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-600 hover:text-neutral-900 bg-white hover:bg-neutral-50 px-2 py-1 rounded-md transition cursor-pointer shadow-2xs"
                            >
                              <span>{validTypes.length} Tiers</span>
                              <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                            </button>
                          )}
                        </div>

                        {/* Collapsible Tiers Breakdown */}
                        <AnimatePresence initial={false}>
                          {isExpanded && validTypes.length > 1 && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.2, ease: "easeInOut" }}
                              className="overflow-hidden"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="mt-2 pt-2 border-t border-neutral-200/50 space-y-1 max-h-36 overflow-y-auto custom-scrollbar">
                                {validTypes.map((type, tIdx) => (
                                  <div key={tIdx} className="flex justify-between items-center py-0.5 text-xs text-neutral-700">
                                    <span className="truncate pr-2 font-medium text-[11px] text-neutral-600">{type.title || "Standard"}</span>
                                    <div className="flex items-baseline gap-1.5 shrink-0">
                                      {type.memberPrice ? (
                                        <>
                                          <span className="line-through text-neutral-400 text-[10px]">€{type.nonMemberPrice}</span>
                                          <span className="font-semibold text-neutral-900 text-[11px]">€{type.memberPrice}</span>
                                        </>
                                      ) : (
                                        <span className="font-semibold text-neutral-900 text-[11px]">€{type.nonMemberPrice}</span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Outside Inner Card at Bottom (Holds active toggle, edit, delete) */}
              <div
                className="px-2 pt-2.5 pb-1 flex items-center justify-between gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Active Toggle Switch */}
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={t.isActive !== false}
                    onChange={() => handleToggleActive(t)}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4.5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-neutral-200 after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-600"></div>
                  <span className="ml-1.5 text-[11px] font-medium text-neutral-500">
                    {t.isActive !== false ? "Active" : "Inactive"}
                  </span>
                </label>

                {/* Unified Action Buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleEditClick(t)}
                    className="btn-card-edit"
                    title="Edit Treatment"
                  >
                    <Edit2 className="w-3 h-3 text-neutral-500" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(t)}
                    className="btn-card-delete"
                    title="Delete Treatment"
                  >
                    <Trash2 className="w-3 h-3 text-rose-500" />
                    <span>Delete</span>
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
        title="Delete Treatment"
        description="This treatment will be permanently removed from your clinic. Clients will no longer see it in the app."
        itemName={deleteTarget?.title}
      />
    </div>
  );
}
