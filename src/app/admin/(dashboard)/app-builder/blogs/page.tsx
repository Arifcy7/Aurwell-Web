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

  const loadData = async (cId: string) => {
    try {
      // 1. Fetch clinic config to get custom section title
      const clinicDoc = await getDoc(doc(db, "clinics", cId));
      if (clinicDoc.exists()) {
        setBlogSectionTitle(clinicDoc.data().blogSectionTitle || "Blogs");
      }

      // 2. Fetch blogs subcollection
      const q = query(
        collection(db, "clinics", cId, "blogs"),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      const loadedBlogs: Blog[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        loadedBlogs.push({
          id: d.id,
          isActive: data.isActive !== false,
          title: data.title || "",
          description: data.description || "",
          imageUrl: data.imageUrl || "",
          articleUrl: data.articleUrl || "",
        });
      });
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
        blogSectionTitle,
      });
      setTitleSuccessMsg("Section title updated successfully!");
      setTimeout(() => setTitleSuccessMsg(""), 3000);
    } catch (err) {
      console.error("Error updating section title:", err);
    } finally {
      setSavingTitle(false);
    }
  };

  const handleSaveBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !clinicId) return;

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
        imageUrl: finalImageUrl || "https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=600",
        articleUrl,
      };

      if (editId) {
        // Update existing blog
        await updateDoc(doc(db, "clinics", clinicId, "blogs", editId), blogData);
        setBlogs((prev) =>
          prev.map((b) => (b.id === editId ? { ...b, ...blogData } : b))
        );
      } else {
        // Create new blog
        const fullData = { ...blogData, isActive: true, createdAt: serverTimestamp() };
        const docRef = await addDoc(
          collection(db, "clinics", clinicId, "blogs"),
          fullData
        );
        setBlogs((prev) => [{ id: docRef.id, ...fullData } as any, ...prev]);
      }

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
    } catch (err) {
      console.error("Error toggling active state:", err);
    }
  };

  const handleDeleteBlog = async (blogId: string) => {
    if (!clinicId) return;
    if (!confirm("Are you sure you want to delete this blog article? This action cannot be undone.")) return;

    setLoading(true);
    try {
      await deleteDoc(doc(db, "clinics", clinicId, "blogs", blogId));
      setBlogs((prev) => prev.filter((b) => b.id !== blogId));
    } catch (err) {
      console.error("Error deleting blog:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && blogs.length === 0) {
    return <div className="text-sm text-neutral-500">Loading blogs configurations...</div>;
  }

  return (
    <div className="space-y-8 w-full">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Blog & Article Management</h2>
          <p className="text-sm text-neutral-500">Add resources, guides, or informational articles for patient education</p>
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
            setShowForm(!showForm);
          }}
          className="rounded-md bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 shadow-sm transition self-start"
        >
          {showForm ? "Cancel" : "Create Blog Article"}
        </button>
      </div>

      {/* App Section Label Customizer */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold tracking-tight text-neutral-900">Custom Mobile App Tab Label</h3>
          <p className="text-xs text-neutral-500">Configure how the blog page displays in your patients' Android app (e.g. "Read Blogs", "Educate Yourself").</p>
        </div>

        <form onSubmit={handleSaveSectionTitle} className="flex flex-col sm:flex-row gap-3 items-end max-w-lg">
          <div className="flex-1 w-full">
            <label className="block text-xs font-semibold text-neutral-600 mb-1">Mobile Tab Display Title</label>
            <input
              type="text"
              required
              value={blogSectionTitle}
              onChange={(e) => setBlogSectionTitle(e.target.value)}
              className="block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-black shadow-sm placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black text-sm"
              placeholder="e.g. Educate Yourself"
            />
          </div>
          <button
            type="submit"
            disabled={savingTitle}
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 transition shadow-sm h-9 flex items-center justify-center min-w-[120px]"
          >
            {savingTitle ? "Saving..." : "Save Label"}
          </button>
        </form>

        {titleSuccessMsg && (
          <div className="max-w-lg rounded-md border border-green-200 bg-green-50 p-2.5 text-xs text-green-800">
            {titleSuccessMsg}
          </div>
        )}
      </div>

      {/* New / Edit Blog Form */}
      {showForm && (
        <form
          onSubmit={handleSaveBlog}
          className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4 w-full"
        >
          <h3 className="text-md font-bold tracking-tight">
            {editId ? "Edit Blog Article" : "New Blog Article"}
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-neutral-700">Article Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-black shadow-sm placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
                placeholder="e.g. The Science of Hydrafacials"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700">Brief Description</label>
              <textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-black shadow-sm placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
                placeholder="Write a short summary to hook patients..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ImageUploader
                file={imageFile}
                onChange={setImageFile}
                imageUrl={imageUrl}
                onClearImage={() => setImageUrl("")}
                label="Banner Image"
              />
              <div>
                <label className="block text-sm font-medium text-neutral-700">Full Article Link</label>
                <input
                  type="url"
                  required
                  value={articleUrl}
                  onChange={(e) => setArticleUrl(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-black shadow-sm placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
                  placeholder="https://yourwebsite.com/blog/article-name"
                />
              </div>
            </div>
          </div>
          <div className="pt-2 flex gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 rounded-md bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 transition disabled:bg-neutral-300 disabled:text-neutral-500 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {editId ? "Updating Article..." : "Saving Article..."}
                </>
              ) : (
                editId ? "Update Article" : "Save Article"
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Blogs Listing */}
      {blogs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 p-12 text-center">
          <p className="text-sm text-neutral-500 font-medium mb-1">No articles created yet</p>
          <p className="text-xs text-neutral-400">Click "Create Blog Article" to add your first post.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {blogs.map((b) => (
            <div
              key={b.id}
              className={`overflow-hidden rounded-xl border bg-white shadow-sm flex flex-col justify-between transition ${
                b.isActive === false ? "border-neutral-200 opacity-60" : "border-neutral-200"
              }`}
            >
              <div
                className="h-44 bg-cover bg-center"
                style={{ backgroundImage: `url(${b.imageUrl})` }}
              />
              <div className="p-6 space-y-4 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <h3 className="text-md font-bold text-neutral-900 line-clamp-1">{b.title}</h3>
                  <p className="text-xs text-neutral-500 line-clamp-3 leading-relaxed">{b.description}</p>
                </div>

                <div className="pt-3 border-t border-neutral-100 space-y-4">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-neutral-400 uppercase tracking-wider">
                      Article Reference
                    </span>
                    <a
                      href={b.articleUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-black font-semibold hover:underline flex items-center gap-0.5"
                    >
                      Read full article ↗
                    </a>
                  </div>

                  <div className="flex items-center justify-between">
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

                    {/* Edit & Delete Action buttons */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditClick(b)}
                        className="rounded border border-neutral-300 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteBlog(b.id)}
                        className="rounded border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
