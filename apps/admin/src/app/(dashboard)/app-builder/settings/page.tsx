"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";
import ImageUploader from "@/components/ImageUploader";
import ColorPickerDropdown from "@/components/ColorPickerDropdown";
import AppDockMockup from "@/components/AppDockMockup";
import { uploadImageFile, deleteImageFile } from "@/lib/firebase/upload";
import { COUNTRIES, CURRENCIES, TIMEZONES } from "@/lib/constants";
import { CreditCard, CheckCircle2, AlertCircle, Mail } from "lucide-react";

/**
 * Silently extracts latitude and longitude from Google Maps URLs
 */
function extractCoordinatesFromGoogleMapUrl(url: string): { latitude: number | null; longitude: number | null } {
  if (!url) return { latitude: null, longitude: null };

  try {
    // 1. Matches /@(-?\d+\.\d+),(-?\d+\.\d+)/ e.g. https://www.google.com/maps/@37.7749,-122.4194,15z
    const atMatch = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) {
      return {
        latitude: parseFloat(atMatch[1]),
        longitude: parseFloat(atMatch[2]),
      };
    }

    // 2. Matches ?q=lat,lng or &q=lat,lng or ?ll=lat,lng e.g. https://maps.google.com/?q=37.7749,-122.4194
    const qMatch = url.match(/[?&](?:q|ll|center)=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (qMatch) {
      return {
        latitude: parseFloat(qMatch[1]),
        longitude: parseFloat(qMatch[2]),
      };
    }

    // 3. Matches destination=lat,lng or saddr=lat,lng or daddr=lat,lng
    const destMatch = url.match(/[?&](?:destination|daddr|saddr)=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (destMatch) {
      return {
        latitude: parseFloat(destMatch[1]),
        longitude: parseFloat(destMatch[2]),
      };
    }
  } catch (err) {
    console.error("Error parsing Google Maps coordinates:", err);
  }

  return { latitude: null, longitude: null };
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clinicId, setClinicId] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Form State matching FIREBASE_SCHEMA.md (/clinics/{clinicId})
  const [merchantName, setMerchantName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [originalLogoUrl, setOriginalLogoUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const [appHeroImageUrl, setAppHeroImageUrl] = useState("");
  const [originalAppHeroImageUrl, setOriginalAppHeroImageUrl] = useState("");
  const [appHeroImageFile, setAppHeroImageFile] = useState<File | null>(null);

  const [brandColor, setBrandColor] = useState("#111827");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [treatmentListText, setTreatmentListText] = useState("");
  const [description, setDescription] = useState("");
  const [currency, setCurrency] = useState(CURRENCIES[0].code);
  const [timezone, setTimezone] = useState(TIMEZONES[0].value);
  const [country, setCountry] = useState(COUNTRIES[0].code);

  // Address & Contact
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [phone, setPhone] = useState("");
  const [googleMapUrl, setGoogleMapUrl] = useState("");
  const [blogSectionTitle, setBlogSectionTitle] = useState("Blogs");

  // Stripe Setup Status
  const [stripeSetup, setStripeSetup] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const cId = userDoc.data().clinicId;
          setClinicId(cId);

          const clinicDoc = await getDoc(doc(db, "clinics", cId));
          if (clinicDoc.exists()) {
            const data = clinicDoc.data();
            setMerchantName(data.merchantName || "");
            
            // Stripe Setup Check according to FIREBASE_SCHEMA.md (/clinics/{clinicId})
            const isStripeConfigured = Boolean(
              data.stripe &&
                typeof data.stripe === "object" &&
                Object.keys(data.stripe).length > 0 &&
                data.stripe.enabled !== false
            );
            setStripeSetup(isStripeConfigured);
            
            // Logo
            setLogoUrl(data.logoUrl || "");
            setOriginalLogoUrl(data.logoUrl || "");

            // Hero Image
            const heroUrl = data.appHeroImageUrl || data.heroBannerUrl || "";
            setAppHeroImageUrl(heroUrl);
            setOriginalAppHeroImageUrl(heroUrl);

            // Branding & Details
            setBrandColor(data.brandColor || data.primaryColor || "#111827");
            setWebsiteUrl(data.websiteUrl || "");
            if (Array.isArray(data.treatmentList)) {
              setTreatmentListText(data.treatmentList.join(", "));
            } else if (typeof data.treatmentList === "string") {
              setTreatmentListText(data.treatmentList);
            }
            setDescription(data.description || "");

            // Regional & Currency
            setCurrency(data.currency || CURRENCIES[0].code);
            setTimezone(data.timezone || TIMEZONES[0].value);
            setCountry(data.country || COUNTRIES[0].code);

            // Location & Contact (with fallback for legacy nested object)
            if (typeof data.address === "object" && data.address !== null) {
              setAddress([data.address.street, data.address.city].filter(Boolean).join(", "));
              setPostalCode(data.address.postalCode || data.postalCode || "");
              setPhone(data.address.phone || data.phone || "");
            } else {
              setAddress(data.address || "");
              setPostalCode(data.postalCode || "");
              setPhone(data.phone || "");
            }

            setGoogleMapUrl(data.googleMapUrl || "");
            setBlogSectionTitle(data.blogSectionTitle || "Blogs");
          }
        }
      } catch (err) {
        console.error("Error fetching clinic settings:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicId) return;

    setSaving(true);
    setSuccessMessage("");

    try {
      let finalLogoUrl = logoUrl;
      let shouldDeleteLogo = false;

      if (logoFile) {
        finalLogoUrl = await uploadImageFile(logoFile, "settings");
        shouldDeleteLogo = true;
      } else if (!logoUrl && originalLogoUrl) {
        shouldDeleteLogo = true;
      }

      let finalAppHeroImageUrl = appHeroImageUrl;
      let shouldDeleteHero = false;

      if (appHeroImageFile) {
        finalAppHeroImageUrl = await uploadImageFile(appHeroImageFile, "settings");
        shouldDeleteHero = true;
      } else if (!appHeroImageUrl && originalAppHeroImageUrl) {
        shouldDeleteHero = true;
      }

      // Parse coordinates silently from googleMapUrl
      const { latitude, longitude } = extractCoordinatesFromGoogleMapUrl(googleMapUrl);

      const updateData: Record<string, any> = {
        merchantName,
        logoUrl: finalLogoUrl || "",
        brandColor,
        websiteUrl,
        treatmentList: treatmentListText
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        description,
        currency,
        timezone,
        country,
        address,
        postalCode,
        phone,
        googleMapUrl,
        appHeroImageUrl: finalAppHeroImageUrl || "",
        blogSectionTitle,
      };

      if (latitude !== null) updateData.latitude = latitude;
      if (longitude !== null) updateData.longitude = longitude;

      await updateDoc(doc(db, "clinics", clinicId), updateData);

      if (shouldDeleteLogo && originalLogoUrl) {
        await deleteImageFile(originalLogoUrl);
      }
      if (shouldDeleteHero && originalAppHeroImageUrl) {
        await deleteImageFile(originalAppHeroImageUrl);
      }

      setOriginalLogoUrl(finalLogoUrl);
      setOriginalAppHeroImageUrl(finalAppHeroImageUrl);
      setLogoFile(null);
      setAppHeroImageFile(null);

      setSuccessMessage("Clinic configuration & settings updated successfully!");
      setTimeout(() => setSuccessMessage(""), 4000);
    } catch (err) {
      console.error("Error updating settings:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-black"></div>
          <p className="text-sm font-medium text-neutral-500">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-lg font-bold tracking-tight">App Settings & Branding</h2>
        <p className="text-sm text-neutral-500">
          Configure clinic profile, white-label branding, currency, and contact information
        </p>
      </div>

      {successMessage && (
        <div className="rounded-full bg-green-50 border border-green-200 px-5 py-3 text-xs font-semibold text-green-800 shadow-sm animate-fadeIn">
          {successMessage}
        </div>
      )}

      <form
        onSubmit={handleSaveSettings}
        className="rounded-3xl border border-neutral-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6"
      >
        {/* Brand & Profile Details */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold tracking-tight text-neutral-900 border-b border-neutral-100 pb-2">
            General Branding Profile
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Clinic Merchant Name</label>
              <input
                type="text"
                required
                value={merchantName}
                onChange={(e) => setMerchantName(e.target.value)}
                className="input-modern"
                placeholder="e.g. Aurwell Aesthetic Clinic"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Clinic Website URL</label>
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="input-modern"
                placeholder="https://example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Clinic Bio / Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="textarea-modern"
              placeholder="Describe your clinic services and patient values..."
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
              Treatment Tags <span className="text-[10px] text-neutral-400 font-normal">(comma-separated)</span>
            </label>
            <input
              type="text"
              value={treatmentListText}
              onChange={(e) => setTreatmentListText(e.target.value)}
              className="input-modern"
              placeholder="e.g. Laser, Botox, Chemical Peel, Facial"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <AppDockMockup
              file={logoFile}
              onChange={setLogoFile}
              imageUrl={logoUrl}
              onClearImage={() => setLogoUrl("")}
              label="Clinic App Logo"
            />

            <ImageUploader
              file={appHeroImageFile}
              onChange={setAppHeroImageFile}
              imageUrl={appHeroImageUrl}
              onClearImage={() => setAppHeroImageUrl("")}
              label="App Home Hero Header Banner"
              heightClass="aspect-[3/2]"
            />
          </div>
        </div>

        {/* Color Theme & Regional / Currency Settings */}
        <div className="space-y-4 pt-2">
          <h3 className="text-sm font-bold tracking-tight text-neutral-900 border-b border-neutral-100 pb-2">
            Theme, Currency & Regional Settings
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <ColorPickerDropdown
                value={brandColor}
                onChange={setBrandColor}
                label="Brand Accent Color"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Operating Base Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="select-modern"
              >
                {CURRENCIES.map((cur) => (
                  <option key={cur.code} value={cur.code}>
                    {cur.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Country</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="select-modern"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Timezone</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="select-modern"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Blog Section Display Title</label>
            <input
              type="text"
              value={blogSectionTitle}
              onChange={(e) => setBlogSectionTitle(e.target.value)}
              className="input-modern"
              placeholder="Blogs"
            />
          </div>
        </div>

        {/* Contact & Location Info */}
        <div className="space-y-4 pt-2">
          <h3 className="text-sm font-bold tracking-tight text-neutral-900 border-b border-neutral-100 pb-2">
            Clinic Contact & Location Info
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Street Address</label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="input-modern"
                placeholder="e.g. 104 Harley Street, London"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Postal Code</label>
              <input
                type="text"
                required
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="input-modern"
                placeholder="e.g. W1G 7JD"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Contact Phone</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input-modern"
                placeholder="+44 20 7946 0912"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Google Maps Location URL</label>
              <input
                type="url"
                value={googleMapUrl}
                onChange={(e) => setGoogleMapUrl(e.target.value)}
                className="input-modern"
                placeholder="https://maps.google.com/?q=51.5173,-0.1472"
              />
            </div>
          </div>
        </div>

        {/* Stripe Payment Gateway Integration */}
        <div className="space-y-4 pt-2">
          <h3 className="text-sm font-bold tracking-tight text-neutral-900 border-b border-neutral-100 pb-2">
            Stripe Payment Gateway Integration
          </h3>

          {stripeSetup ? (
            <div className="rounded-2xl bg-emerald-50/70 border border-emerald-100 p-5 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center flex-shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-neutral-900 tracking-tight">Stripe Connected Successfully</h4>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Online payments and memberships are active for your clinic.
                    </p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100/80 px-3.5 py-1.5 text-xs font-semibold text-emerald-800 border border-emerald-200/80 self-start sm:self-auto">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Connected
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-amber-50/60 border border-amber-200/80 p-5 space-y-3 transition-all">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-amber-950 tracking-tight">Stripe Payment Gateway Not Set Up</h4>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100/80 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200/80">
                      <AlertCircle className="w-3 h-3 text-amber-600" />
                      Not Configured
                    </span>
                  </div>
                  <p className="text-xs text-amber-900/80 leading-relaxed max-w-2xl">
                    Stripe is not configured for your clinic yet. To start accepting online payments and subscriptions, please contact our team at{" "}
                    <a
                      href="mailto:contact@aurwell.app"
                      className="inline-flex items-center gap-1 font-bold text-amber-950 underline underline-offset-2 hover:text-amber-800 transition-colors"
                    >
                      <Mail className="w-3 h-3 inline" />
                      contact@aurwell.app
                    </a>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="pt-2 flex justify-end border-t border-neutral-100">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-neutral-900 px-6 py-2.5 text-xs font-bold text-white hover:bg-neutral-800 transition cursor-pointer"
          >
            {saving ? "Saving Changes..." : "Save Configuration"}
          </button>
        </div>
      </form>
    </div>
  );
}

