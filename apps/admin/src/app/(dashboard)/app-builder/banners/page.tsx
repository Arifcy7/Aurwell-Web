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
import {
  fetchCanonicalTreatments,
  fetchWithVersionCache,
  incrementCollectionVersion,
  updateLocalCache,
} from "@/lib/firebase/versionCache";
import ImageUploader from "@/components/ImageUploader";
import { uploadImageFile, deleteImageFile } from "@/lib/firebase/upload";
import { CardGridSkeleton } from "@/components/Loader";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import Modal from "@/components/Modal";
import { motion, AnimatePresence } from "framer-motion";
import { Edit2, Trash2, ExternalLink, Sparkles, ChevronRight } from "lucide-react";

interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  targetType: "treatment" | "membership" | "custom_url";
  targetId: string;
  imageUrl: string;
  order?: number;
  isActive?: boolean;
}

interface Treatment {
  id: string;
  title: string;
}

export default function BannersPage() {
  const [clinicId, setClinicId] = useState("");
  const [banners, setBanners] = useState<Banner[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [targetType, setTargetType] = useState<"treatment" | "membership" | "custom_url">("treatment");
  const [targetId, setTargetId] = useState("");
  const [order, setOrder] = useState(0);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [originalImageUrl, setOriginalImageUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<Banner | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async (cId: string) => {
    try {
      // 1. Fetch treatments with canonical Version Cache
      const loadedTreatments = await fetchCanonicalTreatments(cId);
      setTreatments(loadedTreatments);
      if (loadedTreatments.length > 0) {
        setTargetId((prev) => prev || loadedTreatments[0].id);
      }

      // 2. Fetch banners with Version Cache
      const loadedBanners = await fetchWithVersionCache<Banner>(
        cId,
        "banners",
        async () => {
          const q = query(
            collection(db, "clinics", cId, "banners"),
            orderBy("createdAt", "desc")
          );
          const snapshot = await getDocs(q);
          const list: Banner[] = [];
          snapshot.forEach((d) => {
            const data = d.data();
            list.push({
              id: d.id,
              isActive: data.isActive !== false,
              title: data.title || "",
              subtitle: data.subtitle || "",
              imageUrl: data.imageUrl || "",
              targetType: data.targetType || "treatment",
              targetId: data.targetId || "",
              order: Number(data.order || 0),
            });
          });
          return list;
        }
      );
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

    setIsSaving(true);
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
        updateLocalCache<Banner>(clinicId, "banners", (prev) =>
          prev.map((b) => (b.id === editId ? { ...b, ...bannerData } : b))
        );
      } else {
        // Create new banner
        const fullData = { ...bannerData, isActive: true, createdAt: serverTimestamp() };
        const docRef = await addDoc(
          collection(db, "clinics", clinicId, "banners"),
          fullData
        );
        const newBanner = { id: docRef.id, ...fullData } as any;
        setBanners((prev) => [newBanner, ...prev]);
        updateLocalCache<Banner>(clinicId, "banners", (prev) => [newBanner, ...prev]);
      }

      await incrementCollectionVersion(clinicId, "banners");

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
      setIsSaving(false);
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
      updateLocalCache<Banner>(clinicId, "banners", (prev) =>
        prev.map((b) => (b.id === banner.id ? { ...b, isActive: newStatus } : b))
      );
      await incrementCollectionVersion(clinicId, "banners");
    } catch (err) {
      console.error("Error toggling active state:", err);
    }
  };

  const handleDeleteBanner = async () => {
    if (!deleteTarget || !clinicId) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.imageUrl) {
        await deleteImageFile(deleteTarget.imageUrl).catch(() => {});
      }
      await deleteDoc(doc(db, "clinics", clinicId, "banners", deleteTarget.id));
      setBanners((prev) => prev.filter((b) => b.id !== deleteTarget.id));
      updateLocalCache<Banner>(clinicId, "banners", (prev) =>
        prev.filter((b) => b.id !== deleteTarget.id)
      );
      await incrementCollectionVersion(clinicId, "banners");
      setDeleteTarget(null);
    } catch (err) {
      console.error("Error deleting banner:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-neutral-900">App Promotional Banners</h2>
          <p className="text-xs text-neutral-500 mt-0.5">Configure visual carousel banners displayed at the top of your patient mobile app.</p>
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
            setShowForm(true);
          }}
          className="btn-primary px-4 py-2 text-xs font-semibold self-start cursor-pointer shadow-xs"
        >
          Add App Banner
        </button>
      </div>

      {/* New / Edit Banner Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editId ? "Edit App Banner" : "Add App Banner"}
        subtitle="Promotional Banners"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSaveBanner} className="space-y-4">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Banner Click Action</label>
              <select
                value={targetType}
                onChange={(e) => setTargetType(e.target.value as any)}
                className="select-modern text-xs"
              >
                <option value="treatment">Open Treatment Product</option>
                <option value="link">Open External Link</option>
              </select>
            </div>

            {targetType === "treatment" ? (
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Target Treatment</label>
                <select
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  className="select-modern text-xs"
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
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Target URL</label>
                <input
                  type="url"
                  required
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  className="input-modern text-xs"
                  placeholder="https://example.com/promo"
                />
              </div>
            )}
          </div>

          <div className="bg-neutral-50/60 border border-neutral-200/60 rounded-2xl p-3.5">
            <ImageUploader
              file={imageFile}
              onChange={setImageFile}
              imageUrl={imageUrl}
              onClearImage={() => setImageUrl("")}
              label="Banner Image (16:9 Aspect Ratio)"
              heightClass="aspect-[16/9] h-auto w-full"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-neutral-100 mt-4">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="btn-primary px-5 py-2 text-xs font-semibold cursor-pointer shadow-xs disabled:opacity-50"
            >
              {isSaving ? "Saving..." : editId ? "Update Banner" : "Save Banner"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Banners Listing Cards with Card-in-Card Architecture */}
      {loading ? (
        <CardGridSkeleton count={3} variant="banner" />
      ) : banners.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 p-12 text-center bg-white/50">
          <p className="text-sm text-neutral-500 font-medium mb-1">No promotional banners added yet</p>
          <p className="text-xs text-neutral-400">Click &quot;Add App Banner&quot; to create your first visual carousel item.</p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 items-start">
          {banners.map((b, idx) => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: idx * 0.03 }}
              className={`rounded-3xl bg-white p-2 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group select-none ${
                b.isActive === false ? "opacity-75" : ""
              }`}
            >
              {/* Inner Card (Holds all visual & contextual content, soft tinted surface without strokes) */}
              <div
                onClick={() => handleEditClick(b)}
                className="rounded-[1.125rem] overflow-hidden bg-[#f4f5f8] flex-1 flex flex-col justify-between cursor-pointer transition-colors hover:bg-[#edf0f4]"
              >
                <div>
                  {/* 16:9 Image Preview with smooth zoom on hover */}
                  <div className="relative w-full aspect-[16/9] bg-neutral-200 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={b.imageUrl}
                      alt={b.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute top-2.5 right-2.5">
                      <span
                        className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-md shadow-2xs ${
                          b.isActive !== false
                            ? "bg-white/95 text-emerald-700"
                            : "bg-white/95 text-neutral-500"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${b.isActive !== false ? "bg-emerald-500" : "bg-neutral-400"}`} />
                        {b.isActive !== false ? "Live" : "Inactive"}
                      </span>
                    </div>
                  </div>

                  {/* Card Content Body */}
                  <div className="p-3.5 space-y-2">
                    <h3 className="text-sm font-bold text-neutral-900 leading-snug line-clamp-1 group-hover:text-neutral-950">
                      {b.title}
                    </h3>

                    <p className="text-xs text-neutral-500 font-medium flex items-center gap-1">
                      <span className="text-neutral-400">Action:</span>
                      <span className="text-neutral-700 font-semibold truncate">
                        {b.targetType === "treatment" ? "Opens Treatment Product" : "External Link"}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Outside Inner Card at Bottom (Holds active toggle, edit, delete) */}
              <div
                className="px-2 pt-2.5 pb-1 flex items-center justify-between gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Status Toggle switch */}
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={b.isActive !== false}
                    onChange={() => handleToggleActive(b)}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4.5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:border-neutral-200 after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-600"></div>
                  <span className="ml-2 text-xs font-medium text-neutral-700">
                    {b.isActive !== false ? "Active" : "Inactive"}
                  </span>
                </label>

                {/* Right-aligned Unified Action Buttons */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleEditClick(b)}
                    className="btn-card-edit"
                    title="Edit Banner"
                  >
                    <Edit2 className="w-3 h-3 text-neutral-500" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(b)}
                    className="btn-card-delete"
                    title="Delete Banner"
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
        onConfirm={handleDeleteBanner}
        isDeleting={isDeleting}
        title="Delete Banner"
        description="This banner will be permanently removed from the app carousel. The banner image will also be deleted from storage."
        itemName={deleteTarget?.title}
      />
    </div>
  );
}
