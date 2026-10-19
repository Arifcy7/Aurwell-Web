"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { clearAllAurwellCache } from "@/lib/firebase/versionCache";
import dynamic from "next/dynamic";

const QRScannerModal = dynamic(() => import("@/components/QRScannerModal"), { ssr: false });
import AdminSplashScreen from "@/components/AdminSplashScreen";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  ShoppingBag,
  CreditCard,
  Bell,
  Sparkles,
  ChevronDown,
  LogOut,
  Menu,
  X,
  QrCode,
  Tag,
  Gift,
  FileText,
  Image as ImageIcon,
  Settings,
  Share2,
  Calendar,
  CalendarDays,
  UserCheck,
  Clock,
  CalendarOff,
  Globe,
  Shield,
} from "lucide-react";
import { checkIsSuperAdmin } from "@/lib/firebase/booking";

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
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [hasCustomBooking, setHasCustomBooking] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    appBuilder: false,
    bookings: true,
  });

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Reset logo error when logo URL updates
  useEffect(() => {
    setLogoError(false);
  }, [logoUrl]);

  // Synchronize profile changes from other tabs or settings updates
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const cachedStr = localStorage.getItem("aurwell_admin_profile");
        if (cachedStr) {
          const cached = JSON.parse(cachedStr);
          if (cached.clinicName) setClinicName(cached.clinicName);
          if (cached.logoUrl !== undefined) {
            setLogoUrl(cached.logoUrl);
            setLogoError(false);
          }
        }
      } catch (e) {}
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  useEffect(() => {
    // 1. Immediately hydrate from local profile cache if available
    const CACHE_KEY = "aurwell_admin_profile";
    try {
      const cachedStr = localStorage.getItem(CACHE_KEY);
      if (cachedStr) {
        const cached = JSON.parse(cachedStr);
        if (cached.clinicId) setClinicId(cached.clinicId);
        if (cached.clinicName) setClinicName(cached.clinicName);
        if (cached.logoUrl !== undefined) setLogoUrl(cached.logoUrl);
        if (cached.hasCustomBooking !== undefined) setHasCustomBooking(Boolean(cached.hasCustomBooking));
        setLoading(false);
      }
    } catch (e) {
      console.error("Failed to read cached profile", e);
    }

    // 2. Subscribe to Auth state changes and revalidate in background
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        clearAllAurwellCache();
        router.push("/login");
        return;
      }

      setUser(currentUser);

      try {
        // Check Super Admin privilege from /admin collection
        const isSuper = await checkIsSuperAdmin(currentUser.uid);
        setIsSuperAdmin(isSuper);

        const userDoc = await getDoc(doc(db, "users", currentUser.uid));

        if (userDoc.exists()) {
          const uData = userDoc.data();
          const role = uData.role;

          // Enforce role-based access control
          if (!isSuper && role !== "clinic_admin" && role !== "admin") {
            console.warn("Unauthorized access attempt by non-admin user:", currentUser.uid);
            clearAllAurwellCache();
            await signOut(auth);
            router.push("/login");
            return;
          }

          const freshClinicId = uData.clinicId || "";
          setClinicId(freshClinicId);

          let freshName = "Aurwell Clinic";
          let freshLogo = "";
          let freshHasCustom = false;

          if (freshClinicId) {
            const clinicDoc = await getDoc(doc(db, "clinics", freshClinicId));

            if (clinicDoc.exists()) {
              const cData = clinicDoc.data();
              freshName = cData.merchantName || cData.name || cData.clinicName || "Aurwell Clinic";
              freshLogo =
                cData.logoUrl ||
                cData.logo ||
                cData.clinicLogo ||
                cData.branding?.logoUrl ||
                cData.branding?.logo ||
                cData.appHeroImageUrl ||
                cData.iconUrl ||
                cData.imageUrl ||
                "";

              const sys = cData.bookingConfig?.systemType;
              freshHasCustom = sys === "aurwell_custom" || sys === "custom";
              setHasCustomBooking(freshHasCustom);
            }
          }

          setClinicName(freshName);
          setLogoUrl(freshLogo);

          // Update local cache
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({
              clinicId: freshClinicId,
              clinicName: freshName,
              logoUrl: freshLogo,
              hasCustomBooking: freshHasCustom,
            })
          );
        } else if (!isSuper) {
          // If no user doc and not super admin, deny access
          clearAllAurwellCache();
          await signOut(auth);
          router.push("/login");
          return;
        } else {
          setClinicName("Super Admin Portal");
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
      clearAllAurwellCache();
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

  const bookingsSubItems: SubNavItem[] = [
    { name: "Appointments", href: "/bookings", icon: <CalendarDays className="w-4 h-4" /> },
    { name: "Practitioners", href: "/bookings/doctors", icon: <UserCheck className="w-4 h-4" /> },
    { name: "Operating Hours & Shifts", href: "/bookings/schedules", icon: <Clock className="w-4 h-4" /> },
    { name: "Leaves & Blocked Slots", href: "/bookings/leaves", icon: <CalendarOff className="w-4 h-4" /> },
    { name: "Subdomain & Settings", href: "/bookings/settings", icon: <Globe className="w-4 h-4" /> },
  ];

  const getBadgeStyle = (variant: "orange" | "green" | "gray") => {
    switch (variant) {
      case "orange":
        return "bg-orange-100 text-orange-700";
      case "green":
        return "bg-emerald-100 text-emerald-800";
      case "gray":
      default:
        return "bg-neutral-100 text-neutral-700";
    }
  };

  // Sidebar Component for reuse in Desktop and Mobile drawer
  const SidebarContent = () => (
    <div className="flex flex-col h-full overflow-hidden select-none bg-white">
      {/* Brand Emblem / Top Logo - Rounded Rectangle */}
      <div className="shrink-0 px-5 pt-5 pb-4">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-xl bg-neutral-950 text-white flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
            {logoUrl && !logoError ? (
              <img
                src={logoUrl}
                alt={clinicName}
                className="w-full h-full object-contain p-1"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 flex items-center justify-center">
                <span className="font-extrabold text-base tracking-tight text-white select-none">
                  {clinicName && clinicName !== "Loading..." && clinicName !== "Aurwell Clinic"
                    ? clinicName.charAt(0).toUpperCase()
                    : "A"}
                </span>
              </div>
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-sm text-neutral-900 truncate tracking-tight">
              {clinicName}
            </span>
            <span className="text-[10px] font-semibold text-neutral-400 tracking-wider uppercase">
              Admin Portal
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Items */}
      <div className="relative flex-1 min-h-0">
        <div className="h-full overflow-y-auto px-3.5 pt-2 pb-6 custom-scrollbar">
          <nav className="space-y-1">
            {/* Dashboard */}
            <Link
              href="/dashboard"
              className={`group flex items-center gap-3 px-3.5 py-2.5 rounded-full text-xs sm:text-[13px] font-medium transition-all ${
                pathname === "/dashboard"
                  ? "bg-neutral-950 text-white font-semibold"
                  : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
              }`}
            >
              <LayoutDashboard
                className={`w-4 h-4 transition-colors ${
                  pathname === "/dashboard" ? "text-white" : "text-neutral-400 group-hover:text-neutral-700"
                }`}
              />
              <span>Dashboard</span>
            </Link>

            {/* App Builder Collapsible Section */}
            <div>
              <button
                onClick={() => toggleSection("appBuilder")}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-full text-xs sm:text-[13px] font-medium transition-all cursor-pointer ${
                  pathname.startsWith("/app-builder")
                    ? "bg-neutral-100 text-neutral-950 font-semibold"
                    : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Sparkles
                    className={`w-4 h-4 transition-colors ${
                      pathname.startsWith("/app-builder") ? "text-neutral-950" : "text-neutral-400"
                    }`}
                  />
                  <span>App Builder</span>
                </div>
                <motion.div
                  animate={{ rotate: expandedSections.appBuilder ? 180 : 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                >
                  <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                </motion.div>
              </button>

              {/* Accordion Sub-Items with slide down and sequential item reveal */}
              <AnimatePresence initial={false}>
                {expandedSections.appBuilder && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.28, ease: "easeInOut" }}
                    className="relative pl-4 mt-1 space-y-0.5 overflow-hidden"
                  >
                    {appBuilderSubItems.map((subItem, sIdx) => {
                      const isSubActive = pathname === subItem.href;
                      return (
                        <motion.div
                          key={subItem.href}
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: sIdx * 0.025, ease: "easeInOut" }}
                        >
                          <Link
                            href={subItem.href}
                            className={`w-full flex items-center justify-between px-3.5 py-2 rounded-full text-xs transition-all ${
                              isSubActive
                                ? "bg-neutral-950 text-white font-semibold"
                                : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 font-medium"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              {subItem.icon && (
                                <span className={isSubActive ? "text-white" : "text-neutral-400"}>
                                  {subItem.icon}
                                </span>
                              )}
                              <span>{subItem.name}</span>
                            </div>

                            {subItem.badge && (
                              <span
                                className={`px-2 py-0.5 text-[9px] font-bold rounded-full ${getBadgeStyle(
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
            <Link
              href="/clients"
              className={`group flex items-center justify-between px-3.5 py-2.5 rounded-full text-xs sm:text-[13px] font-medium transition-all ${
                pathname === "/clients"
                  ? "bg-neutral-950 text-white font-semibold"
                  : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
              }`}
            >
              <div className="flex items-center gap-3">
                <Users
                  className={`w-4 h-4 transition-colors ${
                    pathname === "/clients" ? "text-white" : "text-neutral-400 group-hover:text-neutral-700"
                  }`}
                />
                <span>Clients</span>
              </div>
            </Link>

            {/* Shop */}
            <Link
              href="/shop"
              className={`group flex items-center justify-between px-3.5 py-2.5 rounded-full text-xs sm:text-[13px] font-medium transition-all ${
                pathname === "/shop"
                  ? "bg-neutral-950 text-white font-semibold"
                  : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
              }`}
            >
              <div className="flex items-center gap-3">
                <ShoppingBag
                  className={`w-4 h-4 transition-colors ${
                    pathname === "/shop" ? "text-white" : "text-neutral-400 group-hover:text-neutral-700"
                  }`}
                />
                <span>Shop</span>
              </div>
            </Link>

            {/* Memberships */}
            <Link
              href="/memberships"
              className={`group flex items-center justify-between px-3.5 py-2.5 rounded-full text-xs sm:text-[13px] font-medium transition-all ${
                pathname === "/memberships"
                  ? "bg-neutral-950 text-white font-semibold"
                  : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
              }`}
            >
              <div className="flex items-center gap-3">
                <CreditCard
                  className={`w-4 h-4 transition-colors ${
                    pathname === "/memberships" ? "text-white" : "text-neutral-400 group-hover:text-neutral-700"
                  }`}
                />
                <span>Memberships</span>
              </div>
            </Link>

            {/* Notifications */}
            <Link
              href="/notifications"
              className={`group flex items-center justify-between px-3.5 py-2.5 rounded-full text-xs sm:text-[13px] font-medium transition-all ${
                pathname === "/notifications"
                  ? "bg-neutral-950 text-white font-semibold"
                  : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
              }`}
            >
              <div className="flex items-center gap-3">
                <Bell
                  className={`w-4 h-4 transition-colors ${
                    pathname === "/notifications" ? "text-white" : "text-neutral-400 group-hover:text-neutral-700"
                  }`}
                />
                <span>Notifications</span>
              </div>
            </Link>

            {/* Referrals Program */}
            <Link
              href="/referrals"
              className={`group flex items-center justify-between px-3.5 py-2.5 rounded-full text-xs sm:text-[13px] font-medium transition-all ${
                pathname === "/referrals"
                  ? "bg-neutral-950 text-white font-semibold"
                  : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
              }`}
            >
              <div className="flex items-center gap-3">
                <Share2
                  className={`w-4 h-4 transition-colors ${
                    pathname === "/referrals" ? "text-white" : "text-neutral-400 group-hover:text-neutral-700"
                  }`}
                />
                <span>Referrals Program</span>
              </div>
            </Link>

            {/* Bookings Collapsible Section */}
            {hasCustomBooking && (
              <div>
                <button
                  onClick={() => toggleSection("bookings")}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-full text-xs sm:text-[13px] font-medium transition-all cursor-pointer ${
                    pathname.startsWith("/bookings")
                      ? "bg-neutral-100 text-neutral-950 font-semibold"
                      : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Calendar
                      className={`w-4 h-4 transition-colors ${
                        pathname.startsWith("/bookings") ? "text-neutral-950" : "text-neutral-400"
                      }`}
                    />
                    <span>Bookings</span>
                  </div>
                  <motion.div
                    animate={{ rotate: expandedSections.bookings ? 180 : 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                  >
                    <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
                  </motion.div>
                </button>

                {/* Bookings Sub-Items with slide down and sequential item reveal */}
                <AnimatePresence initial={false}>
                  {expandedSections.bookings && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.28, ease: "easeInOut" }}
                      className="relative pl-4 mt-1 space-y-0.5 overflow-hidden"
                    >
                      {bookingsSubItems.map((subItem, sIdx) => {
                        const isSubActive = pathname === subItem.href;
                        return (
                          <motion.div
                            key={subItem.href}
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: sIdx * 0.025, ease: "easeInOut" }}
                          >
                            <Link
                              href={subItem.href}
                              className={`w-full flex items-center justify-between px-3.5 py-2 rounded-full text-xs transition-all ${
                                isSubActive
                                  ? "bg-neutral-950 text-white font-semibold"
                                  : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 font-medium"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 truncate">
                                {subItem.icon && (
                                  <span className={isSubActive ? "text-white" : "text-neutral-400"}>
                                    {subItem.icon}
                                  </span>
                                )}
                                <span>{subItem.name}</span>
                              </div>
                            </Link>
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Super Admin Tab */}
            {isSuperAdmin && (
              <Link
                href="/super-admin"
                className={`group flex items-center justify-between px-3.5 py-2.5 rounded-full text-xs sm:text-[13px] font-medium transition-all ${
                  pathname === "/super-admin"
                    ? "bg-neutral-950 text-white font-semibold"
                    : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Shield
                    className={`w-4 h-4 transition-colors ${
                      pathname === "/super-admin" ? "text-white" : "text-neutral-400 group-hover:text-neutral-700"
                    }`}
                  />
                  <span>Super Admin</span>
                </div>
                <span className="px-2 py-0.5 text-[9px] font-bold rounded-full bg-neutral-200 text-neutral-800">
                  Master
                </span>
              </Link>
            )}
          </nav>
        </div>
      </div>

      {/* User Session Footer */}
      <div className="shrink-0 p-4 bg-white space-y-3">
        <div className="flex items-center gap-3 px-1">
          <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-xs font-bold text-neutral-800 uppercase shrink-0">
            {user?.email ? user.email[0] : "A"}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs font-semibold text-neutral-900 truncate leading-tight">
              {user?.email}
            </span>
            <span className="text-[10px] text-neutral-400 font-medium leading-tight">
              {isSuperAdmin ? "Super Admin" : "Clinic Admin"}
            </span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 rounded-full bg-neutral-100 px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-200 hover:text-neutral-900 transition-all cursor-pointer active:scale-[0.98]"
        >
          <LogOut className="w-3.5 h-3.5 text-neutral-500" />
          Sign Out
        </button>
      </div>
    </div>
  );

  const getPageTitle = () => {
    if (pathname === "/bookings") return "Appointments Calendar";
    if (pathname.includes("/bookings/doctors")) return "Practitioners & Staff";
    if (pathname.includes("/bookings/schedules")) return "Operating Hours & Shifts";
    if (pathname.includes("/bookings/leaves")) return "Leaves & Blocked Slots";
    if (pathname.includes("/bookings/settings")) return "Subdomain & Booking Settings";
    if (pathname.startsWith("/super-admin")) return "Super Admin Portal";
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

  // If initial auth / clinic session is loading, show desktop sidebar with splash screen directly in middle of main page
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f2f5] text-neutral-900 font-sans flex flex-col md:flex-row">
        {/* Desktop Sidebar (Left side) - Remains visible during loading */}
        <aside className="hidden md:flex w-64 lg:w-72 flex-shrink-0 bg-white sticky top-0 h-screen flex-col overflow-hidden">
          <SidebarContent />
        </aside>

        {/* Main Workspace Area with Splash Screen centered directly in the middle (excluding sidebar) */}
        <main className="flex-1 flex flex-col items-center justify-center min-w-0 bg-[#f0f2f5] min-h-screen p-4 sm:p-8">
          <AdminSplashScreen fullScreen={false} label="Loading Admin Panel..." />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f0f2f5] text-neutral-900 font-sans flex flex-col md:flex-row">
      {/* Desktop Sidebar (Left side) - Sticky full height, flat white surface on #f0f2f5 background */}
      <aside className="hidden md:flex w-64 lg:w-72 flex-shrink-0 bg-white sticky top-0 h-screen flex-col overflow-hidden">
        <SidebarContent />
      </aside>

      {/* Mobile Header Bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="relative w-9 h-9 rounded-xl bg-neutral-950 text-white flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
            {logoUrl && !logoError ? (
              <img
                src={logoUrl}
                alt={clinicName}
                className="w-full h-full object-contain p-1"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 flex items-center justify-center">
                <span className="font-extrabold text-xs tracking-tight text-white select-none">
                  {clinicName && clinicName !== "Loading..." && clinicName !== "Aurwell Clinic"
                    ? clinicName.charAt(0).toUpperCase()
                    : "A"}
                </span>
              </div>
            )}
          </div>
          <span className="font-semibold text-sm text-neutral-900 truncate max-w-[140px]">
            {clinicName}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowScanner(true)}
            className="p-2 rounded-full bg-[#0f0f11] text-white hover:bg-[#27272a] transition flex items-center justify-center cursor-pointer active:scale-[0.98]"
            title="Scan Member QR"
          >
            <QrCode className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-full bg-neutral-100 text-neutral-800 hover:bg-neutral-200 transition"
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
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
              className="relative flex-1 w-full max-w-xs bg-white h-full flex flex-col z-10 overflow-hidden"
            >
              <SidebarContent />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Workspace Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#f0f2f5] min-h-screen">
        {/* Main Workspace Header Bar */}
        <header className="h-16 flex items-center justify-between px-6 sm:px-8 bg-transparent flex-shrink-0">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
              {getPageTitle()}
            </h1>
          </div>

          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={() => setShowScanner(true)}
              className="btn-primary"
            >
              <QrCode className="w-4 h-4 text-white" />
              Scan Member QR
            </button>
          </div>
        </header>

        {/* Page Content Container with Smooth Fade Route Transition */}
        <div className="flex-1 px-4 sm:px-6 md:px-8 py-4 pb-12 overflow-x-hidden">
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
