import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white text-black font-sans px-6">
      <main className="w-full max-w-2xl text-center space-y-12 py-16">
        {/* Brand Identity */}
        <div className="space-y-4">
          <span className="bg-neutral-100 text-neutral-800 text-xs font-semibold px-3 py-1 rounded-full border border-neutral-200 uppercase tracking-widest">
            Aesthetic & Dermatology Platform
          </span>
          <h1 className="text-5xl font-extrabold tracking-tight text-black sm:text-6xl">
            Aurwell
          </h1>
          <p className="text-lg text-neutral-500 max-w-md mx-auto">
            The premium white-labeled patient loyalty app engine built specifically for modern aesthetic clinics.
          </p>
        </div>

        {/* Action Routes */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link
            href="/admin/signup"
            className="w-full sm:w-auto rounded-md bg-black px-8 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-neutral-800 transition"
          >
            Build Clinic App
          </Link>
          <Link
            href="/admin/login"
            className="w-full sm:w-auto rounded-md border border-neutral-300 bg-white px-8 py-3.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition"
          >
            Clinic Admin Login
          </Link>
        </div>
      </main>

      <footer className="absolute bottom-6 text-xs text-neutral-400">
        © 2026 Aurwell Inc. All rights reserved.
      </footer>
    </div>
  );
}

