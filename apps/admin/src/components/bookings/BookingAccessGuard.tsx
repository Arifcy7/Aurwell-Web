"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { checkIsSuperAdmin } from "@/lib/firebase/booking";
import Link from "next/link";
import { ShieldAlert, ArrowLeft, ShieldCheck } from "lucide-react";
import AdminSplashScreen from "@/components/AdminSplashScreen";

interface BookingAccessGuardProps {
  children: React.ReactNode;
}

/**
 * Access guard component wrapping /bookings routes.
 *
 * Enforces the booking system access policy:
 * - Only clinics configured with systemType === "aurwell_custom" (or super-admins) can access
 *   the Aurwell Booking Management Suite.
 * - Clinics with other systemTypes (e.g. Fresha, Jane, Pabau external redirects, or disabled)
 *   are blocked with a clean explanation and guidance.
 */
export default function BookingAccessGuard({ children }: BookingAccessGuardProps) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [isSuper, setIsSuper] = useState(false);
  const [clinicName, setClinicName] = useState("");
  const [currentSystemType, setCurrentSystemType] = useState<string>("disabled");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setAllowed(false);
        setLoading(false);
        return;
      }

      try {
        // 1. Check if user is Super Admin (always allowed full access)
        const superAdmin = await checkIsSuperAdmin(user.uid);
        setIsSuper(superAdmin);
        if (superAdmin) {
          setAllowed(true);
          setLoading(false);
          return;
        }

        // 2. Fetch user's clinic ID
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (!userDoc.exists()) {
          setAllowed(false);
          setLoading(false);
          return;
        }

        const clinicId = userDoc.data().clinicId;
        if (!clinicId) {
          setAllowed(false);
          setLoading(false);
          return;
        }

        // 3. Fetch clinic data to inspect booking systemType
        const clinicDoc = await getDoc(doc(db, "clinics", clinicId));
        if (clinicDoc.exists()) {
          const cData = clinicDoc.data();
          setClinicName(cData.merchantName || "Your Clinic");
          const sysType = cData.bookingConfig?.systemType || "disabled";
          setCurrentSystemType(sysType);

          const hasAccess = sysType === "aurwell_custom" || sysType === "custom";
          setAllowed(hasAccess);
        } else {
          setAllowed(false);
        }
      } catch (err) {
        console.error("Error verifying booking suite access:", err);
        setAllowed(false);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div className="w-full min-h-[calc(100vh-12rem)] flex items-center justify-center">
        <AdminSplashScreen fullScreen={false} label="Verifying booking permissions..." />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="rounded-3xl bg-white p-8 sm:p-12 text-center max-w-xl mx-auto my-12 space-y-5">
        <div className="w-14 h-14 rounded-full bg-neutral-100 text-neutral-800 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-7 h-7 text-neutral-800" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight text-neutral-900">
            Booking Suite Inactive
          </h2>
          <p className="text-xs text-neutral-500 leading-relaxed max-w-md mx-auto">
            The Aurwell Custom Booking Suite is not enabled for{" "}
            <span className="font-semibold text-neutral-800">{clinicName || "your clinic"}</span>.
            {currentSystemType !== "disabled" ? (
              <>
                {" "}Your clinic is currently configured to use an external system (
                <span className="font-mono font-semibold text-neutral-700">{currentSystemType}</span>).
              </>
            ) : (
              <> Booking functionality is currently disabled for this workspace.</>
            )}
          </p>
        </div>

        <div className="admin-card-inner p-4 text-xs text-neutral-600 space-y-2 text-left max-w-md mx-auto">
          <p className="font-semibold text-neutral-900">How to activate the Aurwell Booking Suite:</p>
          <ul className="list-disc list-inside space-y-1 text-neutral-500 text-[11px]">
            <li>Contact Aurwell Platform Support or your account representative</li>
            <li>Request activation of the native Aurwell booking infrastructure</li>
            <li>Super Admins can switch this clinic to <code className="bg-neutral-200/80 px-1.5 py-0.5 rounded text-neutral-800 font-mono text-[10px]">aurwell_custom</code> in Super Admin Portal</li>
          </ul>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="btn-primary"
          >
            <ArrowLeft className="w-4 h-4 text-white" />
            Return to Dashboard
          </Link>
          {isSuper && (
            <Link
              href="/super-admin"
              className="btn-secondary"
            >
              <ShieldCheck className="w-4 h-4 text-amber-600" /> Configure in Super Admin
            </Link>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
