"use client";

import { useEffect, useState } from "react";
import { collection, query, getDocs, doc, getDoc, addDoc, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";

interface Reward {
  id: string;
  title: string;
  description: string;
  cardInfo: string; // e.g. "10% OFF"
  pointsRequired: number;
  treatmentId: string;
  discountPercentage: number;
  discountUpTo?: number; // Maximum limit value
  isActive?: boolean;
}

interface Treatment {
  id: string;
  title: string;
}

export default function RewardsPage() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [clinicId, setClinicId] = useState("");

  // Point Earning Config
  const [spendAmount, setSpendAmount] = useState(10); // e.g. Spend €10
  const [pointsEarned, setPointsEarned] = useState(1); // Get 1 point

  // Reward Form State
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cardInfo, setCardInfo] = useState("10% OFF");
  const [pointsRequired, setPointsRequired] = useState(100);
  const [selectedTreatmentId, setSelectedTreatmentId] = useState("");
  const [discountPercentage, setDiscountPercentage] = useState(10);
  const [discountUpTo, setDiscountUpTo] = useState(""); // Maximum discount threshold

  const loadData = async (cId: string) => {
    try {
      // Fetch treatments for dropdown selector
      const treatSnapshot = await getDocs(collection(db, "clinics", cId, "treatments"));
      const loadedTreatments: Treatment[] = [];
      treatSnapshot.forEach((d) => {
        loadedTreatments.push({ id: d.id, title: d.data().title } as Treatment);
      });
      setTreatments(loadedTreatments);
      if (loadedTreatments.length > 0) {
        setSelectedTreatmentId(loadedTreatments[0].id);
      }

      // Fetch point ratio settings
      const ratioDoc = await getDoc(doc(db, "clinics", cId, "settings", "rewards_ratio"));
      if (ratioDoc.exists()) {
        const data = ratioDoc.data();
        setSpendAmount(data.spendAmount || 10);
        setPointsEarned(data.pointsEarned || 1);
      }

      // Fetch rewards list
      const rewardSnapshot = await getDocs(collection(db, "clinics", cId, "rewards"));
      const loadedRewards: Reward[] = [];
      rewardSnapshot.forEach((d) => {
        const data = d.data();
        loadedRewards.push({
          id: d.id,
          isActive: data.isActive !== false,
          ...data,
        } as Reward);
      });
      setRewards(loadedRewards);
    } catch (err) {
      console.error("Error loading rewards:", err);
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

  const handleSaveRatio = async () => {
    if (!clinicId) return;
    try {
      await setDoc(doc(db, "clinics", clinicId, "settings", "rewards_ratio"), {
        spendAmount,
        pointsEarned,
      });
      alert("Loyalty point ratio configuration saved successfully!");
    } catch (err) {
      console.error("Error saving point ratio:", err);
    }
  };

  const handleSaveReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !clinicId) return;

    setLoading(true);
    const rewardData = {
      title,
      description,
      cardInfo,
      pointsRequired: Number(pointsRequired),
      treatmentId: selectedTreatmentId,
      discountPercentage: Number(discountPercentage),
      discountUpTo: discountUpTo ? Number(discountUpTo) : undefined,
    };

    try {
      if (editId) {
        // Update existing reward
        await updateDoc(doc(db, "clinics", clinicId, "rewards", editId), rewardData);
        setRewards((prev) =>
          prev.map((r) => (r.id === editId ? { ...r, ...rewardData } : r))
        );
      } else {
        // Create new reward
        const fullData = { ...rewardData, isActive: true, createdAt: serverTimestamp() };
        const docRef = await addDoc(
          collection(db, "clinics", clinicId, "rewards"),
          fullData
        );
        setRewards((prev) => [{ id: docRef.id, ...fullData } as any, ...prev]);
      }

      // Reset
      setTitle("");
      setDescription("");
      setCardInfo("10% OFF");
      setPointsRequired(100);
      setDiscountPercentage(10);
      setDiscountUpTo("");
      setEditId(null);
      setShowForm(false);
    } catch (err) {
      console.error("Error saving reward:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (reward: Reward) => {
    setEditId(reward.id);
    setTitle(reward.title);
    setDescription(reward.description);
    setCardInfo(reward.cardInfo);
    setPointsRequired(reward.pointsRequired);
    setSelectedTreatmentId(reward.treatmentId);
    setDiscountPercentage(reward.discountPercentage);
    setDiscountUpTo(reward.discountUpTo ? String(reward.discountUpTo) : "");
    setShowForm(true);
  };

  const handleToggleActive = async (reward: Reward) => {
    if (!clinicId) return;
    const newStatus = reward.isActive === false ? true : false;
    try {
      await updateDoc(doc(db, "clinics", clinicId, "rewards", reward.id), {
        isActive: newStatus,
      });
      setRewards((prev) =>
        prev.map((r) => (r.id === reward.id ? { ...r, isActive: newStatus } : r))
      );
    } catch (err) {
      console.error("Error toggling active state:", err);
    }
  };

  return (
    <div className="space-y-8">
      {/* Spend / Earn Loyalty Point Slider Config */}
      <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4 w-full">
        <h3 className="text-md font-bold tracking-tight">Point Earning Configuration</h3>
        <p className="text-sm text-neutral-500">
          Configure how many loyalty points clients earn for their treatments spending.
        </p>

        <div className="space-y-4 border-t border-neutral-100 pt-4">
          <div className="space-y-1">
            <div className="flex justify-between text-sm font-medium">
              <span>Spend Amount (€)</span>
              <span className="font-bold">€{spendAmount}</span>
            </div>
            <input
              type="range"
              min="5"
              max="100"
              step="5"
              value={spendAmount}
              onChange={(e) => setSpendAmount(Number(e.target.value))}
              className="w-full h-1 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-black"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-sm font-medium">
              <span>Points Earned</span>
              <span className="font-bold">{pointsEarned} pt(s)</span>
            </div>
            <input
              type="range"
              min="1"
              max="20"
              step="1"
              value={pointsEarned}
              onChange={(e) => setPointsEarned(Number(e.target.value))}
              className="w-full h-1 bg-neutral-200 rounded-lg appearance-none cursor-pointer accent-black"
            />
          </div>

          <div className="bg-neutral-50 border border-neutral-200 rounded p-3 text-xs text-neutral-600">
            Current Rule: Clients earn <strong className="text-black">{pointsEarned} point(s)</strong> for every{" "}
            <strong className="text-black">€{spendAmount}</strong> they spend on treatments.
          </div>

          <button
            onClick={handleSaveRatio}
            className="w-full rounded-md bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 transition"
          >
            Save Earning Rules
          </button>
        </div>
      </div>

      {/* Rewards management header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold tracking-tight">Redemption Rewards</h2>
          <p className="text-sm text-neutral-500">Create discount coupons redeemable with loyalty points</p>
        </div>
        <button
          onClick={() => {
            setEditId(null);
            setTitle("");
            setDescription("");
            setCardInfo("10% OFF");
            setPointsRequired(100);
            setDiscountPercentage(10);
            setDiscountUpTo("");
            setShowForm(!showForm);
          }}
          className="rounded-md bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 shadow-sm transition"
        >
          {showForm ? "Cancel" : "Add Reward Option"}
        </button>
      </div>

      {/* Reward Creation Form */}
      {showForm && (
        <form
          onSubmit={handleSaveReward}
          className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4 w-full"
        >
          <h3 className="text-md font-bold tracking-tight">
            {editId ? "Edit Point Reward Option" : "New Point Reward Option"}
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-neutral-700">Reward Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-black shadow-sm placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
                placeholder="e.g. Botox 10% Off"
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
                placeholder="Details of the reward option..."
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700">Card Badge Info</label>
                <input
                  type="text"
                  required
                  value={cardInfo}
                  onChange={(e) => setCardInfo(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-black shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
                  placeholder="e.g. 10% OFF"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700">Points Required</label>
                <input
                  type="number"
                  required
                  value={pointsRequired}
                  onChange={(e) => setPointsRequired(Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-black shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700">
                  Discount Up To (€) <span className="text-xs text-neutral-400">(optional)</span>
                </label>
                <input
                  type="number"
                  value={discountUpTo}
                  onChange={(e) => setDiscountUpTo(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-black shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
                  placeholder="Max Cap Limit"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700">Target Treatment</label>
                <select
                  value={selectedTreatmentId}
                  onChange={(e) => setSelectedTreatmentId(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-black shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
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
              <div>
                <label className="block text-sm font-medium text-neutral-700">Discount Percentage (%)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  required
                  value={discountPercentage}
                  onChange={(e) => setDiscountPercentage(Number(e.target.value))}
                  className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-black shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
                />
              </div>
            </div>
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 transition"
          >
            {editId ? "Update Reward" : "Create Reward"}
          </button>
        </form>
      )}

      {/* Rewards Listing */}
      <div className="grid gap-6 md:grid-cols-3">
        {rewards.map((r) => (
          <div
            key={r.id}
            className={`rounded-xl border p-6 bg-white shadow-sm flex flex-col justify-between transition ${
              r.isActive === false ? "border-neutral-200 opacity-60" : "border-neutral-200"
            }`}
          >
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <span className="bg-black text-white text-[10px] font-bold px-2 py-1 rounded">
                  {r.cardInfo}
                </span>
                <span className="text-xs text-neutral-500 font-medium">{r.pointsRequired} pts required</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900">{r.title}</h3>
                <p className="text-xs text-neutral-500 mt-1">{r.description}</p>
                {r.discountUpTo && (
                  <p className="text-[10px] font-semibold text-black mt-2">
                    Up to €{r.discountUpTo} max discount limit
                  </p>
                )}
              </div>
            </div>
            <div className="border-t border-neutral-100 mt-4 pt-3 text-[10px] text-neutral-400">
              Applies to:{" "}
              <strong className="text-neutral-700">
                {treatments.find((t) => t.id === r.treatmentId)?.title || "Selected Treatment"}
              </strong>
            </div>

            <div className="border-t border-neutral-100 mt-4 pt-4 flex items-center justify-between">
              {/* Toggle switch */}
              <div className="flex items-center gap-2">
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={r.isActive !== false}
                    onChange={() => handleToggleActive(r)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-black"></div>
                  <span className="ml-2 text-xs font-medium text-neutral-500">
                    {r.isActive !== false ? "Active" : "Inactive"}
                  </span>
                </label>
              </div>

              {/* Edit button */}
              <button
                onClick={() => handleEditClick(r)}
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
