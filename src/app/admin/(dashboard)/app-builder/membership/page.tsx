"use client";

import { useEffect, useState } from "react";
import { collection, query, getDocs, doc, getDoc, addDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";

interface Membership {
  id: string;
  title: string;
  description: string;
  price: number;
  bannerUrl: string;
  terms: string;
  bundledTreatments: string[]; // Treatment IDs
  isActive?: boolean;
}

interface Treatment {
  id: string;
  title: string;
}

export default function MembershipBuilderPage() {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [clinicId, setClinicId] = useState("");

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [terms, setTerms] = useState("");
  const [selectedTreatments, setSelectedTreatments] = useState<string[]>([]);

  const loadData = async (cId: string) => {
    try {
      // Fetch treatments to bundle
      const treatSnapshot = await getDocs(collection(db, "clinics", cId, "treatments"));
      const loadedTreatments: Treatment[] = [];
      treatSnapshot.forEach((d) => {
        loadedTreatments.push({ id: d.id, title: d.data().title } as Treatment);
      });
      setTreatments(loadedTreatments);

      // Fetch memberships
      const membSnapshot = await getDocs(collection(db, "clinics", cId, "memberships"));
      const loadedMemberships: Membership[] = [];
      membSnapshot.forEach((d) => {
        const data = d.data();
        loadedMemberships.push({
          id: d.id,
          isActive: data.isActive !== false,
          ...data,
        } as Membership);
      });
      setMemberships(loadedMemberships);
    } catch (err) {
      console.error("Error loading membership builder data:", err);
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

  const handleToggleTreatment = (treatmentId: string) => {
    setSelectedTreatments((prev) =>
      prev.includes(treatmentId)
        ? prev.filter((id) => id !== treatmentId)
        : [...prev, treatmentId]
    );
  };

  const handleSaveMembership = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !price || !clinicId) return;

    setLoading(true);
    const membershipData = {
      title,
      description,
      price: Number(price),
      bannerUrl: bannerUrl || "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600",
      terms,
      bundledTreatments: selectedTreatments,
    };

    try {
      if (editId) {
        // Update existing membership
        await updateDoc(doc(db, "clinics", clinicId, "memberships", editId), membershipData);
        setMemberships((prev) =>
          prev.map((m) => (m.id === editId ? { ...m, ...membershipData } : m))
        );
      } else {
        // Create new membership
        const fullData = { ...membershipData, isActive: true, createdAt: serverTimestamp() };
        const docRef = await addDoc(
          collection(db, "clinics", clinicId, "memberships"),
          fullData
        );
        setMemberships((prev) => [{ id: docRef.id, ...fullData } as any, ...prev]);
      }

      // Reset
      setTitle("");
      setDescription("");
      setPrice("");
      setBannerUrl("");
      setTerms("");
      setSelectedTreatments([]);
      setEditId(null);
      setShowForm(false);
    } catch (err) {
      console.error("Error saving membership:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (membership: Membership) => {
    setEditId(membership.id);
    setTitle(membership.title);
    setDescription(membership.description);
    setPrice(String(membership.price));
    setBannerUrl(membership.bannerUrl);
    setTerms(membership.terms);
    setSelectedTreatments(membership.bundledTreatments);
    setShowForm(true);
  };

  const handleToggleActive = async (membership: Membership) => {
    if (!clinicId) return;
    const newStatus = membership.isActive === false ? true : false;
    try {
      await updateDoc(doc(db, "clinics", clinicId, "memberships", membership.id), {
        isActive: newStatus,
      });
      setMemberships((prev) =>
        prev.map((m) => (m.id === membership.id ? { ...m, isActive: newStatus } : m))
      );
    } catch (err) {
      console.error("Error toggling active state:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Membership Bundles</h2>
          <p className="text-sm text-neutral-500">Configure recurring patient packages and rules</p>
        </div>
        <button
          onClick={() => {
            setEditId(null);
            setTitle("");
            setDescription("");
            setPrice("");
            setBannerUrl("");
            setTerms("");
            setSelectedTreatments([]);
            setShowForm(!showForm);
          }}
          className="rounded-md bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 shadow-sm transition"
        >
          {showForm ? "Cancel" : "Create Membership"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSaveMembership}
          className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4 w-full"
        >
          <h3 className="text-md font-bold tracking-tight">
            {editId ? "Edit Membership Bundle" : "New Membership Bundle"}
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-neutral-700">Membership Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-black shadow-sm placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
                placeholder="e.g. Skin Health Platinum"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700">Description</label>
              <textarea
                required
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-black shadow-sm placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
                placeholder="Overview of the bundle's benefits..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700">Price (€/month)</label>
                <input
                  type="number"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-black shadow-sm placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
                  placeholder="e.g. 150"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700">Banner Image URL</label>
                <input
                  type="url"
                  value={bannerUrl}
                  onChange={(e) => setBannerUrl(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-black shadow-sm placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
                  placeholder="https://example.com/banner.jpg"
                />
              </div>
            </div>

            {/* Checkboxes to bundle treatments */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Bundle Treatments
              </label>
              <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto border border-neutral-200 rounded p-2.5 bg-neutral-50/50">
                {treatments.map((t) => (
                  <label key={t.id} className="flex items-center gap-2 text-xs cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={selectedTreatments.includes(t.id)}
                      onChange={() => handleToggleTreatment(t.id)}
                      className="rounded border-neutral-300 text-black focus:ring-black h-4 w-4 bg-white"
                    />
                    {t.title}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700">Terms & Conditions</label>
              <textarea
                rows={2}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-black shadow-sm placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
                placeholder="Refund policies, commitment period, etc..."
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 transition"
          >
            {editId ? "Update Bundle" : "Create Bundle"}
          </button>
        </form>
      )}

      {/* Memberships Listing */}
      <div className="grid gap-6 md:grid-cols-2">
        {memberships.map((m) => (
          <div
            key={m.id}
            className={`overflow-hidden rounded-xl border bg-white shadow-sm flex flex-col justify-between transition ${
              m.isActive === false ? "border-neutral-200 opacity-60" : "border-neutral-200"
            }`}
          >
            <div
              className="h-40 bg-cover bg-center"
              style={{ backgroundImage: `url(${m.bannerUrl})` }}
            />
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-baseline">
                <h3 className="text-lg font-bold text-neutral-900">{m.title}</h3>
                <span className="text-xl font-bold tracking-tight text-neutral-950">
                  €{m.price}
                  <span className="text-xs font-normal text-neutral-500">/mo</span>
                </span>
              </div>
              <p className="text-sm text-neutral-500">{m.description}</p>

              {/* Bundled items list */}
              <div>
                <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider block mb-1">
                  Bundled Treatments
                </span>
                {m.bundledTreatments && m.bundledTreatments.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {m.bundledTreatments.map((tid) => {
                      const found = treatments.find((t) => t.id === tid);
                      return (
                        <span key={tid} className="bg-neutral-100 border border-neutral-200 text-neutral-800 text-[10px] px-2 py-0.5 rounded font-medium">
                          {found ? found.title : `Treatment #${tid}`}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-400">No treatments bundled.</p>
                )}
              </div>

              {m.terms && (
                <div className="border-t border-neutral-100 pt-3">
                  <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">
                    Terms & Conditions
                  </span>
                  <p className="text-[11px] text-neutral-500 leading-normal">{m.terms}</p>
                </div>
              )}

              <div className="border-t border-neutral-100 pt-4 flex items-center justify-between">
                {/* Toggle switch */}
                <div className="flex items-center gap-2">
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={m.isActive !== false}
                      onChange={() => handleToggleActive(m)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-black"></div>
                    <span className="ml-2 text-xs font-medium text-neutral-500">
                      {m.isActive !== false ? "Active" : "Inactive"}
                    </span>
                  </label>
                </div>

                {/* Edit button */}
                <button
                  onClick={() => handleEditClick(m)}
                  className="rounded border border-neutral-300 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
