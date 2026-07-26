"use client";

import { useState } from "react";
import Link from "next/link";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase/client";

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
      setMessage("Password reset email sent! Please check your inbox.");
    } catch (err: any) {
      setStatus("error");
      setMessage(err?.message || "An error occurred. Please try again.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f3f4f6] px-4 text-black">
      <div className="w-full max-w-md space-y-8 rounded-3xl border border-neutral-100 bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-lg mx-auto shadow-md">
            A
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-neutral-900">Reset Password</h2>
          <p className="text-xs text-neutral-500 font-medium">
            Enter your email to receive a password reset link
          </p>
        </div>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-neutral-700 mb-1.5">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-modern"
              placeholder="name@example.com"
              disabled={status === "loading"}
            />
          </div>

          {message && (
            <div
              className={`rounded-full px-4 py-2 text-xs font-semibold ${status === "success"
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
                }`}
            >
              {message}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={status === "loading"}
              className="flex w-full justify-center rounded-full bg-neutral-900 px-5 py-3 text-xs font-bold text-white shadow-sm hover:bg-neutral-800 transition disabled:opacity-50 cursor-pointer"
            >
              {status === "loading" ? "Sending..." : "Send Reset Link"}
            </button>
          </div>
        </form>

        <div className="text-center text-xs">
          <Link href="/login" className="font-bold text-neutral-900 hover:underline">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
