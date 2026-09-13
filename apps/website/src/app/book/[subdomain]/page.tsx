"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
  query,
  where,
} from "firebase/firestore";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import { db, auth, signInWithGoogle, logoutUser } from "@/lib/firebase/client";
import {
  fetchSubdomainInfo,
  fetchClinicPublicData,
  fetchClinicStripeConfig,
  fetchAvailableSlots,
  reserveBookingHold,
  createStripePaymentIntent,
  confirmStripePayment,
  confirmBooking,
  rescheduleAppointment,
  cancelAppointment,
  fetchAppointmentDetails,
  ReserveHoldResponse,
  AvailableSlot,
} from "@/lib/api/booking";
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Phone,
  Mail,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  MapPin,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  ChevronLeft,
  CalendarDays,
  Sun,
  Sunset,
  Moon,
  Heart,
  Stethoscope,
  Tag,
  Check,
  CreditCard,
  Lock,
  CalendarPlus,
  Trash2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import Link from "next/link";

function toISODateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatTime12Hour(time24: string): string {
  if (!time24) return "";
  const [hStr, mStr] = time24.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr || "0", 10);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${m.toString().padStart(2, "0")} ${period}`;
}

function formatDoctorName(name?: string | null, fallback = "Any Available Specialist"): string {
  if (!name || name === "Any Specialist" || name === "any" || name === "all") return fallback;
  const clean = name.trim();
  if (clean.toLowerCase().startsWith("dr.") || clean.toLowerCase().startsWith("dr ")) {
    return clean;
  }
  return `Dr. ${clean}`;
}

interface ClinicData {
  id: string;
  merchantName?: string;
  description?: string;
  logoUrl?: string;
  brandColor?: string;
  address?: string;
  phone?: string;
  currency?: string;
  stripe?: {
    enabled?: boolean;
    publishableKey?: string;
    accountId?: string;
    defaultCurrency?: string;
  };
  bookingConfig?: any;
}

// Dynamic Stripe SDK Loader
function loadStripeSdk(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return;
    if ((window as any).Stripe) {
      resolve((window as any).Stripe);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://js.stripe.com/v3/";
    script.async = true;
    script.onload = () => resolve((window as any).Stripe);
    script.onerror = () => reject(new Error("Failed to load Stripe payment library."));
    document.head.appendChild(script);
  });
}

export default function ClinicBookingPage() {
  const params = useParams();
  const [subdomain, setSubdomain] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [clinic, setClinic] = useState<ClinicData | null>(null);
  const [treatments, setTreatments] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [operatingHours, setOperatingHours] = useState<any>(null);
  const brandColor = clinic?.brandColor || "#C9A96E";

  // Extract Subdomain from Params or Window Host
  useEffect(() => {
    let resolved = "";
    if (params?.subdomain) {
      resolved = Array.isArray(params.subdomain) ? params.subdomain[0] : params.subdomain;
    } else if (typeof window !== "undefined") {
      const pathParts = window.location.pathname.split("/").filter(Boolean);
      if (pathParts[0] === "book" && pathParts[1]) {
        resolved = pathParts[1];
      } else {
        const hostParts = window.location.host.split(":")[0].split(".");
        if (hostParts.length >= 2 && hostParts[0] !== "localhost" && hostParts[0] !== "www") {
          resolved = hostParts[0];
        }
      }
    }

    if (resolved) {
      setSubdomain(resolved.toLowerCase());
    }
  }, [params]);

  // Booking Wizard Steps:
  // 1: Treatment, 2: Doctor, 3: Date/Time, 4: Patient Info, 45: Stripe Payment, 5: Confirmed
  const [reschedulingAppointmentId, setReschedulingAppointmentId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("reschedule") || "";
    }
    return "";
  });

  // Cancellation State
  const [cancellingAppointmentId, setCancellingAppointmentId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("cancel") || "";
    }
    return "";
  });
  const [cancelAppointmentData, setCancelAppointmentData] = useState<any>(null);
  const [cancelReason, setCancelReason] = useState<string>("Change of plans");
  const [customCancelReason, setCustomCancelReason] = useState<string>("");
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [cancelSuccessResult, setCancelSuccessResult] = useState<any>(null);

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 45 | 5>(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const isResched = sp.get("reschedule");
      if (isResched) return 3;
      const redirectStatus = sp.get("redirect_status");
      const paymentIntent = sp.get("payment_intent") || sp.get("paymentIntentId");
      if (redirectStatus === "succeeded" || paymentIntent) return 5;
    }
    return 1;
  });

  // Selected Booking State
  const [selectedTreatment, setSelectedTreatment] = useState<any>(null);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null); // null = "any"
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().substring(0, 10)
  );
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("");

  // Backend Slot Availability Cache State
  const [apiSlots, setApiSlots] = useState<AvailableSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [hasLoadedSlots, setHasLoadedSlots] = useState(false);
  const [backendSlotsLoaded, setBackendSlotsLoaded] = useState(false);

  // Google Auth User State
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);
  const [isSigningInGoogle, setIsSigningInGoogle] = useState(false);

  // Calendar & Date Navigation State
  const [calendarViewMode, setCalendarViewMode] = useState<"week" | "month">("week");
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => new Date());
  const [weekOffsetDays, setWeekOffsetDays] = useState<number>(0);

  // Filter practitioners qualified to provide the selected treatment
  const qualifiedDoctors = React.useMemo(() => {
    if (!selectedTreatment) return doctors;
    const targetTreatmentId = selectedTreatment.id;

    return doctors.filter((doc: any) => {
      // 1. If explicit allTreatments flag is true, doctor is qualified for all treatments
      if (doc.allTreatments === true) return true;

      // 2. Check assignedTreatments array
      if (Array.isArray(doc.assignedTreatments)) {
        if (doc.assignedTreatments.includes("all")) return true;
        if (doc.assignedTreatments.includes(targetTreatmentId)) return true;
      }

      // 3. Check treatmentIds array
      if (Array.isArray(doc.treatmentIds)) {
        if (doc.treatmentIds.includes("all")) return true;
        if (doc.treatmentIds.includes(targetTreatmentId)) return true;
      }

      // 4. Check services array
      if (Array.isArray(doc.services)) {
        if (doc.services.includes("all")) return true;
        if (doc.services.includes(targetTreatmentId)) return true;
      }

      // 5. Default fallback if doctor.allTreatments is not false and assigned list is empty
      if (
        doc.allTreatments !== false &&
        (!doc.assignedTreatments || doc.assignedTreatments.length === 0) &&
        (!doc.treatmentIds || doc.treatmentIds.length === 0) &&
        (!doc.services || doc.services.length === 0)
      ) {
        return true;
      }

      return false;
    });
  }, [doctors, selectedTreatment]);

  // If currently selected doctor is not qualified for selected treatment, auto-reset to "Any Specialist"
  useEffect(() => {
    if (selectedDoctor && selectedTreatment) {
      const isStillQualified = qualifiedDoctors.some(
        (d: any) =>
          d.id === selectedDoctor.id ||
          d.doctorId === selectedDoctor.id ||
          d.id === selectedDoctor.doctorId
      );
      if (!isStillQualified) {
        setSelectedDoctor(null);
      }
    }
  }, [selectedTreatment, qualifiedDoctors, selectedDoctor]);

  // Patient Info Form
  const [patientName, setPatientName] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [patientNotes, setPatientNotes] = useState("");
  const [bookingRef, setBookingRef] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Stripe & Reservation State
  const [heldReservation, setHeldReservation] = useState<ReserveHoldResponse | null>(null);
  const [stripeClientSecret, setStripeClientSecret] = useState<string>("");
  const [depositAmountDue, setDepositAmountDue] = useState<number>(0);
  const [stripeObj, setStripeObj] = useState<any>(null);
  const [stripeElements, setStripeElements] = useState<any>(null);
  const [paymentElement, setPaymentElement] = useState<any>(null);
  const [stripeError, setStripeError] = useState<string>("");
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [holdSecondsLeft, setHoldSecondsLeft] = useState<number>(600);
  const paymentMountedRef = useRef(false);

  // Live 10-minute hold countdown timer
  useEffect(() => {
    if (step === 45 && heldReservation) {
      setHoldSecondsLeft(600);
      const timer = setInterval(() => {
        setHoldSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step, heldReservation]);

  // Guard: In Reschedule mode, Treatment is immutable (Step 1 locked)
  useEffect(() => {
    if (reschedulingAppointmentId && step === 1 && selectedTreatment) {
      setStep(3);
    }
  }, [reschedulingAppointmentId, step, selectedTreatment]);

  // Listen to Firebase Auth state (e.g. Google Sign-In)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && !user.isAnonymous) {
        setAuthUser(user);
        if (!patientName && user.displayName) {
          setPatientName(user.displayName);
        }
        if (!patientEmail && user.email) {
          setPatientEmail(user.email);
        }
        if (!patientPhone && user.phoneNumber) {
          setPatientPhone(user.phoneNumber);
        }
      } else {
        setAuthUser(null);
      }
    });
    return () => unsubscribe();
  }, [patientName, patientEmail, patientPhone]);

  const handleGoogleSignIn = async () => {
    try {
      setIsSigningInGoogle(true);
      const res = await signInWithGoogle();
      if (res?.user) {
        setAuthUser(res.user);
        if (res.user.displayName) setPatientName(res.user.displayName);
        if (res.user.email) setPatientEmail(res.user.email);
        if (res.user.phoneNumber) setPatientPhone(res.user.phoneNumber);
      }
    } catch (err: any) {
      console.warn("Google sign-in was cancelled or encountered an error:", err);
    } finally {
      setIsSigningInGoogle(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logoutUser();
      setAuthUser(null);
    } catch (err) {
      console.warn("Sign out error:", err);
    }
  };

  useEffect(() => {
    if (!subdomain) return;
    loadClinicData(subdomain);
  }, [subdomain]);

  const loadClinicData = async (targetSubdomain: string) => {
    try {
      setLoading(true);
      setError("");

      const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const queryClinicId = searchParams?.get("clinicId");
      const rescheduleAptId = searchParams?.get("reschedule");
      const cancelAptId = searchParams?.get("cancel");

      if (rescheduleAptId) {
        setReschedulingAppointmentId(rescheduleAptId);
      }
      if (cancelAptId) {
        setCancellingAppointmentId(cancelAptId);
      }

      const cleanSub = targetSubdomain.trim().toLowerCase();

      // 1. Resolve Clinic ID (Prioritize query parameter clinicId, then API, then subdomains)
      let clinicId = "";

      if (queryClinicId) {
        const directSnap = await getDoc(doc(db, "clinics", queryClinicId));
        if (directSnap.exists()) {
          clinicId = queryClinicId;
          setClinic({ id: directSnap.id, ...directSnap.data() } as ClinicData);
        }
      }

      if (!clinicId) {
        // Try loading from Backend API
        const apiSubData = await fetchSubdomainInfo(cleanSub);
        if (apiSubData && apiSubData.clinicId) {
          clinicId = apiSubData.clinicId;
          setClinic({ id: apiSubData.clinicId, ...apiSubData });
        } else {
          // Fallback A: Resolve subdomain lookup from Firestore /subdomains/{cleanSub}
          const subSnap = await getDoc(doc(db, "subdomains", cleanSub));

          if (subSnap.exists()) {
            clinicId = subSnap.data().clinicId;
          } else {
            // Fallback B: Check if subdomain is direct clinicId
            const directSnap = await getDoc(doc(db, "clinics", cleanSub));
            if (directSnap.exists()) {
              clinicId = cleanSub;
            } else {
              // Fallback C: Query /clinics where bookingConfig.subdomain == cleanSub
              const clinicQuery = query(
                collection(db, "clinics"),
                where("bookingConfig.subdomain", "==", cleanSub)
              );
              const querySnap = await getDocs(clinicQuery);
              if (!querySnap.empty) {
                clinicId = querySnap.docs[0].id;
              } else {
                setError(`We could not find an active booking page for "${cleanSub}". Please double-check the web link.`);
                setLoading(false);
                return;
              }
            }
          }

          // Fetch Clinic Config from Firestore
          const clinicSnap = await getDoc(doc(db, "clinics", clinicId));
          if (!clinicSnap.exists()) {
            setError("This clinic's booking schedule is currently unavailable. Please try again shortly.");
            setLoading(false);
            return;
          }

          const cData = { id: clinicId, ...clinicSnap.data() } as ClinicData;
          setClinic(cData);
        }
      }

      // If external redirect mode, redirect
      if (
        clinic?.bookingConfig?.systemType === "external_sdk" &&
        clinic?.bookingConfig?.externalBooking?.url
      ) {
        window.location.href = clinic.bookingConfig.externalBooking.url;
        return;
      }

      // 2. Fetch Treatments and Doctors (via Backend API or fallback to Firestore)
      let resolvedTreatments: any[] = [];
      let resolvedDoctors: any[] = [];
      const publicData = await fetchClinicPublicData(clinicId);
      if (publicData && publicData.treatments && publicData.treatments.length > 0) {
        resolvedTreatments = publicData.treatments.filter((t: any) => t.isActive !== false);
        resolvedDoctors = publicData.doctors?.filter((d: any) => d.isActive !== false) || [];
      } else {
        const treatSnap = await getDocs(collection(db, "clinics", clinicId, "treatments"));
        resolvedTreatments = treatSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((t: any) => t.isActive !== false);

        const docSnap = await getDocs(collection(db, "clinics", clinicId, "doctors"));
        resolvedDoctors = docSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((d: any) => d.isActive !== false);
      }
      setTreatments(resolvedTreatments);
      setDoctors(resolvedDoctors);

      // Fetch Operating Hours for slot fallback calculation
      const schedSnap = await getDoc(doc(db, "clinics", clinicId, "schedules", "operating_hours"));
      if (schedSnap.exists()) {
        setOperatingHours(schedSnap.data());
      }

      // Fetch clinic Stripe configuration from Backend API
      const stripeConfig = await fetchClinicStripeConfig(clinicId);
      if (stripeConfig && stripeConfig.stripe) {
        setClinic((prev: any) => ({
          ...prev,
          stripe: stripeConfig.stripe,
          currency: stripeConfig.currency || prev?.currency || "GBP",
          currencySymbol: stripeConfig.currencySymbol || prev?.currencySymbol || "£",
        }));
      }

      // 3. If in Reschedule Mode, preload existing appointment details
      if (rescheduleAptId && clinicId) {
        try {
          let aptData: any = null;
          try {
            aptData = await fetchAppointmentDetails(clinicId, rescheduleAptId);
          } catch (apiErr) {
            const aptSnap = await getDoc(doc(db, "clinics", clinicId, "appointments", rescheduleAptId));
            if (aptSnap.exists()) {
              aptData = aptSnap.data();
            }
          }

          if (aptData) {
            // Extract patient data (both top-level and nested patient object)
            const pObj = aptData.patient || {};
            const reschedName = pObj.name || aptData.patientName || aptData.name || "";
            const reschedEmail = pObj.email || aptData.patientEmail || aptData.email || "";
            const reschedPhone = pObj.phone || aptData.patientPhone || aptData.phone || "";
            const reschedNotes = pObj.notes || aptData.patientNotes || aptData.notes || "";

            if (reschedName) setPatientName(reschedName);
            if (reschedEmail) setPatientEmail(reschedEmail);
            if (reschedPhone) setPatientPhone(reschedPhone);
            if (reschedNotes) setPatientNotes(reschedNotes);

            // Extract treatment data (both nested treatment object and top-level fields)
            const tObj = aptData.treatment || {};
            const tId = tObj.treatmentId || tObj.id || aptData.treatmentId || "";
            const tTitle = tObj.title || tObj.name || aptData.treatmentTitle || aptData.treatmentName || aptData.title || "Selected Treatment";
            const vTitle = tObj.variantTitle || aptData.variantTitle || "";
            const duration = tObj.durationMinutes || aptData.durationMinutes || 30;
            const price = tObj.price ?? aptData.price ?? 0;

            let matchedTreat = resolvedTreatments.find(
              (t: any) => (tId && (t.id === tId || t.treatmentId === tId)) || t.title === tTitle
            );

            if (!matchedTreat && tId) {
              try {
                const directTreatSnap = await getDoc(doc(db, "clinics", clinicId, "treatments", tId));
                if (directTreatSnap.exists()) {
                  matchedTreat = { id: directTreatSnap.id, ...directTreatSnap.data() };
                }
              } catch (e) {
                console.warn("Direct treatment fetch fallback:", e);
              }
            }

            if (!matchedTreat) {
              matchedTreat = {
                id: tId || "treatment_reschedule",
                title: tTitle,
                durationMinutes: duration,
                price: price,
                types: [{ title: vTitle || "Standard", nonMemberPrice: price }],
              };
            }

            setSelectedTreatment(matchedTreat);

            if (vTitle) {
              const matchedVar = matchedTreat.types?.find((v: any) => v.title === vTitle) || {
                title: vTitle,
                nonMemberPrice: price,
              };
              setSelectedVariant(matchedVar);
            } else if (matchedTreat.types?.[0]) {
              setSelectedVariant(matchedTreat.types[0]);
            }

            // Extract Doctor
            const dId = aptData.doctorId || "";
            const dName = aptData.doctorName || "";
            if (dId) {
              const matchedDoc = resolvedDoctors.find(
                (d: any) => d.id === dId || d.doctorId === dId
              );
              if (matchedDoc) {
                setSelectedDoctor(matchedDoc);
              } else {
                setSelectedDoctor({ id: dId, doctorId: dId, name: dName || "Clinic Specialist" });
              }
            }

            // Always ensure step is 3 (Date & Time selection)
            setStep(3);
          }
        } catch (aptErr) {
          console.warn("Could not preload reschedule appointment:", aptErr);
        }
      }

      // 4. If in Cancel Mode, preload existing appointment details
      if (cancelAptId && clinicId) {
        try {
          let aptData: any = null;
          try {
            aptData = await fetchAppointmentDetails(clinicId, cancelAptId);
          } catch (apiErr) {
            const aptSnap = await getDoc(doc(db, "clinics", clinicId, "appointments", cancelAptId));
            if (aptSnap.exists()) {
              aptData = { id: aptSnap.id, ...aptSnap.data() };
            }
          }

          if (aptData) {
            setCancelAppointmentData(aptData);
          } else {
            console.warn(`Appointment #${cancelAptId} could not be located.`);
          }
        } catch (cErr) {
          console.warn("Could not preload appointment for cancellation:", cErr);
        }
      }

      // 5. If returning from Stripe Redirect Payment (Amazon Pay, Apple Pay, Google Pay, Revolut, Link, Klarna, 3DS)
      const redirectStatus = searchParams?.get("redirect_status");
      const paymentIntent = searchParams?.get("payment_intent") || searchParams?.get("paymentIntentId");

      if (paymentIntent || redirectStatus === "succeeded") {
        try {
          let aptData: any = null;
          let sessionSnapshot: any = null;

          if (typeof window !== "undefined") {
            try {
              const raw = sessionStorage.getItem("aurwell_pending_booking");
              if (raw) sessionSnapshot = JSON.parse(raw);
            } catch (e) {}
          }

          try {
            aptData = await fetchAppointmentDetails(clinicId, {
              paymentIntentId: paymentIntent || undefined,
              appointmentId: sessionSnapshot?.appointmentId || undefined,
            });
          } catch (fetchErr) {
            console.warn("Could not fetch appointment by payment intent:", fetchErr);
          }

          const targetAptId = aptData?.appointmentId || aptData?.id || sessionSnapshot?.appointmentId;

          if (targetAptId && clinicId) {
            // Finalize booking on backend only if not already confirmed
            if (aptData?.status !== "confirmed") {
              try {
                await confirmBooking({
                  clinicId,
                  appointmentId: targetAptId,
                  paymentIntentId: paymentIntent || null,
                });
              } catch (cErr) {
                console.warn("Post-redirect confirmBooking status:", cErr);
              }
            }

            // Populate Step 5 Confirmed Booking Details
            setBookingRef(targetAptId.toUpperCase());

            if (aptData?.treatment) {
              setSelectedTreatment(aptData.treatment);
            } else if (sessionSnapshot?.treatmentTitle) {
              setSelectedTreatment({
                id: sessionSnapshot.treatmentId || "treatment_booked",
                title: sessionSnapshot.treatmentTitle,
                durationMinutes: sessionSnapshot.durationMinutes || 30,
              });
            }

            if (aptData?.treatment?.variantTitle || sessionSnapshot?.variantTitle) {
              setSelectedVariant({
                title: aptData?.treatment?.variantTitle || sessionSnapshot?.variantTitle,
              });
            }

            if (aptData?.doctorName || sessionSnapshot?.doctorName) {
              setSelectedDoctor({ name: aptData?.doctorName || sessionSnapshot?.doctorName });
            }

            if (aptData?.schedule?.startDateTime) {
              setSelectedDate(aptData.schedule.startDateTime.substring(0, 10));
              try {
                const dateObj = new Date(aptData.schedule.startDateTime);
                setSelectedTimeSlot(
                  dateObj.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                  })
                );
              } catch (e) {}
            } else if (sessionSnapshot?.selectedDate) {
              setSelectedDate(sessionSnapshot.selectedDate);
              setSelectedTimeSlot(sessionSnapshot.selectedTimeSlot || "");
            }

            const pName = aptData?.patient?.name || sessionSnapshot?.patientName || "";
            const pEmail = aptData?.patient?.email || sessionSnapshot?.patientEmail || "";
            const pPhone = aptData?.patient?.phone || sessionSnapshot?.patientPhone || "";

            if (pName) setPatientName(pName);
            if (pEmail) setPatientEmail(pEmail);
            if (pPhone) setPatientPhone(pPhone);

            setStep(5);

            if (typeof window !== "undefined") {
              sessionStorage.removeItem("aurwell_pending_booking");
              // Clean URL to base path so refreshing won't re-trigger payment redirect or duplicate emails
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          }
        } catch (redirectErr) {
          console.error("Error processing Stripe redirect return:", redirectErr);
        }
      }
    } catch (err: any) {
      console.error("Error loading clinic portal:", err);
      setError("Unable to load the booking schedule right now. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  };

  // Dynamic Browser Tab Title and Favicon based on Clinic Info
  useEffect(() => {
    if (!subdomain && !clinic) return;

    // 1. Update Document Title
    const titleText = clinic?.merchantName
      ? `${clinic.merchantName} – Online Booking`
      : `${subdomain.charAt(0).toUpperCase() + subdomain.slice(1)} – Online Booking`;
    document.title = titleText;

    // 2. Prepare Favicon Source
    let faviconUrl = clinic?.logoUrl;
    if (!faviconUrl && (clinic?.merchantName || subdomain)) {
      const initial = (clinic?.merchantName || subdomain).charAt(0).toUpperCase();
      const color = clinic?.brandColor || "#0F172A";
      // Generate dynamically styled SVG favicon with clinic initial and brand color
      faviconUrl = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="28" fill="${encodeURIComponent(color)}"/><text x="50" y="66" font-size="52" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif" font-weight="900" fill="white" text-anchor="middle">${initial}</text></svg>`;
    }

    // 3. Update Browser Tab Favicon links in <head>
    if (faviconUrl) {
      const existingIcons = document.querySelectorAll(
        "link[rel*='icon'], link[rel*='shortcut'], link[rel*='apple-touch-icon'], link[rel='manifest']"
      );
      existingIcons.forEach((icon) => icon.remove());

      const linkIcon = document.createElement("link");
      linkIcon.rel = "icon";
      linkIcon.type = faviconUrl.startsWith("data:image/svg+xml") ? "image/svg+xml" : "image/png";
      linkIcon.href = faviconUrl;
      document.head.appendChild(linkIcon);

      const linkShortcut = document.createElement("link");
      linkShortcut.rel = "shortcut icon";
      linkShortcut.type = faviconUrl.startsWith("data:image/svg+xml") ? "image/svg+xml" : "image/png";
      linkShortcut.href = faviconUrl;
      document.head.appendChild(linkShortcut);

      const linkApple = document.createElement("link");
      linkApple.rel = "apple-touch-icon";
      linkApple.href = faviconUrl;
      document.head.appendChild(linkApple);
    }
  }, [clinic, subdomain]);

  // Query Backend for Real-Time Available Slots whenever date/doctor/treatment changes
  useEffect(() => {
    if (!clinic || !selectedTreatment || !selectedDate) return;

    // Immediately reset slots when query criteria changes
    setApiSlots([]);
    setBackendSlotsLoaded(false);
    setLoadingSlots(true);
    setHasLoadedSlots(false);

    const loadSlots = async () => {
      const resolvedClinicId = clinic.id || (clinic as any).clinicId;
      if (!resolvedClinicId) {
        setLoadingSlots(false);
        setHasLoadedSlots(true);
        return;
      }

      // 1. Call Backend API for calculated slot availability (checks doctor shifts, leaves, and appointments)
      try {
        const slots = await fetchAvailableSlots({
          clinicId: resolvedClinicId,
          treatmentId: selectedTreatment.id,
          doctorId: selectedDoctor ? (selectedDoctor.doctorId || selectedDoctor.id) : undefined,
          date: selectedDate,
        });
        setApiSlots(slots);
        setBackendSlotsLoaded(true);
      } catch (err) {
        console.warn("Could not load backend slots, falling back to schedule matrix", err);
        setApiSlots([]);
        setBackendSlotsLoaded(false);
      } finally {
        setHasLoadedSlots(true);
        setLoadingSlots(false);
      }
    };

    loadSlots();
  }, [clinic, selectedTreatment, selectedDoctor, selectedDate]);

  // Generate all possible operating slots for the selected date
  const generateOperatingSlots = () => {
    if (!selectedDate) return [];

    const dateObj = new Date(selectedDate);
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const dayName = days[dateObj.getDay()];

    const daySchedule = operatingHours?.weeklyHours?.[dayName] || {
      isOpen: true,
      slots: [{ start: "09:00", end: "17:00" }],
    };

    if (!daySchedule.isOpen) return [];

    const interval = Number(clinic?.bookingConfig?.settings?.slotIntervalMinutes || 30);
    const duration = Number(selectedTreatment?.durationMinutes || 30);
    const slots: string[] = [];

    const ranges =
      daySchedule.slots && daySchedule.slots.length > 0
        ? daySchedule.slots
        : [{ start: "09:00", end: "17:00" }];

    ranges.forEach((slotRange: any) => {
      const [startHour, startMin] = (slotRange.start || "09:00").split(":").map(Number);
      const [endHour, endMin] = (slotRange.end || "17:00").split(":").map(Number);

      let currentMin = startHour * 60 + startMin;
      const endTotalMin = endHour * 60 + endMin;

      while (currentMin + duration <= endTotalMin) {
        const h = Math.floor(currentMin / 60);
        const m = currentMin % 60;
        const timeStr = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
        slots.push(timeStr);
        currentMin += interval;
      }
    });

    return slots;
  };

  const operatingSlots = generateOperatingSlots();
  const availableSet = new Set(apiSlots.map((s) => s.time));

  // Determine all candidate slots for this day
  const allDaySlots = Array.from(
    new Set([...operatingSlots, ...apiSlots.map((s) => s.time)])
  ).sort();

  // Helper to determine exact availability of a slot
  const isSlotAvailable = (slot: string) => {
    // 1. Min notice & same-day past time checking
    const minNoticeHours = Number(clinic?.bookingConfig?.settings?.minNoticeHours ?? 2);
    if (selectedDate) {
      const [slotH, slotM] = slot.split(":").map(Number);
      const [y, m, d] = selectedDate.split("-").map(Number);
      const slotTime = new Date(y, m - 1, d, slotH, slotM, 0, 0);
      const now = new Date();

      // If slot is in past or within minNoticeHours window from now
      const diffHours = (slotTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (diffHours < minNoticeHours) {
        return false;
      }
    }

    // 2. If backend slots API returned results, respect calculated availability
    if (backendSlotsLoaded) {
      return availableSet.has(slot);
    }

    // Fallback when backend is unreachable
    return operatingSlots.includes(slot);
  };

  const availableCount = allDaySlots.filter((t) => isSlotAvailable(t)).length;
  const bookedCount = allDaySlots.length - availableCount;

  // Group slots by period
  const morningSlots = allDaySlots.filter((slot) => {
    const h = parseInt(slot.split(":")[0], 10);
    return h < 12;
  });
  const afternoonSlots = allDaySlots.filter((slot) => {
    const h = parseInt(slot.split(":")[0], 10);
    return h >= 12 && h < 17;
  });
  const eveningSlots = allDaySlots.filter((slot) => {
    const h = parseInt(slot.split(":")[0], 10);
    return h >= 17;
  });

  // Rolling 7-day strip generator
  const weekDays = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const maxAdvanceDays = Number(clinic?.bookingConfig?.settings?.maxAdvanceDays ?? 60);
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + maxAdvanceDays);
    maxDate.setHours(23, 59, 59, 999);

    const base = new Date();
    base.setDate(base.getDate() + weekOffsetDays);

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      d.setHours(0, 0, 0, 0);

      const isPast = d < today;
      const isFutureDisabled = d > maxDate;
      const isToday = toISODateString(d) === toISODateString(new Date());
      const isSelected = toISODateString(d) === selectedDate;

      days.push({
        date: d,
        dateStr: toISODateString(d),
        dayName: d.toLocaleDateString("en-US", { weekday: "short" }),
        dayNum: d.getDate(),
        monthName: d.toLocaleDateString("en-US", { month: "short" }),
        isPast: isPast || isFutureDisabled,
        isFutureDisabled,
        isToday,
        isSelected,
      });
    }
    return days;
  }, [weekOffsetDays, selectedDate, clinic]);

  // Month Calendar matrix generator
  const monthDays = React.useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    let startDayOfWeek = firstDay.getDay() - 1; // 0 for Mon ... 6 for Sun
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const maxAdvanceDays = Number(clinic?.bookingConfig?.settings?.maxAdvanceDays ?? 60);
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + maxAdvanceDays);
    maxDate.setHours(23, 59, 59, 999);

    const days = [];
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      d.setHours(0, 0, 0, 0);
      const isPast = d < today;
      const isFutureDisabled = d > maxDate;
      days.push({
        date: d,
        dateStr: toISODateString(d),
        dayNum: d.getDate(),
        isCurrentMonth: false,
        isPast: isPast || isFutureDisabled,
        isFutureDisabled,
        isSelected: toISODateString(d) === selectedDate,
        isToday: toISODateString(d) === toISODateString(new Date()),
      });
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i);
      d.setHours(0, 0, 0, 0);
      const isPast = d < today;
      const isFutureDisabled = d > maxDate;
      days.push({
        date: d,
        dateStr: toISODateString(d),
        dayNum: i,
        isCurrentMonth: true,
        isPast: isPast || isFutureDisabled,
        isFutureDisabled,
        isSelected: toISODateString(d) === selectedDate,
        isToday: toISODateString(d) === toISODateString(new Date()),
      });
    }

    const remaining = 35 - days.length >= 0 ? 35 - days.length : 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      d.setHours(0, 0, 0, 0);
      const isPast = d < today;
      const isFutureDisabled = d > maxDate;
      days.push({
        date: d,
        dateStr: toISODateString(d),
        dayNum: d.getDate(),
        isCurrentMonth: false,
        isPast: isPast || isFutureDisabled,
        isFutureDisabled,
        isSelected: toISODateString(d) === selectedDate,
        isToday: toISODateString(d) === toISODateString(new Date()),
      });
    }

    return days;
  }, [calendarMonth, selectedDate, clinic]);

  // Jump to next available day
  const handleJumpNextDay = () => {
    const current = new Date(selectedDate || Date.now());
    current.setDate(current.getDate() + 1);

    const maxAdvanceDays = Number(clinic?.bookingConfig?.settings?.maxAdvanceDays ?? 60);
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + maxAdvanceDays);
    if (current > maxDate) return;

    const nextStr = toISODateString(current);
    setSelectedDate(nextStr);
    setSelectedTimeSlot("");
    setCalendarMonth(new Date(current));
  };

  // Auto-deselect slot if it becomes unavailable
  useEffect(() => {
    if (selectedTimeSlot && hasLoadedSlots && !isSlotAvailable(selectedTimeSlot)) {
      setSelectedTimeSlot("");
    }
  }, [apiSlots, hasLoadedSlots, selectedTimeSlot]);

  // Initialize Modern Stripe Payment Element (Multi-method Tabs Sheet)
  const initStripePaymentElement = async (publishableKey: string, clientSecret: string) => {
    try {
      setStripeError("");
      const StripeConstructor = await loadStripeSdk();
      if (!StripeConstructor) {
        setStripeError("Unable to load secure checkout. Please check your internet connection and try again.");
        return;
      }

      const stripe = StripeConstructor(publishableKey);
      setStripeObj(stripe);

      const elements = stripe.elements({
        clientSecret,
        appearance: {
          theme: "stripe",
          variables: {
            colorPrimary: brandColor || "#0f172a",
            colorBackground: "#ffffff",
            colorText: "#0f172a",
            colorDanger: "#e11d48",
            fontFamily: "Inter, -apple-system, sans-serif",
            borderRadius: "14px",
            spacingUnit: "4.5px",
          },
          rules: {
            ".Tab": {
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
              backgroundColor: "#f8fafc",
            },
            ".Tab--selected": {
              borderColor: brandColor || "#0f172a",
              backgroundColor: "#ffffff",
              boxShadow: `0 0 0 1.5px ${brandColor || "#0f172a"}`,
            },
            ".Input": {
              border: "1px solid #e2e8f0",
              boxShadow: "none",
              backgroundColor: "#f8fafc",
            },
            ".Input:focus": {
              borderColor: brandColor || "#0f172a",
              backgroundColor: "#ffffff",
              boxShadow: `0 0 0 1px ${brandColor || "#0f172a"}`,
            },
          },
        },
      });

      setStripeElements(elements);

      const pElement = elements.create("payment", {
        layout: {
          type: "tabs",
          defaultCollapsed: false,
        },
        paymentMethodOrder: [
          "apple_pay",
          "google_pay",
          "card",
          "revolut_pay",
          "amazon_pay",
          "link",
          "klarna",
          "paypal",
          "afterpay_clearpay",
        ],
        wallets: {
          applePay: "auto",
          googlePay: "auto",
        },
      });

      setPaymentElement(pElement);
      paymentMountedRef.current = false;
    } catch (err: any) {
      console.error("Error initializing Stripe payment element:", err);
      setStripeError("Unable to initialize payment methods. Please refresh and try again.");
    }
  };

  // Mount payment element into DOM when Step 45 renders
  useEffect(() => {
    let mountTimer: any;
    if (step === 45 && paymentElement) {
      // Small timeout to guarantee DOM node is rendered
      mountTimer = setTimeout(() => {
        const container = document.getElementById("stripe-payment-sheet-mount");
        if (container && !paymentMountedRef.current) {
          try {
            paymentElement.mount("#stripe-payment-sheet-mount");
            paymentMountedRef.current = true;
          } catch (e: any) {
            console.warn("Stripe Element mount attempt:", e?.message);
          }
        }
      }, 50);
    }
    return () => {
      if (mountTimer) clearTimeout(mountTimer);
      if (step !== 45) {
        paymentMountedRef.current = false;
      }
    };
  }, [step, paymentElement]);

  // Step 4 Handler: Call Backend API to Reserve Slot & Check if Upfront Stripe Payment is required
  const handleProceedToConfirmation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinic) {
      alert("Clinic profile is still loading. Please try again in a moment.");
      return;
    }

    if (!selectedDate || !selectedTimeSlot) {
      alert("Please select your desired date and time slot on the calendar.");
      return;
    }

    if (!selectedTreatment && !reschedulingAppointmentId) {
      alert("Please select a treatment before proceeding.");
      return;
    }

    setSubmitting(true);
    setStripeError("");

    try {
      // 1. Ensure user is authenticated with Google to obtain valid ID Token for backend & Stripe
      let currentAuth = auth.currentUser;
      if (!currentAuth || currentAuth.isAnonymous) {
        try {
          const res = await signInWithGoogle();
          currentAuth = res.user;
          setAuthUser(res.user);
          if (res.user.displayName && !patientName) setPatientName(res.user.displayName);
          if (res.user.email && !patientEmail) setPatientEmail(res.user.email);
        } catch (authErr: any) {
          setSubmitting(false);
          console.warn("Google sign-in was not completed:", authErr);
          alert("Sign in with Google is required to secure your appointment slot and proceed with payment.");
          return;
        }
      }

      const finalName = patientName.trim() || currentAuth?.displayName || "";
      const finalEmail = patientEmail.trim() || currentAuth?.email || "";

      if (!finalName || !finalEmail) {
        setSubmitting(false);
        alert("Please provide your full name and email address.");
        return;
      }

      const resolvedClinicId = clinic.id || (clinic as any).clinicId;

      // When "Any Specialist" is selected, dynamically pick the doctor free for this slot from apiSlots, or fallback to first available doctor
      let resolvedDoctor = selectedDoctor;
      if (!resolvedDoctor) {
        const matchedSlot = apiSlots.find((s) => s.time === selectedTimeSlot);
        const freeDocId = matchedSlot?.doctorIds?.[0];
        if (freeDocId) {
          resolvedDoctor = doctors.find((d) => d.id === freeDocId || d.doctorId === freeDocId) || null;
        }
        if (!resolvedDoctor && doctors.length > 0) {
          resolvedDoctor = doctors[0];
        }
      }

      const resolvedDoctorId =
        resolvedDoctor?.doctorId || resolvedDoctor?.id || "doc_staff";
      const resolvedVariantTitle =
        selectedVariant?.title || selectedTreatment?.types?.[0]?.title || "Standard";

      // Construct canonical ISO startDateTime based strictly on the user's selected date and time slot
      const [hours, mins] = (selectedTimeSlot || "09:00").split(":");
      const startDateTime = `${selectedDate}T${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}:00.000Z`;

      const patientPayload: any = {
        name: finalName,
        email: finalEmail,
        phone: patientPhone.trim(),
        patientId: currentAuth?.uid,
      };
      if (patientNotes && patientNotes.trim()) {
        patientPayload.notes = patientNotes.trim();
      }

      // Special Path: If this is an existing appointment reschedule
      if (reschedulingAppointmentId) {
        const res = await rescheduleAppointment({
          clinicId: resolvedClinicId,
          appointmentId: reschedulingAppointmentId,
          newStartDateTime: startDateTime,
          newDoctorId: resolvedDoctorId,
          reason: "Online reschedule by patient",
        });

        setBookingRef((res.appointmentId || reschedulingAppointmentId).toUpperCase());
        setStep(5);
        return;
      }

      // 2. Call Booking API to reserve atomic 10-minute hold
      const holdRes = await reserveBookingHold({
        clinicId: resolvedClinicId,
        treatmentId: selectedTreatment.id,
        variantTitle: resolvedVariantTitle,
        doctorId: resolvedDoctorId,
        startDateTime,
        patient: patientPayload,
        bookingSource: "public_web",
      });

      setHeldReservation(holdRes);

      // Determine full price and upfront deposit amount
      const fullPrice = Number(
        selectedVariant?.nonMemberPrice || selectedTreatment?.types?.[0]?.nonMemberPrice || 0
      );
      const isUpfrontRequired =
        holdRes.paymentRequired === true ||
        clinic.bookingConfig?.settings?.requirePaymentUpfront === true ||
        selectedTreatment.depositRequired === true;

      // 3. If upfront payment / deposit is required, initialize Stripe Elements
      if (isUpfrontRequired) {
        let calculatedDeposit = holdRes.payment?.amount || fullPrice;
        if (clinic.bookingConfig?.settings?.depositType === "percentage") {
          const pct = clinic.bookingConfig.settings.depositAmount || 50;
          calculatedDeposit = (fullPrice * pct) / 100;
        } else if (clinic.bookingConfig?.settings?.depositType === "fixed") {
          calculatedDeposit = clinic.bookingConfig.settings.depositAmount || 50;
        }
        setDepositAmountDue(calculatedDeposit);

        // Resolve clientSecret
        let secret = holdRes.payment?.clientSecret;
        if (!secret) {
          // Generate PaymentIntent from backend
          const intentData = await createStripePaymentIntent({
            clinicId: resolvedClinicId,
            patientId: currentAuth?.uid || holdRes.appointmentId,
            userUid: currentAuth?.uid || "guest_patient",
            treatmentId: selectedTreatment.id,
            variantTitle: resolvedVariantTitle,
            amount: calculatedDeposit,
            currency: clinic.currency || clinic.stripe?.defaultCurrency || "GBP",
            metadata: {
              appointmentId: holdRes.appointmentId,
              bookingType: "appointment_deposit",
            },
          });
          secret = intentData.clientSecret;
        }

        let pubKey = clinic.stripe?.publishableKey;
        if (!pubKey) {
          const conf = await fetchClinicStripeConfig(resolvedClinicId);
          if (conf?.stripe?.publishableKey) {
            pubKey = conf.stripe.publishableKey;
          }
        }

        if (!pubKey) {
          throw new Error("Online payment setup is in progress for this clinic. Please contact clinic reception directly to confirm your booking.");
        }

        setStripeClientSecret(secret);
        await initStripePaymentElement(pubKey, secret);
        setStep(45); // Transition to Modern Stripe Payment Sheet Screen
      } else {
        // No payment needed -> Confirm booking immediately on backend
        await confirmBooking({
          clinicId: resolvedClinicId,
          appointmentId: holdRes.appointmentId,
        });
        setBookingRef(holdRes.appointmentId.toUpperCase());
        setStep(5);
      }
    } catch (err: any) {
      console.error("Booking reservation failed:", err);
      alert(err.message || "We could not complete your booking reservation. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Step 45 Handler: Process Stripe Payment & Finalize Appointment
  const handleProcessStripePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripeObj || !stripeElements || !stripeClientSecret || !heldReservation) {
      setStripeError("Secure checkout is loading. Please try again in a moment.");
      return;
    }

    setIsProcessingPayment(true);
    setStripeError("");

    const resolvedClinicId = clinic?.id || (clinic as any)?.clinicId;

    // Persist pending booking snapshot to sessionStorage in case of wallet / 3DS redirect
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(
          "aurwell_pending_booking",
          JSON.stringify({
            appointmentId: heldReservation.appointmentId,
            clinicId: resolvedClinicId,
            treatmentId: selectedTreatment?.id,
            treatmentTitle: selectedTreatment?.title,
            durationMinutes: selectedTreatment?.durationMinutes || 30,
            variantTitle: selectedVariant?.title,
            doctorName: selectedDoctor?.name,
            selectedDate,
            selectedTimeSlot,
            patientName: patientName.trim(),
            patientEmail: patientEmail.trim(),
            patientPhone: patientPhone.trim(),
          })
        );
      } catch (e) {
        console.warn("Could not save pending booking snapshot:", e);
      }
    }

    try {
      const returnUrl = new URL(window.location.href);
      if (resolvedClinicId) {
        returnUrl.searchParams.set("clinicId", resolvedClinicId);
      }
      returnUrl.searchParams.set("booking_return", "1");

      const confirmResult = await stripeObj.confirmPayment({
        elements: stripeElements,
        confirmParams: {
          return_url: returnUrl.toString(),
          payment_method_data: {
            billing_details: {
              name: patientName.trim(),
              email: patientEmail.trim(),
              phone: patientPhone.trim(),
            },
          },
        },
        redirect: "if_required",
      });

      if (confirmResult.error) {
        setStripeError(confirmResult.error.message || "Card payment was declined. Please try another card.");
        setIsProcessingPayment(false);
        return;
      }

      if (
        confirmResult.paymentIntent &&
        (confirmResult.paymentIntent.status === "succeeded" || confirmResult.paymentIntent.status === "processing")
      ) {
        const resolvedClinicId = clinic?.id || (clinic as any)?.clinicId;

        // Finalize appointment status on booking backend with the succeeded PaymentIntent
        await confirmBooking({
          clinicId: resolvedClinicId,
          appointmentId: heldReservation.appointmentId,
          paymentIntentId: confirmResult.paymentIntent.id,
        });

        setBookingRef(heldReservation.appointmentId.toUpperCase());
        setStep(5);

        if (typeof window !== "undefined") {
          sessionStorage.removeItem("aurwell_pending_booking");
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      } else {
        setStripeError("Payment could not be verified. If your card was charged, please contact the clinic.");
      }
    } catch (err: any) {
      console.error("Payment confirmation failed:", err);
      setStripeError(err.message || "Payment verification failed.");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Execute Appointment Cancellation
  const handleExecuteCancelAppointment = async () => {
    if (!clinic || !cancellingAppointmentId) return;

    const resolvedClinicId = clinic.id || (clinic as any).clinicId;
    const finalReason = customCancelReason.trim()
      ? `${cancelReason}: ${customCancelReason.trim()}`
      : cancelReason;

    try {
      setIsCancelling(true);
      const res = await cancelAppointment({
        clinicId: resolvedClinicId,
        appointmentId: cancellingAppointmentId,
        reason: finalReason,
        cancelledBy: "patient",
      });

      setCancelSuccessResult(res);
    } catch (err: any) {
      console.error("Cancellation failed:", err);
      alert(err.message || "Failed to cancel appointment. Please try again or contact clinic reception.");
    } finally {
      setIsCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-6 text-neutral-600">
        <div
          className="w-12 h-12 rounded-full border-4 border-t-transparent animate-spin mb-4"
          style={{ borderColor: `${brandColor} transparent ${brandColor} ${brandColor}` }}
        />
        <h3 className="text-base font-bold text-neutral-900">Loading Appointments...</h3>
        <p className="text-xs text-neutral-400 mt-1">Finding available dates & services for you...</p>
      </div>
    );
  }

  if (error || !clinic) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-8 sm:p-12 rounded-3xl border border-neutral-200/80 shadow-xl max-w-md w-full space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-black text-neutral-900">Clinic Unavailable</h2>
          <p className="text-xs text-neutral-500 leading-relaxed">{error}</p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white px-6 py-2.5 rounded-full text-xs font-bold transition shadow-sm"
            >
              Return to Aurwell
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-neutral-900 font-sans flex flex-col">
      {/* Clinic Header Bar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-neutral-200/80 shadow-2xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {clinic.logoUrl ? (
              <img
                src={clinic.logoUrl}
                alt={clinic.merchantName}
                className="w-10 h-10 object-contain rounded-xl border border-neutral-200 p-1 bg-white"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-xl text-white flex items-center justify-center font-black text-base shadow-xs"
                style={{ backgroundColor: brandColor }}
              >
                {clinic.merchantName ? clinic.merchantName[0] : "A"}
              </div>
            )}
            <div>
              <h1 className="font-black text-base text-neutral-900 tracking-tight leading-none">
                {clinic.merchantName}
              </h1>
              <span
                className="text-[10px] font-extrabold tracking-wider uppercase mt-1 block"
                style={{ color: brandColor }}
              >
                Online Appointments
              </span>
            </div>
          </div>

          {clinic.phone && (
            <a
              href={`tel:${clinic.phone}`}
              className="hidden sm:inline-flex items-center gap-2 text-xs font-bold text-neutral-700 bg-neutral-100 hover:bg-neutral-200/70 px-4 py-2 rounded-full transition"
            >
              <Phone className="w-3.5 h-3.5" style={{ color: brandColor }} />
              <span>{clinic.phone}</span>
            </a>
          )}
        </div>
      </header>

      {/* Main Booking Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10 flex flex-col">
        {/* CANCELLATION FLOW */}
        {cancellingAppointmentId ? (
          <div className="max-w-xl mx-auto w-full space-y-6">
            {/* SUCCESS STATE */}
            {cancelSuccessResult ? (
              <div className="bg-white p-8 sm:p-12 rounded-3xl border border-neutral-200/80 shadow-xl text-center space-y-6">
                <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div className="space-y-1">
                  <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
                    Appointment Cancelled
                  </h2>
                  <p className="text-xs sm:text-sm text-neutral-500">
                    Your appointment at <strong>{clinic.merchantName}</strong> has been cancelled.
                  </p>
                </div>

                {/* Refund Outcome Box */}
                {cancelSuccessResult.refundEligible || cancelSuccessResult.refundAmount > 0 ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-left space-y-1.5">
                    <div className="flex items-center gap-2 text-emerald-900 font-black text-xs sm:text-sm">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Full Deposit Refund Issued: £{Number(cancelSuccessResult.refundAmount || 0).toFixed(2)}</span>
                    </div>
                    <p className="text-[11px] text-emerald-800 leading-relaxed">
                      Your refund has been processed via Stripe and will appear on your original payment card statement in 5–10 business days.
                    </p>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left space-y-1.5">
                    <div className="flex items-center gap-2 text-amber-900 font-bold text-xs sm:text-sm">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Late Cancellation Policy Applied</span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      In accordance with the clinic’s cancellation policy, appointments cancelled within {clinic.bookingConfig?.settings?.cancellationHours || 24} hours of the scheduled time forfeit the initial deposit.
                    </p>
                  </div>
                )}

                {/* Appointment Snapshot */}
                <div className="bg-neutral-50 p-4 rounded-2xl text-xs space-y-2.5 border border-neutral-200 text-left">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Reference:</span>
                    <span className="font-mono font-bold text-neutral-900">#{cancellingAppointmentId.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Treatment:</span>
                    <span className="font-bold text-neutral-900">
                      {cancelAppointmentData?.treatment?.title || cancelAppointmentData?.treatmentTitle || "Appointment"}
                    </span>
                  </div>
                  {cancelAppointmentData?.patient?.email && (
                    <div className="flex justify-between">
                      <span className="text-neutral-500">Confirmation Sent To:</span>
                      <span className="font-bold text-neutral-900">{cancelAppointmentData.patient.email}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = window.location.pathname;
                    }}
                    className="w-full text-white py-3.5 rounded-2xl text-xs font-bold transition shadow-sm cursor-pointer"
                    style={{ backgroundColor: brandColor }}
                  >
                    Book A New Appointment
                  </button>
                </div>
              </div>
            ) : cancelAppointmentData?.status === "cancelled" ? (
              /* ALREADY CANCELLED STATE */
              <div className="bg-white p-8 sm:p-12 rounded-3xl border border-neutral-200/80 shadow-xl text-center space-y-5">
                <div className="w-16 h-16 rounded-full bg-neutral-100 text-neutral-500 flex items-center justify-center mx-auto border border-neutral-200">
                  <XCircle className="w-8 h-8 text-neutral-400" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-neutral-900 tracking-tight">
                    Appointment Already Cancelled
                  </h2>
                  <p className="text-xs text-neutral-500">
                    This appointment (#{cancellingAppointmentId.toUpperCase()}) has already been cancelled.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = window.location.pathname;
                    }}
                    className="w-full text-white py-3.5 rounded-2xl text-xs font-bold transition shadow-sm cursor-pointer"
                    style={{ backgroundColor: brandColor }}
                  >
                    Book A New Appointment
                  </button>
                </div>
              </div>
            ) : !cancelAppointmentData ? (
              /* APPOINTMENT NOT FOUND STATE */
              <div className="bg-white p-8 sm:p-12 rounded-3xl border border-neutral-200/80 shadow-xl text-center space-y-5">
                <div className="w-16 h-16 rounded-full bg-neutral-100 text-neutral-500 flex items-center justify-center mx-auto border border-neutral-200">
                  <AlertCircle className="w-8 h-8 text-neutral-400" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-2xl font-black text-neutral-900 tracking-tight">
                    Appointment Details Unavailable
                  </h2>
                  <p className="text-xs text-neutral-500">
                    We could not locate appointment #{cancellingAppointmentId.toUpperCase()}. It may have expired or been removed.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = window.location.pathname;
                    }}
                    className="w-full text-white py-3.5 rounded-2xl text-xs font-bold transition shadow-sm cursor-pointer"
                    style={{ backgroundColor: brandColor }}
                  >
                    Book An Appointment
                  </button>
                </div>
              </div>
            ) : (
              /* MAIN CANCELLATION & REFUND FORM */
              <div className="space-y-6">
                {/* Header */}
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/30 text-rose-900 text-xs font-bold px-3.5 py-1.5 rounded-full shadow-2xs">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    <span>Appointment Cancellation & Refund</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
                    Cancel Your Appointment
                  </h2>
                  <p className="text-xs sm:text-sm text-neutral-500">
                    Review your booking details and cancellation policy for <strong className="text-neutral-800">{clinic.merchantName}</strong>
                  </p>
                </div>

                {/* Appointment Card */}
                <div className="bg-white p-6 sm:p-8 rounded-3xl border border-neutral-200/80 shadow-xl space-y-5">
                  <div className="bg-neutral-50 rounded-2xl p-4 sm:p-5 border border-neutral-200/60 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 block">
                          Scheduled Treatment
                        </span>
                        <h3 className="text-sm sm:text-base font-black text-neutral-900">
                          {cancelAppointmentData?.treatment?.title || cancelAppointmentData?.treatmentTitle || "Appointment"}
                        </h3>
                        {(cancelAppointmentData?.treatment?.variantTitle || cancelAppointmentData?.variantTitle) && (
                          <p className="text-xs text-neutral-500">
                            {cancelAppointmentData?.treatment?.variantTitle || cancelAppointmentData?.variantTitle}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 block">
                          Ref
                        </span>
                        <span className="font-mono text-xs font-bold text-neutral-700">
                          #{cancellingAppointmentId.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-neutral-200/60 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-neutral-600">
                      <div className="flex items-center gap-2">
                        <CalendarIcon className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span className="font-bold text-neutral-800">
                          {(() => {
                            const sched = cancelAppointmentData?.schedule;
                            if (!sched) return "Scheduled Date";
                            const dateStr = sched.date || (sched.startDateTime?.includes("T") ? sched.startDateTime.split("T")[0] : "");
                            if (dateStr) {
                              const [y, m, d] = dateStr.split("-").map(Number);
                              return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              });
                            }
                            return new Date(sched.startDateTime).toLocaleDateString("en-GB");
                          })()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 sm:justify-end">
                        <Clock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span className="font-bold text-neutral-800">
                          {(() => {
                            const sched = cancelAppointmentData?.schedule;
                            const timeStr = sched?.timeSlot || (sched?.startDateTime?.includes("T") ? sched.startDateTime.split("T")[1].substring(0, 5) : "");
                            if (timeStr) {
                              const [h, min] = timeStr.split(":");
                              const hNum = parseInt(h, 10);
                              const ampm = hNum >= 12 ? "pm" : "am";
                              const h12 = hNum % 12 || 12;
                              return `${String(h12).padStart(2, "0")}:${min} ${ampm}`;
                            }
                            return "";
                          })()}{" "}
                          ({cancelAppointmentData?.treatment?.durationMinutes || 30} mins)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span>Practitioner: <strong>{cancelAppointmentData?.doctorName || "Clinic Specialist"}</strong></span>
                      </div>
                      <div className="flex items-center gap-2 sm:justify-end">
                        <User className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <span>Patient: <strong>{cancelAppointmentData?.patient?.name || "Patient"}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Policy & Refund Eligibility Card */}
                  {(() => {
                    const startMs = cancelAppointmentData?.schedule?.startDateTime
                      ? new Date(cancelAppointmentData.schedule.startDateTime).getTime()
                      : 0;
                    const hoursLeft = startMs > 0 ? (startMs - Date.now()) / (1000 * 60 * 60) : 0;
                    const freeHours = clinic.bookingConfig?.settings?.cancellationHours ?? 24;
                    const isEligible = hoursLeft >= freeHours;
                    const depositPaid =
                      cancelAppointmentData?.payment?.amountPaid ||
                      cancelAppointmentData?.payment?.depositAmount ||
                      cancelAppointmentData?.treatment?.price ||
                      0;

                    return isEligible ? (
                      <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 space-y-1.5">
                        <div className="flex items-center gap-2 text-emerald-950 font-black text-xs sm:text-sm">
                          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>100% Refund Guarantee Eligible ({hoursLeft.toFixed(0)}h Notice)</span>
                        </div>
                        <p className="text-[11px] text-emerald-800 leading-relaxed">
                          Because you are cancelling more than {freeHours} hours ahead of time, your deposit of <strong>£{Number(depositPaid).toFixed(2)}</strong> will be automatically refunded to your original payment card via Stripe.
                        </p>
                      </div>
                    ) : (
                      <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 space-y-1.5">
                        <div className="flex items-center gap-2 text-amber-950 font-black text-xs sm:text-sm">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Late Cancellation Notice ({hoursLeft.toFixed(1)}h Remaining)</span>
                        </div>
                        <p className="text-[11px] text-amber-800 leading-relaxed">
                          Under clinic policy, cancellations with less than {freeHours} hours notice forfeit the deposit to cover the reserved practitioner time. You can reschedule for free instead!
                        </p>
                      </div>
                    );
                  })()}

                  {/* Reason Selection */}
                  <div className="space-y-2.5">
                    <label className="text-xs font-bold text-neutral-800 block">
                      Reason for Cancellation
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        "Change of plans",
                        "Scheduling conflict",
                        "Personal emergency",
                        "Illness / Medical reason",
                        "Other",
                      ].map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setCancelReason(r)}
                          className={`text-xs px-3.5 py-1.5 rounded-full border font-bold transition cursor-pointer ${
                            cancelReason === r
                              ? "bg-neutral-900 border-neutral-900 text-white shadow-2xs"
                              : "bg-neutral-50 border-neutral-200 text-neutral-700 hover:bg-neutral-100"
                          }`}
                        >
                          {r}
                        </button>
                      ))}
                    </div>

                    <textarea
                      rows={2}
                      value={customCancelReason}
                      onChange={(e) => setCustomCancelReason(e.target.value)}
                      placeholder="Optional additional remarks for the clinic..."
                      className="w-full border border-neutral-200 rounded-xl p-3 text-xs mt-1 bg-neutral-50 focus:bg-white focus:outline-none"
                    />
                  </div>

                  {/* Action Controls */}
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        window.location.href = `${window.location.pathname}?reschedule=${cancellingAppointmentId}&clinicId=${clinic.id}`;
                      }}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 border border-neutral-200 rounded-2xl text-xs font-bold text-neutral-800 hover:bg-neutral-50 transition cursor-pointer shadow-2xs"
                    >
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <span>Reschedule Instead</span>
                    </button>

                    <button
                      type="button"
                      disabled={isCancelling}
                      onClick={handleExecuteCancelAppointment}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 text-white bg-rose-600 hover:bg-rose-700 active:scale-[0.99] px-8 py-3.5 rounded-2xl text-xs font-bold transition shadow-md cursor-pointer disabled:opacity-50"
                    >
                      {isCancelling ? (
                        <>
                          <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                          <span>Processing Cancellation...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="w-4 h-4" />
                          <span>Cancel Appointment</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Reschedule Active Banner */}
            {reschedulingAppointmentId && step !== 5 && (
              <div className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-amber-950">
                      Rescheduling Appointment #{reschedulingAppointmentId.toUpperCase()}
                    </h3>
                    <p className="text-[11px] text-amber-800 font-medium">
                      Select your new date and time. Your previous deposit is automatically applied.
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold bg-amber-200/80 text-amber-900 px-2.5 py-1 rounded-full uppercase shrink-0">
                  Free Reschedule
                </span>
              </div>
            )}

            {/* Progress Stepper */}
            {step !== 5 && (
              <div className="mb-8">
            {reschedulingAppointmentId ? (
              <div className="flex flex-wrap items-center justify-between text-xs font-bold text-neutral-400 mb-2 gap-2">
                <span className="text-amber-800 flex items-center gap-1.5 font-black bg-amber-50 px-3 py-1 rounded-full border border-amber-200 shadow-2xs">
                  <Lock className="w-3.5 h-3.5 text-amber-700" /> Treatment: {selectedTreatment?.title || "Pre-selected"}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className={`cursor-pointer transition ${
                      step === 2 ? "text-neutral-900 font-black underline underline-offset-4" : "text-neutral-500 hover:text-neutral-800 font-bold"
                    }`}
                  >
                    1. Practitioner
                  </button>
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-300" />
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className={`cursor-pointer transition ${
                      step === 3 ? "text-neutral-900 font-black underline underline-offset-4" : "text-neutral-500 hover:text-neutral-800 font-bold"
                    }`}
                  >
                    2. Date & Time
                  </button>
                  <ChevronRight className="w-3.5 h-3.5 text-neutral-300" />
                  <span className={step >= 4 ? "text-neutral-900 font-black underline underline-offset-4" : "text-neutral-400"}>
                    3. Confirm
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs font-bold text-neutral-400 mb-2">
                <span className={step >= 1 ? "text-neutral-900 font-black" : ""}>1. Treatment</span>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className={step >= 2 ? "text-neutral-900 font-black" : ""}>2. Practitioner</span>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className={step >= 3 ? "text-neutral-900 font-black" : ""}>3. Date & Time</span>
                <ChevronRight className="w-3.5 h-3.5" />
                <span className={step >= 4 ? "text-neutral-900 font-black" : ""}>4. Details</span>
                {step === 45 && (
                  <>
                    <ChevronRight className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-amber-600 font-black">5. Stripe Deposit</span>
                  </>
                )}
              </div>
            )}
            <div className="w-full bg-neutral-200 h-1.5 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-300 rounded-full"
                style={{
                  width: reschedulingAppointmentId
                    ? step === 2
                      ? "33%"
                      : step === 3
                      ? "66%"
                      : "100%"
                    : step === 1
                    ? "25%"
                    : step === 2
                    ? "50%"
                    : step === 3
                    ? "75%"
                    : step === 4
                    ? "90%"
                    : "95%",
                  backgroundColor: brandColor,
                }}
              />
            </div>
          </div>
        )}

        {/* STEP 1: Select Treatment (Hidden entirely in Reschedule Mode) */}
        {step === 1 && !reschedulingAppointmentId && (
          <div className="space-y-6">
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-black text-neutral-900 tracking-tight">Select a Treatment</h2>
              <p className="text-xs text-neutral-500">Choose your desired aesthetic procedure and option</p>
            </div>

            {treatments.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-neutral-200 text-center text-neutral-400">
                No active treatments available for online booking.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {treatments.map((t) => {
                  const variants =
                    Array.isArray(t.types) && t.types.length > 0
                      ? t.types
                      : [{ title: "Standard", nonMemberPrice: t.price || 0 }];
                  const isTreatmentSelected = selectedTreatment?.id === t.id;
                  const currentVariant = isTreatmentSelected && selectedVariant ? selectedVariant : variants[0];

                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        setSelectedTreatment(t);
                        if (!isTreatmentSelected || !selectedVariant) {
                          setSelectedVariant(variants[0]);
                        }
                      }}
                      className={`bg-white p-5 rounded-3xl border-2 cursor-pointer transition-all flex flex-col justify-between space-y-4 shadow-xs ${
                        isTreatmentSelected
                          ? "shadow-md ring-2 ring-offset-1"
                          : "border-neutral-200/80 hover:border-neutral-300 hover:shadow-sm"
                      }`}
                      style={{
                        borderColor: isTreatmentSelected ? brandColor : undefined,
                        backgroundColor: isTreatmentSelected ? `${brandColor}08` : "white",
                      }}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-extrabold text-base text-neutral-900">{t.title}</h3>
                          <span
                            className="text-base font-black shrink-0"
                            style={{ color: brandColor }}
                          >
                            £{currentVariant?.nonMemberPrice ?? "—"}
                          </span>
                        </div>

                        {t.description && (
                          <p className="text-xs text-neutral-500 mt-1.5 line-clamp-2 leading-relaxed">
                            {t.description}
                          </p>
                        )}

                        {/* Multiple Treatment Types / Variants Selector */}
                        {variants.length > 1 && (
                          <div className="mt-3 pt-3 border-t border-neutral-100">
                            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
                              Select Option / Area:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {variants.map((v: any, vIdx: number) => {
                                const isVariantActive = isTreatmentSelected && selectedVariant?.title === v.title;
                                return (
                                  <button
                                    key={vIdx}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedTreatment(t);
                                      setSelectedVariant(v);
                                    }}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                                      isVariantActive
                                        ? "text-white shadow-xs"
                                        : "bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100"
                                    }`}
                                    style={{
                                      backgroundColor: isVariantActive ? brandColor : undefined,
                                      borderColor: isVariantActive ? brandColor : undefined,
                                    }}
                                  >
                                    <span>{v.title}</span>
                                    <span className="opacity-90 font-extrabold">(£{v.nonMemberPrice})</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-400 font-semibold">
                        <span className="flex items-center gap-1.5 text-neutral-600">
                          <Clock className="w-3.5 h-3.5" style={{ color: brandColor }} /> {t.durationMinutes || 30} mins
                        </span>
                        <span
                          className="font-bold flex items-center gap-1"
                          style={{ color: brandColor }}
                        >
                          {isTreatmentSelected ? (
                            <>
                              <Check className="w-3.5 h-3.5" /> Selected
                            </>
                          ) : (
                            <>
                              Select <ArrowRight className="w-3 h-3" />
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button
                disabled={!selectedTreatment}
                onClick={() => setStep(2)}
                className="flex items-center gap-2 text-white px-8 py-3.5 rounded-2xl text-xs font-bold transition shadow-lg cursor-pointer disabled:opacity-40"
                style={{ backgroundColor: brandColor }}
              >
                Continue to Practitioner <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Select Doctor */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-black text-neutral-900 tracking-tight">Select a Practitioner</h2>
              <p className="text-xs text-neutral-500">Choose your preferred doctor or select Any Specialist</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {/* Option: Any Doctor */}
              <div
                onClick={() => setSelectedDoctor(null)}
                className={`bg-white p-5 rounded-3xl border-2 cursor-pointer transition text-center flex flex-col items-center justify-center space-y-3 ${
                  selectedDoctor === null
                    ? "shadow-md ring-2 ring-offset-1"
                    : "border-neutral-200 hover:border-neutral-300"
                }`}
                style={{
                  borderColor: selectedDoctor === null ? brandColor : undefined,
                  backgroundColor: selectedDoctor === null ? `${brandColor}08` : "white",
                }}
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center text-white"
                  style={{ backgroundColor: brandColor }}
                >
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-neutral-900">Any Available Specialist</h3>
                  <p className="text-[11px] text-neutral-400 mt-0.5">Recommended for quickest availability</p>
                </div>
              </div>

              {/* Doctor Profiles (Only qualified for selected treatment) */}
              {qualifiedDoctors.map((doc) => {
                const isSelected = selectedDoctor?.id === doc.id;
                return (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDoctor(doc)}
                    className={`bg-white p-5 rounded-3xl border-2 cursor-pointer transition flex flex-col items-center text-center space-y-3 ${
                      isSelected
                        ? "shadow-md ring-2 ring-offset-1"
                        : "border-neutral-200 hover:border-neutral-300"
                    }`}
                    style={{
                      borderColor: isSelected ? brandColor : undefined,
                      backgroundColor: isSelected ? `${brandColor}08` : "white",
                    }}
                  >
                    {doc.avatarUrl ? (
                      <img
                        src={doc.avatarUrl}
                        alt={doc.name}
                        className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-xs"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-neutral-100 text-neutral-600 flex items-center justify-center font-bold text-base">
                        {doc.name ? doc.name[0] : "D"}
                      </div>
                    )}
                    <div>
                      <h3 className="font-extrabold text-sm text-neutral-900">{doc.name}</h3>
                      <p className="text-[11px] text-neutral-400 mt-0.5">{doc.title || "Aesthetic Specialist"}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4">
              {!reschedulingAppointmentId ? (
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center gap-2 px-6 py-3 border border-neutral-200 rounded-2xl text-xs font-bold text-neutral-700 hover:bg-neutral-50 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Change Treatment
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex items-center gap-2 px-6 py-3 border border-neutral-200 rounded-2xl text-xs font-bold text-neutral-700 hover:bg-neutral-50 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Date & Time
                </button>
              )}
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex items-center gap-2 text-white px-8 py-3.5 rounded-2xl text-xs font-bold transition shadow-lg cursor-pointer"
                style={{ backgroundColor: brandColor }}
              >
                Continue to Date & Time <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Select Date & Time */}
        {step === 3 && (
          <div className="space-y-6">
            {/* Locked Treatment & Practitioner Banner when Rescheduling */}
            {reschedulingAppointmentId && selectedTreatment && (
              <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-900 flex items-center justify-center shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-800 block">
                      Treatment (Locked For Reschedule)
                    </span>
                    <h3 className="text-sm font-black text-neutral-900">
                      {selectedTreatment.title} {selectedVariant ? `• ${selectedVariant.title}` : ""}
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-800 bg-white border border-neutral-200/80 hover:bg-neutral-50 px-3.5 py-2 rounded-xl transition shadow-2xs cursor-pointer shrink-0"
                >
                  <User className="w-3.5 h-3.5 text-neutral-500" />
                  <span>Practitioner: <strong>{formatDoctorName(selectedDoctor?.name, "Any Available Specialist")}</strong></span>
                  <span className="text-[10px] text-amber-700 underline ml-1">Change</span>
                </button>
              </div>
            )}

            <div className="text-center space-y-1">
              <h2 className="text-2xl font-black text-neutral-900 tracking-tight">Select Date & Time</h2>
              <p className="text-xs text-neutral-500">Pick a convenient date and time slot for your appointment</p>
            </div>

            {/* Date Switcher & Calendar Section */}
            <div className="bg-white p-4 sm:p-6 rounded-3xl border border-neutral-200/80 shadow-xs space-y-4 sm:space-y-5">
              {/* Calendar Controls Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-3 sm:pb-4">
                {/* Top Row: Month Info + Navigation Arrows */}
                <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div
                      className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center text-white shadow-xs shrink-0"
                      style={{ backgroundColor: brandColor }}
                    >
                      <CalendarDays className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base font-extrabold text-neutral-900 leading-tight">
                        {calendarMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                      </h3>
                      <p className="text-[10px] sm:text-[11px] text-neutral-500 font-medium">
                        Selected:{" "}
                        <span className="font-bold text-neutral-800">
                          {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Navigation Arrows for Mobile (Top-Right) and Desktop */}
                  <div className="flex sm:hidden items-center gap-1 bg-neutral-50 border border-neutral-200 p-0.5 rounded-xl shadow-2xs">
                    <button
                      type="button"
                      onClick={() => {
                        if (calendarViewMode === "week") {
                          setWeekOffsetDays((prev) => prev - 7);
                        } else {
                          const prevMonth = new Date(calendarMonth);
                          prevMonth.setMonth(prevMonth.getMonth() - 1);
                          setCalendarMonth(prevMonth);
                        }
                      }}
                      className="p-1 rounded-lg hover:bg-neutral-200 text-neutral-700 transition cursor-pointer"
                      title="Previous"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (calendarViewMode === "week") {
                          setWeekOffsetDays((prev) => prev + 7);
                        } else {
                          const nextMonth = new Date(calendarMonth);
                          nextMonth.setMonth(nextMonth.getMonth() + 1);
                          setCalendarMonth(nextMonth);
                        }
                      }}
                      className="p-1 rounded-lg hover:bg-neutral-200 text-neutral-700 transition cursor-pointer"
                      title="Next"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Bottom Row on Mobile / Right Group on Desktop: Toggle and Today */}
                <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
                  <div className="flex-1 sm:flex-initial flex items-center bg-neutral-100/90 p-0.5 sm:p-1 rounded-2xl border border-neutral-200/70">
                    <button
                      type="button"
                      onClick={() => setCalendarViewMode("week")}
                      className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition cursor-pointer text-center ${
                        calendarViewMode === "week"
                          ? "bg-white text-neutral-900 shadow-xs"
                          : "text-neutral-500 hover:text-neutral-900"
                      }`}
                    >
                      Week Strip
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalendarViewMode("month")}
                      className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition cursor-pointer text-center ${
                        calendarViewMode === "month"
                          ? "bg-white text-neutral-900 shadow-xs"
                          : "text-neutral-500 hover:text-neutral-900"
                      }`}
                    >
                      Month Grid
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const todayStr = toISODateString(new Date());
                      setSelectedDate(todayStr);
                      setSelectedTimeSlot("");
                      setCalendarMonth(new Date());
                      setWeekOffsetDays(0);
                    }}
                    className="px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 shadow-2xs cursor-pointer transition shrink-0"
                  >
                    Today
                  </button>

                  {/* Desktop Navigation Arrows */}
                  <div className="hidden sm:flex items-center gap-1 bg-white border border-neutral-200 p-0.5 rounded-xl shadow-2xs">
                    <button
                      type="button"
                      onClick={() => {
                        if (calendarViewMode === "week") {
                          setWeekOffsetDays((prev) => prev - 7);
                        } else {
                          const prevMonth = new Date(calendarMonth);
                          prevMonth.setMonth(prevMonth.getMonth() - 1);
                          setCalendarMonth(prevMonth);
                        }
                      }}
                      className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-600 transition cursor-pointer"
                      title="Previous"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (calendarViewMode === "week") {
                          setWeekOffsetDays((prev) => prev + 7);
                        } else {
                          const nextMonth = new Date(calendarMonth);
                          nextMonth.setMonth(nextMonth.getMonth() + 1);
                          setCalendarMonth(nextMonth);
                        }
                      }}
                      className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-600 transition cursor-pointer"
                      title="Next"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* VIEW 1: Interactive 7-Day Week Strip (Single-line swipeable on mobile, 7-col grid on desktop) */}
              {calendarViewMode === "week" && (
                <div className="w-full overflow-hidden">
                  <div className="flex sm:grid sm:grid-cols-7 gap-2 sm:gap-2.5 overflow-x-auto pb-2 pt-1 px-0.5 no-scrollbar snap-x snap-mandatory">
                    {weekDays.map((d) => {
                      const isSelected = d.isSelected;
                      const isPast = d.isPast;

                      return (
                        <button
                          key={d.dateStr}
                          type="button"
                          disabled={isPast}
                          onClick={() => {
                            setSelectedDate(d.dateStr);
                            setSelectedTimeSlot("");
                            setCalendarMonth(new Date(d.date));
                          }}
                          className={`relative flex-1 min-w-[58px] sm:min-w-0 max-w-[85px] sm:max-w-none py-2.5 px-1.5 sm:py-3 sm:px-2 rounded-2xl flex flex-col items-center justify-center transition cursor-pointer border select-none snap-center shrink-0 sm:shrink group ${
                            isPast
                              ? "bg-neutral-50/70 border-neutral-200/50 text-neutral-300 opacity-50 cursor-not-allowed"
                              : isSelected
                              ? "text-white shadow-md ring-2 ring-offset-2 scale-[1.02]"
                              : "bg-white border-neutral-200/90 text-neutral-700 hover:border-neutral-300 hover:bg-neutral-50/90 hover:shadow-2xs"
                          }`}
                          style={{
                            backgroundColor: isSelected ? brandColor : undefined,
                            borderColor: isSelected ? brandColor : undefined,
                          }}
                        >
                          {d.isToday && !isSelected && (
                            <span
                              className="absolute top-1 right-1 text-[7px] font-black uppercase px-1 py-0.2 rounded-full"
                              style={{
                                backgroundColor: `${brandColor}15`,
                                color: brandColor,
                              }}
                            >
                              Today
                            </span>
                          )}
                          <span
                            className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${
                              isSelected ? "text-white/80" : "text-neutral-400 group-hover:text-neutral-600"
                            }`}
                          >
                            {d.dayName}
                          </span>
                          <span className="text-base sm:text-xl md:text-2xl font-black my-0.5 tracking-tight">
                            {d.dayNum}
                          </span>
                          <span
                            className={`text-[9px] sm:text-[10px] font-semibold ${
                              isSelected ? "text-white/90" : "text-neutral-500"
                            }`}
                          >
                            {d.monthName}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* VIEW 2: Full Interactive Month Calendar Grid */}
              {calendarViewMode === "month" && (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center text-[10px] sm:text-[11px] font-bold uppercase text-neutral-400 py-1 border-b border-neutral-100">
                    <span>Mon</span>
                    <span>Tue</span>
                    <span>Wed</span>
                    <span>Thu</span>
                    <span>Fri</span>
                    <span>Sat</span>
                    <span>Sun</span>
                  </div>

                  <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
                    {monthDays.map((d, index) => {
                      const isPast = d.isPast;
                      const isSelected = d.isSelected;
                      const isCurrentMonth = d.isCurrentMonth;

                      return (
                        <button
                          key={`${d.dateStr}-${index}`}
                          type="button"
                          disabled={isPast || !isCurrentMonth}
                          onClick={() => {
                            if (!isCurrentMonth) return;
                            setSelectedDate(d.dateStr);
                            setSelectedTimeSlot("");
                          }}
                          className={`h-9 sm:h-11 md:h-12 rounded-xl sm:rounded-2xl flex flex-col items-center justify-center text-[11px] sm:text-xs font-bold transition select-none cursor-pointer relative ${
                            !isCurrentMonth
                              ? "text-neutral-200 bg-transparent cursor-default"
                              : isPast
                              ? "text-neutral-300 bg-neutral-50/50 cursor-not-allowed line-through opacity-50"
                              : isSelected
                              ? "text-white shadow-sm ring-2 ring-offset-1 font-black scale-105"
                              : "text-neutral-800 bg-white border border-neutral-200/70 hover:bg-neutral-50 hover:border-neutral-300"
                          }`}
                          style={{
                            backgroundColor: isSelected ? brandColor : undefined,
                            borderColor: isSelected ? brandColor : undefined,
                          }}
                        >
                          <span>{d.dayNum}</span>
                          {d.isToday && !isSelected && (
                            <span
                              className="w-1 sm:w-1.5 h-1 sm:h-1.5 rounded-full absolute bottom-1"
                              style={{ backgroundColor: brandColor }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Time Slots Section */}
            <div className="bg-white p-4 sm:p-6 rounded-3xl border border-neutral-200/80 shadow-xs space-y-4 sm:space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 border-b border-neutral-100 pb-3 sm:pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" style={{ color: brandColor }} />
                    <h3 className="text-sm sm:text-base font-extrabold text-neutral-900">
                      Available Time Slots
                    </h3>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-neutral-500 mt-0.5">
                    For {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })} • Specialist:{" "}
                    <span className="font-semibold text-neutral-700">
                      {formatDoctorName(selectedDoctor?.name, "Any Available Specialist")}
                    </span>
                  </p>
                </div>

                <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
                  {loadingSlots ? (
                    <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-neutral-600 bg-neutral-100 border border-neutral-200 px-3 py-1 rounded-full animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-neutral-400 animate-ping" />
                      Checking Availability...
                    </span>
                  ) : (
                    <>
                      <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {availableCount} Available
                      </span>
                      {bookedCount > 0 && (
                        <span className="inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-neutral-500 bg-neutral-100 border border-neutral-200 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full">
                          <Lock className="w-3 h-3 text-neutral-400" />
                          {bookedCount} Booked
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* 1. LOADING SKELETON STATE (Shown while data is being fetched) */}
              {loadingSlots && (
                <div className="space-y-4 py-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-neutral-400 animate-pulse">
                    <div className="w-3 h-3 rounded-full bg-neutral-200" />
                    <span>Loading real-time practitioner schedules...</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                    {[1, 2, 3, 4, 5, 6].map((idx) => (
                      <div
                        key={idx}
                        className="h-14 rounded-2xl bg-neutral-100 border border-neutral-200/60 animate-pulse flex flex-col items-center justify-center space-y-1"
                      >
                        <div className="w-12 h-3.5 bg-neutral-200 rounded-md" />
                        <div className="w-10 h-2 bg-neutral-200/70 rounded-md" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. NO SLOTS ALERT (Only shown once loading has finished and 0 slots available) */}
              {!loadingSlots && hasLoadedSlots && availableCount === 0 && (
                <div className="p-4 sm:p-5 rounded-3xl bg-amber-50/90 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                  <div className="flex items-start gap-2.5 sm:gap-3">
                    <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-xs sm:text-sm block">No Available Slots on This Date</span>
                      <p className="text-[10px] sm:text-[11px] text-amber-700/90 mt-0.5">
                        {selectedDoctor
                          ? `${formatDoctorName(selectedDoctor.name)} is fully booked or unavailable on this day. Try another date or choose "Any Available Specialist".`
                          : "All specialist slots are booked on this date. Click below to check the next day."}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleJumpNextDay}
                    className="w-full sm:w-auto px-4 py-2 sm:py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition shrink-0 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    Check Next Day (+1) <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* 3. LOADED SLOTS (Only shown once loading has finished and slots exist) */}
              {!loadingSlots && allDaySlots.length > 0 && availableCount > 0 && (
                <div className="space-y-4 sm:space-y-5">
                  {/* Morning Slots */}
                  {morningSlots.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-[11px] sm:text-xs font-bold text-neutral-600">
                        <Sun className="w-3.5 h-3.5 text-amber-500" />
                        <span>Morning (Before 12:00 PM)</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-2.5">
                        {morningSlots.map((slot) => {
                          const isAvailable = isSlotAvailable(slot);
                          const isSelected = selectedTimeSlot === slot;

                          if (!isAvailable) {
                            return (
                              <div
                                key={slot}
                                className="py-2 px-2.5 sm:py-2.5 sm:px-3 rounded-xl sm:rounded-2xl text-xs border border-neutral-200/70 bg-neutral-100/60 text-neutral-400 flex flex-col items-center justify-center cursor-not-allowed select-none opacity-60"
                              >
                                <span className="font-semibold line-through text-xs text-neutral-400">{slot}</span>
                                <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-0.5 mt-0.5">
                                  <Lock className="w-2.5 h-2.5" /> Booked
                                </span>
                              </div>
                            );
                          }

                          return (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => setSelectedTimeSlot(slot)}
                              className={`py-2 px-2.5 sm:py-2.5 sm:px-3 rounded-xl sm:rounded-2xl text-xs font-bold transition border cursor-pointer flex flex-col items-center justify-center shadow-2xs ${
                                isSelected
                                  ? "text-white shadow-sm ring-2 ring-offset-1 scale-[1.02]"
                                  : "bg-white text-neutral-800 border-neutral-200/90 hover:border-neutral-300 hover:bg-neutral-50"
                              }`}
                              style={{
                                backgroundColor: isSelected ? brandColor : undefined,
                                borderColor: isSelected ? brandColor : undefined,
                              }}
                            >
                              <span className="font-black text-xs sm:text-sm">{slot}</span>
                              <span
                                className={`text-[8px] sm:text-[9px] font-bold tracking-wider mt-0.5 ${
                                  isSelected ? "text-white/90" : "text-neutral-500"
                                }`}
                              >
                                {formatTime12Hour(slot)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Afternoon Slots */}
                  {afternoonSlots.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-neutral-100">
                      <div className="flex items-center gap-2 text-[11px] sm:text-xs font-bold text-neutral-600">
                        <Sunset className="w-3.5 h-3.5 text-orange-500" />
                        <span>Afternoon (12:00 PM – 5:00 PM)</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-2.5">
                        {afternoonSlots.map((slot) => {
                          const isAvailable = isSlotAvailable(slot);
                          const isSelected = selectedTimeSlot === slot;

                          if (!isAvailable) {
                            return (
                              <div
                                key={slot}
                                className="py-2 px-2.5 sm:py-2.5 sm:px-3 rounded-xl sm:rounded-2xl text-xs border border-neutral-200/70 bg-neutral-100/60 text-neutral-400 flex flex-col items-center justify-center cursor-not-allowed select-none opacity-60"
                              >
                                <span className="font-semibold line-through text-xs text-neutral-400">{slot}</span>
                                <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-0.5 mt-0.5">
                                  <Lock className="w-2.5 h-2.5" /> Booked
                                </span>
                              </div>
                            );
                          }

                          return (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => setSelectedTimeSlot(slot)}
                              className={`py-2 px-2.5 sm:py-2.5 sm:px-3 rounded-xl sm:rounded-2xl text-xs font-bold transition border cursor-pointer flex flex-col items-center justify-center shadow-2xs ${
                                isSelected
                                  ? "text-white shadow-sm ring-2 ring-offset-1 scale-[1.02]"
                                  : "bg-white text-neutral-800 border-neutral-200/90 hover:border-neutral-300 hover:bg-neutral-50"
                              }`}
                              style={{
                                backgroundColor: isSelected ? brandColor : undefined,
                                borderColor: isSelected ? brandColor : undefined,
                              }}
                            >
                              <span className="font-black text-xs sm:text-sm">{slot}</span>
                              <span
                                className={`text-[8px] sm:text-[9px] font-bold tracking-wider mt-0.5 ${
                                  isSelected ? "text-white/90" : "text-neutral-500"
                                }`}
                              >
                                {formatTime12Hour(slot)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Evening Slots */}
                  {eveningSlots.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-neutral-100">
                      <div className="flex items-center gap-2 text-[11px] sm:text-xs font-bold text-neutral-600">
                        <Moon className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Evening (5:00 PM Onwards)</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 sm:gap-2.5">
                        {eveningSlots.map((slot) => {
                          const isAvailable = isSlotAvailable(slot);
                          const isSelected = selectedTimeSlot === slot;

                          if (!isAvailable) {
                            return (
                              <div
                                key={slot}
                                className="py-2 px-2.5 sm:py-2.5 sm:px-3 rounded-xl sm:rounded-2xl text-xs border border-neutral-200/70 bg-neutral-100/60 text-neutral-400 flex flex-col items-center justify-center cursor-not-allowed select-none opacity-60"
                              >
                                <span className="font-semibold line-through text-xs text-neutral-400">{slot}</span>
                                <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-0.5 mt-0.5">
                                  <Lock className="w-2.5 h-2.5" /> Booked
                                </span>
                              </div>
                            );
                          }

                          return (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => setSelectedTimeSlot(slot)}
                              className={`py-2 px-2.5 sm:py-2.5 sm:px-3 rounded-xl sm:rounded-2xl text-xs font-bold transition border cursor-pointer flex flex-col items-center justify-center shadow-2xs ${
                                isSelected
                                  ? "text-white shadow-sm ring-2 ring-offset-1 scale-[1.02]"
                                  : "bg-white text-neutral-800 border-neutral-200/90 hover:border-neutral-300 hover:bg-neutral-50"
                              }`}
                              style={{
                                backgroundColor: isSelected ? brandColor : undefined,
                                borderColor: isSelected ? brandColor : undefined,
                              }}
                            >
                              <span className="font-black text-xs sm:text-sm">{slot}</span>
                              <span
                                className={`text-[8px] sm:text-[9px] font-bold tracking-wider mt-0.5 ${
                                  isSelected ? "text-white/90" : "text-neutral-500"
                                }`}
                              >
                                {formatTime12Hour(slot)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between gap-3 pt-3 sm:pt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex items-center gap-1.5 sm:gap-2 px-4 sm:px-6 py-3 sm:py-3.5 border border-neutral-200 rounded-2xl text-xs font-bold text-neutral-700 hover:bg-neutral-50 cursor-pointer shadow-2xs transition shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Back
              </button>
              <button
                type="button"
                disabled={!selectedTimeSlot}
                onClick={() => setStep(4)}
                className="flex items-center gap-1.5 sm:gap-2 text-white px-5 sm:px-8 py-3 sm:py-3.5 rounded-2xl text-xs font-bold transition shadow-lg cursor-pointer disabled:opacity-40"
                style={{ backgroundColor: brandColor }}
              >
                Continue to Details <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Patient Details Form */}
        {step === 4 && (
          <form onSubmit={handleProceedToConfirmation} className="space-y-6">
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-black text-neutral-900 tracking-tight">Your Contact Details</h2>
              <p className="text-xs text-neutral-500">Sign in with Google to secure your reservation and complete booking</p>
            </div>

            {/* Google Authentication Quick Banner */}
            {!authUser ? (
              <div className="bg-gradient-to-r from-amber-50 via-white to-amber-50/30 border border-amber-200/80 rounded-3xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-white border border-neutral-200/80 shadow-xs flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-neutral-900">Sign in with Google</h4>
                    <p className="text-[11px] text-neutral-500">Quick and secure verification to confirm your booking.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isSigningInGoogle}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white border border-neutral-300 text-neutral-800 hover:bg-neutral-50 text-xs font-bold transition shadow-xs flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {isSigningInGoogle ? "Signing in..." : "Continue with Google"}
                </button>
              </div>
            ) : (
              <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-3xl p-4 flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  {authUser.photoURL ? (
                    <img src={authUser.photoURL} alt="" className="w-10 h-10 rounded-full border border-emerald-300 shadow-2xs" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-2xs">
                      {authUser.displayName ? authUser.displayName[0] : "P"}
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-xs text-emerald-950">{authUser.displayName || "Google Patient"}</span>
                      <span className="text-[10px] bg-emerald-200/60 text-emerald-800 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-700" /> Authenticated
                      </span>
                    </div>
                    <span className="text-[11px] text-emerald-700 font-medium">{authUser.email}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="text-[11px] font-bold text-neutral-500 hover:text-rose-600 transition underline cursor-pointer shrink-0"
                >
                  Switch Account
                </button>
              </div>
            )}

            {/* Summary Preview */}
            <div
              className="p-5 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              style={{
                backgroundColor: `${brandColor}10`,
                borderColor: `${brandColor}30`,
              }}
            >
              <div>
                <span className="font-extrabold text-neutral-900 text-sm">
                  {selectedTreatment?.title} {selectedVariant ? `• ${selectedVariant.title}` : ""}
                </span>
                <p className="text-neutral-600 mt-0.5">
                  {selectedDate} at {selectedTimeSlot} • {selectedTreatment?.durationMinutes || 30} mins •{" "}
                  {formatDoctorName(selectedDoctor?.name, "Any Available Specialist")}
                </p>
              </div>
              <span className="text-lg font-black" style={{ color: brandColor }}>
                £{selectedVariant?.nonMemberPrice || selectedTreatment?.types?.[0]?.nonMemberPrice || 0}
              </span>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-neutral-200/80 shadow-xs space-y-4">
              <div>
                <label className="text-xs font-bold text-neutral-700">Full Name *</label>
                <input
                  type="text"
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="e.g. Sarah Connor"
                  className="w-full border border-neutral-200 rounded-xl p-3 text-xs mt-1 bg-neutral-50 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-neutral-700">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    placeholder="+44 7700 900123"
                    className="w-full border border-neutral-200 rounded-xl p-3 text-xs mt-1 bg-neutral-50 focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-700">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={patientEmail}
                    onChange={(e) => setPatientEmail(e.target.value)}
                    placeholder="sarah@example.com"
                    className="w-full border border-neutral-200 rounded-xl p-3 text-xs mt-1 bg-neutral-50 focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700">Medical Notes / Special Requests</label>
                <textarea
                  rows={2}
                  value={patientNotes}
                  onChange={(e) => setPatientNotes(e.target.value)}
                  placeholder="Optional allergies, skin sensitivities, or remarks..."
                  className="w-full border border-neutral-200 rounded-xl p-3 text-xs mt-1 bg-neutral-50 focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex items-center gap-2 px-6 py-3 border border-neutral-200 rounded-2xl text-xs font-bold text-neutral-700 hover:bg-neutral-50 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 text-white px-10 py-3.5 rounded-2xl text-xs font-bold transition shadow-lg cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: brandColor }}
              >
                {submitting
                  ? "Processing..."
                  : reschedulingAppointmentId
                  ? "Confirm Reschedule"
                  : "Confirm & Proceed"}
              </button>
            </div>
          </form>
        )}

        {/* STEP 45: Modern Stripe Payment Sheet Modal / Drawer */}
        {step === 45 && (
          <form onSubmit={handleProcessStripePayment} className="space-y-6 max-w-xl mx-auto w-full">
            {/* Header & Temporary Hold Live Countdown */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-900 text-xs font-bold px-3.5 py-1.5 rounded-full shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                <Lock className="w-3.5 h-3.5 text-amber-700" />
                <span>10-Minute Hold Active:</span>
                <span className="font-mono bg-amber-200/60 px-1.5 py-0.5 rounded text-amber-900 font-black">
                  {Math.floor(holdSecondsLeft / 60)}:{(holdSecondsLeft % 60).toString().padStart(2, "0")}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 tracking-tight">
                Complete Deposit Payment
              </h2>
              <p className="text-xs sm:text-sm text-neutral-500">
                Secure your appointment slot at <strong className="text-neutral-800">{clinic.merchantName}</strong>
              </p>
            </div>

            {/* Main Payment Sheet Card */}
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-neutral-200/80 shadow-xl space-y-6">
              {/* Treatment Summary & Price Breakdown Banner */}
              <div className="bg-neutral-50 rounded-2xl p-4 border border-neutral-200/60 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400">
                      Selected Treatment
                    </span>
                    <h3 className="text-sm font-black text-neutral-900 leading-tight">
                      {selectedTreatment?.name}
                    </h3>
                    <p className="text-xs text-neutral-500">
                      {selectedVariant?.title || selectedTreatment?.types?.[0]?.title || "Standard Service"}
                      {selectedTreatment?.durationMinutes && ` • ${selectedTreatment.durationMinutes} mins`}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-neutral-400 block">
                      Total Price
                    </span>
                    <span className="text-sm font-black text-neutral-900">
                      £{Number(selectedVariant?.nonMemberPrice || selectedTreatment?.types?.[0]?.nonMemberPrice || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Practitioner, Date & Time Strip */}
                <div className="pt-2 border-t border-neutral-200/60 grid grid-cols-2 gap-2 text-xs text-neutral-600">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <span className="truncate font-medium">
                      {formatDoctorName(selectedDoctor?.name, "Any Available Specialist")}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 justify-end">
                    <Clock className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                    <span className="font-bold text-neutral-800">
                      {selectedDate} at {selectedTimeSlot}
                    </span>
                  </div>
                </div>
              </div>

              {/* Deposit Due vs In-Clinic Balance */}
              <div className="flex items-center justify-between bg-gradient-to-br from-neutral-900 to-neutral-800 text-white p-4 sm:p-5 rounded-2xl shadow-md">
                <div>
                  <span className="text-[11px] font-bold text-neutral-300 block uppercase tracking-wider">
                    Deposit Due Today
                  </span>
                  <div className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-0.5">
                    £{depositAmountDue.toFixed(2)}
                  </div>
                  <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1 mt-1">
                    <ShieldCheck className="w-3 h-3" /> Deducted from final clinic total
                  </span>
                </div>
                <div className="text-right border-l border-neutral-700/80 pl-4">
                  <span className="text-[10px] text-neutral-400 uppercase tracking-wider block font-bold">
                    Remaining Balance
                  </span>
                  <div className="text-base sm:text-lg font-bold text-neutral-200 mt-0.5">
                    £{Math.max(
                      0,
                      Number(selectedVariant?.nonMemberPrice || selectedTreatment?.types?.[0]?.nonMemberPrice || 0) -
                        depositAmountDue
                    ).toFixed(2)}
                  </div>
                  <span className="text-[10px] text-neutral-400 block mt-1">Pay at clinic desk</span>
                </div>
              </div>

              {/* Stripe Multi-Payment Sheet Mount Container */}
              <div className="space-y-2">
                <div className="flex items-center justify-between pb-1">
                  <label className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-neutral-500" />
                    <span>Payment Method</span>
                  </label>
                  <span className="text-[11px] font-medium text-neutral-500 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> 256-bit Encrypted
                  </span>
                </div>

                {/* Stripe Elements Mount Box */}
                <div className="p-3.5 sm:p-4 rounded-2xl border border-neutral-200 bg-neutral-50/50 min-h-[240px]">
                  <div id="stripe-payment-sheet-mount" className="w-full" />
                </div>
              </div>

              {/* Error Message */}
              {stripeError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2.5 animate-shake">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{stripeError}</span>
                </div>
              )}

              {/* Trust & Guarantee Badges */}
              <div className="pt-2 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-neutral-400 font-medium">
                <span className="flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-neutral-400" /> Powered by Stripe Payments
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Instant confirmation & calendar invite
                </span>
              </div>
            </div>

            {/* Navigation & Submit Action */}
            <div className="flex items-center justify-between pt-2 gap-3">
              <button
                type="button"
                onClick={() => setStep(4)}
                disabled={isProcessingPayment}
                className="flex items-center gap-2 px-6 py-3.5 border border-neutral-200 rounded-2xl text-xs font-bold text-neutral-700 hover:bg-white hover:border-neutral-300 transition cursor-pointer disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4" /> Change Info
              </button>
              <button
                type="submit"
                disabled={isProcessingPayment}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-2.5 text-white px-8 sm:px-10 py-3.5 rounded-2xl text-xs font-bold transition shadow-lg hover:brightness-105 active:scale-[0.99] cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: brandColor }}
              >
                {isProcessingPayment ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    <span>Processing Payment...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>Pay £{depositAmountDue.toFixed(2)} & Confirm Appointment</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 5: Booking Success */}
        {step === 5 && (
          <div className="max-w-lg mx-auto text-center bg-white p-8 sm:p-12 rounded-3xl border border-neutral-200/80 shadow-xl space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h2 className="text-2xl font-black text-neutral-900 tracking-tight">
                {reschedulingAppointmentId ? "Appointment Successfully Rescheduled!" : "Appointment Confirmed!"}
              </h2>
              <p className="text-xs text-neutral-500">
                {reschedulingAppointmentId
                  ? `Your appointment with ${clinic.merchantName} has been rescheduled to your new time. An updated confirmation email and calendar attachment have been sent to ${patientEmail}.`
                  : `Your appointment has been confirmed with ${clinic.merchantName}. A confirmation email with receipt and calendar attachment has been dispatched to ${patientEmail}.`}
              </p>
            </div>

            <div className="bg-neutral-50 p-4 rounded-2xl text-xs space-y-2 border border-neutral-200 text-left">
              <div className="flex justify-between">
                <span className="text-neutral-500">Booking Reference:</span>
                <span className="font-mono font-bold text-neutral-900">{bookingRef}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Treatment:</span>
                <span className="font-bold text-neutral-900">
                  {selectedTreatment?.title} {selectedVariant ? `(${selectedVariant.title})` : ""}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Date & Time:</span>
                <span className="font-bold text-neutral-900">
                  {selectedDate} at {selectedTimeSlot} ({selectedTreatment?.durationMinutes || 30} mins)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Practitioner:</span>
                <span className="font-bold text-neutral-900">
                  {formatDoctorName(selectedDoctor?.name || (heldReservation as any)?.doctorName, "Clinic Specialist")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Patient:</span>
                <span className="font-bold text-neutral-900">{patientName}</span>
              </div>
            </div>

            {/* 1-Click Add to Google Calendar */}
            <div className="pt-2">
              <a
                href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
                  `${selectedTreatment?.title || "Treatment"} at ${clinic.merchantName || "Clinic"}`
                )}&dates=${selectedDate.replace(/-/g, "")}T${selectedTimeSlot.replace(/:/g, "")}00Z/${selectedDate.replace(/-/g, "")}T${selectedTimeSlot.replace(/:/g, "")}00Z&details=${encodeURIComponent(
                  `Booking Reference: ${bookingRef}\nPractitioner: ${formatDoctorName(selectedDoctor?.name || (heldReservation as any)?.doctorName, "Specialist")}\nPatient: ${patientName}`
                )}&location=${encodeURIComponent(clinic.address || "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-neutral-900 hover:bg-neutral-800 text-white py-3 rounded-2xl text-xs font-bold transition shadow-sm"
              >
                <CalendarPlus className="w-4 h-4 text-emerald-400" />
                Add to Google Calendar
              </a>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setSelectedTreatment(null);
                  setSelectedVariant(null);
                  setSelectedTimeSlot("");
                  setHeldReservation(null);
                  setPatientName("");
                  setPatientEmail("");
                  setPatientPhone("");
                }}
                className="w-full text-white py-3 rounded-2xl text-xs font-bold transition shadow-sm cursor-pointer"
                style={{ backgroundColor: brandColor }}
              >
                Book Another Appointment
              </button>
            </div>
          </div>
        )}
      </>
    )}
      </main>
    </div>
  );
}


