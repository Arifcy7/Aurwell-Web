"use client";

import { useEffect, useState, useRef } from "react";
import { collection, query, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";
import { fetchWithVersionCache, incrementCollectionVersion, updateLocalCache } from "@/lib/firebase/versionCache";
import ImageUploader from "@/components/ImageUploader";
import { uploadImageFile, deleteImageFile } from "@/lib/firebase/upload";
import { CardGridSkeleton } from "@/components/Loader";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import Modal from "@/components/Modal";
import { TREATMENT_CATEGORIES } from "@/lib/constants";
import { Search, Tag, Check, X, Plus, Filter, ChevronDown, SlidersHorizontal, Trash2 } from "lucide-react";
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
  isActive?: boolean;
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

  // Form Reference for Auto-Scroll
  const formRef = useRef<HTMLFormElement>(null);

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
      const loadedTreatments = await fetchWithVersionCache<Treatment>(
        cId,
        "treatments",
        async () => {
          const treatSnapshot = await getDocs(collection(db, "clinics", cId, "treatments"));
          const list: Treatment[] = [];

          treatSnapshot.forEach((d) => {
            const data = d.data();
            const typesMapped = (data.types || []).map((t: any) => ({
              title: t.title || "Standard",
              nonMemberPrice: t.nonMemberPrice !== undefined ? t.nonMemberPrice : (t.originalPrice || 0),
              memberPrice: t.memberPrice !== undefined ? t.memberPrice : (t.discountedPrice !== undefined ? t.discountedPrice : null),
            }));

            // Backwards compatibility: Map legacy categoryId or categories array
            const catsMapped: string[] = Array.isArray(data.categories) && data.categories.length > 0
              ? data.categories
              : data.categoryId
              ? [data.categoryId]
              : ["Face"];

            list.push({
              id: d.id,
              ...data,
              categories: catsMapped,
              types: typesMapped,
            } as Treatment);
          });

          return list;
        }
      );

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

      const treatmentData = {
        categories: selectedCategories,
        title,
        description,
        bannerUrl: finalBannerUrl || "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600",
        featuresHeading,
        features: featuresListInput.split(",").map((f) => f.trim()).filter(Boolean),
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
    setTitle(treatment.title);
    setDescription(treatment.description);
    setBannerUrl(treatment.bannerUrl);
    setOriginalBannerUrl(treatment.bannerUrl);
    setBannerFile(null);
    setFeaturesHeading(treatment.featuresHeading);
    setFeaturesListInput(treatment.features.join(", "));
    setTypes(
      treatment.types.length > 0
        ? treatment.types.map((t) => ({
            title: t.title,
            nonMemberPrice: String(t.nonMemberPrice),
            memberPrice: t.memberPrice ? String(t.memberPrice) : "",
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
    const matchesSearch =
      !searchTerm.trim() ||
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.categories.some((c) => c.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory =
      selectedFilterCategories.length === 0 ||
      t.categories.some((c) => selectedFilterCategories.includes(c));

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
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Treatments Directory</h2>
          <p className="text-sm text-neutral-500">
            Configure clinic service products and assign standard treatment categories
          </p>
        </div>
        <div className="flex gap-3">
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
                setTypes([{ title: "Standard", nonMemberPrice: "", memberPrice: "" }]);
                setSelectedCategories([]);
                setShowTreatmentForm(true);
              }
            }}
            className="rounded-full bg-neutral-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-neutral-800 shadow-sm transition flex items-center gap-2 cursor-pointer"
          >
            {showTreatmentForm ? (
              <>
                <X className="w-4 h-4" /> Close Form
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" /> Add Treatment Product
              </>
            )}
          </button>
        </div>
      </div>

      {/* Directory Filter & Search Controls */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="rounded-3xl bg-white p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-100 space-y-3 relative"
      >
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 z-10 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search treatments by title or tag..."
              className="input-modern input-search text-xs py-2"
            />
          </div>

          {/* Category Funnel Filter Button */}
          <div className="relative w-full sm:w-auto">
            <button
              onClick={() => setShowFilterPopover(!showFilterPopover)}
              className={`w-full sm:w-auto px-4 py-2 rounded-full text-xs font-bold flex items-center justify-between sm:justify-start gap-2 border transition cursor-pointer shadow-sm ${
                selectedFilterCategories.length > 0
                  ? "bg-neutral-900 text-white border-neutral-900"
                  : "bg-neutral-50 text-neutral-800 border-neutral-200 hover:bg-neutral-100"
              }`}
            >
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-emerald-500" />
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
                  className="absolute right-0 top-12 z-30 w-80 sm:w-96 rounded-3xl bg-white p-5 shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-neutral-100 space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-neutral-700" />
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
                            isSelected
                              ? "bg-neutral-900 text-white font-semibold shadow-sm"
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
                      className="rounded-full bg-neutral-900 px-4 py-1.5 text-xs font-bold text-white hover:bg-neutral-800 transition cursor-pointer"
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
                className="inline-flex items-center gap-1 bg-neutral-900 text-white text-xs font-semibold px-2.5 py-0.5 rounded-full shadow-sm"
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
        maxWidth="max-w-6xl"
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
                      className="inline-flex items-center gap-1.5 bg-neutral-900 text-white text-xs font-semibold px-2.5 py-1 rounded-full shadow-sm"
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
                        isSelected
                          ? "bg-neutral-900 text-white border-neutral-900"
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
                className="rounded-full bg-neutral-900 px-6 py-2.5 text-xs font-bold text-white hover:bg-neutral-800 transition disabled:bg-neutral-300 disabled:text-neutral-500 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
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

      {/* Treatments Display Grid with Simple Fade Animation */}
      {loading ? (
        <CardGridSkeleton count={3} />
      ) : filteredTreatments.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-white border border-neutral-100 text-sm font-medium text-neutral-400">
          No treatment products found matching your filter criteria.
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTreatments.map((t, idx) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: idx * 0.04 }}
              className={`overflow-hidden rounded-3xl border bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between transition-all hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)] ${
                t.isActive === false ? "border-neutral-200 opacity-60" : "border-neutral-100"
              }`}
            >
              {/* Treatment Banner */}
              <div
                className="h-36 bg-cover bg-center relative"
                style={{ backgroundImage: `url(${t.bannerUrl})` }}
              >
                <div className="absolute top-3 right-3 flex flex-wrap gap-1 max-w-[80%] justify-end">
                  {t.categories.slice(0, 2).map((cat) => (
                    <span
                      key={cat}
                      className="bg-black/80 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm"
                    >
                      {cat}
                    </span>
                  ))}
                  {t.categories.length > 2 && (
                    <span className="bg-black/80 backdrop-blur-sm text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">
                      +{t.categories.length - 2}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <h4 className="text-base font-bold tracking-tight mb-1 text-neutral-900">{t.title}</h4>

                  {/* Multi-category Pills */}
                  <div className="flex flex-wrap gap-1 mb-2">
                    {t.categories.map((cat) => (
                      <span
                        key={cat}
                        className="bg-neutral-100 border border-neutral-200 text-neutral-700 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      >
                        {cat}
                      </span>
                    ))}
                  </div>

                  <p className="text-xs text-neutral-500 mb-3 line-clamp-2">{t.description}</p>

                  {t.features && t.features.length > 0 && (
                    <div className="space-y-1 mb-3">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                        {t.featuresHeading}
                      </span>
                      <ul className="space-y-0.5 text-xs text-neutral-600">
                        {t.features.slice(0, 3).map((f, i) => (
                          <li key={i} className="flex items-center gap-1.5">
                            <span className="h-1 w-1 bg-black rounded-full" />
                            <span className="truncate">{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Types & Pricing Display */}
                <div className="border-t border-neutral-100 pt-3 space-y-3">
                  <div>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                      Pricing Tiers
                    </span>
                    <div className="space-y-1">
                      {t.types.map((type, idx) => (
                        <div key={idx} className="flex justify-between text-xs text-neutral-700">
                          <span className="font-medium text-neutral-800">{type.title}</span>
                          <div className="space-x-1.5">
                            {type.memberPrice ? (
                              <>
                                <span className="line-through text-neutral-400">
                                  €{type.nonMemberPrice}
                                </span>
                                <span className="font-bold text-neutral-950">
                                  Member: €{type.memberPrice}
                                </span>
                              </>
                            ) : (
                              <span className="font-bold text-neutral-950">
                                €{type.nonMemberPrice}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-neutral-100 pt-3 flex items-center justify-between gap-2">
                    {/* Toggle switch */}
                    <div className="flex items-center gap-2">
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={t.isActive !== false}
                          onChange={() => handleToggleActive(t)}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-black"></div>
                        <span className="ml-2 text-xs font-medium text-neutral-500">
                          {t.isActive !== false ? "Active" : "Inactive"}
                        </span>
                      </label>
                    </div>

                    {/* Action Buttons (right) */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditClick(t)}
                        className="rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition cursor-pointer"
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
