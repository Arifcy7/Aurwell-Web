"use client";

import { useEffect, useState } from "react";
import { collection, query, getDocs, doc, getDoc, addDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";
import ImageUploader from "@/components/ImageUploader";
import { uploadImageFile, deleteImageFile } from "@/lib/firebase/upload";

interface TreatmentType {
  title: string;
  nonMemberPrice: number;
  memberPrice?: number | null;
}

interface Treatment {
  id: string;
  categoryId: string;
  title: string;
  description: string;
  bannerUrl: string;
  featuresHeading: string;
  features: string[];
  types: TreatmentType[];
  isActive?: boolean;
}

interface Category {
  id: string;
  name: string;
}

export default function TreatmentsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [clinicId, setClinicId] = useState("");

  // Category Creation Form State
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  // Treatment Creation Form State
  const [showTreatmentForm, setShowTreatmentForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [originalBannerUrl, setOriginalBannerUrl] = useState("");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [featuresHeading, setFeaturesHeading] = useState("Key Benefits");
  const [featuresListInput, setFeaturesListInput] = useState(""); // Comma separated benefits

  // Treatment Types State (multiple types)
  const [types, setTypes] = useState<any[]>([
    { title: "Standard", nonMemberPrice: "", memberPrice: "" },
  ]);

  const loadData = async (cId: string) => {
    try {
      // Fetch categories
      const catSnapshot = await getDocs(collection(db, "clinics", cId, "categories"));
      const loadedCategories: Category[] = [];
      catSnapshot.forEach((d) => {
        loadedCategories.push({ id: d.id, ...d.data() } as Category);
      });
      setCategories(loadedCategories);
      if (loadedCategories.length > 0) {
        setSelectedCategoryId(loadedCategories[0].id);
      }

      // Fetch treatments
      const treatSnapshot = await getDocs(collection(db, "clinics", cId, "treatments"));
      const loadedTreatments: Treatment[] = [];
      treatSnapshot.forEach((d) => {
        const data = d.data();
        const typesMapped = (data.types || []).map((t: any) => ({
          title: t.title || "Standard",
          nonMemberPrice: t.nonMemberPrice !== undefined ? t.nonMemberPrice : (t.originalPrice || 0),
          memberPrice: t.memberPrice !== undefined ? t.memberPrice : (t.discountedPrice !== undefined ? t.discountedPrice : null),
        }));
        loadedTreatments.push({
          id: d.id,
          isActive: data.isActive !== false,
          ...data,
          types: typesMapped,
        } as Treatment);
      });
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

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName || !clinicId) return;

    setLoading(true);
    try {
      const docRef = await addDoc(collection(db, "clinics", clinicId, "categories"), {
        name: newCategoryName,
      });

      const newCat = { id: docRef.id, name: newCategoryName };
      setCategories((prev) => [...prev, newCat]);
      setSelectedCategoryId(docRef.id);
      setNewCategoryName("");
      setShowCategoryForm(false);
    } catch (err) {
      console.error("Error creating category:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTypeRow = () => {
    setTypes((prev) => [...prev, { title: "", nonMemberPrice: "", memberPrice: "" }]);
  };

  const handleTypeRowChange = (index: number, field: keyof TreatmentType, value: string) => {
    setTypes((prev) =>
      prev.map((t, idx) => (idx === index ? { ...t, [field]: value } : t))
    );
  };

  const handleSaveTreatment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !selectedCategoryId || !clinicId) return;

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
        categoryId: selectedCategoryId,
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
      } else {
        // Create new treatment
        const fullData = { ...treatmentData, isActive: true, createdAt: serverTimestamp() };
        const docRef = await addDoc(
          collection(db, "clinics", clinicId, "treatments"),
          fullData
        );
        setTreatments((prev) => [{ id: docRef.id, ...fullData } as any, ...prev]);
      }

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
    setSelectedCategoryId(treatment.categoryId);
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
    } catch (err) {
      console.error("Error toggling active state:", err);
    }
  };

  return (
    <div className="space-y-8">
      {/* Categories & Actions Controls */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Treatments Directory</h2>
          <p className="text-sm text-neutral-500">Configure catalog categories and services</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowCategoryForm(!showCategoryForm)}
            className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 shadow-sm transition"
          >
            {showCategoryForm ? "Close Category" : "Add Category"}
          </button>
          <button
            onClick={() => {
              setEditId(null);
              setTitle("");
              setDescription("");
              setBannerUrl("");
              setOriginalBannerUrl("");
              setBannerFile(null);
              setFeaturesHeading("Key Benefits");
              setFeaturesListInput("");
              setTypes([{ title: "Standard", nonMemberPrice: "", memberPrice: "" }]);
              setShowTreatmentForm(!showTreatmentForm);
            }}
            className="rounded-md bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 shadow-sm transition"
          >
            {showTreatmentForm ? "Cancel" : "Add Treatment"}
          </button>
        </div>
      </div>

      {/* Category Creation Form */}
      {showCategoryForm && (
        <form
          onSubmit={handleCreateCategory}
          className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4 w-full"
        >
          <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500">New Category</h3>
          <div>
            <label className="block text-sm font-medium text-neutral-700">Category Name</label>
            <input
              type="text"
              required
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-black shadow-sm placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
              placeholder="e.g. Skin Peels"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 transition"
          >
            Save Category
          </button>
        </form>
      )}

      {/* Treatment Creation Form */}
      {showTreatmentForm && (
        <form
          onSubmit={handleSaveTreatment}
          className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm space-y-6 w-full"
        >
          <h3 className="text-md font-bold tracking-tight">
            {editId ? "Edit Treatment Details" : "New Treatment Details"}
          </h3>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700">Category</label>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-black shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700">Treatment Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-black shadow-sm placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
                  placeholder="e.g. Microneedling Therapy"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700">Description</label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-black shadow-sm placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
                  placeholder="Provide treatment info..."
                />
              </div>

              <ImageUploader
                file={bannerFile}
                onChange={setBannerFile}
                imageUrl={bannerUrl}
                onClearImage={() => setBannerUrl("")}
                label="Banner Image"
              />
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700">Features Heading</label>
                <input
                  type="text"
                  value={featuresHeading}
                  onChange={(e) => setFeaturesHeading(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-black shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-700">
                  Features List <span className="text-xs text-neutral-400">(comma-separated)</span>
                </label>
                <input
                  type="text"
                  value={featuresListInput}
                  onChange={(e) => setFeaturesListInput(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-black shadow-sm placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
                  placeholder="e.g. Deep cleansing, collagen booster"
                />
              </div>

              {/* Treatment Types list */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-neutral-700">Treatment Pricing Types</span>
                  <button
                    type="button"
                    onClick={handleAddTypeRow}
                    className="text-xs font-semibold text-black hover:underline"
                  >
                    + Add Type
                  </button>
                </div>

                {types.map((type, idx) => (
                  <div key={idx} className="grid grid-cols-3 gap-2 border-b border-neutral-100 pb-2">
                    <input
                      type="text"
                      placeholder="Type (e.g. Full Face)"
                      value={type.title}
                      onChange={(e) => handleTypeRowChange(idx, "title", e.target.value)}
                      className="rounded border border-neutral-300 px-2 py-1 text-xs bg-white text-black"
                    />
                    <input
                      type="number"
                      placeholder="Non-Member Price"
                      value={type.nonMemberPrice}
                      onChange={(e) => handleTypeRowChange(idx, "nonMemberPrice", e.target.value)}
                      className="rounded border border-neutral-300 px-2 py-1 text-xs bg-white text-black"
                    />
                    <input
                      type="number"
                      placeholder="Member-Only Price"
                      value={type.memberPrice}
                      onChange={(e) => handleTypeRowChange(idx, "memberPrice", e.target.value)}
                      className="rounded border border-neutral-300 px-2 py-1 text-xs bg-white text-black"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full rounded-md bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 transition disabled:bg-neutral-300 disabled:text-neutral-500 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {editId ? "Updating Treatment..." : "Saving Treatment..."}
              </>
            ) : (
              editId ? "Update Treatment Product" : "Save Treatment Product"
            )}
          </button>
        </form>
      )}

      {/* Treatments Display grouped by Category */}
      <div className="space-y-8">
        {categories.map((cat) => {
          const catTreatments = treatments.filter((t) => t.categoryId === cat.id);
          return (
            <div key={cat.id} className="space-y-4">
              <h3 className="text-md font-bold tracking-tight border-b border-neutral-200 pb-2 text-neutral-900">
                {cat.name}
              </h3>
              {catTreatments.length === 0 ? (
                <p className="text-sm text-neutral-400">No treatments added to this category yet.</p>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  {catTreatments.map((t) => (
                    <div
                      key={t.id}
                      className={`overflow-hidden rounded-xl border bg-white shadow-sm flex flex-col justify-between transition ${
                        t.isActive === false ? "border-neutral-200 opacity-60" : "border-neutral-200"
                      }`}
                    >
                      {/* Treatment Banner */}
                      <div
                        className="h-48 bg-cover bg-center"
                        style={{ backgroundImage: `url(${t.bannerUrl})` }}
                      />

                      <div className="p-6 flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="text-lg font-bold tracking-tight mb-2">{t.title}</h4>
                          <p className="text-sm text-neutral-500 mb-4">{t.description}</p>

                          <div className="space-y-2 mb-4">
                            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block">
                              {t.featuresHeading}
                            </span>
                            <ul className="space-y-1 text-xs text-neutral-600">
                              {t.features.map((f, i) => (
                                <li key={i} className="flex items-center gap-2">
                                  <span className="h-1 w-1 bg-black rounded-full" />
                                  {f}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {/* Types & Pricing Display */}
                        <div className="border-t border-neutral-100 pt-4 space-y-4">
                          <div>
                            <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                              Pricing Tiers
                            </span>
                            <div className="space-y-1">
                              {t.types.map((type, idx) => (
                                <div key={idx} className="flex justify-between text-xs text-neutral-700">
                                  <span>{type.title}</span>
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

                          <div className="border-t border-neutral-100 pt-4 flex items-center justify-between">
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

                            {/* Edit button */}
                            <button
                              onClick={() => handleEditClick(t)}
                              className="rounded border border-neutral-300 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition"
                            >
                              Edit
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
