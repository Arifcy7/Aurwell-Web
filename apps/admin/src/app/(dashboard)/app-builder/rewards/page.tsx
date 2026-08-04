"use client";

import { useEffect, useState } from "react";
import { collection, query, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";
import { getDocsCacheFirst, getDocCacheFirst } from "@/lib/firebase/logger";
import { CardGridSkeleton } from "@/components/Loader";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import Modal from "@/components/Modal";
import { motion, AnimatePresence } from "framer-motion";
import {
  Coins,
  Sparkles,
  Gift,
  Star,
  UserPlus,
  X,
  Plus,
  Minus,
  Tag,
  Clock,
  Percent,
  Award,
  SlidersHorizontal,
  Pencil,
  PlusCircle,
  TrendingUp,
  Trash2,
} from "lucide-react";

interface Reward {
  id: string;
  title: string;
  description: string;
  cardInfo: string; // e.g. "10% OFF"
  pointsRequired: number;
  treatmentId: string;
  discountPercentage: number;
  discountUpTo?: number | null; // Maximum limit value
  expiryDays?: number | null; // Expiry in days
  isActive?: boolean;
}

interface Treatment {
  id: string;
  title: string;
}

interface ModernSliderProps {
  label: string;
  description?: string;
  value: number;
  onChange: (val: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
  prefix?: string;
  icon: React.ReactNode;
  presets?: number[];
}

function ModernSlider({
  label,
  description,
  value,
  onChange,
  min,
  max,
  step,
  unit,
  prefix = "",
  icon,
  presets = [],
}: ModernSliderProps) {
  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

  const handleDecrement = () => {
    onChange(Math.max(min, value - step));
  };

  const handleIncrement = () => {
    onChange(Math.min(max, value + step));
  };

  return (
    <div className="group py-3.5 px-1 transition-all space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-neutral-100 text-neutral-700 shrink-0">
            {icon}
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-semibold text-neutral-900 tracking-tight truncate">{label}</h4>
            {description && <p className="text-[11px] text-neutral-500 truncate">{description}</p>}
          </div>
        </div>

        {/* Selected Value */}
        <div className="text-right shrink-0">
          <span className="text-base font-bold text-neutral-900">
            {prefix}{value}
          </span>
          <span className="text-[11px] text-neutral-500 font-medium ml-1">{unit}</span>
        </div>
      </div>

      {/* Slider Controls */}
      <div className="flex items-center gap-2.5 pt-0.5">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={value <= min}
          className="w-7 h-7 rounded-full bg-neutral-100 text-neutral-700 flex items-center justify-center hover:bg-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer shrink-0"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <div className="relative flex-1 flex items-center">
          <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden relative">
            <div
              className="h-full bg-neutral-900 rounded-full transition-all duration-75"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
        </div>

        <button
          type="button"
          onClick={handleIncrement}
          disabled={value >= max}
          className="w-7 h-7 rounded-full bg-neutral-100 text-neutral-700 flex items-center justify-center hover:bg-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Quick Select Preset Buttons - Revealed ONLY on Hover */}
      {presets.length > 0 && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center gap-1.5 pt-0.5">
          <span className="text-[11px] font-medium text-neutral-400">Quick set:</span>
          <div className="flex items-center gap-1 flex-wrap">
            {presets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onChange(preset)}
                className={`text-[11px] font-medium px-2 py-0.5 rounded-md transition cursor-pointer ${
                  value === preset
                    ? "bg-neutral-900 text-white shadow-xs"
                    : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
                }`}
              >
                {prefix}{preset} {unit}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RewardsPage() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);
  const [clinicId, setClinicId] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);

  // Point Earning Config
  const [spendAmount, setSpendAmount] = useState(10); // e.g. Spend €10
  const [pointsEarned, setPointsEarned] = useState(1); // Get 1 point
  const [firstVisitPoints, setFirstVisitPoints] = useState(10); // Default to 10 points
  const [googleReviewPoints, setGoogleReviewPoints] = useState(15); // Default to 15 points
  const [referralPoints, setReferralPoints] = useState(20); // Default to 20 points

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
  const [expiryDays, setExpiryDays] = useState(""); // Expiry in days

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<Reward | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async (cId: string) => {
    try {
      // Fetch treatments for dropdown selector (Cache-First)
      const treatSnapshot = await getDocsCacheFirst(collection(db, "clinics", cId, "treatments"));
      const loadedTreatments: Treatment[] = [];
      treatSnapshot.forEach((d) => {
        loadedTreatments.push({ id: d.id, title: d.data().title } as Treatment);
      });
      setTreatments(loadedTreatments);
      if (loadedTreatments.length > 0) {
        setSelectedTreatmentId(loadedTreatments[0].id);
      }

      // Fetch point ratio settings (Cache-First)
      const ratioDoc = await getDocCacheFirst(doc(db, "clinics", cId, "settings", "rewards_ratio"));
      if (ratioDoc.exists()) {
        const data = ratioDoc.data();
        setSpendAmount(data.spendAmount || 10);
        setPointsEarned(data.pointsEarned || 1);
        setFirstVisitPoints(data.firstVisitPoints || 0);
        setGoogleReviewPoints(data.googleReviewPoints || 0);
        setReferralPoints(data.referralPoints || 0);
      }

      // Fetch rewards list (Cache-First)
      const rewardSnapshot = await getDocsCacheFirst(collection(db, "clinics", cId, "rewards"));
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
      setIsLoaded(true);
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

  // Auto-save point earning ratio whenever sliders are modified
  useEffect(() => {
    if (!clinicId || !isLoaded) return;
    const timer = setTimeout(() => {
      setDoc(doc(db, "clinics", clinicId, "settings", "rewards_ratio"), {
        spendAmount,
        pointsEarned,
        firstVisitPoints,
        googleReviewPoints,
        referralPoints,
      }).catch((err) => console.error("Error auto-saving point config:", err));
    }, 400);

    return () => clearTimeout(timer);
  }, [spendAmount, pointsEarned, firstVisitPoints, googleReviewPoints, referralPoints, clinicId, isLoaded]);

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
      discountUpTo: discountUpTo ? Number(discountUpTo) : null,
      expiryDays: expiryDays ? Number(expiryDays) : null,
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
      setExpiryDays("");
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
    setExpiryDays(reward.expiryDays ? String(reward.expiryDays) : "");
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

  const handleDeleteConfirmed = async () => {
    if (!deleteTarget || !clinicId) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "clinics", clinicId, "rewards", deleteTarget.id));
      setRewards((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error("Error deleting reward:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8 relative">
      {/* Point Earning Configuration Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="rounded-3xl border border-neutral-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6 w-full"
      >
        <div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-neutral-800 shrink-0" />
            <h3 className="text-base font-bold tracking-tight text-neutral-900">
              Point Earning Configuration
            </h3>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Configure rules for how clients automatically accumulate loyalty points for spending and engagements.
          </p>
        </div>

        {/* 2-Column Split: Sliders on Left (7 cols), Live Summary on Right (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 border-t border-neutral-100 pt-6 items-start">
          {/* Left Column: Sliders Stack */}
          <div className="lg:col-span-7 divide-y divide-neutral-100">
            <ModernSlider
              label="Spend Amount Threshold"
              description="Base spending amount to trigger point reward"
              value={spendAmount}
              onChange={setSpendAmount}
              min={5}
              max={100}
              step={5}
              unit=""
              prefix="€"
              icon={<Coins className="w-4 h-4 text-neutral-700" />}
              presets={[10, 20, 50, 100]}
            />

            <ModernSlider
              label="Points Earned Per Threshold"
              description="Loyalty points rewarded for every spend threshold"
              value={pointsEarned}
              onChange={setPointsEarned}
              min={1}
              max={20}
              step={1}
              unit="pt(s)"
              icon={<Sparkles className="w-4 h-4 text-neutral-700" />}
              presets={[1, 2, 5, 10]}
            />

            <ModernSlider
              label="First Visit Bonus"
              description="Bonus points gifted on client's first appointment"
              value={firstVisitPoints}
              onChange={setFirstVisitPoints}
              min={0}
              max={100}
              step={5}
              unit="pt(s)"
              icon={<Gift className="w-4 h-4 text-neutral-700" />}
              presets={[0, 10, 25, 50]}
            />

            <ModernSlider
              label="Google Review Bonus"
              description="Bonus awarded when client submits a Google review"
              value={googleReviewPoints}
              onChange={setGoogleReviewPoints}
              min={0}
              max={300}
              step={5}
              unit="pt(s)"
              icon={<Star className="w-4 h-4 text-neutral-700" />}
              presets={[0, 15, 50, 100]}
            />

            <ModernSlider
              label="Refer a Friend Bonus"
              description="Bonus granted when a client successfully refers a new patient"
              value={referralPoints}
              onChange={setReferralPoints}
              min={0}
              max={300}
              step={5}
              unit="pt(s)"
              icon={<UserPlus className="w-4 h-4 text-neutral-700" />}
              presets={[0, 20, 50, 100]}
            />
          </div>

          {/* Right Column: Light & Modern Live Rule Summary Box */}
          <div className="lg:col-span-5 bg-gradient-to-b from-neutral-50/90 to-neutral-100/40 border border-neutral-200/80 rounded-2xl p-5 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between border-b border-neutral-200/70 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-800">Live Rule Summary</h4>
              </div>
              <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200/60">
                Active Calculation
              </span>
            </div>

            <div className="bg-white border border-neutral-200/70 rounded-xl p-3.5 text-xs text-neutral-700 leading-relaxed font-medium shadow-2xs">
              Clients earn <strong className="text-neutral-900 font-bold underline decoration-emerald-500 decoration-2">{pointsEarned} pt(s)</strong> for every{" "}
              <strong className="text-neutral-900 font-bold">€{spendAmount}</strong> spent on clinic treatments.
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 block px-0.5">
                Bonus Engagement Rewards
              </span>
              <div className="grid grid-cols-1 gap-2">
                <div className="bg-white border border-neutral-200/70 rounded-xl p-3 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-2">
                    <Gift className="w-3.5 h-3.5 text-neutral-500" />
                    <span className="text-xs font-semibold text-neutral-800">First Visit Bonus</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-100">
                    +{firstVisitPoints} pts
                  </span>
                </div>

                <div className="bg-white border border-neutral-200/70 rounded-xl p-3 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-2">
                    <Star className="w-3.5 h-3.5 text-neutral-500" />
                    <span className="text-xs font-semibold text-neutral-800">Google Review Bonus</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-100">
                    +{googleReviewPoints} pts
                  </span>
                </div>

                <div className="bg-white border border-neutral-200/70 rounded-xl p-3 flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-3.5 h-3.5 text-neutral-500" />
                    <span className="text-xs font-semibold text-neutral-800">Refer a Friend Bonus</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-100">
                    +{referralPoints} pts
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Rewards Management Section Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-neutral-800" />
            <h2 className="text-lg font-bold tracking-tight text-neutral-900">Redemption Rewards</h2>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Configure redeemable discount coupons that clients can unlock using accumulated points
          </p>
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
            setExpiryDays("");
            setShowForm(!showForm);
          }}
          className="rounded-full bg-neutral-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-neutral-800 shadow-xs transition cursor-pointer flex items-center gap-2"
        >
          {showForm ? (
            <>
              <X className="w-3.5 h-3.5" />
              Cancel
            </>
          ) : (
            <>
              <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
              Add Reward Option
            </>
          )}
        </button>
      </div>

      {/* Reward Creation/Edit Form Modal */}
      <Modal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        title={editId ? "Edit Reward Option" : "Create New Reward Option"}
        subtitle="Rewards Configuration"
        maxWidth="max-w-6xl"
      >
        <form onSubmit={handleSaveReward} className="space-y-6">

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Reward Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="input-modern"
                    placeholder="e.g. Botox 10% Off"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Card Badge Banner Info</label>
                  <input
                    type="text"
                    required
                    value={cardInfo}
                    onChange={(e) => setCardInfo(e.target.value)}
                    className="input-modern"
                    placeholder="e.g. 10% OFF"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Description</label>
                <textarea
                  required
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="textarea-modern"
                  placeholder="Describe the details of this reward option..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Points Required</label>
                  <input
                    type="number"
                    required
                    value={pointsRequired}
                    onChange={(e) => setPointsRequired(Number(e.target.value))}
                    className="input-modern"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Discount Percentage (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={discountPercentage}
                    onChange={(e) => setDiscountPercentage(Number(e.target.value))}
                    className="input-modern"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    Max Discount Cap (€) <span className="text-[10px] text-neutral-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="number"
                    value={discountUpTo}
                    onChange={(e) => setDiscountUpTo(e.target.value)}
                    className="input-modern"
                    placeholder="e.g. 50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Target Treatment</label>
                  <select
                    value={selectedTreatmentId}
                    onChange={(e) => setSelectedTreatmentId(e.target.value)}
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

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                    Expiry Period (Days) <span className="text-[10px] text-neutral-400 font-normal">(optional)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={expiryDays}
                    onChange={(e) => setExpiryDays(e.target.value)}
                    className="input-modern"
                    placeholder="e.g. 30"
                  />
                </div>
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
                className="rounded-full bg-neutral-900 px-6 py-2.5 text-xs font-bold text-white hover:bg-neutral-800 shadow-md transition cursor-pointer"
              >
                {editId ? "Update Reward Option" : "Save & Publish Reward"}
              </button>
            </div>
          </form>
        </Modal>

      {/* Rewards Cards Grid with Simple Fade Animation */}
      {loading ? (
        <CardGridSkeleton count={3} />
      ) : rewards.length === 0 ? (
        <div className="rounded-3xl border border-neutral-100 bg-white p-12 text-center space-y-3 shadow-xs">
          <Award className="w-10 h-10 text-neutral-300 mx-auto" />
          <h4 className="text-sm font-bold text-neutral-700">No Redemption Rewards Configured</h4>
          <p className="text-xs text-neutral-400 max-w-sm mx-auto">
            Create your first reward option so clients can redeem their loyalty points for discounts.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 grid-cols-1 md:grid-cols-3">
          {rewards.map((r, idx) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: idx * 0.04 }}
              className={`rounded-3xl border p-6 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col justify-between transition-all hover:shadow-[0_12px_32px_rgba(0,0,0,0.08)] ${
                r.isActive === false ? "border-neutral-200 opacity-60 bg-neutral-50/50" : "border-neutral-100"
              }`}
            >
              <div className="space-y-4">
                <div className="flex justify-between items-center gap-2">
                  <span className="bg-neutral-900 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-xs flex items-center gap-1">
                    <Tag className="w-3 h-3 text-emerald-400" />
                    {r.cardInfo}
                  </span>
                  <span className="text-xs text-neutral-600 font-bold bg-neutral-100 px-2.5 py-1 rounded-full border border-neutral-200/60">
                    {r.pointsRequired} pts
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-neutral-900">{r.title}</h3>
                  <p className="text-xs text-neutral-500 mt-1 leading-relaxed">{r.description}</p>
                  
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {r.discountUpTo && (
                      <span className="bg-emerald-50 text-emerald-800 text-[10px] font-semibold px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                        <Percent className="w-3 h-3" /> Up to €{r.discountUpTo} max
                      </span>
                    )}
                    {r.expiryDays && (
                      <span className="bg-neutral-100 text-neutral-700 text-[10px] font-semibold px-2.5 py-0.5 rounded-full border border-neutral-200 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-neutral-500" /> Expires in {r.expiryDays}d
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-neutral-100 space-y-3">
                <div className="text-[11px] text-neutral-400 flex items-center justify-between">
                  <span>Applies to:</span>
                  <strong className="text-neutral-800 font-semibold truncate max-w-[140px]">
                    {treatments.find((t) => t.id === r.treatmentId)?.title || "Selected Treatment"}
                  </strong>
                </div>

                <div className="flex items-center justify-between pt-1">
                  {/* Status Toggle */}
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={r.isActive !== false}
                      onChange={() => handleToggleActive(r)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-neutral-900"></div>
                    <span className="ml-2 text-xs font-semibold text-neutral-600">
                      {r.isActive !== false ? "Active" : "Inactive"}
                    </span>
                  </label>

                  {/* Edit & Delete Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditClick(r)}
                      className="rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                    >
                      <Pencil className="w-3 h-3 text-neutral-500" />
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget(r)}
                      className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
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
        title="Delete Reward"
        description="This reward will be permanently removed. Clients who have already availed this reward won't be affected, but new redemptions will no longer be possible."
        itemName={deleteTarget?.title}
      />
    </div>
  );
}
