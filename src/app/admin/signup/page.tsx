"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { collection, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { COUNTRIES, CURRENCIES, TIMEZONES } from "@/lib/constants";

export default function SignUpPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1 State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Step 2 State
  const [brandColor, setBrandColor] = useState("#000000");
  const [merchantName, setMerchantName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [treatmentList, setTreatmentList] = useState(""); // Comma separated tags
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

      // 2. Generate a clinicId (we can use a custom prefix or let Firestore generate it. Let's use user's UID or create a new document in clinics collection)
      const clinicId = `clinic_${uid}`;

      // 3. Write clinic document configurations
      await setDoc(doc(db, "clinics", clinicId), {
        clinicId,
        merchantName,
        brandColor,
        websiteUrl,
        treatmentList: treatmentList.split(",").map((t) => t.trim()).filter(Boolean),
        description,
        currency,
        timezone,
        country,
        address,
        postalCode,
        phone: `${phoneDialCode} ${phoneNumber}`,
        createdAt: serverTimestamp(),
        ownerUid: uid,
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
      });

      // 5. Success -> redirect
      router.push("/admin/dashboard");
    } catch (err: any) {
      setError(err?.message || "Sign up failed. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f3f4f6] px-4 text-black py-12">
      <div className="w-full max-w-lg space-y-8 rounded-3xl border border-neutral-100 bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-lg mx-auto shadow-md">
            A
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-neutral-900">Create Clinic Account</h2>
          <p className="text-xs text-neutral-500 font-medium">
            Step {step} of 3 — {step === 1 ? "Owner Details" : step === 2 ? "Clinic Branding" : "Location & Contact"}
          </p>
        </div>

        {error && (
          <div className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-800">
            {error}
          </div>
        )}

        {step === 1 && (
          <form className="space-y-5" onSubmit={handleNextStep}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">First Name</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="input-modern"
                  placeholder="John"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Last Name</label>
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

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-modern"
                placeholder="john@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-modern"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              className="flex w-full justify-center rounded-full bg-neutral-900 px-5 py-3 text-xs font-bold text-white shadow-sm hover:bg-neutral-800 transition cursor-pointer"
            >
              Next Step
            </button>

            <div className="text-center text-xs text-neutral-500">
              Already have an account?{" "}
              <Link href="/admin/login" className="font-bold text-neutral-900 hover:underline">
                Sign In
              </Link>
            </div>
          </form>
        )}

        {step === 2 && (
          <form className="space-y-5" onSubmit={handleNextStep}>
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Merchant Name</label>
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

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Brand Color</label>
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
                  placeholder="#000000"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
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

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                Treatment List <span className="text-[10px] text-neutral-400 font-normal">(optional, comma-separated)</span>
              </label>
              <input
                type="text"
                value={treatmentList}
                onChange={(e) => setTreatmentList(e.target.value)}
                className="input-modern"
                placeholder="Laser, Botox, Chemical Peel, Facial"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Merchant Description</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="textarea-modern"
                placeholder="Describe your clinic or aesthetics services..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Base Currency</label>
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

            <div className="flex gap-4">
              <button
                type="button"
                onClick={handlePrevStep}
                className="flex w-1/3 justify-center rounded-full border border-neutral-200 bg-white px-5 py-2.5 text-xs font-semibold text-neutral-800 shadow-sm hover:bg-neutral-50 transition cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                className="flex w-2/3 justify-center rounded-full bg-neutral-900 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-neutral-800 transition cursor-pointer"
              >
                Next Step
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form className="space-y-5" onSubmit={handleSignUp}>
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

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Street Address</label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="input-modern"
                placeholder="123 Main St"
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
                placeholder="12345"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Phone Number</label>
              <div className="flex gap-2">
                <select
                  value={phoneDialCode}
                  onChange={(e) => setPhoneDialCode(e.target.value)}
                  className="select-modern w-auto px-3"
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
                  className="input-modern flex-1"
                  placeholder="555-0199"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={handlePrevStep}
                disabled={loading}
                className="flex w-1/3 justify-center rounded-full border border-neutral-200 bg-white px-5 py-2.5 text-xs font-semibold text-neutral-800 shadow-sm hover:bg-neutral-50 disabled:opacity-50 transition cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex w-2/3 justify-center rounded-full bg-neutral-900 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-neutral-800 disabled:opacity-50 transition cursor-pointer"
              >
                {loading ? "Creating Account..." : "Create Account"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
