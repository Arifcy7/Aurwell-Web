"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";
import { checkIsSuperAdmin } from "@/lib/firebase/booking";
import { CalendarOff, ExternalLink, ShieldCheck, ArrowRight, Lock } from "lucide-react";
import Link from "next/link";

export default function BookingAccessGuard({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [hasCustomBooking, setHasCustomBooking] = useState(false);
  const [systemType, setSystemType] = useState<string>("disabled");
  const [externalUrl, setExternalUrl] = useState<string>("");
  const [externalProvider, setExternalProvider] = useState<string>("");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        const isSuper = await checkIsSuperAdmin(currentUser.uid);
        setIsSuperAdmin(isSuper);

        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const uData = userDoc.data();
          const clinicId = uData.clinicId || "";
          if (clinicId) {
            const clinicDoc = await getDoc(doc(db, "clinics", clinicId));
            if (clinicDoc.exists()) {
              const cData = clinicDoc.data();
              const sys = cData.bookingConfig?.systemType;
              const isCustom = sys === "aurwell_custom" || sys === "custom";
              setHasCustomBooking(isCustom);
              setSystemType(sys || "disabled");

              if (cData.bookingConfig?.externalBooking) {
                setExternalUrl(cData.bookingConfig.externalBooking.url || "");
                setExternalProvider(cData.bookingConfig.externalBooking.provider || "External System");
              }
            }
          }
        }
      } catch (err) {
        console.error("Error checking booking system configuration:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div className="text-center py-20 text-neutral-400 text-sm animate-pulse font-medium">
        Verifying booking configuration...
      </div>
    );
  }

  if (!hasCustomBooking) {
    return (
      <div className="max-w-2xl mx-auto my-12 bg-white p-8 sm:p-12 rounded-2xl border border-neutral-200/80 shadow-xs space-y-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200 shadow-xs">
          <CalendarOff className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100/80 text-amber-800 border border-amber-200 inline-block">
            {systemType === "external_sdk" ? "External Booking System Active" : "Booking Module Disabled"}
          </span>
          <h2 className="text-2xl font-black text-neutral-900 tracking-tight">
            Native Booking Section Unavailable
          </h2>
          <p className="text-xs text-neutral-500 max-w-md mx-auto leading-relaxed">
            {systemType === "external_sdk" ? (
              <>
                Your clinic is configured to use an external booking service (<strong>{externalProvider || "External System"}</strong>). Native appointment scheduling, practitioner rosters, operating hours, and booking settings are disabled in this admin portal.
              </>
            ) : (
              <>
                The Native Custom Booking engine is currently disabled for your clinic.
              </>
            )}
          </p>
        </div>

        {systemType === "external_sdk" && externalUrl && (
          <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200/80 max-w-md mx-auto text-left space-y-1">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Configured External URL</span>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-mono font-semibold text-neutral-800 truncate">{externalUrl}</span>
              <a
                href={externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-[#768957] hover:underline shrink-0"
              >
                Visit Link <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}

        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-[#768957] hover:bg-[#65774a] text-white px-6 py-2.5 rounded-xl text-xs font-bold transition shadow-xs"
          >
            Return to Dashboard
          </Link>
          {isSuperAdmin && (
            <Link
              href="/super-admin"
              className="inline-flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white px-6 py-2.5 rounded-xl text-xs font-bold transition shadow-xs"
            >
              <ShieldCheck className="w-4 h-4 text-[#C9A96E]" /> Configure in Super Admin
            </Link>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
