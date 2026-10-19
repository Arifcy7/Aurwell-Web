"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { collection, doc, setDoc, serverTimestamp, query, where, getDocs, limit } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { COUNTRIES, CURRENCIES, TIMEZONES } from "@/lib/constants";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { motion } from "framer-motion";

export default function SignUpPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [referredByCode, setReferredByCode] = useState("");

  const landingPageUrl = process.env.NEXT_PUBLIC_WEBSITE_URL || "https://www.aurwell.app";

  // Step 1 State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step 2 State
  const [brandColor, setBrandColor] = useState("#000000");
  const [merchantName, setMerchantName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [description, setDescription] = useState("");
  const [currency, setCurrency] = useState(CURRENCIES[0].code);
  const [merchantNameError, setMerchantNameError] = useState("");

  // Step 3 State
  const [timezone, setTimezone] = useState(TIMEZONES[0].value);
  const [country, setCountry] = useState(COUNTRIES[0].code);
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [phoneDialCode, setPhoneDialCode] = useState(COUNTRIES[0].dialCode);
  const [phoneNumber, setPhoneNumber] = useState("");

  // Check for incoming referral code from URL
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get("ref");
      if (ref) {
        setReferredByCode(ref);
        try {
          localStorage.setItem("aurwell_ref_code", ref);
        } catch (e) {
          console.error(e);
        }
      } else {
        const stored = localStorage.getItem("aurwell_ref_code");
        if (stored) {
          setReferredByCode(stored);
        }
      }
    }
  }, []);

  const handleCountryChange = (countryCode: string) => {
    setCountry(countryCode);
    const selected = COUNTRIES.find((c) => c.code === countryCode);
    if (selected) {
      setPhoneDialCode(selected.dialCode);
    }
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      if (!firstName || !lastName || !email || !password) {
        setError("All fields are required.");
        return;
      }
      setError("");
      setStep(2);
    } else if (step === 2) {
      if (!merchantName.trim()) {
        setMerchantNameError("Merchant name is required");
        return;
      }
      setMerchantNameError("");
      setError("");
      setStep(3);
    }
  };

  const handlePrevStep = () => {
    setError("");
    setStep((prev) => prev - 1);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) {
      setError("Phone number is required.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1. Create auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // 2. Generate a clinicId
      const clinicId = `clinic_${uid}`;
      const activeRefCode = referredByCode || (typeof window !== "undefined" ? localStorage.getItem("aurwell_ref_code") || "" : "");

      // 3. Write clinic document configurations
      await setDoc(doc(db, "clinics", clinicId), {
        clinicId,
        merchantName,
        brandColor,
        websiteUrl,
        description,
        currency,
        timezone,
        country,
        address,
        postalCode,
        phone: `${phoneDialCode} ${phoneNumber}`,
        createdAt: serverTimestamp(),
        ownerUid: uid,
        ...(activeRefCode ? { referredByCode: activeRefCode } : {}),
      });

      // 4. Create User profile mapping
      await setDoc(doc(db, "users", uid), {
        uid,
        firstName,
        lastName,
        email,
        role: "clinic_admin",
        clinicId,
        createdAt: serverTimestamp(),
        ...(activeRefCode ? { referredByCode: activeRefCode } : {}),
      });

      // 5. Create B2B Referral Document if referred
      if (activeRefCode) {
        try {
          const snapshot = await getDocs(query(collection(db, "users"), limit(50)));
          let referrerUid = "PLATFORM_ADMIN";
          snapshot.forEach((uDoc) => {
            const code = `REF-${uDoc.id.substring(0, 6).toUpperCase()}` ;
            if (code === activeRefCode) {
              referrerUid = uDoc.id;
            }
          });

          const monthlyFee = 300;
          const commissionPercentage = 30; // 30% recurring commission
          const monthlyCommission = (monthlyFee * commissionPercentage) / 100;

          await setDoc(doc(db, "b2b_referrals", `ref_${clinicId}`), {
            referralId: `ref_${clinicId}`,
            referrerUid: referrerUid,
            referrerCode: activeRefCode,
            referredClinicId: clinicId,
            referredClinicName: merchantName,
            ownerEmail: email,
            status: "pending_trial",
            monthlyFee: monthlyFee,
            commissionPercentage: commissionPercentage,
            monthlyCommission: monthlyCommission,
            totalEarned: 0,
            currentMonthPaid: false,
            paymentHistory: [],
            createdAt: serverTimestamp(),
          });
        } catch (refErr) {
          console.error("Error logging B2B referral:", refErr);
        }
      }

      // 6. Success -> redirect
      router.push("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Sign up failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] text-neutral-900 flex flex-col justify-between p-4 sm:p-6 selection:bg-neutral-900 selection:text-white">
      {/* Top Header */}
      <div className="flex items-center justify-between max-w-5xl w-full mx-auto py-2">
        <Link
          href={landingPageUrl}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Aurwell</span>
        </Link>
        <span className="text-[11px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full bg-neutral-200/70 text-neutral-700">
          Admin Portal
        </span>
      </div>

      {/* Main Centered Signup Card */}
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
        style={{ willChange: "transform, opacity" }}
        className="w-full max-w-lg mx-auto bg-white rounded-3xl p-7 sm:p-9 space-y-6 select-none my-6"
      >
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center">
            <Image
              src="/logo-black.png"
              alt="Aurwell Logo"
              width={56}
              height={56}
              className="h-12 w-auto object-contain mx-auto select-none transition-transform duration-200 hover:scale-105"
              priority
            />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-neutral-900 pt-1">Create Clinic Account</h2>
          <p className="text-xs text-neutral-500">
            Step {step} of 3 — {step === 1 ? "Owner Details" : step === 2 ? "Clinic Branding" : "Location & Contact"}
          </p>

          {/* Step Pill Indicators */}
          <div className="flex items-center justify-center gap-2 pt-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s === step
                    ? "w-8 bg-neutral-900"
                    : s < step
                    ? "w-4 bg-neutral-400"
                    : "w-4 bg-neutral-200"
                }`}
              />
            ))}
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-800">
            {error}
          </div>
        )}

        {step === 1 && (
          <form className="space-y-4" onSubmit={handleNextStep}>
            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-700">First Name</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="input-modern"
                  placeholder="John"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-neutral-700">Last Name</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="input-modern"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-700">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-modern"
                placeholder="john@example.com"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-700">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-modern"
                placeholder="••••••••••••"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="btn-primary w-full py-3 text-xs font-semibold inline-flex items-center justify-center gap-2"
              >
                <span>Next Step</span>
                <ArrowRight className="w-3.5 h-3.5 text-white" />
              </button>
            </div>

            <div className="text-center text-xs text-neutral-500 pt-1">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-neutral-900 hover:underline">
                Sign In
              </Link>
            </div>
          </form>
        )}

        {step === 2 && (
          <form className="space-y-4" onSubmit={handleNextStep}>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-700">Merchant Name</label>
              <input
                type="text"
                value={merchantName}
                onChange={(e) => {
                  setMerchantName(e.target.value);
                  if (e.target.value.trim()) setMerchantNameError("");
                }}
                className="input-modern"
                placeholder="Clinic / Merchant Name"
              />
              {merchantNameError && <p className="mt-1 text-xs text-red-600">{merchantNameError}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-700">Brand Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="h-10 w-12 cursor-pointer rounded-xl border border-neutral-200 p-0 overflow-hidden bg-transparent"
                />
                <input
                  type="text"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="input-modern"
                  placeholder="#000000"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-700">
                Clinic Website URL <span className="text-[10px] text-neutral-400 font-normal">(optional)</span>
              </label>
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="input-modern"
                placeholder="https://example.com"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-700">Merchant Description</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="textarea-modern"
                placeholder="Describe your clinic or aesthetics services..."
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-700">Base Currency</label>
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

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handlePrevStep}
                className="btn-outline w-1/3 py-2.5 text-xs font-semibold inline-flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <button
                type="submit"
                className="btn-primary w-2/3 py-2.5 text-xs font-semibold inline-flex items-center justify-center gap-2"
              >
                <span>Next Step</span>
                <ArrowRight className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form className="space-y-4" onSubmit={handleSignUp}>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-700">Timezone</label>
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

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-700">Country</label>
              <select
                value={country}
                onChange={(e) => handleCountryChange(e.target.value)}
                className="select-modern"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-700">Street Address</label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="input-modern"
                placeholder="123 Main St"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-700">Postal Code</label>
              <input
                type="text"
                required
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="input-modern"
                placeholder="12345"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-700">Phone Number</label>
              <div className="flex gap-2 items-center">
                <select
                  value={phoneDialCode}
                  onChange={(e) => setPhoneDialCode(e.target.value)}
                  style={{ width: "110px", minWidth: "110px", flexShrink: 0 }}
                  className="h-10 rounded-xl bg-neutral-100 px-3 text-xs font-bold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:bg-white transition-all cursor-pointer"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.dialCode}>
                      {c.code} ({c.dialCode})
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="input-modern flex-1 min-w-0"
                  placeholder={
                    COUNTRIES.find((c) => c.dialCode === phoneDialCode || c.code === country)?.placeholder
                      ? `e.g. ${COUNTRIES.find((c) => c.dialCode === phoneDialCode || c.code === country)?.placeholder}`
                      : "e.g. 712 345 678"
                  }
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handlePrevStep}
                disabled={loading}
                className="btn-outline w-1/3 py-2.5 text-xs font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-2/3 py-2.5 text-xs font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="inline-block h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" />
                    <span>Create Account</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </motion.div>

      {/* Footer */}
      <div className="text-center py-4">
        <p className="text-xs text-neutral-400">
          © {new Date().getFullYear()} Aurwell Healthcare Systems Inc.
        </p>
      </div>
    </div>
  );
}
