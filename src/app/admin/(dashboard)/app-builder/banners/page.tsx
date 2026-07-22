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
import ImageUploader from "@/components/ImageUploader";
import { uploadImageFile, deleteImageFile } from "@/lib/firebase/upload";
import { CardGridSkeleton } from "@/components/Loader";
import { motion, AnimatePresence } from "framer-motion";

interface Treatment {
  id: string;
  title: string;
}

interface Banner {
  id: string;
  title: string;
  imageUrl: string;
  targetType: "treatment" | "link";
  targetId: string;
  isActive?: boolean;
}

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [clinicId, setClinicId] = useState("");

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [originalImageUrl, setOriginalImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [targetType, setTargetType] = useState<"treatment" | "link">("treatment");
  const [targetId, setTargetId] = useState("");

  const loadData = async (cId: string) => {
    try {
      // 1. Fetch treatments for dropdown selector
      const treatSnapshot = await getDocs(collection(db, "clinics", cId, "treatments"));
      const loadedTreatments: Treatment[] = [];
      treatSnapshot.forEach((d) => {
        loadedTreatments.push({ id: d.id, title: d.data().title } as Treatment);
      });
      setTreatments(loadedTreatments);
      if (loadedTreatments.length > 0) {
        setTargetId(loadedTreatments[0].id);
      }

      // 2. Fetch banners subcollection
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
          imageUrl: data.imageUrl || "",
          targetType: data.targetType || "treatment",
          targetId: data.targetId || "",
        });
      });
      setBanners(loadedBanners);
    } catch (err) {
      console.error("Error loading banners page data:", err);
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
    try {
      let finalImageUrl = imageUrl;
      let shouldDeleteOriginal = false;

      if (imageFile) {
        finalImageUrl = await uploadImageFile(imageFile, "banners");
        shouldDeleteOriginal = true;
      } else if (!imageUrl && originalImageUrl) {
        shouldDeleteOriginal = true;
      }

      const bannerData = {
        title,
        imageUrl: finalImageUrl || "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800",
        targetType,
        targetId,
      };

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

      if (shouldDeleteOriginal && originalImageUrl) {
        await deleteImageFile(originalImageUrl);
      }

      // Reset form
      setTitle("");
      setImageUrl("");
      setOriginalImageUrl("");
      setImageFile(null);
      setTargetType("treatment");
      if (treatments.length > 0) setTargetId(treatments[0].id);
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
    setImageUrl(banner.imageUrl);
    setOriginalImageUrl(banner.imageUrl);
    setImageFile(null);
    setTargetType(banner.targetType);
    setTargetId(banner.targetId);
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
      console.error("Error toggling active state:", err);
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

  return (
    <div className="space-y-8 w-full">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight">App Promotional Banners</h2>
          <p className="text-sm text-neutral-500">Configure visual carousel banners displayed at the top of your patient mobile app</p>
        </div>
        <button
          onClick={() => {
            setEditId(null);
            setTitle("");
            setImageUrl("");
            setOriginalImageUrl("");
            setImageFile(null);
            setTargetType("treatment");
            if (treatments.length > 0) setTargetId(treatments[0].id);
            setShowForm(!showForm);
          }}
          className="rounded-full bg-neutral-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-neutral-800 shadow-sm transition self-start cursor-pointer"
        >
          {showForm ? "Cancel" : "Add App Banner"}
        </button>
      </div>

      {/* New / Edit Banner Form */}
      <AnimatePresence>
        {showForm && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            onSubmit={handleSaveBanner}
            className="rounded-3xl border border-neutral-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-4 w-full overflow-hidden"
          >
            <h3 className="text-md font-bold tracking-tight">
              {editId ? "Edit App Banner" : "New App Banner"}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Banner Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input-modern"
                  placeholder="e.g. Summer Skincare Sale"
                />
              </div>

              <ImageUploader
                file={imageFile}
                onChange={setImageFile}
                imageUrl={imageUrl}
                onClearImage={() => setImageUrl("")}
                label="Banner Image (High Resolution Recommended)"
              />

              {/* Target Click Action Setup */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Banner Click Action</label>
                  <select
                    value={targetType}
                    onChange={(e) => setTargetType(e.target.value as any)}
                    className="select-modern"
                  >
                    <option value="treatment">Open Specific Treatment Product</option>
                    <option value="link">Open External URL / Website Link</option>
                  </select>
                </div>

                {targetType === "treatment" ? (
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Target Treatment Product</label>
                    <select
                      value={targetId}
                      onChange={(e) => setTargetId(e.target.value)}
                      className="select-modern"
                    >
                      {treatments.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title}
                        </option>
                      ))}
                      {treatments.length === 0 && (
                        <option value="">No treatments available</option>
                      )}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Target External URL</label>
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
                className="rounded-full bg-neutral-900 px-6 py-2.5 text-xs font-bold text-white hover:bg-neutral-800 transition cursor-pointer"
              >
                {editId ? "Update Banner" : "Save Banner"}
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Banners Listing Cards with Simple Fade Animation */}
      {loading ? (
        <CardGridSkeleton count={2} />
      ) : banners.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-neutral-300 p-12 text-center bg-white/50">
          <p className="text-sm text-neutral-500 font-medium mb-1">No promotional banners added yet</p>
          <p className="text-xs text-neutral-400">Click "Add App Banner" to create your first visual carousel item.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {banners.map((b, idx) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: idx * 0.04 }}
              className={`overflow-hidden rounded-3xl border bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between transition-all hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)] ${
                b.isActive === false ? "border-neutral-200 opacity-60" : "border-neutral-100"
              }`}
            >
              <div
                className="h-48 bg-cover bg-center"
                style={{ backgroundImage: `url(${b.imageUrl})` }}
              />
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <h3 className="text-md font-bold text-neutral-900">{b.title}</h3>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Action: {b.targetType === "treatment" ? "Opens Treatment" : "External Link"}
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${b.isActive !== false
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-neutral-100 text-neutral-500 border border-neutral-200"
                      }`}
                  >
                    {b.isActive !== false ? "Live in App" : "Inactive"}
                  </span>
                </div>

                <div className="pt-3 border-t border-neutral-100 flex items-center justify-between">
                  {/* Status Toggle switch */}
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

                  {/* Actions */}
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
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
