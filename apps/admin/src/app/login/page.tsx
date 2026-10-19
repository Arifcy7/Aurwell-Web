"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";
import { doc, getDoc } from "firebase/firestore";
import { checkIsSuperAdmin } from "@/lib/firebase/booking";
import { ArrowLeft, LogIn } from "lucide-react";
import { motion } from "framer-motion";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const landingPageUrl = process.env.NEXT_PUBLIC_LANDING_PAGE_URL || "https://aurwell.com";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setError(null);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Verify admin role or super admin privilege
      const isSuper = await checkIsSuperAdmin(user.uid);
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const uData = userDoc.exists() ? userDoc.data() : null;
      const role = uData?.role;

      if (!isSuper && role !== "clinic_admin" && role !== "admin") {
        await signOut(auth);
        setStatus("error");
        setError("Access denied: This portal is restricted to authorized clinic administrators.");
        return;
      }

      let clinicId = "";
      let clinicName = "Aurwell Clinic";
      let logoUrl = "";
      let hasCustomBooking = false;

      if (uData) {
        clinicId = uData.clinicId || "";
        if (clinicId) {
          const clinicDoc = await getDoc(doc(db, "clinics", clinicId));
          if (clinicDoc.exists()) {
            const cData = clinicDoc.data();
            clinicName = cData.merchantName || "Aurwell Clinic";
            logoUrl = cData.logoUrl || "";
            const sys = cData.bookingConfig?.systemType;
            hasCustomBooking = sys === "aurwell_custom" || sys === "custom";
          }
        }
      }

      localStorage.setItem(
        "aurwell_admin_profile",
        JSON.stringify({
          clinicId,
          clinicName,
          logoUrl,
          hasCustomBooking,
        })
      );

      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setError(err.message || "Failed to sign in. Please verify your credentials.");
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

      {/* Main Centered Login Card */}
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
        style={{ willChange: "transform, opacity" }}
        className="w-full max-w-sm mx-auto bg-white rounded-3xl p-7 sm:p-8 space-y-6 select-none"
      >
        {/* Brand Header */}
        <div className="text-center space-y-2.5">
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
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 pt-1">Welcome back</h1>
          <p className="text-xs text-neutral-500">Sign in to manage your clinic dashboard</p>
        </div>

        {error && (
          <div className="rounded-2xl bg-rose-50 p-3.5 text-xs text-rose-800">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-neutral-700">Work Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="clinic@aurwell.app"
              className="input-modern"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-neutral-700">Password</label>
              <Link
                href="/forgot-password"
                className="text-[11px] font-medium text-neutral-500 hover:text-neutral-900 transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="input-modern"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={status === "loading"}
              className="btn-primary w-full py-3 text-xs font-semibold disabled:opacity-50"
            >
              {status === "loading" ? (
                <>
                  <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4 text-white" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </div>
        </form>

        <div className="text-center pt-2">
          <p className="text-xs text-neutral-500">
            Not registered?{" "}
            <Link
              href="/signup"
              className="font-semibold text-neutral-900 hover:underline transition"
            >
              Create an Account
            </Link>
          </p>
        </div>
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
