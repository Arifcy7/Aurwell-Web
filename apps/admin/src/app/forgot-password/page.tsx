"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { Mail, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");
    setMessage("");

    try {
      await sendPasswordResetEmail(auth, email);
      setStatus("success");
      setMessage("A password reset link has been dispatched to your email address.");
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setMessage(err.message || "Failed to send reset link. Please verify your email.");
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f2f5] text-neutral-900 flex flex-col justify-between p-4 sm:p-6 selection:bg-neutral-900 selection:text-white">
      {/* Top Header */}
      <div className="flex items-center justify-between max-w-5xl w-full mx-auto py-2">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-500 hover:text-neutral-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sign In</span>
        </Link>
        <span className="text-[11px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full bg-neutral-200/70 text-neutral-700">
          Admin Portal
        </span>
      </div>

      {/* Main Centered Reset Card */}
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
          <h1 className="text-xl font-bold tracking-tight text-neutral-900 pt-1">Reset Password</h1>
          <p className="text-xs text-neutral-500">Enter your email to receive recovery instructions</p>
        </div>

        {/* Reset Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-neutral-700">Account Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="clinic@aurwell.app"
              className="input-modern"
            />
          </div>

          {message && (
            <div
              className={`rounded-2xl px-4 py-3 text-xs font-semibold ${
                status === "success"
                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200/60"
                  : "bg-rose-50 text-rose-800 border border-rose-200/60"
              }`}
            >
              {message}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={status === "loading"}
              className="btn-primary w-full py-3 text-xs font-semibold disabled:opacity-50"
            >
              {status === "loading" ? (
                <>
                  <span className="inline-block h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 text-white" />
                  <span>Send Reset Link</span>
                </>
              )}
            </button>
          </div>
        </form>

        <div className="text-center text-xs pt-1">
          <Link href="/login" className="inline-flex items-center gap-1 font-semibold text-neutral-900 hover:underline">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Login
          </Link>
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
