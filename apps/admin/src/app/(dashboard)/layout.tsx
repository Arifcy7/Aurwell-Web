"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import QRScannerModal from "@/components/QRScannerModal";
import { motion, AnimatePresence } from "framer-motion";
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
  Share2,
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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [clinicName, setClinicName] = useState("Loading...");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoError, setLogoError] = useState(false);
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
        router.push("/login");
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
            const cData = clinicDoc.data();
            setClinicName(cData.merchantName || "Aurwell Clinic");
            setLogoUrl(cData.logoUrl || "");
          } else {
            setClinicName("Aurwell Clinic");
            setLogoUrl("");
          }
        } else {
          setClinicName("Aurwell Clinic");
          setLogoUrl("");
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
      router.push("/login");
    } catch (err) {
      console.error("Sign out error", err);
    }
  };

  const appBuilderSubItems: SubNavItem[] = [
    { name: "Treatments", href: "/app-builder/treatments", icon: <Tag className="w-4 h-4" /> },
    { name: "Membership Tiers", href: "/app-builder/membership", icon: <CreditCard className="w-4 h-4" /> },
    { name: "Rewards", href: "/app-builder/rewards", icon: <Gift className="w-4 h-4" /> },
    { name: "Automated Offers", href: "/app-builder/offers", icon: <Sparkles className="w-4 h-4" />, badge: { text: "New", variant: "green" } },
    { name: "Blogs & Articles", href: "/app-builder/blogs", icon: <FileText className="w-4 h-4" /> },
    { name: "Banners", href: "/app-builder/banners", icon: <ImageIcon className="w-4 h-4" /> },
    { name: "App Settings", href: "/app-builder/settings", icon: <Settings className="w-4 h-4" /> },
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

  // Sidebar Component for reuse in Desktop and Mobile drawer (Static, zero re-animating on route changes)
  const SidebarContent = () => (
    <div className="flex flex-col h-full justify-between py-6 px-4">
      <div className="space-y-6">
        {/* Brand Emblem / Top Logo */}
        <div className="flex items-center gap-3 px-3">
          <div className="relative w-10 h-10 rounded-md bg-white text-white flex items-center justify-center shadow-md overflow-hidden shrink-0 border-0 outline-none">
            {logoUrl && !logoError ? (
              <img
                src={logoUrl}
                alt={clinicName}
                className="w-full h-full object-contain p-1"
                onError={() => setLogoError(true)}
              />
            ) : (
              <>
                {/* Default Aurwell Quad Emblem */}
                <div className="absolute inset-0 bg-gradient-to-tr from-neutral-950 via-neutral-800 to-neutral-700"></div>
                <div className="relative grid grid-cols-2 gap-0.5 p-2">
                  <div className="w-2.5 h-2.5 rounded-tl-full bg-neutral-200/90"></div>
                  <div className="w-2.5 h-2.5 rounded-tr-full bg-neutral-400/90"></div>
                  <div className="w-2.5 h-2.5 rounded-bl-full bg-neutral-400/90"></div>
                  <div className="w-2.5 h-2.5 rounded-br-full bg-neutral-200/90"></div>
                </div>
              </>
            )}
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

        {/* Navigation Items (Static, hover nudge only) */}
        <nav className="space-y-1 pt-2">
          {/* Dashboard */}
          <motion.div whileHover={{ x: 3 }} transition={{ duration: 0.15 }}>
            <Link
              href="/dashboard"
              className={`group relative flex items-center gap-3.5 px-3.5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                pathname === "/dashboard"
                  ? "bg-white text-neutral-900 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-neutral-100 font-bold"
                  : "text-neutral-600 hover:text-neutral-900 hover:bg-white/60"
              }`}
            >
              <LayoutDashboard
                className={`w-5 h-5 transition-colors ${
                  pathname === "/dashboard" ? "text-neutral-900" : "text-neutral-500 group-hover:text-neutral-800"
                }`}
              />
              <span>Dashboard</span>
            </Link>
          </motion.div>

          {/* App Builder Collapsible Section */}
          <div>
            <motion.button
              whileHover={{ x: 3 }}
              transition={{ duration: 0.15 }}
              onClick={() => toggleSection("appBuilder")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-full text-sm font-semibold transition-all cursor-pointer ${
                pathname.startsWith("/app-builder")
                  ? "text-neutral-900"
                  : "text-neutral-600 hover:text-neutral-900 hover:bg-white/60"
              }`}
            >
              <div className="flex items-center gap-3.5">
                <Sparkles
                  className={`w-5 h-5 transition-colors ${
                    pathname.startsWith("/app-builder") ? "text-neutral-900" : "text-neutral-500"
                  }`}
                />
                <span>App Builder</span>
              </div>
              <motion.div animate={{ rotate: expandedSections.appBuilder ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown className="w-4 h-4 text-neutral-400" />
              </motion.div>
            </motion.button>

            {/* Accordion Sub-Items */}
            <AnimatePresence initial={false}>
              {expandedSections.appBuilder && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="relative pl-7 mt-1 space-y-1.5 overflow-hidden"
                >
                  {/* Continuous Tree Trunk Line starting from under parent icon */}
                  <div className="absolute left-[23px] top-0 bottom-[18px] w-[1.5px] bg-neutral-200/90 z-0" />

                  {appBuilderSubItems.map((subItem) => {
                    const isSubActive = pathname === subItem.href;
                    return (
                      <motion.div
                        key={subItem.href}
                        whileHover={{ x: 3 }}
                        transition={{ duration: 0.15 }}
                        className="relative flex items-center"
                      >
                        {/* Curved tree branch connector SVG originating from vertical line */}
                        <svg
                          className="absolute left-[-5px] top-[-10px] w-5 h-[34px] text-neutral-200/90 pointer-events-none z-0"
                          viewBox="0 0 20 34"
                          fill="none"
                        >
                          <path
                            d="M 1 0 V 16 Q 1 22 8 22 H 12"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            fill="none"
                          />
                        </svg>

                        <Link
                          href={subItem.href}
                          className={`relative z-10 w-full flex items-center justify-between pl-3.5 pr-3 py-2 rounded-2xl text-xs font-semibold transition-all ${
                            isSubActive
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
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Clients */}
          <motion.div whileHover={{ x: 3 }} transition={{ duration: 0.15 }}>
            <Link
              href="/clients"
              className={`group flex items-center justify-between px-3.5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                pathname === "/clients"
                  ? "bg-white text-neutral-900 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-neutral-100 font-bold"
                  : "text-neutral-600 hover:text-neutral-900 hover:bg-white/60"
              }`}
            >
              <div className="flex items-center gap-3.5">
                <Users
                  className={`w-5 h-5 transition-colors ${
                    pathname === "/clients" ? "text-neutral-900" : "text-neutral-500 group-hover:text-neutral-800"
                  }`}
                />
                <span>Clients</span>
              </div>
            </Link>
          </motion.div>

          {/* Shop Summary */}
          <motion.div whileHover={{ x: 3 }} transition={{ duration: 0.15 }}>
            <Link
              href="/shop"
              className={`group flex items-center justify-between px-3.5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                pathname === "/shop"
                  ? "bg-white text-neutral-900 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-neutral-100 font-bold"
                  : "text-neutral-600 hover:text-neutral-900 hover:bg-white/60"
              }`}
            >
              <div className="flex items-center gap-3.5">
                <ShoppingBag
                  className={`w-5 h-5 transition-colors ${
                    pathname === "/shop" ? "text-neutral-900" : "text-neutral-500 group-hover:text-neutral-800"
                  }`}
                />
                <span>Shop</span>
              </div>
            </Link>
          </motion.div>

          {/* Memberships */}
          <motion.div whileHover={{ x: 3 }} transition={{ duration: 0.15 }}>
            <Link
              href="/memberships"
              className={`group flex items-center justify-between px-3.5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                pathname === "/memberships"
                  ? "bg-white text-neutral-900 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-neutral-100 font-bold"
                  : "text-neutral-600 hover:text-neutral-900 hover:bg-white/60"
              }`}
            >
              <div className="flex items-center gap-3.5">
                <CreditCard
                  className={`w-5 h-5 transition-colors ${
                    pathname === "/memberships" ? "text-neutral-900" : "text-neutral-500 group-hover:text-neutral-800"
                  }`}
                />
                <span>Memberships</span>
              </div>
            </Link>
          </motion.div>

          {/* Notifications */}
          <motion.div whileHover={{ x: 3 }} transition={{ duration: 0.15 }}>
            <Link
              href="/notifications"
              className={`group flex items-center justify-between px-3.5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                pathname === "/notifications"
                  ? "bg-white text-neutral-900 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-neutral-100 font-bold"
                  : "text-neutral-600 hover:text-neutral-900 hover:bg-white/60"
              }`}
            >
              <div className="flex items-center gap-3.5">
                <Bell
                  className={`w-5 h-5 transition-colors ${
                    pathname === "/notifications" ? "text-neutral-900" : "text-neutral-500 group-hover:text-neutral-800"
                  }`}
                />
                <span>Notifications</span>
              </div>
            </Link>
          </motion.div>

          {/* Referrals Program */}
          <motion.div whileHover={{ x: 3 }} transition={{ duration: 0.15 }}>
            <Link
              href="/referrals"
              className={`group flex items-center justify-between px-3.5 py-2.5 rounded-full text-sm font-semibold transition-all ${
                pathname === "/referrals"
                  ? "bg-white text-neutral-900 shadow-[0_4px_20px_rgba(0,0,0,0.06)] border border-neutral-100 font-bold"
                  : "text-neutral-600 hover:text-neutral-900 hover:bg-white/60"
              }`}
            >
              <div className="flex items-center gap-3.5">
                <Share2
                  className={`w-5 h-5 transition-colors ${
                    pathname === "/referrals" ? "text-neutral-900" : "text-neutral-500 group-hover:text-neutral-800"
                  }`}
                />
                <span>Referrals Program</span>
              </div>
            </Link>
          </motion.div>
        </nav>
      </div>

      {/* Footer Info & Sign Out Button (Static) */}
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
    if (pathname.includes("referrals")) return "Referral Program & Earnings";
    return "Product overview";
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-neutral-900 font-sans flex flex-col md:flex-row">
      {/* Desktop Sidebar (Left side) - Stays static across route changes */}
      <aside className="hidden md:flex w-64 lg:w-72 flex-shrink-0 bg-[#f4f5f7] border-r border-neutral-200/60 sticky top-0 h-screen overflow-y-auto">
        <SidebarContent />
      </aside>

      {/* Mobile Header Bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-[#f4f5f7] border-b border-neutral-200/60 sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="relative w-8 h-8 rounded-md bg-white text-white flex items-center justify-center text-xs font-bold overflow-hidden shadow-sm shrink-0 border-0 outline-none">
            {logoUrl && !logoError ? (
              <img
                src={logoUrl}
                alt={clinicName}
                className="w-full h-full object-contain p-1 text-neutral-900"
                onError={() => setLogoError(true)}
              />
            ) : (
              "A"
            )}
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
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 250 }}
              className="relative flex-1 w-full max-w-xs bg-[#f4f5f7] h-full shadow-2xl flex flex-col z-10"
            >
              <SidebarContent />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

        {/* Page Content Container with Smooth Fade Route Transition */}
        <div className="flex-1 px-4 sm:px-10 pb-12 overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>

        <QRScannerModal
          isOpen={showScanner}
          onClose={() => setShowScanner(false)}
          clinicId={clinicId}
        />
      </main>
    </div>
  );
}
