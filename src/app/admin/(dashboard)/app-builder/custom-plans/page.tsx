"use client";

import { useEffect, useState } from "react";
import { collection, query, getDocs, doc, getDoc, addDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";

interface CustomPlan {
  id: string;
  title: string;
  description: string;
  price: number;
  billingCycle: string;
  features: string[];
  isActive?: boolean;
}

export default function CustomPlansPage() {
  const [plans, setPlans] = useState<CustomPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [clinicId, setClinicId] = useState("");

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [featureInput, setFeatureInput] = useState("");

  const loadPlans = async (cId: string) => {
    try {
      const q = query(collection(db, "clinics", cId, "custom_plans"));
      const snapshot = await getDocs(q);
      const loadedPlans: CustomPlan[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        loadedPlans.push({
          id: docSnap.id,
          isActive: data.isActive !== false, // default true
          ...data,
        } as CustomPlan);
      });
      setPlans(loadedPlans);
    } catch (err) {
      console.error("Error loading plans:", err);
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
          await loadPlans(cId);
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !price || !clinicId) return;

    setLoading(true);
    const planData = {
      title,
      description,
      price: Number(price),
      billingCycle,
      features: featureInput.split(",").map((f) => f.trim()).filter(Boolean),
    };

    try {
      if (editId) {
        // Update existing plan
        await updateDoc(doc(db, "clinics", clinicId, "custom_plans", editId), planData);
        setPlans((prev) =>
          prev.map((p) => (p.id === editId ? { ...p, ...planData } : p))
        );
      } else {
        // Create new plan
        const fullData = { ...planData, isActive: true, createdAt: serverTimestamp() };
        const docRef = await addDoc(
          collection(db, "clinics", clinicId, "custom_plans"),
          fullData
        );
        // Note: For instant UI updates before reload, we set the plan locally
        setPlans((prev) => [{ id: docRef.id, ...fullData } as any, ...prev]);
      }

      // Reset Form
      setTitle("");
      setDescription("");
      setPrice("");
      setFeatureInput("");
      setEditId(null);
      setShowForm(false);
    } catch (err) {
      console.error("Error saving plan:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (plan: CustomPlan) => {
    setEditId(plan.id);
    setTitle(plan.title);
    setDescription(plan.description);
    setPrice(String(plan.price));
    setBillingCycle(plan.billingCycle);
    setFeatureInput(plan.features.join(", "));
    setShowForm(true);
  };

  const handleToggleActive = async (plan: CustomPlan) => {
    if (!clinicId) return;
    const newStatus = plan.isActive === false ? true : false;
    try {
      await updateDoc(doc(db, "clinics", clinicId, "custom_plans", plan.id), {
        isActive: newStatus,
      });
      setPlans((prev) =>
        prev.map((p) => (p.id === plan.id ? { ...p, isActive: newStatus } : p))
      );
    } catch (err) {
      console.error("Error toggling active state:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Manage Custom Plans</h2>
          <p className="text-sm text-neutral-500">Create and edit custom wellness plans for your patients</p>
        </div>
        <button
          onClick={() => {
            setEditId(null);
            setTitle("");
            setDescription("");
            setPrice("");
            setFeatureInput("");
            setShowForm(!showForm);
          }}
          className="rounded-md bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 shadow-sm transition"
        >
          {showForm ? "Cancel" : "Create Plan"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSavePlan}
          className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4 w-full"
        >
          <h3 className="text-md font-bold tracking-tight">
            {editId ? "Edit Custom Plan" : "New Custom Plan"}
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-neutral-700">Plan Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-black shadow-sm placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
                placeholder="e.g. Skin Rejuvenation Plan"
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
                placeholder="e.g. Tailored anti-aging bundle featuring regular consultations..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700">Price</label>
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
                <label className="block text-sm font-medium text-neutral-700">Billing Cycle</label>
                <select
                  value={billingCycle}
                  onChange={(e) => setBillingCycle(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-black shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700">
                Plan Features <span className="text-xs text-neutral-400">(comma-separated)</span>
              </label>
              <input
                type="text"
                value={featureInput}
                onChange={(e) => setFeatureInput(e.target.value)}
                className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-black shadow-sm placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
                placeholder="e.g. 1x Hydrafacial, 15% off creams, priority slot"
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 transition"
          >
            {editId ? "Update Custom Plan" : "Save Custom Plan"}
          </button>
        </form>
      )}

      {/* Plans Listing */}
      <div className="grid gap-6 md:grid-cols-2">
        {plans.map((p) => (
          <div
            key={p.id}
            className={`rounded-xl border p-6 bg-white shadow-sm flex flex-col justify-between transition ${
              p.isActive === false ? "border-neutral-200 opacity-60" : "border-neutral-200"
            }`}
          >
            <div>
              <div className="flex justify-between items-baseline mb-2">
                <h3 className="text-lg font-bold text-neutral-900">{p.title}</h3>
                <span className="text-xl font-bold tracking-tight">
                  €{p.price}
                  <span className="text-xs font-normal text-neutral-500">
                    /{p.billingCycle === "monthly" ? "mo" : p.billingCycle}
                  </span>
                </span>
              </div>
              <p className="text-sm text-neutral-500 mb-4">{p.description}</p>
              <ul className="space-y-2 text-xs text-neutral-600 border-t border-neutral-100 pt-4">
                {p.features.map((feat, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-neutral-900" />
                    {feat}
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-neutral-100 mt-6 pt-4 flex items-center justify-between">
              {/* Toggle switch */}
              <div className="flex items-center gap-2">
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={p.isActive !== false}
                    onChange={() => handleToggleActive(p)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-black"></div>
                  <span className="ml-2 text-xs font-medium text-neutral-500">
                    {p.isActive !== false ? "Active" : "Inactive"}
                  </span>
                </label>
              </div>

              {/* Edit button */}
              <button
                onClick={() => handleEditClick(p)}
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
