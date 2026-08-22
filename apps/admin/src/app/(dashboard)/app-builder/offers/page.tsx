"use client";

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";
import { fetchWithVersionCache, incrementCollectionVersion, updateLocalCache } from "@/lib/firebase/versionCache";
import ImageUploader from "@/components/ImageUploader";
import { uploadImageFile, deleteImageFile } from "@/lib/firebase/upload";
import { CardGridSkeleton } from "@/components/Loader";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import Modal from "@/components/Modal";
import { formatCurrency } from "@/lib/utils/currency";
import {
  Sparkles,
  Search,
  Check,
  X,
  Plus,
  Tag,
  Gift,
  Calendar,
  CheckSquare,
  Square,
  ChevronRight,
  Cake,
  Heart,
  Crown,
  Flame,
  PartyPopper,
} from "lucide-react";

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

      // 2. Fetch Treatments with Version Cache
      const loadedTreatments = await fetchWithVersionCache<TreatmentItem>(
        cId,
        "treatments",
        async () => {
          const treatSnapshot = await getDocs(collection(db, "clinics", cId, "treatments"));
          const list: TreatmentItem[] = [];
          treatSnapshot.forEach((d) => {
            const data = d.data();
            list.push({
              id: d.id,
              title: data.title || "Untitled Product",
              categories: data.categories || [],
              bannerUrl: data.bannerUrl || "",
              nonMemberPrice: data.types?.[0]?.nonMemberPrice || 0,
            });
          });
          return list;
        }
      );
      setTreatments(loadedTreatments);

      // 3. Fetch Automated Offers with Version Cache
      const finalOffers = await fetchWithVersionCache<AutomatedOffer>(
        cId,
        "automated_offers",
        async () => {
          const offersSnapshot = await getDocs(collection(db, "clinics", cId, "automated_offers"));
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

          // Check defaults / presets and ensure seeded
          const list: AutomatedOffer[] = [];
          for (const preset of DEFAULT_OCCASIONS) {
            if (loadedOffersMap[preset.id]) {
              list.push(loadedOffersMap[preset.id]);
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
              setDoc(doc(db, "clinics", cId, "automated_offers", preset.id), {
                ...newOffer,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              }).catch(() => {});
              list.push(newOffer);
            }
          }

          // Add remaining custom offers
          Object.values(loadedOffersMap).forEach((customOff) => {
            list.push(customOff);
          });

          return list;
        }
      );

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
    updateLocalCache<AutomatedOffer>(clinicId, "automated_offers", (prev) =>
      prev.map((o) => (o.id === offer.id ? { ...o, isActive: newActiveState } : o))
    );

    try {
      await updateDoc(doc(db, "clinics", clinicId, "automated_offers", offer.id), {
        isActive: newActiveState,
        updatedAt: serverTimestamp(),
      });
      await incrementCollectionVersion(clinicId, "automated_offers");
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
  const handleSaveOffer = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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

      updateLocalCache<AutomatedOffer>(clinicId, "automated_offers", (prev) =>
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

      await incrementCollectionVersion(clinicId, "automated_offers");

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
  const handleCreateCustomOffer = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
      updateLocalCache<AutomatedOffer>(clinicId, "automated_offers", (prev) => [...prev, newOffer]);
      await incrementCollectionVersion(clinicId, "automated_offers");

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
      updateLocalCache<AutomatedOffer>(clinicId, "automated_offers", (prev) =>
        prev.filter((o) => o.id !== deleteTarget.id)
      );
      await incrementCollectionVersion(clinicId, "automated_offers");
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

  // Occasion Badge Renderer (Sleek monochrome / luxury aesthetic matching Aurwell)
  const renderOccasionBadge = (offer: AutomatedOffer) => {
    // If offer has a custom uploaded square image banner
    if (offer.imageUrl) {
      return (
        <div className="w-12 h-12 rounded-2xl overflow-hidden border border-neutral-200 shadow-xs bg-neutral-100 shrink-0">
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
    let IconComponent = Sparkles;

    if (key.includes("birthday")) IconComponent = Cake;
    else if (key.includes("anniversary")) IconComponent = Crown;
    else if (key.includes("patricks")) IconComponent = Sparkles;
    else if (key.includes("christmas")) IconComponent = Gift;
    else if (key.includes("halloween")) IconComponent = Flame;
    else if (key.includes("black_friday") || key.includes("friday")) IconComponent = Tag;
    else if (key.includes("valentine")) IconComponent = Heart;
    else if (key.includes("easter")) IconComponent = Sparkles;
    else if (key.includes("new_year") || key.includes("year")) IconComponent = PartyPopper;

    return (
      <div className="w-12 h-12 rounded-2xl bg-neutral-900 text-white flex items-center justify-center shadow-xs border border-neutral-800 shrink-0">
        <IconComponent className="w-5 h-5 text-neutral-100" />
      </div>
    );
  };

  // Helper to format discount text in summary list
  const getDiscountSummaryText = (offer: AutomatedOffer) => {
    if (!offer.isActive || offer.discountValue === 0) {
      return "No Discount Set";
    }
    const maxText = offer.maxDiscountAmount
      ? ` (Up to ${formatCurrency(offer.maxDiscountAmount, currency)})`
      : "";
    return `${offer.discountValue}% OFF${maxText}`;
  };

  if (loading) {
    return (
      <div className="space-y-8 w-full">
        <div className="flex flex-col gap-2">
          <div className="h-8 w-64 bg-neutral-200 animate-pulse rounded-lg" />
          <div className="h-4 w-96 bg-neutral-200 animate-pulse rounded-lg" />
        </div>
        <CardGridSkeleton count={4} />
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full">
      {/* ── Top Header Section ── */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold tracking-tight text-neutral-900">Automated Offers</h2>
            <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200/80">
              App Builder
            </span>
          </div>
          <p className="text-sm text-neutral-500 mt-0.5">
            Configure automated seasonal promotions, holiday offers, and scratch card discount campaigns for your patient app.
          </p>
        </div>

        <button
          onClick={() => setShowAddCustomModal(true)}
          className="rounded-full bg-neutral-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-neutral-800 shadow-sm transition flex items-center gap-2 self-start cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Custom Occasion
        </button>
      </div>

      {/* ── Search & Metrics Bar ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Search occasions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-8 py-2 bg-white border border-neutral-200 rounded-full text-xs focus:outline-none focus:ring-2 focus:ring-neutral-900 transition shadow-2xs font-medium text-neutral-800"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2.5 text-xs font-semibold text-neutral-600 self-end sm:self-auto">
          <span className="flex items-center gap-1.5 bg-white px-3.5 py-1.5 rounded-full border border-neutral-200 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Active Offers: {offers.filter((o) => o.isActive).length}
          </span>
          <span className="bg-white px-3.5 py-1.5 rounded-full border border-neutral-200 shadow-2xs text-neutral-500">
            Total: {offers.length}
          </span>
        </div>
      </div>

      {/* ── Occasions Offer List ── */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        {filteredOffers.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400">
              <Gift className="w-6 h-6" />
            </div>
            <p className="text-base font-bold text-neutral-800">No automated offers found</p>
            <p className="text-xs text-neutral-400 max-w-sm">
              Try searching with another keyword or create a new custom occasion offer.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {filteredOffers.map((offer) => {
              const isLive = offer.isActive && offer.discountValue > 0;

              return (
                <div
                  key={offer.id}
                  onClick={() => openEditModal(offer)}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:px-6 sm:py-4.5 gap-4 transition hover:bg-neutral-50/80 cursor-pointer"
                >
                  {/* Left: Emblem Badge & Title Info */}
                  <div className="flex items-center gap-4">
                    {renderOccasionBadge(offer)}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm sm:text-base font-bold text-neutral-900 group-hover:text-black transition">
                          {offer.title}
                        </h3>
                        {offer.isCustom && (
                          <span className="text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200">
                            Custom
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500 mt-1">
                        <span className="font-medium">
                          {offer.allProductsIncluded
                            ? "All Products Included"
                            : `${offer.includedProductIds.length} Product(s) Included`}
                        </span>

                        {(offer.startDate || offer.endDate) && (
                          <span className="inline-flex items-center gap-1.5 text-neutral-600 font-semibold bg-neutral-100 px-2.5 py-0.5 rounded-full text-[10px] border border-neutral-200/60">
                            <Calendar className="w-3 h-3 text-neutral-500" />
                            {offer.startDate ? offer.startDate : "Start"} → {offer.endDate ? offer.endDate : "End"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Discount Summary & Status Button */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-0 border-neutral-100">
                    {/* Discount Summary */}
                    <div className="text-left sm:text-right min-w-[120px]">
                      <span
                        className={`text-xs sm:text-sm font-bold ${
                          isLive ? "text-neutral-900" : "text-neutral-400 font-medium"
                        }`}
                      >
                        {getDiscountSummaryText(offer)}
                      </span>
                    </div>

                    {/* Active / Inactive Status Toggle Pill Button */}
                    <button
                      type="button"
                      onClick={(e) => handleQuickToggleActive(offer, e)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition border cursor-pointer ${
                        offer.isActive
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200/80 hover:bg-emerald-100"
                          : "bg-neutral-100 text-neutral-600 border-neutral-200 hover:bg-neutral-200/80"
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

                    {/* Edit Arrow Indicator */}
                    <div className="text-neutral-400 group-hover:text-neutral-800 group-hover:translate-x-0.5 transition">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Edit Offer Modal (Unified with Aurwell Modal System) ── */}
      <Modal
        isOpen={isEditing && Boolean(selectedOffer)}
        onClose={() => setIsEditing(false)}
        title={selectedOffer?.title || "Edit Automated Offer"}
        subtitle="Automated Campaign Settings"
        maxWidth="max-w-3xl"
      >
        {selectedOffer && (
          <form onSubmit={handleSaveOffer} className="space-y-6">
            {/* Active / Inactive Status Switch */}
            <div className="flex items-center justify-between p-4 rounded-2xl border border-neutral-200/80 bg-neutral-50/50">
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-neutral-800">
                  Live Campaign Status
                </label>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Activate or deactivate this automated offer for patient mobile app users.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neutral-900"></div>
              </label>
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
                className="w-full px-4 py-2.5 rounded-2xl border border-neutral-200 text-sm font-medium text-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900 transition bg-white"
              />
            </div>

            {/* Custom Offer Square Image Upload (Only shown for Custom Offers) */}
            {selectedOffer.isCustom && (
              <div className="p-4 rounded-2xl border border-neutral-200/80 bg-neutral-50/50 space-y-2">
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
                <p className="text-[11px] text-neutral-500 font-medium">
                  Upload a 1:1 square artwork to be displayed on top of the scratch card in the mobile app.
                </p>
              </div>
            )}

            {/* Discount Rule Configuration */}
            <div className="space-y-4 p-5 rounded-2xl border border-neutral-200/80 bg-neutral-50/50">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                Discount Rule
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1.5">
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
                      className="w-full pl-4 pr-9 py-2.5 border border-neutral-200 rounded-2xl text-sm font-medium text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900 transition"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">
                      %
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                    Max Discount Cap ({currency}) <span className="text-neutral-400 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formMaxDiscountAmount}
                      onChange={(e) => setFormMaxDiscountAmount(e.target.value)}
                      placeholder="e.g. 50.00"
                      className="w-full pl-4 pr-12 py-2.5 border border-neutral-200 rounded-2xl text-sm font-medium text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900 transition"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400">
                      {currency}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Validity Period / Date Range Section */}
            <div className="space-y-4 p-5 rounded-2xl border border-neutral-200/80 bg-neutral-50/50">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                    Validity Date Range <span className="text-neutral-400 font-normal">(Optional)</span>
                  </h4>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Restrict offer redemption to a specific active window. Leave empty for open ongoing validity.
                  </p>
                </div>

                {(formStartDate || formEndDate) && (
                  <button
                    type="button"
                    onClick={() => {
                      setFormStartDate("");
                      setFormEndDate("");
                    }}
                    className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 underline cursor-pointer"
                  >
                    Clear Dates
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full px-4 py-2.5 border border-neutral-200 rounded-2xl text-xs font-medium text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-600 mb-1.5">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formEndDate}
                    min={formStartDate || undefined}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full px-4 py-2.5 border border-neutral-200 rounded-2xl text-xs font-medium text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900 transition"
                  />
                </div>
              </div>
            </div>

            {/* Product Scope Section */}
            <div className="space-y-4 p-5 rounded-2xl border border-neutral-200/80 bg-neutral-50/50">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700">
                    Product Scope
                  </h4>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    Apply discount across the entire catalogue or select specific eligible treatments.
                  </p>
                </div>

                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formAllProductsIncluded}
                    onChange={(e) => setFormAllProductsIncluded(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neutral-900"></div>
                </label>
              </div>

              {formAllProductsIncluded ? (
                <div className="p-3.5 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-800 font-semibold">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  All clinic treatments and products are eligible for this discount offer.
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between gap-3">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                      <input
                        type="text"
                        placeholder="Filter products..."
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-neutral-200 rounded-full text-xs font-medium text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={handleSelectAllProducts}
                      className="px-3.5 py-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 text-xs font-bold rounded-full transition cursor-pointer"
                    >
                      {formIncludedProductIds.length === treatments.length
                        ? "Deselect All"
                        : "Select All"}
                    </button>
                  </div>

                  <div className="max-h-52 overflow-y-auto border border-neutral-200 rounded-2xl divide-y divide-neutral-100 bg-white">
                    {filteredTreatments.length === 0 ? (
                      <div className="p-4 text-center text-xs text-neutral-400">
                        No products match your search.
                      </div>
                    ) : (
                      filteredTreatments.map((item) => {
                        const isSelected = formIncludedProductIds.includes(item.id);
                        return (
                          <div
                            key={item.id}
                            onClick={() => toggleProductSelection(item.id)}
                            className={`flex items-center justify-between p-3 text-xs cursor-pointer hover:bg-neutral-50 transition ${
                              isSelected ? "bg-neutral-50 font-bold" : "font-medium"
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-neutral-900 shrink-0" />
                              ) : (
                                <Square className="w-4 h-4 text-neutral-300 shrink-0" />
                              )}
                              <span className="text-neutral-800">{item.title}</span>
                            </div>
                            <span className="text-neutral-500 font-semibold font-mono">
                              {formatCurrency(item.nonMemberPrice || 0, currency)}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="text-right text-[11px] text-neutral-500 font-semibold">
                    {formIncludedProductIds.length} of {treatments.length} product(s) selected
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="pt-3 flex items-center justify-between border-t border-neutral-100 mt-6">
              {selectedOffer.isCustom ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setDeleteTarget(selectedOffer);
                  }}
                  className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 transition cursor-pointer shadow-2xs"
                >
                  Delete Offer
                </button>
              ) : (
                <span />
              )}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="rounded-full border border-neutral-200 bg-white px-5 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-full bg-neutral-900 px-6 py-2.5 text-xs font-bold text-white hover:bg-neutral-800 transition disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  {isSaving && (
                    <div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  )}
                  Save Changes
                </button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* ── Add Custom Occasion Modal (Unified with Aurwell Modal System) ── */}
      <Modal
        isOpen={showAddCustomModal}
        onClose={() => {
          setShowAddCustomModal(false);
          setCustomImageFile(null);
        }}
        title="Add Custom Occasion"
        subtitle="Seasonal Campaigns"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateCustomOffer} className="space-y-5">
          <p className="text-xs text-neutral-500 font-medium">
            Create a custom occasion campaign for special clinic events, anniversaries, or seasonal festivals.
          </p>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 mb-1.5">
              Occasion Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Mid-Summer Glow Festival"
              value={customOccasionName}
              onChange={(e) => setCustomOccasionName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-2xl border border-neutral-200 text-sm font-medium text-neutral-800 bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900 transition"
            />
          </div>

          {/* Custom Banner Image Upload */}
          <div className="space-y-2">
            <ImageUploader
              label="Square Scratch Card Banner Image (1:1 Ratio)"
              file={customImageFile}
              onChange={(file) => setCustomImageFile(file)}
              heightClass="h-40"
            />
            <p className="text-[11px] text-neutral-500 font-medium">
              This image will be displayed on the scratch card within the patient mobile app.
            </p>
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => {
                setShowAddCustomModal(false);
                setCustomImageFile(null);
              }}
              className="rounded-full border border-neutral-200 bg-white px-5 py-2.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!customOccasionName.trim() || isSaving}
              className="rounded-full bg-neutral-900 px-6 py-2.5 text-xs font-bold text-white hover:bg-neutral-800 transition disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-sm"
            >
              {isSaving && (
                <div className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
              )}
              Create & Configure
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Delete Confirmation Modal ── */}
      <DeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteCustomOffer}
        title="Delete Custom Offer?"
        description={`Are you sure you want to delete "${deleteTarget?.title}"? This promotional campaign will be permanently removed.`}
        isDeleting={isDeleting}
      />
    </div>
  );
}
