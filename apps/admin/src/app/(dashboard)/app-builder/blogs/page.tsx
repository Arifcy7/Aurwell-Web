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
import { fetchWithVersionCache, incrementCollectionVersion, updateLocalCache } from "@/lib/firebase/versionCache";
import ImageUploader from "@/components/ImageUploader";
import { uploadImageFile, deleteImageFile } from "@/lib/firebase/upload";
import { CardGridSkeleton } from "@/components/Loader";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import Modal from "@/components/Modal";
import { motion, AnimatePresence } from "framer-motion";
import { Edit2, Trash2, ExternalLink, BookOpen } from "lucide-react";

interface Blog {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  articleUrl: string;
  isActive?: boolean;
}

export default function BlogsPage() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingTitle, setSavingTitle] = useState(false);
  const [clinicId, setClinicId] = useState("");

  // App Section Settings
  const [blogSectionTitle, setBlogSectionTitle] = useState("Blogs");
  const [titleSuccessMsg, setTitleSuccessMsg] = useState("");

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [originalImageUrl, setOriginalImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [articleUrl, setArticleUrl] = useState("");

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<Blog | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async (cId: string) => {
    try {
      // 1. Fetch clinic config to get custom section title
      const clinicDoc = await getDoc(doc(db, "clinics", cId));
      if (clinicDoc.exists()) {
        setBlogSectionTitle(clinicDoc.data().blogSectionTitle || "Blogs");
      }

      // 2. Fetch blogs with Version Cache
      const loadedBlogs = await fetchWithVersionCache<Blog>(
        cId,
        "blogs",
        async () => {
          const q = query(
            collection(db, "clinics", cId, "blogs"),
            orderBy("createdAt", "desc")
          );
          const snapshot = await getDocs(q);
          const list: Blog[] = [];
          snapshot.forEach((d) => {
            const data = d.data();
            list.push({
              id: d.id,
              isActive: data.isActive !== false,
              title: data.title || "",
              description: data.description || "",
              imageUrl: data.imageUrl || "",
              articleUrl: data.articleUrl || "",
            });
          });
          return list;
        }
      );
      setBlogs(loadedBlogs);
    } catch (err) {
      console.error("Error loading blogs page data:", err);
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

  const handleSaveSectionTitle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicId) return;

    setSavingTitle(true);
    setTitleSuccessMsg("");

    try {
      await updateDoc(doc(db, "clinics", clinicId), {
        blogSectionTitle: blogSectionTitle.trim(),
      });
      setTitleSuccessMsg("Display title updated successfully in your mobile app!");
      setTimeout(() => setTitleSuccessMsg(""), 3000);
    } catch (err) {
      console.error("Error saving section title:", err);
    } finally {
      setSavingTitle(false);
    }
  };

  const handleSaveBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !clinicId) return;

    setIsSaving(true);
    try {
      let finalImageUrl = imageUrl;
      let shouldDeleteOriginal = false;

      if (imageFile) {
        finalImageUrl = await uploadImageFile(imageFile, "blogs");
        shouldDeleteOriginal = true;
      } else if (!imageUrl && originalImageUrl) {
        shouldDeleteOriginal = true;
      }

      const blogData = {
        title,
        description,
        imageUrl: finalImageUrl || "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800",
        articleUrl,
      };

      if (editId) {
        // Update existing blog
        await updateDoc(doc(db, "clinics", clinicId, "blogs", editId), blogData);
        setBlogs((prev) =>
          prev.map((b) => (b.id === editId ? { ...b, ...blogData } : b))
        );
        updateLocalCache<Blog>(clinicId, "blogs", (prev) =>
          prev.map((b) => (b.id === editId ? { ...b, ...blogData } : b))
        );
      } else {
        // Create new blog
        const fullData = { ...blogData, isActive: true, createdAt: serverTimestamp() };
        const docRef = await addDoc(collection(db, "clinics", clinicId, "blogs"), fullData);
        const newBlog = { id: docRef.id, ...fullData } as any;
        setBlogs((prev) => [newBlog, ...prev]);
        updateLocalCache<Blog>(clinicId, "blogs", (prev) => [newBlog, ...prev]);
      }

      await incrementCollectionVersion(clinicId, "blogs");

      if (shouldDeleteOriginal && originalImageUrl) {
        await deleteImageFile(originalImageUrl);
      }

      // Reset form
      setTitle("");
      setDescription("");
      setImageUrl("");
      setOriginalImageUrl("");
      setImageFile(null);
      setArticleUrl("");
      setEditId(null);
      setShowForm(false);
    } catch (err) {
      console.error("Error saving blog article:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditClick = (blog: Blog) => {
    setEditId(blog.id);
    setTitle(blog.title);
    setDescription(blog.description);
    setImageUrl(blog.imageUrl);
    setOriginalImageUrl(blog.imageUrl);
    setImageFile(null);
    setArticleUrl(blog.articleUrl);
    setShowForm(true);
  };

  const handleToggleActive = async (blog: Blog) => {
    if (!clinicId) return;
    const newStatus = blog.isActive === false ? true : false;
    try {
      await updateDoc(doc(db, "clinics", clinicId, "blogs", blog.id), {
        isActive: newStatus,
      });
      setBlogs((prev) =>
        prev.map((b) => (b.id === blog.id ? { ...b, isActive: newStatus } : b))
      );
      updateLocalCache<Blog>(clinicId, "blogs", (prev) =>
        prev.map((b) => (b.id === blog.id ? { ...b, isActive: newStatus } : b))
      );
      await incrementCollectionVersion(clinicId, "blogs");
    } catch (err) {
      console.error("Error toggling active state:", err);
    }
  };

  const handleDeleteBlog = async () => {
    if (!deleteTarget || !clinicId) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.imageUrl) {
        await deleteImageFile(deleteTarget.imageUrl).catch(() => {});
      }
      await deleteDoc(doc(db, "clinics", clinicId, "blogs", deleteTarget.id));
      setBlogs((prev) => prev.filter((b) => b.id !== deleteTarget.id));
      updateLocalCache<Blog>(clinicId, "blogs", (prev) =>
        prev.filter((b) => b.id !== deleteTarget.id)
      );
      await incrementCollectionVersion(clinicId, "blogs");
      setDeleteTarget(null);
    } catch (err) {
      console.error("Error deleting blog article:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-neutral-900">Blog & Educational Articles</h2>
          <p className="text-xs text-neutral-500 mt-0.5">Share skincare education, post-op guidance, and clinic news with your app patients.</p>
        </div>
        <button
          onClick={() => {
            setEditId(null);
            setTitle("");
            setDescription("");
            setImageUrl("");
            setOriginalImageUrl("");
            setImageFile(null);
            setArticleUrl("");
            setShowForm(true);
          }}
          className="btn-primary px-4 py-2 text-xs font-semibold self-start cursor-pointer shadow-xs"
        >
          Create Blog Article
        </button>
      </div>

      {/* Customize Mobile Tab Label Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-neutral-200/80 bg-white p-5 space-y-4 shadow-xs"
      >
        <div>
          <h3 className="text-sm font-bold text-neutral-900">Customize Mobile Tab Label</h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            Rename how this educational section appears to patients in your mobile app navigation (e.g. &quot;Articles&quot;, &quot;Skincare Tips&quot;, &quot;Clinic Journal&quot;).
          </p>
        </div>

        <form onSubmit={handleSaveSectionTitle} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
          <div className="flex-1 max-w-sm">
            <label className="block text-xs font-semibold text-neutral-700 mb-1">Mobile Tab Display Title</label>
            <input
              type="text"
              required
              value={blogSectionTitle}
              onChange={(e) => setBlogSectionTitle(e.target.value)}
              className="input-modern"
              placeholder="e.g. Educate Yourself"
            />
          </div>
          <button
            type="submit"
            disabled={savingTitle}
            className="btn-primary px-4 py-2 text-xs font-semibold h-9 min-w-[100px] flex items-center justify-center cursor-pointer shadow-xs disabled:opacity-50"
          >
            {savingTitle ? "Saving..." : "Save Label"}
          </button>
        </form>

        {titleSuccessMsg && (
          <div className="max-w-lg rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs text-emerald-800 font-medium">
            {titleSuccessMsg}
          </div>
        )}
      </motion.div>

      {/* New / Edit Blog Article Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editId ? "Edit Blog Article" : "Create New Blog Article"}
        subtitle="Blogs & Articles"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSaveBlog} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Article Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-modern"
              placeholder="e.g. The Science of Hydrafacials"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Brief Description</label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="textarea-modern text-xs"
              placeholder="Write a short summary to hook patients..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Full Article Link</label>
            <input
              type="url"
              required
              value={articleUrl}
              onChange={(e) => setArticleUrl(e.target.value)}
              className="input-modern text-xs"
              placeholder="https://yourwebsite.com/blog/article-name"
            />
          </div>

          <div className="bg-neutral-50/60 border border-neutral-200/60 rounded-2xl p-3.5">
            <ImageUploader
              file={imageFile}
              onChange={setImageFile}
              imageUrl={imageUrl}
              onClearImage={() => setImageUrl("")}
              label="Article Cover Image"
              heightClass="aspect-[16/9] h-auto w-full"
            />
          </div>
          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-neutral-100">
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
              {isSaving ? "Saving..." : editId ? "Update Article" : "Save Article"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Blogs Listing Cards with Card-in-Card Architecture */}
      {loading ? (
        <CardGridSkeleton count={3} variant="blog" />
      ) : blogs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 p-12 text-center bg-white/50">
          <p className="text-sm text-neutral-500 font-medium mb-1">No articles created yet</p>
          <p className="text-xs text-neutral-400">Click &quot;Create Blog Article&quot; to add your first post.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 items-start">
          {blogs.map((b, idx) => (
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
                  {/* Thumbnail Header with Smooth Zoom */}
                  <div className="relative aspect-[16/9] w-full bg-neutral-200 overflow-hidden">
                    <div
                      className="w-full h-full bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                      style={{ backgroundImage: `url(${b.imageUrl})` }}
                    />
                    <div className="absolute top-2.5 right-2.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-md shadow-2xs ${
                          b.isActive !== false
                            ? "bg-white/95 text-emerald-700"
                            : "bg-white/95 text-neutral-500"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${b.isActive !== false ? "bg-emerald-500" : "bg-neutral-400"}`} />
                        {b.isActive !== false ? "Active" : "Draft"}
                      </span>
                    </div>
                  </div>

                  {/* Card Content Body */}
                  <div className="p-3.5 space-y-1.5">
                    <h3 className="text-sm font-bold text-neutral-900 line-clamp-1 group-hover:text-neutral-950">
                      {b.title}
                    </h3>
                    <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed">
                      {b.description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Outside Inner Card at Bottom (Holds active toggle, edit, delete) */}
              <div
                className="px-2 pt-2.5 pb-1 flex items-center justify-between gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Left: Active Toggle Switch */}
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

                {/* Right: Article link and Action buttons */}
                <div className="flex items-center gap-1.5">
                  {b.articleUrl && (
                    <a
                      href={b.articleUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition mr-0.5"
                      title="Read full article in new tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => handleEditClick(b)}
                    className="btn-card-edit"
                    title="Edit Blog Article"
                  >
                    <Edit2 className="w-3 h-3 text-neutral-500" />
                    <span>Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(b)}
                    className="btn-card-delete"
                    title="Delete Blog Article"
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
        onConfirm={handleDeleteBlog}
        isDeleting={isDeleting}
        title="Delete Blog Article"
        description="This article will be permanently removed from your clinic app. The banner image will also be deleted from storage."
        itemName={deleteTarget?.title}
      />
    </div>
  );
}
