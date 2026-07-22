"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setStatus("loading");
    setError("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/admin/dashboard");
    } catch (err: any) {
      setStatus("error");
      setError(err?.message || "Invalid email or password");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f3f4f6] px-4 text-black">
      <div className="w-full max-w-md space-y-8 rounded-3xl border border-neutral-100 bg-white p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-neutral-900 text-white flex items-center justify-center font-bold text-lg mx-auto shadow-md">
            A
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-neutral-900">Clinic Admin Sign In</h2>
          <p className="text-xs text-neutral-500 font-medium">
            Sign in to manage your clinic and application settings
          </p>
        </div>

        <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-neutral-700 mb-1.5">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={status === "loading"}
                className="input-modern"
                placeholder="name@example.com"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-xs font-semibold text-neutral-700">
                  Password
                </label>
                <Link
                  href="/admin/forgot-password"
                  className="text-xs text-neutral-500 hover:text-black hover:underline font-medium"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={status === "loading"}
                className="input-modern"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-800">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={status === "loading"}
              className="flex w-full justify-center rounded-full bg-neutral-900 px-5 py-3 text-xs font-bold text-white shadow-sm hover:bg-neutral-800 transition disabled:opacity-50 cursor-pointer"
            >
              {status === "loading" ? "Signing In..." : "Sign In"}
            </button>
          </div>
        </form>

        <div className="text-center text-xs text-neutral-500">
          Not registered?{" "}
          <Link href="/admin/signup" className="font-bold text-neutral-900 hover:underline">
            Create an Account
          </Link>
        </div>
      </div>
    </div>
  );
}
