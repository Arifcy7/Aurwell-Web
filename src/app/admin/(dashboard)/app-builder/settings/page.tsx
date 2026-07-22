"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";
import ImageUploader from "@/components/ImageUploader";
import { uploadImageFile, deleteImageFile } from "@/lib/firebase/upload";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clinicId, setClinicId] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Form State
  const [merchantName, setMerchantName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [originalLogoUrl, setOriginalLogoUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const [heroBannerUrl, setHeroBannerUrl] = useState("");
  const [originalHeroBannerUrl, setOriginalHeroBannerUrl] = useState("");
  const [heroBannerFile, setHeroBannerFile] = useState<File | null>(null);

  const [primaryColor, setPrimaryColor] = useState("#111827");
  const [currencySymbol, setCurrencySymbol] = useState("€");
  
  // Address
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [phone, setPhone] = useState("");

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
            setLogoUrl(data.logoUrl || "");
            setOriginalLogoUrl(data.logoUrl || "");
            setHeroBannerUrl(data.heroBannerUrl || "");
            setOriginalHeroBannerUrl(data.heroBannerUrl || "");
            setPrimaryColor(data.primaryColor || "#111827");
            setCurrencySymbol(data.currencySymbol || "€");
            
            if (data.address) {
              setStreet(data.address.street || "");
              setCity(data.address.city || "");
              setPostalCode(data.address.postalCode || "");
              setPhone(data.address.phone || "");
            }
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

      let finalHeroBannerUrl = heroBannerUrl;
      let shouldDeleteHero = false;

      if (heroBannerFile) {
        finalHeroBannerUrl = await uploadImageFile(heroBannerFile, "settings");
        shouldDeleteHero = true;
      } else if (!heroBannerUrl && originalHeroBannerUrl) {
        shouldDeleteHero = true;
      }

      const updateData = {
        merchantName,
        logoUrl: finalLogoUrl || "",
        heroBannerUrl: finalHeroBannerUrl || "",
        primaryColor,
        currencySymbol,
        address: {
          street,
          city,
          postalCode,
          phone,
        },
      };

      await updateDoc(doc(db, "clinics", clinicId), updateData);

      if (shouldDeleteLogo && originalLogoUrl) {
        await deleteImageFile(originalLogoUrl);
      }
      if (shouldDeleteHero && originalHeroBannerUrl) {
        await deleteImageFile(originalHeroBannerUrl);
      }

      setOriginalLogoUrl(finalLogoUrl);
      setOriginalHeroBannerUrl(finalHeroBannerUrl);
      setLogoFile(null);
      setHeroBannerFile(null);

      setSuccessMessage("Clinic configuration & branding updated successfully!");
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
        <p className="text-sm text-neutral-500">Configure clinic profile, custom branding colors, and contact info</p>
      </div>

      {successMessage && (
        <div className="rounded-full bg-green-50 border border-green-200 px-5 py-3 text-xs font-semibold text-green-800 shadow-sm animate-fadeIn">
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSaveSettings} className="rounded-3xl border border-neutral-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
        {/* Brand Details */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold tracking-tight text-neutral-900 border-b border-neutral-100 pb-2">
            General Branding Profile
          </h3>

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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ImageUploader
              file={logoFile}
              onChange={setLogoFile}
              imageUrl={logoUrl}
              onClearImage={() => setLogoUrl("")}
              label="Clinic App Logo"
            />

            <ImageUploader
              file={heroBannerFile}
              onChange={setHeroBannerFile}
              imageUrl={heroBannerUrl}
              onClearImage={() => setHeroBannerUrl("")}
              label="App Home Hero Header Banner"
            />
          </div>
        </div>

        {/* Color Theme & Currency */}
        <div className="space-y-4 pt-2">
          <h3 className="text-sm font-bold tracking-tight text-neutral-900 border-b border-neutral-100 pb-2">
            Theme Customization & Currency
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Primary Accent Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-10 w-12 rounded-xl border border-neutral-200 cursor-pointer p-1 bg-white"
                />
                <input
                  type="text"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="input-modern flex-1 font-mono text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Default Currency Symbol</label>
              <input
                type="text"
                required
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value)}
                className="input-modern"
                placeholder="e.g. € or $"
              />
            </div>
          </div>
        </div>

        {/* Contact Info */}
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
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                className="input-modern"
                placeholder="e.g. 104 Harley Street"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">City</label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="input-modern"
                placeholder="e.g. London"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Postal Code</label>
              <input
                type="text"
                required
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="input-modern"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Phone</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input-modern"
              />
            </div>
          </div>
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
