"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, writeBatch, serverTimestamp, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Save, Globe, ShieldCheck, CheckCircle2, AlertCircle, ExternalLink, Sparkles, CreditCard, Clock, Link as LinkIcon } from "lucide-react";

export default function BookingSettingsPage() {
  const [clinicId, setClinicId] = useState("");
  const [systemType, setSystemType] = useState<"aurwell_custom" | "external_sdk" | "disabled">("aurwell_custom");
  const [subdomain, setSubdomain] = useState("");
  const [initialSubdomain, setInitialSubdomain] = useState("");
  const [customDomain, setCustomDomain] = useState("");
  const [externalProvider, setExternalProvider] = useState("fresha");
  const [externalUrl, setExternalUrl] = useState("");
  const [requirePayment, setRequirePayment] = useState(false);
  const [depositAmount, setDepositAmount] = useState(50);
  const [depositType, setDepositType] = useState<"percentage" | "fixed">("percentage");
  const [slotInterval, setSlotInterval] = useState(15);
  const [minNotice, setMinNotice] = useState(2);
  const [maxAdvance, setMaxAdvance] = useState(60);
  const [cancellationHours, setCancellationHours] = useState(24);
  const [holdDuration, setHoldDuration] = useState(10);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = localStorage.getItem("aurwell_admin_profile");
    if (cached) {
      const id = JSON.parse(cached).clinicId;
      setClinicId(id);
      loadConfig(id);
    }
  }, []);

  const loadConfig = async (id: string) => {
    try {
      const clinicSnap = await getDoc(doc(db, "clinics", id));
      if (clinicSnap.exists()) {
        const cData = clinicSnap.data();
        const config = cData.bookingConfig;
        if (config) {
          const sys = config.systemType === "custom" ? "aurwell_custom" : config.systemType || "aurwell_custom";
          setSystemType(sys);
          const sub = config.subdomain || "";
          setSubdomain(sub);
          setInitialSubdomain(sub);
          setCustomDomain(config.customDomain || "");

          if (config.externalBooking) {
            setExternalProvider(config.externalBooking.provider || "fresha");
            setExternalUrl(config.externalBooking.url || "");
          }

          if (config.settings) {
            setRequirePayment(config.settings.requirePaymentUpfront ?? false);
            setDepositAmount(config.settings.depositAmount ?? 50);
            setDepositType(config.settings.depositType ?? "percentage");
            setSlotInterval(config.settings.slotIntervalMinutes ?? 15);
            setMinNotice(config.settings.minNoticeHours ?? 2);
            setMaxAdvance(config.settings.maxAdvanceDays ?? 60);
            setCancellationHours(config.settings.cancellationHours ?? 24);
            setHoldDuration(config.settings.holdDurationMinutes ?? 10);
          }
        }
      }
    } catch (err) {
      console.error("Error loading booking settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicId) return;

    const cleanSubdomain = subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!cleanSubdomain) {
      setErrorMessage("Please provide a valid alphanumeric subdomain (e.g. harleystreet).");
      return;
    }

    setSaving(true);
    setErrorMessage("");
    setStatusMessage("");

    try {
      // 1. Check Subdomain Uniqueness if changed
      if (cleanSubdomain !== initialSubdomain) {
        const subSnap = await getDoc(doc(db, "subdomains", cleanSubdomain));
        if (subSnap.exists() && subSnap.data().clinicId !== clinicId) {
          setErrorMessage(`Subdomain "${cleanSubdomain}.aurwell.app" is already registered by another clinic.`);
          setSaving(false);
          return;
        }
      }

      const batch = writeBatch(db);

      // If previous subdomain existed and changed, remove previous record
      if (initialSubdomain && initialSubdomain !== cleanSubdomain) {
        batch.delete(doc(db, "subdomains", initialSubdomain));
      }

      // 2. Set /subdomains/{subdomain} lookup document
      batch.set(doc(db, "subdomains", cleanSubdomain), {
        subdomain: cleanSubdomain,
        clinicId,
        isActive: systemType !== "disabled",
        updatedAt: serverTimestamp(),
      });

      // 3. Update /clinics/{clinicId} bookingConfig
      batch.update(doc(db, "clinics", clinicId), {
        bookingConfig: {
          systemType,
          subdomain: cleanSubdomain,
          customDomain: customDomain.trim() || null,
          externalBooking: {
            provider: externalProvider,
            url: externalUrl.trim(),
          },
          settings: {
            requirePaymentUpfront: requirePayment,
            depositType,
            depositAmount: Number(depositAmount),
            slotIntervalMinutes: Number(slotInterval),
            minNoticeHours: Number(minNotice),
            maxAdvanceDays: Number(maxAdvance),
            cancellationHours: Number(cancellationHours),
            holdDurationMinutes: Number(holdDuration),
          },
        },
      });

      await batch.commit();
      setInitialSubdomain(cleanSubdomain);
      setStatusMessage("Booking configuration and subdomain saved successfully!");
      setTimeout(() => setStatusMessage(""), 4000);
    } catch (err) {
      console.error("Error saving booking configuration:", err);
      setErrorMessage("Failed to save booking settings. Please check your connection.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-20 text-neutral-400 text-sm animate-pulse">
        Loading booking configuration...
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Subdomain & Booking Settings</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Configure your public online booking engine, public URL domain, and payment policies
          </p>
        </div>
      </div>

      {statusMessage && (
        <div className="bg-emerald-50 text-emerald-800 p-4 rounded-2xl border border-emerald-200 text-xs font-bold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {statusMessage}
        </div>
      )}

      {errorMessage && (
        <div className="bg-rose-50 text-rose-800 p-4 rounded-2xl border border-rose-200 text-xs font-bold flex items-center gap-2 shadow-xs">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Subdomain */}
        <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-xs space-y-4">
          <div>
            <h2 className="text-sm font-black text-neutral-900 uppercase tracking-wider">Public Web Address</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Patients visit this link to view treatments, select practitioners, and book appointments
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-neutral-700">Aurwell Hosted Subdomain *</label>
            <div className="flex items-center mt-1">
              <input
                type="text"
                required
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                placeholder="harleystreet"
                className="border border-r-0 border-neutral-200 rounded-l-xl p-2.5 text-xs font-mono font-bold text-neutral-900 bg-neutral-50 w-48 focus:bg-white focus:outline-none focus:border-[#768957] focus:ring-1 focus:ring-[#768957]"
              />
              <span className="bg-neutral-100 border border-neutral-200 rounded-r-xl px-3 py-2.5 text-xs text-neutral-600 font-mono font-bold">
                .aurwell.app
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 mt-1.5">
              Public Link: <strong className="text-neutral-900 font-mono">https://{subdomain || "yourclinic"}.aurwell.app</strong>
            </p>
          </div>
        </div>

        {/* Booking Rules & Payment Policies */}
        <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-xs space-y-5">
          <div>
            <h2 className="text-sm font-black text-neutral-900 uppercase tracking-wider">
              Booking Rules & Payment Policies
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Stripe deposit requirements, cancellation thresholds, and calendar increment rules
            </p>
          </div>

          <div className="flex items-center gap-3 p-4 bg-neutral-50 rounded-2xl border border-neutral-200">
            <input
              type="checkbox"
              id="reqPayment"
              checked={requirePayment}
              onChange={(e) => setRequirePayment(e.target.checked)}
              className="rounded text-[#768957] focus:ring-[#768957] h-4 w-4 cursor-pointer"
            />
            <label htmlFor="reqPayment" className="text-xs font-bold text-neutral-900 cursor-pointer">
              Require upfront deposit / full payment via Stripe during online booking
            </label>
          </div>

          {requirePayment && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-neutral-50 rounded-2xl border border-neutral-200">
              <div>
                <label className="text-xs font-bold text-neutral-800">Deposit Calculation Type</label>
                <select
                  value={depositType}
                  onChange={(e) => setDepositType(e.target.value as any)}
                  className="w-full border border-neutral-200 rounded-xl p-2.5 text-xs mt-1 bg-white font-semibold focus:outline-none focus:border-[#768957]"
                >
                  <option value="percentage">Percentage of Treatment Price (%)</option>
                  <option value="fixed">Fixed Currency Amount (£/€/$)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-800">
                  Deposit Amount ({depositType === "percentage" ? "%" : "Fixed Amount"})
                </label>
                <input
                  type="number"
                  min="1"
                  max={depositType === "percentage" ? 100 : 10000}
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(Number(e.target.value))}
                  className="w-full border border-neutral-200 rounded-xl p-2.5 text-xs mt-1 bg-white font-semibold focus:outline-none focus:border-[#768957]"
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-bold text-neutral-700">Slot Interval</label>
              <select
                value={slotInterval}
                onChange={(e) => setSlotInterval(Number(e.target.value))}
                className="w-full border border-neutral-200 rounded-xl p-2.5 text-xs mt-1 bg-neutral-50 font-semibold focus:outline-none"
              >
                <option value={15}>15 Minutes</option>
                <option value={30}>30 Minutes</option>
                <option value={45}>45 Minutes</option>
                <option value={60}>60 Minutes</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-700">Min Notice (Hours)</label>
              <input
                type="number"
                min="0"
                value={minNotice}
                onChange={(e) => setMinNotice(Number(e.target.value))}
                className="w-full border border-neutral-200 rounded-xl p-2.5 text-xs mt-1 bg-neutral-50 font-semibold focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-700">Max Advance (Days)</label>
              <input
                type="number"
                min="1"
                max="365"
                value={maxAdvance}
                onChange={(e) => setMaxAdvance(Number(e.target.value))}
                className="w-full border border-neutral-200 rounded-xl p-2.5 text-xs mt-1 bg-neutral-50 font-semibold focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-700">Free Cancel (Hours)</label>
              <input
                type="number"
                min="0"
                value={cancellationHours}
                onChange={(e) => setCancellationHours(Number(e.target.value))}
                className="w-full border border-neutral-200 rounded-xl p-2.5 text-xs mt-1 bg-neutral-50 font-semibold focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-[#768957] hover:bg-[#65774a] text-white px-8 py-3 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {saving ? "Saving Configuration..." : "Save All Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
