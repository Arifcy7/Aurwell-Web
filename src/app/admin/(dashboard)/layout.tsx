"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import QRScannerModal from "@/components/QRScannerModal";

interface SidebarItem {
  name: string;
  href: string;
}

interface AppBuilderItem {
  name: string;
  href: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [clinicName, setClinicName] = useState("Loading...");
  const [loading, setLoading] = useState(true);
  const [clinicId, setClinicId] = useState("");
  const [showScanner, setShowScanner] = useState(false);

  const mainNavItems: SidebarItem[] = [
    { name: "Dashboard", href: "/admin/dashboard" },
    { name: "Clients", href: "/admin/clients" },
    { name: "Notifications", href: "/admin/notifications" },
    { name: "Shop Summary", href: "/admin/shop" },
    { name: "Memberships", href: "/admin/memberships" },
  ];

  const appBuilderNavItems: AppBuilderItem[] = [
    { name: "Treatments", href: "/admin/app-builder/treatments" },
    { name: "Membership", href: "/admin/app-builder/membership" },
    { name: "Rewards", href: "/admin/app-builder/rewards" },
    { name: "Blogs", href: "/admin/app-builder/blogs" },
    { name: "Banners", href: "/admin/app-builder/banners" },
    { name: "Settings", href: "/admin/app-builder/settings" },
  ];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/admin/login");
        return;
      }

      setUser(currentUser);

      try {
        // Fetch User profile mapping to get clinicId
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const uData = userDoc.data();
          setClinicId(uData.clinicId);
          // Fetch clinic details
          const clinicDoc = await getDoc(doc(db, "clinics", uData.clinicId));
          if (clinicDoc.exists()) {
            setClinicName(clinicDoc.data().merchantName || "My Clinic");
          } else {
            setClinicName("My Clinic");
          }
        } else {
          setClinicName("My Clinic");
        }
      } catch (err) {
        console.error("Error loading clinic profile:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/admin/login");
    } catch (err) {
      console.error("Sign out error", err);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-white text-black">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-black"></div>
          <p className="text-sm font-medium">Loading panel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white text-black">
      {/* Side Panel (Navigation) */}
      <aside className="w-64 flex-shrink-0 border-r border-neutral-200 bg-white flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="h-16 flex items-center px-6 border-b border-neutral-200 justify-between">
            <span className="font-bold text-lg tracking-tight truncate max-w-[150px]">{clinicName}</span>
            <span className="bg-neutral-100 text-neutral-800 text-[10px] font-semibold px-2 py-0.5 rounded border border-neutral-200">
              Admin
            </span>
          </div>

          {/* Navigation Items */}
          <nav className="p-4 space-y-6">
            <div className="space-y-1">
              {mainNavItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-black text-white"
                        : "text-neutral-600 hover:text-black hover:bg-neutral-50"
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>

            {/* App Builder Sub-navigation */}
            <div className="space-y-2">
              <span className="px-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                App Builder
              </span>
              <div className="space-y-1">
                {appBuilderNavItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`block px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-black text-white"
                          : "text-neutral-600 hover:text-black hover:bg-neutral-50"
                      }`}
                    >
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          </nav>
        </div>

        {/* Footer info & Logout */}
        <div className="p-4 border-t border-neutral-200 space-y-3">
          <div className="px-3 text-xs text-neutral-500 truncate">
            {user?.email}
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex justify-center items-center rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Panel Content */}
      <main className="flex-1 flex flex-col bg-white overflow-auto">
        <header className="h-16 flex items-center px-8 border-b border-neutral-200 justify-between bg-white flex-shrink-0">
          <h1 className="text-xl font-bold tracking-tight">
            {pathname.split("/").pop()?.replace("-", " ") || "Dashboard"}
          </h1>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowScanner(true)}
              className="rounded-md bg-black px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800 transition flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              Scan Member QR
            </button>
          </div>
        </header>

        <div className="flex-1 p-8">{children}</div>

        <QRScannerModal
          isOpen={showScanner}
          onClose={() => setShowScanner(false)}
          clinicId={clinicId}
        />
      </main>
    </div>
  );
}
