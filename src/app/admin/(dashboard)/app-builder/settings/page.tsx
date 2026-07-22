"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";
import { COUNTRIES, TIMEZONES } from "@/lib/constants";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clinicId, setClinicId] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Clinic State
  const [merchantName, setMerchantName] = useState("");
  const [brandColor, setBrandColor] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [description, setDescription] = useState("");
  const [timezone, setTimezone] = useState("");
  const [country, setCountry] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [phone, setPhone] = useState("");
  const [googleMapUrl, setGoogleMapUrl] = useState("");
  const [latitude, setLatitude] = useState<number | "">("");
  const [longitude, setLongitude] = useState<number | "">("");
  const [resolvingMap, setResolvingMap] = useState(false);
  const [mapError, setMapError] = useState("");

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
            setBrandColor(data.brandColor || "#000000");
            setWebsiteUrl(data.websiteUrl || "");
            setDescription(data.description || "");
            setTimezone(data.timezone || "");
            setCountry(data.country || "");
            setAddress(data.address || "");
            setPostalCode(data.postalCode || "");
            setPhone(data.phone || "");
            setGoogleMapUrl(data.googleMapUrl || "");
            setLatitude(data.latitude ?? "");
            setLongitude(data.longitude ?? "");
          }
        }
      } catch (err) {
        console.error("Error loading settings:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Auto-resolve Google Maps link to coordinates
  useEffect(() => {
    if (!googleMapUrl) {
      setLatitude("");
      setLongitude("");
      setMapError("");
      return;
    }

    const isGoogleMapsLink =
      googleMapUrl.includes("maps.app.goo.gl") ||
      googleMapUrl.includes("goo.gl/maps") ||
      googleMapUrl.includes("google.com/maps") ||
      googleMapUrl.includes("maps.google.com");

    if (!isGoogleMapsLink) {
      setMapError("Please enter a valid Google Maps link");
      return;
    }

    setMapError("");

    const timer = setTimeout(async () => {
      setResolvingMap(true);
      try {
        const idToken = await auth.currentUser?.getIdToken();
        if (!idToken) return;

        const res = await fetch("/api/resolve-map-link", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${idToken}`,
          },
          body: JSON.stringify({ url: googleMapUrl }),
        });

        if (!res.ok) {
          throw new Error("Failed to resolve URL");
        }

        const data = await res.json();
        if (data.success) {
          setLatitude(data.latitude);
          setLongitude(data.longitude);
          setMapError("");
        } else {
          setMapError("Could not extract coordinates from link automatically.");
        }
      } catch (err) {
        console.error("Error resolving map link:", err);
        setMapError("Error parsing coordinates from link.");
      } finally {
        setResolvingMap(false);
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [googleMapUrl]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicId) return;

    setSaving(true);
    setSuccessMsg("");

    try {
      await updateDoc(doc(db, "clinics", clinicId), {
        merchantName,
        brandColor,
        websiteUrl,
        description,
        timezone,
        country,
        address,
        postalCode,
        phone,
        googleMapUrl,
        latitude: latitude !== "" ? latitude : null,
        longitude: longitude !== "" ? longitude : null,
      });

      setSuccessMsg("Settings updated successfully!");
      // Auto clear alert
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error("Error saving settings:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-neutral-500">Loading settings...</div>;
  }

  return (
    <div className="space-y-6 w-full">
      <div>
        <h2 className="text-lg font-bold tracking-tight">App Configuration & Branding</h2>
        <p className="text-sm text-neutral-500">Update clinic branding, contact, and profile settings</p>
      </div>

      <form onSubmit={handleSaveSettings} className="rounded-3xl border border-neutral-100 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
        {successMsg && (
          <div className="rounded-full border border-green-200 bg-green-50 px-4 py-2 text-xs font-semibold text-green-800">
            {successMsg}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {/* Brand Name & Color */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Merchant Name</label>
              <input
                type="text"
                required
                value={merchantName}
                onChange={(e) => setMerchantName(e.target.value)}
                className="input-modern"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Brand Primary Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="h-10 w-12 cursor-pointer rounded-full border border-neutral-200 p-0 overflow-hidden bg-transparent"
                />
                <input
                  type="text"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="input-modern"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Website URL</label>
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="input-modern"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Description</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="textarea-modern"
              />
            </div>
          </div>

          {/* Location & Metadata */}
          <div className="space-y-4">
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

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Country</label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="select-modern"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Street Address</label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="input-modern"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Google Map Link of Address</label>
              <input
                type="url"
                value={googleMapUrl}
                onChange={(e) => setGoogleMapUrl(e.target.value)}
                placeholder="https://maps.app.goo.gl/..."
                className="input-modern"
              />
              {resolvingMap && (
                <p className="mt-1.5 text-xs text-neutral-500 flex items-center gap-1.5 animate-pulse">
                  <span className="inline-block w-3.5 h-3.5 border-2 border-neutral-500 border-t-transparent rounded-full animate-spin" />
                  Resolving link and extracting coordinates...
                </p>
              )}
              {!resolvingMap && mapError && (
                <p className="mt-1.5 text-xs text-amber-600 font-medium">⚠️ {mapError}</p>
              )}
              {!resolvingMap && !mapError && latitude && longitude && (
                <p className="mt-1.5 text-xs text-green-600 font-semibold flex items-center gap-1">
                  ✓ Coordinates extracted: {latitude}, {longitude}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Latitude</label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={latitude}
                  placeholder="Auto-calculated"
                  className="input-modern bg-neutral-100/60 text-neutral-500 cursor-not-allowed font-mono text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Longitude</label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={longitude}
                  placeholder="Auto-calculated"
                  className="input-modern bg-neutral-100/60 text-neutral-500 cursor-not-allowed font-mono text-xs"
                />
              </div>
            </div>

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

        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-full bg-neutral-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-neutral-800 transition cursor-pointer"
        >
          {saving ? "Saving Changes..." : "Save Configuration"}
        </button>
      </form>
    </div>
  );
}
