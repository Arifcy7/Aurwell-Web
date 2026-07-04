"use client";

import { useEffect, useState } from "react";
import { collection, query, getDocs, doc, getDoc, addDoc, updateDoc, Timestamp, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";

interface Offer {
  id: string;
  title: string;
  description: string;
  discountValue: number;
  discountType: "percentage" | "fixed";
  validUntil: any; // Firestore Timestamp
  isActive?: boolean;
}

export default function OffersPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [clinicId, setClinicId] = useState("");

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [discountValue, setDiscountValue] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [validUntil, setValidUntil] = useState("");

  const loadOffers = async (cId: string) => {
    try {
      const q = query(collection(db, "clinics", cId, "offers"));
      const snapshot = await getDocs(q);
      const loadedOffers: Offer[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        loadedOffers.push({
          id: docSnap.id,
          isActive: data.isActive !== false,
          ...data,
        } as Offer);
      });
      setOffers(loadedOffers);
    } catch (err) {
      console.error("Error loading offers:", err);
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
          await loadOffers(cId);
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSaveOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !discountValue || !clinicId) return;

    setLoading(true);
    const offerData = {
      title,
      description,
      discountValue: Number(discountValue),
      discountType,
      validUntil: Timestamp.fromDate(new Date(validUntil)),
    };

    try {
      if (editId) {
        // Update existing offer
        await updateDoc(doc(db, "clinics", clinicId, "offers", editId), offerData);
        setOffers((prev) =>
          prev.map((o) => (o.id === editId ? { ...o, ...offerData } : o))
        );
      } else {
        // Create new offer
        const fullData = { ...offerData, isActive: true, createdAt: serverTimestamp() };
        const docRef = await addDoc(
          collection(db, "clinics", clinicId, "offers"),
          fullData
        );
        setOffers((prev) => [{ id: docRef.id, ...fullData } as any, ...prev]);
      }

      // Reset
      setTitle("");
      setDescription("");
      setDiscountValue("");
      setValidUntil("");
      setEditId(null);
      setShowForm(false);
    } catch (err) {
      console.error("Error saving offer:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (offer: Offer) => {
    setEditId(offer.id);
    setTitle(offer.title);
    setDescription(offer.description);
    setDiscountValue(String(offer.discountValue));
    setDiscountType(offer.discountType);
    
    // Parse validUntil
    const dateStr = offer.validUntil && typeof offer.validUntil.toDate === "function"
      ? offer.validUntil.toDate().toISOString().split("T")[0]
      : String(offer.validUntil).split("T")[0];
    setValidUntil(dateStr);
    setShowForm(true);
  };

  const handleToggleActive = async (offer: Offer) => {
    if (!clinicId) return;
    const newStatus = offer.isActive === false ? true : false;
    try {
      await updateDoc(doc(db, "clinics", clinicId, "offers", offer.id), {
        isActive: newStatus,
      });
      setOffers((prev) =>
        prev.map((o) => (o.id === offer.id ? { ...o, isActive: newStatus } : o))
      );
    } catch (err) {
      console.error("Error toggling active state:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Manage Special Offers</h2>
          <p className="text-sm text-neutral-500">Configure promotional vouchers and active discounts</p>
        </div>
        <button
          onClick={() => {
            setEditId(null);
            setTitle("");
            setDescription("");
            setDiscountValue("");
            setValidUntil("");
            setShowForm(!showForm);
          }}
          className="rounded-md bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 shadow-sm transition"
        >
          {showForm ? "Cancel" : "Create Offer"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSaveOffer}
          className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4 w-full"
        >
          <h3 className="text-md font-bold tracking-tight">
            {editId ? "Edit Promotional Offer" : "New Promotional Offer"}
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-neutral-700">Offer Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-black shadow-sm placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
                placeholder="e.g. Welcome Discount"
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
                placeholder="Offer details visible to patient..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700">Discount Value</label>
                <input
                  type="number"
                  required
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-black shadow-sm placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
                  placeholder="e.g. 20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700">Type</label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as "percentage" | "fixed")}
                  className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-black shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
                >
                  <option value="percentage">Percentage Off (%)</option>
                  <option value="fixed">Fixed Amount (€ / $)</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700">Expiration Date</label>
              <input
                type="date"
                required
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-black shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 transition"
          >
            {editId ? "Update Promotional Offer" : "Save Promotional Offer"}
          </button>
        </form>
      )}

      {/* Offers List */}
      <div className="grid gap-6 md:grid-cols-2">
        {offers.map((o) => (
          <div
            key={o.id}
            className={`rounded-xl border p-6 bg-white shadow-sm flex flex-col justify-between transition ${
              o.isActive === false ? "border-neutral-200 opacity-60" : "border-neutral-200"
            }`}
          >
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <h3 className="text-lg font-bold text-neutral-900">{o.title}</h3>
                <span className="text-2xl font-bold tracking-tight text-neutral-950">
                  {o.discountType === "percentage" ? `${o.discountValue}%` : `€${o.discountValue}`}
                  <span className="text-xs font-normal text-neutral-500"> off</span>
                </span>
              </div>
              <p className="text-sm text-neutral-500 mb-4">{o.description}</p>
            </div>
            <div className="border-t border-neutral-100 pt-4 text-xs text-neutral-400 flex items-center justify-between">
              <div>
                <span>Valid Until:</span>{" "}
                <span className="font-semibold text-neutral-700">
                  {o.validUntil && typeof o.validUntil.toDate === "function"
                    ? o.validUntil.toDate().toLocaleDateString()
                    : String(o.validUntil)}
                </span>
              </div>
            </div>

            <div className="border-t border-neutral-100 mt-4 pt-4 flex items-center justify-between">
              {/* Toggle switch */}
              <div className="flex items-center gap-2">
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={o.isActive !== false}
                    onChange={() => handleToggleActive(o)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-black"></div>
                  <span className="ml-2 text-xs font-medium text-neutral-500">
                    {o.isActive !== false ? "Active" : "Inactive"}
                  </span>
                </label>
              </div>

              {/* Edit button */}
              <button
                onClick={() => handleEditClick(o)}
                className="rounded border border-neutral-300 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition"
              >
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
