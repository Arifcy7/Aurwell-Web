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
    <div className="flex min-h-screen items-center justify-center bg-white px-4 text-black">
      <div className="w-full max-w-lg space-y-8 rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">Create Clinic Account</h2>
          <p className="mt-2 text-sm text-neutral-500">
            Step {step} of 3 — {step === 1 ? "Owner Details" : step === 2 ? "Clinic Branding" : "Location & Contact"}
          </p>
        </div>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {step === 1 && (
          <form className="space-y-6" onSubmit={handleNextStep}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700">First Name</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-black shadow-sm placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
                  placeholder="John"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700">Last Name</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-black shadow-sm placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-black shadow-sm placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
                placeholder="john@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-black shadow-sm placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              className="flex w-full justify-center rounded-md bg-black px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-neutral-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
            >
              Next Step
            </button>

            <div className="text-center text-sm text-neutral-500">
              Already have an account?{" "}
              <Link href="/admin/login" className="font-semibold text-black hover:underline">
                Sign In
              </Link>
            </div>
          </form>
        )}

        {step === 2 && (
          <form className="space-y-6" onSubmit={handleNextStep}>
            <div>
              <label className="block text-sm font-medium text-neutral-700">Merchant Name</label>
              <input
                type="text"
                value={merchantName}
                onChange={(e) => {
                  setMerchantName(e.target.value);
                  if (e.target.value.trim()) setMerchantNameError("");
                }}
                className={`mt-1 block w-full rounded-md border bg-white px-3 py-2 text-black shadow-sm placeholder:text-neutral-400 focus:outline-none focus:ring-1 sm:text-sm ${
                  merchantNameError
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-neutral-300 focus:border-black focus:ring-black"
                }`}
                placeholder="Clinic / Merchant Name"
              />
              {merchantNameError && <p className="mt-1 text-xs text-red-600">{merchantNameError}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700">Brand Color</label>
              <div className="mt-1 flex items-center gap-3">
                <input
                  type="color"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="h-10 w-10 cursor-pointer rounded-md border border-neutral-300 p-0"
                />
                <input
                  type="text"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-black shadow-sm placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
                  placeholder="#000000"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700">
                Clinic Website URL <span className="text-xs text-neutral-400">(optional)</span>
              </label>
              <input
                type="url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-black shadow-sm placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
                placeholder="https://example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700">
                Treatment List <span className="text-xs text-neutral-400">(optional, comma-separated)</span>
              </label>
              <input
                type="text"
                value={treatmentList}
                onChange={(e) => setTreatmentList(e.target.value)}
                className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-black shadow-sm placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
                placeholder="Laser, Botox, Chemical Peel, Facial"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700">Merchant Description</label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-black shadow-sm placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
                placeholder="Describe your clinic or aesthetics services..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700">Base Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-black shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
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
                className="flex w-1/3 justify-center rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-black shadow-sm hover:bg-neutral-50"
              >
                Back
              </button>
              <button
                type="submit"
                className="flex w-2/3 justify-center rounded-md bg-black px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-neutral-800"
              >
                Next Step
              </button>
            </div>
          </form>
        )}

        {step === 3 && (
          <form className="space-y-6" onSubmit={handleSignUp}>
            <div>
              <label className="block text-sm font-medium text-neutral-700">Timezone</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-black shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700">Country</label>
              <select
                value={country}
                onChange={(e) => handleCountryChange(e.target.value)}
                className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-black shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700">Street Address</label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-black shadow-sm placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
                placeholder="123 Main St"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700">Postal Code</label>
              <input
                type="text"
                required
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="mt-1 block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-black shadow-sm placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
                placeholder="12345"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700">Phone Number</label>
              <div className="mt-1 flex gap-2">
                <select
                  value={phoneDialCode}
                  onChange={(e) => setPhoneDialCode(e.target.value)}
                  className="block rounded-md border border-neutral-300 bg-white px-2 py-2 text-black shadow-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
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
                  className="block w-full flex-1 rounded-md border border-neutral-300 bg-white px-3 py-2 text-black shadow-sm placeholder:text-neutral-400 focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
                  placeholder="555-0199"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={handlePrevStep}
                disabled={loading}
                className="flex w-1/3 justify-center rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-black shadow-sm hover:bg-neutral-50 disabled:opacity-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex w-2/3 justify-center rounded-md bg-black px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-neutral-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:opacity-50"
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
