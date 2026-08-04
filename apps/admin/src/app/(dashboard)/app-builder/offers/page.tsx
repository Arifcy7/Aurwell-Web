"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";
import { getDocsCacheFirst } from "@/lib/firebase/logger";
import ImageUploader from "@/components/ImageUploader";
import { uploadImageFile, deleteImageFile } from "@/lib/firebase/upload";
import { CardGridSkeleton } from "@/components/Loader";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import { formatCurrency } from "@/lib/utils/currency";
import {
  Sparkles,
  Search,
  Check,
  X,
  Plus,
  Edit2,
  Tag,
  Percent,
  Gift,
  Calendar,
  CheckSquare,
  Square,
  AlertCircle,
  Sliders,
  Layers,
  ChevronRight,
  Filter,
  ImageIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface TreatmentItem {
  id: string;
  title: string;
  categories?: string[];
  bannerUrl?: string;
  nonMemberPrice?: number;
}

export interface AutomatedOffer {
  id: string;
  occasion: string;
  title: string;
  isActive: boolean;
  discountType: "percentage";
  discountValue: number;
  maxDiscountAmount?: number | null; // "Up to" cap amount
  allProductsIncluded: boolean;
  includedProductIds: string[];
  startDate?: string | null; // "YYYY-MM-DD"
  endDate?: string | null;   // "YYYY-MM-DD"
  imageUrl?: string | null;  // Square banner / scratch card image URL for custom offers
  isCustom?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

// Preset Occasions to automatically seed/render
const DEFAULT_OCCASIONS: { id: string; title: string; occasion: string; iconType: string }[] = [
  { id: "birthday_special", title: "Birthday Special", occasion: "Birthday Special", iconType: "birthday" },
  { id: "client_anniversary", title: "Client Anniversary", occasion: "Client Anniversary", iconType: "anniversary" },
  { id: "st_patricks_day", title: "St. Patrick's Day", occasion: "St. Patrick's Day", iconType: "patricks" },
  { id: "christmas", title: "Christmas", occasion: "Christmas", iconType: "christmas" },
  { id: "halloween", title: "Halloween", occasion: "Halloween", iconType: "halloween" },
  { id: "black_friday", title: "Black Friday", occasion: "Black Friday", iconType: "black_friday" },
  { id: "st_valentines_day", title: "St. Valentine's Day", occasion: "St. Valentine's Day", iconType: "valentines" },
  { id: "easter_special", title: "Easter Special", occasion: "Easter Special", iconType: "easter" },
  { id: "new_years", title: "New Years", occasion: "New Years", iconType: "new_years" },
];

export default function AutomatedOffersPage() {
  const [offers, setOffers] = useState<AutomatedOffer[]>([]);
  const [treatments, setTreatments] = useState<TreatmentItem[]>([]);
  const [currency, setCurrency] = useState("EUR");
  const [loading, setLoading] = useState(true);
  const [clinicId, setClinicId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal / Form State for Editing an Offer
  const [selectedOffer, setSelectedOffer] = useState<AutomatedOffer | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formIsActive, setFormIsActive] = useState(false);
  const [formDiscountValue, setFormDiscountValue] = useState<string>("0");
  const [formMaxDiscountAmount, setFormMaxDiscountAmount] = useState<string>("");
  const [formAllProductsIncluded, setFormAllProductsIncluded] = useState(true);
  const [formIncludedProductIds, setFormIncludedProductIds] = useState<string[]>([]);
  const [formStartDate, setFormStartDate] = useState<string>("");
  const [formEndDate, setFormEndDate] = useState<string>("");

  // Custom Offer Image State (Edit Modal)
  const [formImageUrl, setFormImageUrl] = useState<string>("");
  const [originalImageUrl, setOriginalImageUrl] = useState<string>("");
  const [formImageFile, setFormImageFile] = useState<File | null>(null);

  const [productSearch, setProductSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Custom Offer Creation Modal State
  const [showAddCustomModal, setShowAddCustomModal] = useState(false);
  const [customOccasionName, setCustomOccasionName] = useState("");
  const [customImageFile, setCustomImageFile] = useState<File | null>(null);

  // Delete Confirmation Modal State
  const [deleteTarget, setDeleteTarget] = useState<AutomatedOffer | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async (cId: string) => {
    try {
      setLoading(true);

      // 1. Fetch Clinic Currency
      const clinicDoc = await getDoc(doc(db, "clinics", cId));
      if (clinicDoc.exists()) {
        setCurrency(clinicDoc.data().currency || "EUR");
      }

      // 2. Fetch Treatments (Products) for scope selection (Cache-First)
      const treatSnapshot = await getDocsCacheFirst(collection(db, "clinics", cId, "treatments"));
      const loadedTreatments: TreatmentItem[] = [];
      treatSnapshot.forEach((d) => {
        const data = d.data();
        loadedTreatments.push({
          id: d.id,
          title: data.title || "Untitled Product",
          categories: data.categories || [],
          bannerUrl: data.bannerUrl || "",
          nonMemberPrice: data.types?.[0]?.nonMemberPrice || 0,
        });
      });
      setTreatments(loadedTreatments);

      // 3. Fetch Automated Offers (Cache-First)
      const offersSnapshot = await getDocsCacheFirst(collection(db, "clinics", cId, "automated_offers"));
      let loadedOffersMap: Record<string, AutomatedOffer> = {};

      offersSnapshot.forEach((d) => {
        const data = d.data();
        loadedOffersMap[d.id] = {
          id: d.id,
          occasion: data.occasion || data.title || "Special Occasion",
          title: data.title || data.occasion || "Special Occasion",
          isActive: Boolean(data.isActive),
          discountType: "percentage",
          discountValue: Number(data.discountValue || 0),
          maxDiscountAmount: data.maxDiscountAmount ? Number(data.maxDiscountAmount) : null,
          allProductsIncluded: data.allProductsIncluded !== false,
          includedProductIds: Array.isArray(data.includedProductIds) ? data.includedProductIds : [],
          startDate: data.startDate || null,
          endDate: data.endDate || null,
          imageUrl: data.imageUrl || null,
          isCustom: Boolean(data.isCustom),
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
      });

      // If no offers exist in database, seed default occasions into Firestore
      const finalOffers: AutomatedOffer[] = [];
      for (const preset of DEFAULT_OCCASIONS) {
        if (loadedOffersMap[preset.id]) {
          finalOffers.push(loadedOffersMap[preset.id]);
          delete loadedOffersMap[preset.id];
        } else {
          // Seed default offer doc
          const newOffer: AutomatedOffer = {
            id: preset.id,
            occasion: preset.occasion,
            title: preset.title,
            isActive: false,
            discountType: "percentage",
            discountValue: 0,
            maxDiscountAmount: null,
            allProductsIncluded: true,
            includedProductIds: [],
            startDate: null,
            endDate: null,
            imageUrl: null,
            isCustom: false,
          };
          await setDoc(doc(db, "clinics", cId, "automated_offers", preset.id), {
            ...newOffer,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          finalOffers.push(newOffer);
        }
      }

      // Add remaining custom offers from database
      Object.values(loadedOffersMap).forEach((customOff) => {
        finalOffers.push(customOff);
      });

      setOffers(finalOffers);
    } catch (err) {
      console.error("Error loading automated offers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const cId = userDoc.data().clinicId;
          setClinicId(cId);
          await loadData(cId);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Quick Active/Inactive Toggle directly from row button
  const handleQuickToggleActive = async (offer: AutomatedOffer, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!clinicId) return;

    const newActiveState = !offer.isActive;
    // Optimistic Update
    setOffers((prev) =>
      prev.map((o) => (o.id === offer.id ? { ...o, isActive: newActiveState } : o))
    );

    try {
      await updateDoc(doc(db, "clinics", clinicId, "automated_offers", offer.id), {
        isActive: newActiveState,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Error updating active status:", err);
      // Revert on error
      setOffers((prev) =>
        prev.map((o) => (o.id === offer.id ? { ...o, isActive: offer.isActive } : o))
      );
    }
  };

  // Open Edit Modal for an Offer
  const openEditModal = (offer: AutomatedOffer) => {
    setSelectedOffer(offer);
    setFormTitle(offer.title || offer.occasion);
    setFormIsActive(offer.isActive);
    setFormDiscountValue(String(offer.discountValue || 0));
    setFormMaxDiscountAmount(offer.maxDiscountAmount ? String(offer.maxDiscountAmount) : "");
    setFormAllProductsIncluded(offer.allProductsIncluded);
    setFormIncludedProductIds(offer.includedProductIds || []);
    setFormStartDate(offer.startDate || "");
    setFormEndDate(offer.endDate || "");
    setFormImageUrl(offer.imageUrl || "");
    setOriginalImageUrl(offer.imageUrl || "");
    setFormImageFile(null);
    setProductSearch("");
    setIsEditing(true);
  };

  // Save Edit Form
  const handleSaveOffer = async () => {
    if (!clinicId || !selectedOffer) return;

    setIsSaving(true);
    const parsedVal = Math.max(0, parseFloat(formDiscountValue) || 0);
    const parsedMax = formMaxDiscountAmount ? Math.max(0, parseFloat(formMaxDiscountAmount) || 0) : null;

    let finalImageUrl = formImageUrl;

    try {
      // If a custom offer and new image file is selected, upload to Firebase Storage
      if (selectedOffer.isCustom && formImageFile) {
        finalImageUrl = await uploadImageFile(formImageFile, "automated_offers");
        if (originalImageUrl && originalImageUrl !== finalImageUrl) {
          await deleteImageFile(originalImageUrl);
        }
      } else if (selectedOffer.isCustom && !formImageUrl && originalImageUrl) {
        // If image was removed
        await deleteImageFile(originalImageUrl);
        finalImageUrl = "";
      }

      const updatedData = {
        title: formTitle.trim() || selectedOffer.occasion,
        isActive: formIsActive,
        discountType: "percentage" as const,
        discountValue: parsedVal,
        maxDiscountAmount: parsedMax,
        allProductsIncluded: formAllProductsIncluded,
        includedProductIds: formAllProductsIncluded ? [] : formIncludedProductIds,
        startDate: formStartDate ? formStartDate : null,
        endDate: formEndDate ? formEndDate : null,
        imageUrl: selectedOffer.isCustom ? (finalImageUrl || null) : null,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(doc(db, "clinics", clinicId, "automated_offers", selectedOffer.id), updatedData);

      setOffers((prev) =>
        prev.map((o) =>
          o.id === selectedOffer.id
            ? {
              ...o,
              title: updatedData.title,
              isActive: updatedData.isActive,
              discountType: updatedData.discountType,
              discountValue: updatedData.discountValue,
              maxDiscountAmount: updatedData.maxDiscountAmount,
              allProductsIncluded: updatedData.allProductsIncluded,
              includedProductIds: updatedData.includedProductIds,
              startDate: updatedData.startDate,
              endDate: updatedData.endDate,
              imageUrl: updatedData.imageUrl,
            }
            : o
        )
      );

      setIsEditing(false);
      setSelectedOffer(null);
    } catch (err) {
      console.error("Error saving automated offer:", err);
      alert("Failed to save offer. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Add Custom Occasion Offer
  const handleCreateCustomOffer = async () => {
    if (!clinicId || !customOccasionName.trim()) return;

    setIsSaving(true);
    try {
      let uploadedImageUrl: string | null = null;
      if (customImageFile) {
        uploadedImageUrl = await uploadImageFile(customImageFile, "automated_offers");
      }

      const customId = `custom_${Date.now()}`;
      const newOffer: AutomatedOffer = {
        id: customId,
        occasion: customOccasionName.trim(),
        title: customOccasionName.trim(),
        isActive: false,
        discountType: "percentage",
        discountValue: 0,
        maxDiscountAmount: null,
        allProductsIncluded: true,
        includedProductIds: [],
        startDate: null,
        endDate: null,
        imageUrl: uploadedImageUrl,
        isCustom: true,
      };

      await setDoc(doc(db, "clinics", clinicId, "automated_offers", customId), {
        ...newOffer,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setOffers((prev) => [...prev, newOffer]);
      setShowAddCustomModal(false);
      setCustomOccasionName("");
      setCustomImageFile(null);
      openEditModal(newOffer);
    } catch (err) {
      console.error("Error creating custom offer:", err);
      alert("Failed to create custom offer.");
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Custom Offer
  const handleDeleteCustomOffer = async () => {
    if (!clinicId || !deleteTarget) return;

    setIsDeleting(true);
    try {
      if (deleteTarget.imageUrl) {
        await deleteImageFile(deleteTarget.imageUrl);
      }
      await deleteDoc(doc(db, "clinics", clinicId, "automated_offers", deleteTarget.id));
      setOffers((prev) => prev.filter((o) => o.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error("Error deleting custom offer:", err);
      alert("Failed to delete offer.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Toggle single product selection
  const toggleProductSelection = (productId: string) => {
    setFormIncludedProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  // Select / Deselect All Products
  const handleSelectAllProducts = () => {
    if (formIncludedProductIds.length === treatments.length) {
      setFormIncludedProductIds([]);
    } else {
      setFormIncludedProductIds(treatments.map((t) => t.id));
    }
  };

  // Filtered offers by search bar
  const filteredOffers = offers.filter(
    (o) =>
      o.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.occasion.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filtered treatments for product selection inside modal
  const filteredTreatments = treatments.filter((t) =>
    t.title.toLowerCase().includes(productSearch.toLowerCase())
  );

  // Occasion Banner / Graphic Renderer
  const renderOccasionBadge = (offer: AutomatedOffer) => {
    // If offer has a custom uploaded square image banner
    if (offer.imageUrl) {
      return (
        <div className="w-16 h-10 rounded-lg overflow-hidden border border-neutral-200 shadow-xs bg-neutral-100 shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={offer.imageUrl}
            alt={offer.title}
            className="w-full h-full object-cover"
          />
        </div>
      );
    }

    const key = offer.id.toLowerCase();
    if (key.includes("birthday")) {
      return (
        <div className="w-16 h-10 rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white shadow-xs border border-rose-400/30 overflow-hidden relative group shrink-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent)]" />
          <Gift className="w-5 h-5 relative z-10 text-white" />
        </div>
      );
    }
    if (key.includes("anniversary")) {
      return (
        <div className="w-16 h-10 rounded-lg bg-gradient-to-br from-amber-700 via-yellow-600 to-amber-800 flex items-center justify-center text-white shadow-xs border border-amber-500/30 overflow-hidden relative shrink-0">
          <div className="absolute inset-0 bg-black/10" />
          <span className="text-[10px] font-bold tracking-wider uppercase text-amber-100 z-10 border border-amber-200/40 px-1.5 py-0.5 rounded bg-black/20">
            ★ VIP ★
          </span>
        </div>
      );
    }
    if (key.includes("patricks")) {
      return (
        <div className="w-16 h-10 rounded-lg bg-gradient-to-br from-emerald-600 to-green-700 flex items-center justify-center text-white shadow-xs border border-emerald-500/30 overflow-hidden relative shrink-0">
          <svg className="w-6 h-6 text-emerald-100 fill-current opacity-90" viewBox="0 0 24 24">
            <path d="M12 2C9.5 2 7.5 4 7.5 6.5c0 1.6 1.1 3 2.5 3.7C8 9.5 6 11 6 13.5c0 2.5 2 4.5 4.5 4.5.7 0 1.4-.2 2-.5v4h3v-4c.6.3 1.3.5 2 .5 2.5 0 4.5-2 4.5-4.5 0-2.5-2-4-4-3.3 1.4-.7 2.5-2.1 2.5-3.7C20.5 4 18.5 2 16 2c-1.8 0-3.3 1.1-4 2.6C11.3 3.1 9.8 2 8 2z" />
          </svg>
        </div>
      );
    }
    if (key.includes("christmas")) {
      return (
        <div className="w-16 h-10 rounded-lg bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center text-white shadow-xs border border-red-500/30 overflow-hidden relative shrink-0">
          <div className="absolute inset-x-0 h-1.5 bg-white/30 top-1/2 -translate-y-1/2" />
          <div className="absolute inset-y-0 w-1.5 bg-white/30 left-1/2 -translate-x-1/2" />
          <Gift className="w-5 h-5 text-white z-10 drop-shadow-xs" />
        </div>
      );
    }
    if (key.includes("halloween")) {
      return (
        <div className="w-16 h-10 rounded-lg bg-gradient-to-br from-purple-900 via-indigo-950 to-orange-600 flex items-center justify-center text-orange-400 shadow-xs border border-purple-700/40 overflow-hidden relative shrink-0">
          <span className="text-base font-extrabold tracking-tighter text-orange-400 drop-shadow-xs">🎃</span>
        </div>
      );
    }
    if (key.includes("black_friday") || key.includes("friday")) {
      return (
        <div className="w-16 h-10 rounded-lg bg-neutral-900 flex flex-col items-center justify-center text-white shadow-xs border border-neutral-700 relative overflow-hidden shrink-0">
          <span className="text-[9px] font-black tracking-widest text-red-500 uppercase leading-none">BLACK</span>
          <span className="text-[9px] font-black tracking-widest text-white uppercase leading-none">FRIDAY</span>
        </div>
      );
    }
    if (key.includes("valentine")) {
      return (
        <div className="w-16 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-white shadow-xs border border-pink-400/40 relative overflow-hidden shrink-0">
          <span className="text-sm">💖</span>
        </div>
      );
    }
    if (key.includes("easter")) {
      return (
        <div className="w-16 h-10 rounded-lg bg-gradient-to-br from-amber-400 via-teal-400 to-pink-400 flex items-center justify-center text-white shadow-xs border border-amber-200/50 relative overflow-hidden shrink-0">
          <span className="text-sm drop-shadow-xs">🥚</span>
        </div>
      );
    }
    if (key.includes("new_year") || key.includes("year")) {
      return (
        <div className="w-16 h-10 rounded-lg bg-gradient-to-br from-neutral-900 via-amber-950 to-neutral-950 flex flex-col items-center justify-center text-amber-400 border border-amber-600/40 shadow-xs relative overflow-hidden shrink-0">
          <span className="text-[8px] font-bold text-amber-300 uppercase tracking-tighter">HAPPY NEW YEAR</span>
          <span className="text-xs font-black tracking-widest text-amber-400">2027</span>
        </div>
      );
    }

    // Default Custom Badge
    return (
      <div className="w-16 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-xs border border-indigo-400/30 shrink-0">
        <Sparkles className="w-5 h-5 text-indigo-100" />
      </div>
    );
  };

  // Helper to format discount text in summary list
  const getDiscountSummaryText = (offer: AutomatedOffer) => {
    if (!offer.isActive || offer.discountValue === 0) {
      return "No Discount";
    }
    const maxText = offer.maxDiscountAmount
      ? ` (Up to ${formatCurrency(offer.maxDiscountAmount, currency)})`
      : "";
    return `${offer.discountValue}% OFF${maxText}`;
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col gap-2">
          <div className="h-8 w-64 bg-neutral-200 animate-pulse rounded-lg" />
          <div className="h-4 w-96 bg-neutral-200 animate-pulse rounded-lg" />
        </div>
        <CardGridSkeleton count={6} />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 min-h-[calc(100vh-80px)]">
      {/* ── Top Header Section ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Automated Offers</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              App Builder
            </span>
          </div>
          <p className="text-sm text-neutral-500 mt-1">
            Set automated discounts for special occasions and holidays. Configure discount rules, date ranges, and product inclusion.
          </p>
        </div>

        <button
          onClick={() => setShowAddCustomModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-black text-white text-sm font-semibold hover:bg-neutral-800 transition shadow-xs active:scale-95 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Custom Occasion
        </button>
      </div>

      {/* ── Search & Stats Bar ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search occasions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs font-medium text-neutral-500 self-end sm:self-auto">
          <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border border-neutral-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Active Offers: {offers.filter((o) => o.isActive).length}
          </span>
          <span className="bg-white px-3 py-1.5 rounded-lg border border-neutral-200">
            Total Occasions: {offers.length}
          </span>
        </div>
      </div>

      {/* ── Occasions Offer List Table/Cards ── */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-2xs overflow-hidden">
        {filteredOffers.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400">
              <Gift className="w-6 h-6" />
            </div>
            <p className="text-base font-semibold text-neutral-700">No automated offers found</p>
            <p className="text-sm text-neutral-500 max-w-sm">
              Try searching with another keyword or create a custom occasion offer.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {filteredOffers.map((offer) => {
              const isHighlight = offer.isActive && offer.discountValue > 0;

              return (
                <div
                  key={offer.id}
                  onClick={() => openEditModal(offer)}
                  className={`group flex flex-col sm:flex-row sm:items-center justify-between p-4 md:px-6 md:py-4.5 gap-4 transition cursor-pointer ${isHighlight ? "bg-rose-50/30 hover:bg-rose-50/60" : "hover:bg-neutral-50/80"
                    }`}
                >
                  {/* Left: Graphic Badge & Title */}
                  <div className="flex items-center gap-4">
                    {renderOccasionBadge(offer)}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-neutral-900 group-hover:text-black">
                          {offer.title}
                        </h3>
                        {offer.isCustom && (
                          <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 border border-neutral-200">
                            Custom
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-neutral-500 mt-0.5">
                        <span>
                          {offer.allProductsIncluded
                            ? "All Products Included"
                            : `${offer.includedProductIds.length} Product(s) Included`}
                        </span>

                        {(offer.startDate || offer.endDate) && (
                          <span className="inline-flex items-center gap-1 text-neutral-600 font-medium bg-neutral-100/70 px-2 py-0.5 rounded-md text-[11px] border border-neutral-200/60">
                            <Calendar className="w-3 h-3 text-neutral-500" />
                            {offer.startDate ? offer.startDate : "Start"} → {offer.endDate ? offer.endDate : "End"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Middle & Right: Discount Summary & Active Status Button */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 md:gap-6 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-0 border-neutral-100">
                    {/* Discount Summary */}
                    <div className="text-left sm:text-right min-w-[120px]">
                      <span
                        className={`text-sm font-semibold ${isHighlight ? "text-rose-600 font-bold" : "text-neutral-500"
                          }`}
                      >
                        {getDiscountSummaryText(offer)}
                      </span>
                    </div>

                    {/* Active / Inactive Status Toggle Pill Button */}
                    <button
                      type="button"
                      onClick={(e) => handleQuickToggleActive(offer, e)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition border ${offer.isActive
                          ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                          : "bg-rose-50/80 text-rose-600 border-rose-200 hover:bg-rose-100"
                        }`}
                    >
                      {offer.isActive ? (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Active</span>
                        </>
                      ) : (
                        <>
                          <X className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Inactive</span>
                        </>
                      )}
                    </button>

                    {/* Edit Arrow */}
                    <div className="text-neutral-400 group-hover:text-neutral-700 group-hover:translate-x-0.5 transition">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Edit Offer Modal ── */}
      <AnimatePresence>
        {isEditing && selectedOffer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="px-6 py-4.5 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
                <div className="flex items-center gap-3">
                  {renderOccasionBadge(selectedOffer)}
                  <div>
                    <h2 className="text-lg font-bold text-neutral-900">
                      Edit Automated Offer
                    </h2>
                    <p className="text-xs text-neutral-500">{selectedOffer.occasion}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditing(false)}
                  className="p-2 rounded-full hover:bg-neutral-200/60 text-neutral-400 hover:text-neutral-700 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {/* Active / Inactive Status Switch */}
                <div className="flex items-center justify-between p-4 rounded-xl border border-neutral-200 bg-neutral-50/60">
                  <div>
                    <label className="text-sm font-semibold text-neutral-900">
                      Offer Status
                    </label>
                    <p className="text-xs text-neutral-500">
                      Turn this automated offer on or off for mobile clients.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setFormIsActive(!formIsActive)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${formIsActive ? "bg-emerald-500" : "bg-neutral-300"
                      }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${formIsActive ? "translate-x-5" : "translate-x-0"
                        }`}
                    />
                  </button>
                </div>

                {/* Offer Title Input */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                    Offer Title
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Birthday Special"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-black transition"
                  />
                </div>

                {/* Custom Offer Square Image Upload (Only shown for Custom Offers) */}
                {selectedOffer.isCustom && (
                  <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50 space-y-2">
                    <ImageUploader
                      label="Square Scratch Card Banner Image (1:1 Ratio)"
                      file={formImageFile}
                      onChange={(file) => setFormImageFile(file)}
                      imageUrl={formImageUrl}
                      onClearImage={() => {
                        setFormImageUrl("");
                        setFormImageFile(null);
                      }}
                      heightClass="h-44"
                    />
                    <p className="text-[11px] text-neutral-500">
                      Upload a square image (1:1 ratio) to be displayed as the top scratch card banner on the mobile app screen for this custom offer.
                    </p>
                  </div>
                )}

                {/* Validity Period / Date Range Section */}
                <div className="space-y-3 p-4 rounded-xl border border-neutral-200 bg-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                        Validity Date Range <span className="text-neutral-400 font-normal">(Optional)</span>
                      </h4>
                      <p className="text-xs text-neutral-500">
                        Specify start and end dates for when this offer applies. Leave blank for ongoing validity.
                      </p>
                    </div>

                    {(formStartDate || formEndDate) && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormStartDate("");
                          setFormEndDate("");
                        }}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-700 underline"
                      >
                        Clear Dates
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 mb-1">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={formStartDate}
                        onChange={(e) => setFormStartDate(e.target.value)}
                        className="w-full px-3.5 py-2 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black text-neutral-800"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-neutral-600 mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={formEndDate}
                        min={formStartDate || undefined}
                        onChange={(e) => setFormEndDate(e.target.value)}
                        className="w-full px-3.5 py-2 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black text-neutral-800"
                      />
                    </div>
                  </div>
                </div>

                {/* Discount Rule Configuration */}
                <div className="space-y-4 p-4 rounded-xl border border-neutral-200 bg-white">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                    Discount Rule
                  </h4>

                  {/* Value Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-neutral-600 mb-1">
                        Discount Percentage (%)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="1"
                          value={formDiscountValue}
                          onChange={(e) => setFormDiscountValue(e.target.value)}
                          placeholder="0"
                          className="w-full pl-3.5 pr-8 py-2 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-neutral-400">
                          %
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-neutral-600 mb-1">
                        Up To Max Amount ({currency}) <span className="text-neutral-400 font-normal">(Optional)</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formMaxDiscountAmount}
                          onChange={(e) => setFormMaxDiscountAmount(e.target.value)}
                          placeholder="e.g. 50.00"
                          className="w-full pl-3.5 pr-8 py-2 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-black"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-neutral-400">
                          {currency}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Product Scope Section */}
                <div className="space-y-3 p-4 rounded-xl border border-neutral-200 bg-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                        Products Scope
                      </h4>
                      <p className="text-xs text-neutral-500">
                        Include all products or choose specific products for this offer.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setFormAllProductsIncluded(!formAllProductsIncluded)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${formAllProductsIncluded ? "bg-black" : "bg-neutral-300"
                        }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${formAllProductsIncluded ? "translate-x-5" : "translate-x-0"
                          }`}
                      />
                    </button>
                  </div>

                  {formAllProductsIncluded ? (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-medium">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      All clinic treatments and products are automatically included in this offer.
                    </div>
                  ) : (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="relative flex-1">
                          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                          <input
                            type="text"
                            placeholder="Filter products..."
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 border border-neutral-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-black"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={handleSelectAllProducts}
                          className="px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold rounded-lg transition"
                        >
                          {formIncludedProductIds.length === treatments.length
                            ? "Deselect All"
                            : "Select All"}
                        </button>
                      </div>

                      <div className="max-h-48 overflow-y-auto border border-neutral-200 rounded-xl divide-y divide-neutral-100">
                        {filteredTreatments.length === 0 ? (
                          <div className="p-4 text-center text-xs text-neutral-500">
                            No products match your search.
                          </div>
                        ) : (
                          filteredTreatments.map((item) => {
                            const isSelected = formIncludedProductIds.includes(item.id);
                            return (
                              <div
                                key={item.id}
                                onClick={() => toggleProductSelection(item.id)}
                                className={`flex items-center justify-between p-2.5 text-xs cursor-pointer hover:bg-neutral-50 transition ${isSelected ? "bg-neutral-50 font-medium" : ""
                                  }`}
                              >
                                <div className="flex items-center gap-2">
                                  {isSelected ? (
                                    <CheckSquare className="w-4 h-4 text-black shrink-0" />
                                  ) : (
                                    <Square className="w-4 h-4 text-neutral-300 shrink-0" />
                                  )}
                                  <span className="text-neutral-800">{item.title}</span>
                                </div>
                                <span className="text-neutral-400 font-mono">
                                  {formatCurrency(item.nonMemberPrice || 0, currency)}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>

                      <div className="text-right text-[11px] text-neutral-500 font-medium">
                        {formIncludedProductIds.length} of {treatments.length} product(s) selected
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-neutral-100 flex items-center justify-between bg-neutral-50/50">
                {selectedOffer.isCustom ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setDeleteTarget(selectedOffer);
                    }}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 underline"
                  >
                    Delete Custom Offer
                  </button>
                ) : (
                  <span />
                )}

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveOffer}
                    disabled={isSaving}
                    className="px-5 py-2 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 flex items-center gap-2 shadow-xs"
                  >
                    {isSaving && (
                      <div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    )}
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Add Custom Occasion Modal ── */}
      <AnimatePresence>
        {showAddCustomModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden p-6 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-neutral-900">Add Custom Occasion</h3>
                <button
                  onClick={() => {
                    setShowAddCustomModal(false);
                    setCustomImageFile(null);
                  }}
                  className="p-1 rounded-full text-neutral-400 hover:text-neutral-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-neutral-500">
                Enter the name for your custom occasion offer and upload a square scratch card banner image.
              </p>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
                  Occasion Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mid-Summer Glow Festival"
                  value={customOccasionName}
                  onChange={(e) => setCustomOccasionName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              {/* Custom Banner Image Upload */}
              <div className="space-y-1">
                <ImageUploader
                  label="Square Scratch Card Banner Image (1:1 Ratio)"
                  file={customImageFile}
                  onChange={(file) => setCustomImageFile(file)}
                  heightClass="h-36"
                />
                <p className="text-[11px] text-neutral-500">
                  This image will be displayed as the top scratch card card banner on the app home screen.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-neutral-100">
                <button
                  onClick={() => {
                    setShowAddCustomModal(false);
                    setCustomImageFile(null);
                  }}
                  className="px-4 py-2 border border-neutral-200 rounded-xl text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCustomOffer}
                  disabled={!customOccasionName.trim() || isSaving}
                  className="px-4 py-2 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving && (
                    <div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  )}
                  Create & Configure
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Delete Confirmation Modal ── */}
      {deleteTarget && (
        <DeleteConfirmModal
          isOpen={Boolean(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteCustomOffer}
          title="Delete Custom Offer?"
          description={`Are you sure you want to delete "${deleteTarget.title}"? This action cannot be undone.`}
          isDeleting={isDeleting}
        />
      )}
    </div>
  );
}
