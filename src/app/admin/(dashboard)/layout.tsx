"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import QRScannerModal from "@/components/QRScannerModal";
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  CreditCard,
  Bell,
  Sparkles,
  ChevronDown,
  ChevronUp,
  LogOut,
  Menu,
  X,
  QrCode,
  Layers,
  Wrench,
  Tag,
  Gift,
  FileText,
  Image as ImageIcon,
  Settings,
} from "lucide-react";

interface SubNavItem {
  name: string;
  href: string;
  icon?: React.ReactNode;
  badge?: {
    text: string;
    variant: "orange" | "green" | "gray";
  };
}

interface NavGroup {
  name: string;
  icon: React.ReactNode;
  href?: string;
  badge?: {
    text: string;
    variant: "orange" | "green" | "gray";
  };
  subItems?: SubNavItem[];
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [clinicName, setClinicName] = useState("Loading...");
  const [loading, setLoading] = useState(true);
  const [clinicId, setClinicId] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    appBuilder: true,
  });

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/admin/login");
        return;
      }

      setUser(currentUser);

      try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const uData = userDoc.data();
          setClinicId(uData.clinicId);
          const clinicDoc = await getDoc(doc(db, "clinics", uData.clinicId));
          if (clinicDoc.exists()) {
            setClinicName(clinicDoc.data().merchantName || "Aurwell Clinic");
          } else {
            setClinicName("Aurwell Clinic");
          }
        } else {
          setClinicName("Aurwell Clinic");
        }
      } catch (err) {
        console.error("Error loading clinic profile:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/admin/login");
    } catch (err) {
      console.error("Sign out error", err);
    }
  };

  const appBuilderSubItems: SubNavItem[] = [
    { name: "Treatments", href: "/admin/app-builder/treatments", icon: <Tag className="w-4 h-4" /> },
    { name: "Membership Tiers", href: "/admin/app-builder/membership", icon: <CreditCard className="w-4 h-4" /> },
    { name: "Rewards", href: "/admin/app-builder/rewards", icon: <Gift className="w-4 h-4" /> },
    { name: "Blogs & Articles", href: "/admin/app-builder/blogs", icon: <FileText className="w-4 h-4" /> },
    { name: "Banners", href: "/admin/app-builder/banners", icon: <ImageIcon className="w-4 h-4" />, badge: { text: "New", variant: "green" } },
    { name: "App Settings", href: "/admin/app-builder/settings", icon: <Settings className="w-4 h-4" /> },
  ];

  const getBadgeStyle = (variant: "orange" | "green" | "gray") => {
    switch (variant) {
      case "orange":
        return "bg-[#ffeadb] text-[#ff6b35] border border-[#ffd5b8]";
      case "green":
        return "bg-[#d1fae5] text-[#10b981] border border-[#a7f3d0]";
      case "gray":
      default:
        return "bg-neutral-100 text-neutral-600 border border-neutral-200";
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#f4f5f7] text-black">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-3 border-neutral-300 border-t-neutral-900"></div>
          <p className="text-sm font-semibold tracking-wide text-neutral-600">Loading panel...</p>
        </div>
      </div>
    );
  }

  // Sidebar Component for reuse in Desktop and Mobile drawer
  const SidebarContent = () => (
    <div className="flex flex-col h-full justify-between py-6 px-4">
      <div className="space-y-6">
        {/* Brand Emblem / Top Logo */}
        <div className="flex items-center gap-3 px-3">
          <div className="relative w-10 h-10 rounded-full bg-neutral-900 text-white flex items-center justify-center shadow-md overflow-hidden">
            {/* Shaded quad emblem matching reference image */}
            <div className="absolute inset-0 bg-gradient-to-tr from-neutral-950 via-neutral-800 to-neutral-700"></div>
            <div className="relative grid grid-cols-2 gap-0.5 p-2">
              <div className="w-2.5 h-2.5 rounded-tl-full bg-neutral-200/90"></div>
              <div className="w-2.5 h-2.5 rounded-tr-full bg-neutral-400/90"></div>
              <div className="w-2.5 h-2.5 rounded-bl-full bg-neutral-400/90"></div>
              <div className="w-2.5 h-2.5 rounded-br-full bg-neutral-200/90"></div>
            </div>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-base text-neutral-900 truncate tracking-tight">
              {clinicName}
            </span>
            <span className="text-[11px] font-semibold text-neutral-400 tracking-wide uppercase">
              Admin Portal
            </span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1 pt-2">
          {/* Dashboard */}
          <Link
            href="/admin/dashboard"
            className={`group relative flex items-center gap-3.5 px-3.5 py-2.5 rounded-full text-sm font-semibold transition-all ${pathname === "/admin/dashboard"
              ? "bg-white text-neutral-900 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-neutral-100"
              : "text-neutral-600 hover:text-neutral-900 hover:bg-white/60"
              }`}
          >
            <LayoutDashboard
              className={`w-5 h-5 transition-colors ${pathname === "/admin/dashboard" ? "text-neutral-900" : "text-neutral-500 group-hover:text-neutral-800"
                }`}
            />
            <span>Dashboard</span>
          </Link>

          {/* App Builder Collapsible Section (Tree Navigation matching Reference Image 1) */}
          <div>
            <button
              onClick={() => toggleSection("appBuilder")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-full text-sm font-semibold transition-all ${pathname.startsWith("/admin/app-builder")
                ? "text-neutral-900"
                : "text-neutral-600 hover:text-neutral-900 hover:bg-white/60"
                }`}
            >
              <div className="flex items-center gap-3.5">
                <Sparkles
                  className={`w-5 h-5 transition-colors ${pathname.startsWith("/admin/app-builder")
                    ? "text-neutral-900"
                    : "text-neutral-500"
                    }`}
                />
                <span>App Builder</span>
              </div>
              {expandedSections.appBuilder ? (
                <ChevronUp className="w-4 h-4 text-neutral-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-neutral-400" />
              )}
            </button>

            {/* Tree Branch Sub-Items (Seamlessly Connected Vertical Line & Curved Branch Connectors) */}
            {expandedSections.appBuilder && (
              <div className="relative pl-7 mt-1 space-y-1.5">
                {/* Continuous Tree Trunk Line starting from under parent icon */}
                <div className="absolute left-[23px] top-0 bottom-[18px] w-[1.5px] bg-neutral-200/90" />

                {appBuilderSubItems.map((subItem, idx) => {
                  const isSubActive = pathname === subItem.href;
                  return (
                    <div key={subItem.href} className="relative flex items-center">
                      {/* Curved tree branch connector SVG originating from vertical line */}
                      <svg
                        className="absolute left-[-5px] top-[-10px] w-5 h-[34px] text-neutral-200/90 pointer-events-none"
                        viewBox="0 0 20 34"
                        fill="none"
                      >
                        <path
                          d="M 1 0 V 16 Q 1 24 12 24 H 19"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          fill="none"
                        />
                      </svg>

                      <Link
                        href={subItem.href}
                        className={`w-full flex items-center justify-between pl-3.5 pr-3 py-2 rounded-2xl text-xs font-semibold transition-all ${isSubActive
                          ? "bg-white text-neutral-900 shadow-[0_4px_16px_rgba(0,0,0,0.06)] border border-neutral-100 font-bold"
                          : "text-neutral-500 hover:text-neutral-900 hover:bg-white/60"
                          }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          {subItem.name}
                        </div>

                        {subItem.badge && (
                          <span
                            className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full ${getBadgeStyle(
                              subItem.badge.variant
                            )}`}
                          >
                            {subItem.badge.text}
                          </span>
                        )}
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Clients */}
          <Link
            href="/admin/clients"
            className={`group flex items-center justify-between px-3.5 py-2.5 rounded-full text-sm font-semibold transition-all ${pathname === "/admin/clients"
              ? "bg-white text-neutral-900 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-neutral-100"
              : "text-neutral-600 hover:text-neutral-900 hover:bg-white/60"
              }`}
          >
            <div className="flex items-center gap-3.5">
              <Users
                className={`w-5 h-5 transition-colors ${pathname === "/admin/clients" ? "text-neutral-900" : "text-neutral-500 group-hover:text-neutral-800"
                  }`}
              />
              <span>Clients</span>
            </div>
          </Link>

          {/* Shop Summary */}
          <Link
            href="/admin/shop"
            className={`group flex items-center justify-between px-3.5 py-2.5 rounded-full text-sm font-semibold transition-all ${pathname === "/admin/shop"
              ? "bg-white text-neutral-900 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-neutral-100"
              : "text-neutral-600 hover:text-neutral-900 hover:bg-white/60"
              }`}
          >
            <div className="flex items-center gap-3.5">
              <ShoppingBag
                className={`w-5 h-5 transition-colors ${pathname === "/admin/shop" ? "text-neutral-900" : "text-neutral-500 group-hover:text-neutral-800"
                  }`}
              />
              <span>Shop</span>
            </div>
          </Link>

          {/* Memberships */}
          <Link
            href="/admin/memberships"
            className={`group flex items-center justify-between px-3.5 py-2.5 rounded-full text-sm font-semibold transition-all ${pathname === "/admin/memberships"
              ? "bg-white text-neutral-900 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-neutral-100"
              : "text-neutral-600 hover:text-neutral-900 hover:bg-white/60"
              }`}
          >
            <div className="flex items-center gap-3.5">
              <CreditCard
                className={`w-5 h-5 transition-colors ${pathname === "/admin/memberships" ? "text-neutral-900" : "text-neutral-500 group-hover:text-neutral-800"
                  }`}
              />
              <span>Memberships</span>
            </div>
          </Link>

          {/* Notifications */}
          <Link
            href="/admin/notifications"
            className={`group flex items-center justify-between px-3.5 py-2.5 rounded-full text-sm font-semibold transition-all ${pathname === "/admin/notifications"
              ? "bg-white text-neutral-900 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-neutral-100"
              : "text-neutral-600 hover:text-neutral-900 hover:bg-white/60"
              }`}
          >
            <div className="flex items-center gap-3.5">
              <Bell
                className={`w-5 h-5 transition-colors ${pathname === "/admin/notifications" ? "text-neutral-900" : "text-neutral-500 group-hover:text-neutral-800"
                  }`}
              />
              <span>Notifications</span>
            </div>
          </Link>
        </nav>
      </div>

      {/* Footer Info & Sign Out Button */}
      <div className="pt-4 border-t border-neutral-200/80 space-y-3">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center text-xs font-bold text-neutral-700 uppercase">
            {user?.email ? user.email[0] : "A"}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-neutral-900 truncate">
              {user?.email}
            </span>
            <span className="text-[10px] text-neutral-400 font-medium">Logged in</span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 rounded-full border border-neutral-200/80 bg-white px-4 py-2.5 text-xs font-bold text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 shadow-sm transition-all cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </div>
    </div>
  );

  const getPageTitle = () => {
    if (pathname.includes("treatments")) return "Treatments";
    if (pathname.includes("membership")) return "Membership Tiers";
    if (pathname.includes("rewards")) return "Rewards Program";
    if (pathname.includes("blogs")) return "Blogs & Articles";
    if (pathname.includes("banners")) return "Banners";
    if (pathname.includes("settings")) return "App Settings";
    if (pathname.includes("clients")) return "Clients Directory";
    if (pathname.includes("shop")) return "Shop Overview";
    if (pathname.includes("memberships")) return "Active Memberships";
    if (pathname.includes("notifications")) return "Push Notifications";
    return "Product overview";
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-neutral-900 font-sans flex flex-col md:flex-row">
      {/* Desktop Sidebar (Left side) */}
      <aside className="hidden md:flex w-64 lg:w-72 flex-shrink-0 bg-[#f4f5f7] border-r border-neutral-200/60 sticky top-0 h-screen overflow-y-auto">
        <SidebarContent />
      </aside>

      {/* Mobile Header Bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-[#f4f5f7] border-b border-neutral-200/60 sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center text-xs font-bold">
            A
          </div>
          <span className="font-bold text-sm text-neutral-900 truncate max-w-[140px]">
            {clinicName}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowScanner(true)}
            className="p-2 rounded-full bg-neutral-900 text-white hover:bg-neutral-800 transition"
            title="Scan Member QR"
          >
            <QrCode className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-full border border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50 transition"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="relative flex-1 w-full max-w-xs bg-[#f4f5f7] h-full shadow-2xl flex flex-col z-10">
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main Workspace Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#f3f4f6] min-h-screen">
        {/* Main Workspace Header Bar */}
        <header className="h-20 flex items-center justify-between px-6 sm:px-10 bg-[#f3f4f6] flex-shrink-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900">
              {getPageTitle()}
            </h1>
          </div>

          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={() => setShowScanner(true)}
              className="rounded-full bg-neutral-900 px-5 py-2.5 text-xs font-semibold text-white hover:bg-neutral-800 shadow-[0_4px_14px_rgba(0,0,0,0.12)] transition-all flex items-center gap-2 cursor-pointer"
            >
              <QrCode className="w-4 h-4 text-emerald-400" />
              Scan Member QR
            </button>
          </div>
        </header>

        {/* Page Content Container */}
        <div className="flex-1 px-4 sm:px-10 pb-12 overflow-x-hidden">{children}</div>

        <QRScannerModal
          isOpen={showScanner}
          onClose={() => setShowScanner(false)}
          clinicId={clinicId}
        />
      </main>
    </div>
  );
}
