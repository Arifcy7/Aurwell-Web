"use client";

import { useState, useEffect, useMemo } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  addDoc,
  getDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { adminBookingService } from "@/lib/services/adminBookingService";
import { AppointmentActionsMenu } from "@/components/bookings/AppointmentActionsMenu";
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  CalendarDays,
  Sparkles,
  Info,
  DollarSign,
  UserCheck,
  RefreshCw,
  Trash2,
  CheckCircle2,
  UserX,
  Calendar,
  Ban,
  Loader2,
} from "lucide-react";
import Link from "next/link";

// Helper: Format date strings
function getTodayIso(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftDateString(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const target = new Date(y, m - 1, d + days);
  const year = target.getFullYear();
  const month = String(target.getMonth() + 1).padStart(2, "0");
  const day = String(target.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateHeader(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatAppointmentDateTime(schedule: any, fallbackTime?: string): string {
  if (!schedule && !fallbackTime) return "N/A";

  let datePart = schedule?.date || "";
  let timePart = schedule?.timeSlot || fallbackTime || "";

  if (schedule?.startDateTime && (!datePart || !timePart)) {
    const str = String(schedule.startDateTime);
    if (str.includes("T")) {
      const parts = str.split("T");
      if (!datePart) datePart = parts[0];
      if (!timePart) timePart = parts[1].substring(0, 5);
    }
  }

  if (datePart && timePart) {
    const [y, m, d] = datePart.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dateFormatted = dateObj.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    const [h, min] = timePart.split(":");
    const hNum = parseInt(h, 10);
    const ampm = hNum >= 12 ? "pm" : "am";
    const h12 = hNum % 12 || 12;
    return `${dateFormatted}, ${String(h12).padStart(2, "0")}:${min} ${ampm}`;
  }

  if (schedule?.startDateTime) {
    const dt = new Date(schedule.startDateTime);
    if (!isNaN(dt.getTime())) {
      return dt.toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    }
  }

  return "N/A";
}

function getWeekDays(dateStr: string): { dateStr: string; dayName: string; dayNumber: number; isToday: boolean }[] {
  const [y, m, d] = dateStr.split("-").map(Number);
  const current = new Date(y, m - 1, d);
  const dayOfWeek = current.getDay(); // 0 = Sun, 1 = Mon ...
  const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;

  const monday = new Date(current);
  monday.setDate(current.getDate() + diffToMonday);

  const todayIso = getTodayIso();
  const weekDays = [];

  for (let i = 0; i < 7; i++) {
    const itemDate = new Date(monday);
    itemDate.setDate(monday.getDate() + i);
    const itemIso = `${itemDate.getFullYear()}-${String(itemDate.getMonth() + 1).padStart(2, "0")}-${String(
      itemDate.getDate()
    ).padStart(2, "0")}`;

    weekDays.push({
      dateStr: itemIso,
      dayName: itemDate.toLocaleDateString("en-US", { weekday: "short" }),
      dayNumber: itemDate.getDate(),
      isToday: itemIso === todayIso,
    });
  }

  return weekDays;
}

const TIME_SLOTS = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
];

function formatTimeSlot(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

function isDoctorMatch(apt: any, doc: any, allVisibleDocs: any[] = []): boolean {
  if (!doc || doc.id === "all" || doc.doctorId === "all") return true;
  const docIds = [doc.id, doc.doctorId].filter(Boolean);
  const docName = (doc.name || "").trim().toLowerCase().replace(/^dr\.?\s*/i, "");

  // 1. Match by ID
  const aptDocId = apt.doctorId || apt.doctor?.id;
  if (aptDocId && docIds.includes(aptDocId)) return true;

  // 2. Match by Name
  const aptDocName = (apt.doctorName || apt.doctor?.name || "")
    .trim()
    .toLowerCase()
    .replace(/^dr\.?\s*/i, "");
  if (aptDocName && docName && (aptDocName === docName || aptDocName.includes(docName) || docName.includes(aptDocName))) {
    return true;
  }

  // 3. Fallback: If appointment has no doctor assigned or unmatched, only place it in the first visible column
  if (!aptDocId && !aptDocName) {
    return allVisibleDocs.length > 0 && (allVisibleDocs[0]?.doctorId || allVisibleDocs[0]?.id) === (doc.doctorId || doc.id);
  }

  return false;
}

function getPractitionerDisplayName(apt: any, doctorsList: any[] = []): string {
  const directName = apt?.doctorName || apt?.doctor?.name;
  if (directName) {
    const clean = String(directName).trim();
    if (clean.toLowerCase().startsWith("dr.") || clean.toLowerCase().startsWith("dr ")) {
      return clean;
    }
    return `Dr. ${clean}`;
  }
  const aptDocId = apt?.doctorId || apt?.doctor?.id;
  if (aptDocId && doctorsList.length > 0) {
    const matched = doctorsList.find((d) => d.id === aptDocId || d.doctorId === aptDocId);
    if (matched?.name) {
      const clean = String(matched.name).trim();
      if (clean.toLowerCase().startsWith("dr.") || clean.toLowerCase().startsWith("dr ")) {
        return clean;
      }
      return `Dr. ${clean}`;
    }
  }
  return "Practitioner";
}

export default function AppointmentsPage() {
  const [clinicId, setClinicId] = useState<string>("");
  const [clinicName, setClinicName] = useState<string>("");
  const [bookingConfig, setBookingConfig] = useState<any>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [treatments, setTreatments] = useState<any[]>([]);

  // Navigation & View States
  const [viewMode, setViewMode] = useState<"calendar" | "grid">("calendar");
  const [selectedDate, setSelectedDate] = useState<string>(getTodayIso());
  const [selectedDoctor, setSelectedDoctor] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  // Walk-in Modal State
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);
  const [formPatientName, setFormPatientName] = useState("");
  const [formPatientEmail, setFormPatientEmail] = useState("");
  const [formPatientPhone, setFormPatientPhone] = useState("");
  const [formPatientNotes, setFormPatientNotes] = useState("");
  const [formDoctorId, setFormDoctorId] = useState("");
  const [formTreatmentId, setFormTreatmentId] = useState("");
  const [formStartTime, setFormStartTime] = useState("10:00");
  const [submitting, setSubmitting] = useState(false);

  // Appointment Details Modal
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);

  useEffect(() => {
    const cached = localStorage.getItem("aurwell_admin_profile");
    if (cached) {
      const parsed = JSON.parse(cached);
      setClinicId(parsed.clinicId || "");
      setClinicName(parsed.clinicName || "");
    }
  }, []);

  useEffect(() => {
    if (!clinicId) return;

    // Load clinic booking config
    getDoc(doc(db, "clinics", clinicId)).then((snap) => {
      if (snap.exists()) {
        const cData = snap.data();
        setBookingConfig(cData.bookingConfig || null);
      }
    });

    // 1. Fetch Doctors
    const doctorsUnsub = onSnapshot(collection(db, "clinics", clinicId, "doctors"), (snap) => {
      const docs: any[] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setDoctors(docs);
      if (docs.length > 0 && !formDoctorId) {
        setFormDoctorId(docs[0].doctorId || docs[0].id);
      }
    });

    // 2. Fetch Treatments
    const treatmentsUnsub = onSnapshot(collection(db, "clinics", clinicId, "treatments"), (snap) => {
      const treats = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setTreatments(treats);
      if (treats.length > 0 && !formTreatmentId) {
        setFormTreatmentId(treats[0].id);
      }
    });

    // 3. Real-time Appointments Subscription for Selected Date
    const dayStart = `${selectedDate}T00:00:00.000Z`;
    const dayEnd = `${selectedDate}T23:59:59.999Z`;

    const aptQuery = query(
      collection(db, "clinics", clinicId, "appointments"),
      where("schedule.startDateTime", ">=", dayStart),
      where("schedule.startDateTime", "<=", dayEnd)
    );

    const aptUnsub = onSnapshot(
      aptQuery,
      (snap) => {
        setAppointments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching appointments:", err);
        // Fallback without range filter if composite index is missing
        onSnapshot(collection(db, "clinics", clinicId, "appointments"), (allSnap) => {
          const list = allSnap.docs
            .map((d) => ({ id: d.id, ...d.data() } as any))
            .filter((apt) => apt.schedule?.startDateTime?.startsWith(selectedDate));
          setAppointments(list);
          setLoading(false);
        });
      }
    );

    return () => {
      doctorsUnsub();
      treatmentsUnsub();
      aptUnsub();
    };
  }, [clinicId, selectedDate]);

  // Reschedule Modal State
  const [rescheduleTarget, setRescheduleTarget] = useState<any | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>(getTodayIso());
  const [rescheduleTime, setRescheduleTime] = useState<string>("14:30");
  const [rescheduleDoctorId, setRescheduleDoctorId] = useState<string>("");
  const [rescheduleReason, setRescheduleReason] = useState<string>("");
  const [isRescheduling, setIsRescheduling] = useState<boolean>(false);

  // Smart Cancellation Modal State
  const [cancelTarget, setCancelTarget] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState<string>("");
  const [isCancelling, setIsCancelling] = useState<boolean>(false);

  // Complete Appointment Modal State
  const [completeTarget, setCompleteTarget] = useState<any | null>(null);
  const [completeNotes, setCompleteNotes] = useState<string>("");
  const [completeReason, setCompleteReason] = useState<string>("Treatment successfully delivered");
  const [isCompleting, setIsCompleting] = useState<boolean>(false);

  // Hold Cleanup State
  const [cleaningHolds, setCleaningHolds] = useState<boolean>(false);
  const [cleanupToast, setCleanupToast] = useState<string | null>(null);

  // Open Handlers
  const openRescheduleModal = (apt: any) => {
    setRescheduleTarget(apt);
    if (apt?.schedule?.startDateTime) {
      const dt = new Date(apt.schedule.startDateTime);
      setRescheduleDate(dt.toISOString().substring(0, 10));
      const hours = String(dt.getUTCHours()).padStart(2, "0");
      const mins = String(dt.getUTCMinutes()).padStart(2, "0");
      setRescheduleTime(`${hours}:${mins}`);
    } else {
      setRescheduleDate(getTodayIso());
      setRescheduleTime("14:30");
    }
    setRescheduleDoctorId(apt.doctorId || (doctors[0]?.doctorId || doctors[0]?.id || ""));
    setRescheduleReason("");
  };

  const openCancelModal = (apt: any) => {
    setCancelTarget(apt);
    setCancelReason("");
  };

  const cancelHoursRemaining = useMemo(() => {
    if (!cancelTarget?.schedule?.startDateTime) return 0;
    const startMs = new Date(cancelTarget.schedule.startDateTime).getTime();
    return !isNaN(startMs) ? (startMs - Date.now()) / (1000 * 60 * 60) : 0;
  }, [cancelTarget]);

  const isEligibleForRefund = cancelHoursRemaining >= 24;

  const openCompleteModal = (apt: any) => {
    setCompleteTarget(apt);
    setCompleteNotes("");
    setCompleteReason("Treatment successfully delivered");
  };

  // API Execution Handlers
  const handleExecuteReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicId || !rescheduleTarget) return;

    try {
      setIsRescheduling(true);
      const newStartDateTime = new Date(`${rescheduleDate}T${rescheduleTime}:00Z`).toISOString();
      const res = await adminBookingService.rescheduleAppointment({
        clinicId,
        appointmentId: rescheduleTarget.id || rescheduleTarget.appointmentId,
        newStartDateTime,
        newDoctorId: rescheduleDoctorId || undefined,
        reason: rescheduleReason || "Rescheduled by clinic staff",
      });

      alert(
        `Appointment successfully rescheduled!\nNew Time: ${new Date(
          res.newStartDateTime
        ).toLocaleString()}\nDoctor: ${res.doctorName || "Specialist"}\nReschedule confirmation email dispatched to patient.`
      );
      setRescheduleTarget(null);
      if (selectedAppointment?.id === rescheduleTarget.id) {
        setSelectedAppointment(null);
      }
    } catch (err: any) {
      console.error("Reschedule failed:", err);
      alert(err.message || "Failed to reschedule appointment.");
    } finally {
      setIsRescheduling(false);
    }
  };

  const handleExecuteCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicId || !cancelTarget) return;

    try {
      setIsCancelling(true);
      const res = await adminBookingService.cancelAppointment({
        clinicId,
        appointmentId: cancelTarget.id || cancelTarget.appointmentId,
        cancelledBy: "clinic_staff",
        reason: cancelReason || "Cancelled by clinic staff",
      });

      if (res.refundEligible) {
        alert(
          `Appointment cancelled!\nFull refund of £${Number(res.refundAmount || 0).toFixed(
            2
          )} automatically processed to original payment method.`
        );
      } else {
        alert(
          `Appointment cancelled!\nLate cancellation policy applied (deposit retained per clinic terms).`
        );
      }
      setCancelTarget(null);
      if (selectedAppointment?.id === cancelTarget.id) {
        setSelectedAppointment(null);
      }
    } catch (err: any) {
      console.error("Cancel failed:", err);
      alert(err.message || "Failed to cancel appointment.");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleExecuteComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicId || !completeTarget) return;

    try {
      setIsCompleting(true);
      await adminBookingService.updateAppointmentStatus({
        clinicId,
        appointmentId: completeTarget.id || completeTarget.appointmentId,
        status: "completed",
        notes: completeNotes,
        reason: completeReason,
      });

      alert("Appointment marked as Completed!\nThank-you and aftercare review email dispatched.");
      setCompleteTarget(null);
      if (selectedAppointment?.id === completeTarget.id) {
        setSelectedAppointment(null);
      }
    } catch (err: any) {
      console.error("Complete status failed:", err);
      alert(err.message || "Failed to mark appointment completed.");
    } finally {
      setIsCompleting(false);
    }
  };

  const handleTriggerCleanup = async () => {
    try {
      setCleaningHolds(true);
      const res = await adminBookingService.cleanupHolds();
      setCleanupToast(`Cleaned up ${res.cleanedCount || 0} expired held slots.`);
      setTimeout(() => setCleanupToast(null), 4000);
    } catch (err: any) {
      alert(err.message || "Hold cleanup failed.");
    } finally {
      setCleaningHolds(false);
    }
  };

  const updateStatus = async (appointmentId: string, status: string) => {
    if (!clinicId) return;
    try {
      await adminBookingService.updateAppointmentStatus({
        clinicId,
        appointmentId,
        status: status as any,
      });

      if (selectedAppointment?.id === appointmentId) {
        setSelectedAppointment((prev: any) => (prev ? { ...prev, status } : null));
      }
    } catch (err: any) {
      console.error("Error updating appointment status:", err);
      alert(err.message || "Failed to update status.");
    }
  };

  const handleCreateWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicId || !formPatientName || !formDoctorId || !formTreatmentId) {
      alert("Please fill all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      const selectedDocObj = doctors.find((d) => (d.doctorId || d.id) === formDoctorId);
      const selectedTreatmentObj = treatments.find((t) => t.id === formTreatmentId);

      const durationMinutes = Number(selectedTreatmentObj?.durationMinutes || 30);
      const bufferMinutes = Number(selectedTreatmentObj?.bufferMinutes || 15);

      const [sh, sm] = formStartTime.split(":").map(Number);
      const [sy, smo, sd] = selectedDate.split("-").map(Number);
      const startDt = new Date(sy, smo - 1, sd, sh, sm);
      const endDt = new Date(startDt.getTime() + durationMinutes * 60000);
      const bufferEndDt = new Date(startDt.getTime() + (durationMinutes + bufferMinutes) * 60000);

      const startDateTime = `${selectedDate}T${formStartTime}:00.000Z`;
      const endDateTime = `${selectedDate}T${String(endDt.getHours()).padStart(2, "0")}:${String(endDt.getMinutes()).padStart(2, "0")}:00.000Z`;
      const bufferEndDateTime = `${selectedDate}T${String(bufferEndDt.getHours()).padStart(2, "0")}:${String(bufferEndDt.getMinutes()).padStart(2, "0")}:00.000Z`;

      const aptId = `apt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      await addDoc(collection(db, "clinics", clinicId, "appointments"), {
        appointmentId: aptId,
        clinicId,
        doctorId: formDoctorId,
        doctorName: selectedDocObj?.name || "Staff Practitioner",
        patient: {
          patientId: null,
          name: formPatientName.trim(),
          email: formPatientEmail.trim() || "walkin@aurwell.app",
          phone: formPatientPhone.trim() || "N/A",
          notes: formPatientNotes.trim() || null,
        },
        treatment: {
          treatmentId: formTreatmentId,
          title: selectedTreatmentObj?.title || "Walk-in Treatment",
          variantTitle: selectedTreatmentObj?.types?.[0]?.title || "Standard",
          price: Number(selectedTreatmentObj?.types?.[0]?.nonMemberPrice || 0),
          durationMinutes,
          bufferMinutes,
        },
        schedule: {
          startDateTime,
          date: selectedDate,
          timeSlot: formStartTime,
          endDateTime,
          slotEndDateTimeWithBuffer: bufferEndDateTime,
          timezone: "Europe/London",
        },
        status: "confirmed",
        bookingSource: "admin_staff",
        payment: {
          required: false,
          status: "not_required",
          amountPaid: 0,
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setFormPatientName("");
      setFormPatientEmail("");
      setFormPatientPhone("");
      setFormPatientNotes("");
      setIsNewModalOpen(false);
    } catch (err) {
      console.error("Error creating walk-in appointment:", err);
      alert("Failed to create appointment.");
    } finally {
      setSubmitting(false);
    }
  };

  const openSlotCreator = (docId?: string, timeSlot?: string) => {
    if (docId) setFormDoctorId(docId);
    if (timeSlot) setFormStartTime(timeSlot);
    setIsNewModalOpen(true);
  };

  // Visible Practitioners for Calendar View
  const visibleDoctors = useMemo(() => {
    if (selectedDoctor === "all") return doctors;
    return doctors.filter((d) => (d.doctorId || d.id) === selectedDoctor);
  }, [doctors, selectedDoctor]);

  // Filtered Appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      if (selectedDoctor !== "all") {
        const targetDoc = doctors.find((d) => (d.doctorId || d.id) === selectedDoctor || d.id === selectedDoctor);
        if (targetDoc && !isDoctorMatch(apt, targetDoc, visibleDoctors)) return false;
      }
      if (selectedStatus !== "all" && apt.status !== selectedStatus) return false;
      if (searchQuery.trim()) {
        const queryLower = searchQuery.toLowerCase();
        const pName = (apt.patient?.name || "").toLowerCase();
        const pEmail = (apt.patient?.email || "").toLowerCase();
        const pPhone = (apt.patient?.phone || "").toLowerCase();
        const tTitle = (apt.treatment?.title || "").toLowerCase();
        const docDisplay = getPractitionerDisplayName(apt, doctors).toLowerCase();
        if (!pName.includes(queryLower) && !pEmail.includes(queryLower) && !pPhone.includes(queryLower) && !tTitle.includes(queryLower) && !docDisplay.includes(queryLower)) {
          return false;
        }
      }
      return true;
    });
  }, [appointments, selectedDoctor, selectedStatus, searchQuery, doctors, visibleDoctors]);

  const weekDays = useMemo(() => getWeekDays(selectedDate), [selectedDate]);
  const isTodayActive = selectedDate === getTodayIso();
  const isCustom = bookingConfig?.systemType === "aurwell_custom" || bookingConfig?.systemType === "custom";

  const statusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "held":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "completed":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "cancelled":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "no_show":
        return "bg-neutral-100 text-neutral-700 border-neutral-300";
      default:
        return "bg-neutral-100 text-neutral-600 border-neutral-200";
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-12">
      {/* ── Top Header & Action Controls ───────────────────────────────────── */}
      <div className="bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Appointments Calendar</h1>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-neutral-100 text-neutral-800 border border-neutral-200/80">
              Live Feed
            </span>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Real-time schedule management, patient walk-ins, and practitioner timetable for {clinicName || "your clinic"}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-neutral-100 p-1 rounded-xl border border-neutral-200/80">
            <button
              onClick={() => setViewMode("calendar")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${viewMode === "calendar"
                ? "bg-white text-neutral-900 shadow-xs"
                : "text-neutral-500 hover:text-neutral-900"
                }`}
            >
              <CalendarDays className="w-3.5 h-3.5" /> Calendar
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${viewMode === "grid"
                ? "bg-white text-neutral-900 shadow-xs"
                : "text-neutral-500 hover:text-neutral-900"
                }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Grid View
            </button>
          </div>

          {/* Clean Expired Holds GC Button */}
          <button
            type="button"
            onClick={handleTriggerCleanup}
            disabled={cleaningHolds}
            title="Trigger background garbage collection for expired 15-minute held slots"
            className="flex items-center gap-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 border border-neutral-300/80 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
          >
            {cleaningHolds ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5 text-neutral-600" />
            )}
            <span>Clean Holds</span>
          </button>

          {/* Add Walk-in Button */}
          <button
            onClick={() => openSlotCreator()}
            className="flex items-center gap-1.5 bg-[#768957] hover:bg-[#65774a] text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" /> Add Walk-in
          </button>
        </div>
      </div>

      {/* ── Easy Interactive Date Navigator & 7-Day Ribbon ─────────────────── */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-3">
          {/* Date Navigation & Heading */}
          <div className="flex items-center gap-2">
            <div className="flex items-center border border-neutral-200 rounded-xl bg-neutral-50 p-0.5">
              <button
                onClick={() => setSelectedDate((prev) => shiftDateString(prev, -1))}
                title="Previous Day"
                className="p-1.5 hover:bg-white rounded-xl text-neutral-700 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSelectedDate(getTodayIso())}
                className={`px-3 py-1 text-xs font-bold rounded-xl transition cursor-pointer ${isTodayActive ? "bg-[#768957] text-white shadow-2xs" : "text-neutral-700 hover:bg-white"
                  }`}
              >
                Today
              </button>
              <button
                onClick={() => setSelectedDate((prev) => shiftDateString(prev, 1))}
                title="Next Day"
                className="p-1.5 hover:bg-white rounded-xl text-neutral-700 transition cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="relative flex items-center gap-2 bg-neutral-50 border border-neutral-200 px-3 py-1.5 rounded-2xl">
              <CalendarIcon className="w-4 h-4 text-neutral-500" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-neutral-900 outline-none cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-neutral-900 tracking-tight">
              {formatDateHeader(selectedDate)}
            </span>
            <span className="text-xs font-semibold text-neutral-400 bg-neutral-100 px-2.5 py-0.5 rounded-full">
              {filteredAppointments.length} appointment{filteredAppointments.length === 1 ? "" : "s"}
            </span>
          </div>
        </div>

        {/* 7-Day Ribbon Strip */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 pt-1">
          {weekDays.map((day) => {
            const isSelected = day.dateStr === selectedDate;
            return (
              <button
                key={day.dateStr}
                onClick={() => setSelectedDate(day.dateStr)}
                className={`flex flex-col items-center justify-center py-2.5 sm:py-3 rounded-xl border transition-all cursor-pointer ${isSelected
                  ? "bg-[#768957] text-white border-[#768957] shadow-sm ring-1 ring-[#768957]"
                  : "bg-neutral-50/70 hover:bg-neutral-100/90 text-neutral-700 border-neutral-200/70"
                  }`}
              >
                <span
                  className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${isSelected ? "text-neutral-300" : "text-neutral-400"
                    }`}
                >
                  {day.dayName}
                </span>
                <span className="text-sm sm:text-base font-black mt-0.5 leading-none">{day.dayNumber}</span>
                {day.isToday && (
                  <span
                    className={`mt-1.5 w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : "bg-[#768957]"
                      }`}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Filter & Search Toolbar ────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-neutral-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Live Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search patient, phone, treatment..."
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-neutral-800 placeholder:text-neutral-400 focus:bg-white focus:outline-none focus:border-[#768957] focus:ring-1 focus:ring-[#768957]"
            />
          </div>

          {/* Practitioner Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider hidden sm:inline">
              Doctor:
            </span>
            <select
              value={selectedDoctor}
              onChange={(e) => setSelectedDoctor(e.target.value)}
              className="border border-neutral-200 rounded-xl px-3 py-2 text-xs font-semibold bg-neutral-50 text-neutral-800 focus:outline-none focus:border-[#768957]"
            >
              <option value="all">All Practitioners ({doctors.length})</option>
              {doctors.map((doc) => (
                <option key={doc.doctorId || doc.id} value={doc.doctorId || doc.id}>
                  {doc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider hidden sm:inline">
              Status:
            </span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="border border-neutral-200 rounded-xl px-3 py-2 text-xs font-semibold bg-neutral-50 text-neutral-800 focus:outline-none focus:border-[#768957]"
            >
              <option value="all">All Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="held">Held (Checkout)</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No-Show</option>
            </select>
          </div>
        </div>

        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="text-xs text-neutral-500 hover:text-neutral-900 font-bold underline cursor-pointer"
          >
            Clear Search
          </button>
        )}
      </div>

      {/* ── Main View Area: Calendar Timeline View vs Grid Cards View ─────── */}
      {loading ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-neutral-200/80 p-8 shadow-xs text-neutral-400 text-sm animate-pulse">
          Loading appointments schedule...
        </div>
      ) : filteredAppointments.length === 0 && viewMode === "grid" ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-neutral-200/80 p-8 shadow-xs">
          <CalendarIcon className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-neutral-900">No appointments scheduled for {selectedDate}</h3>
          <p className="text-xs text-neutral-500 mt-1 max-w-md mx-auto">
            There are no bookings matching the selected date or practitioner filter. Click &quot;Add Walk-in&quot; to schedule an appointment.
          </p>
        </div>
      ) : viewMode === "calendar" ? (
        /* ── CALENDAR TIMELINE VIEW ─────────────────────────────────────────── */
        <div className="bg-white rounded-2xl border border-neutral-200/80 shadow-xs overflow-hidden">
          {/* Header Row of Practitioners / Columns */}
          <div className="border-b border-neutral-200 bg-neutral-50/80 grid grid-cols-[80px_1fr] sm:grid-cols-[100px_1fr]">
            <div className="p-3.5 text-center text-xs font-bold text-neutral-400 border-r border-neutral-200">
              TIME
            </div>
            <div
              className={`grid divide-x divide-neutral-200`}
              style={{
                gridTemplateColumns: `repeat(${Math.max(1, visibleDoctors.length)}, minmax(200px, 1fr))`,
              }}
            >
              {visibleDoctors.length === 0 ? (
                <div className="p-3 text-xs font-bold text-neutral-500 text-center">General Appointments</div>
              ) : (
                visibleDoctors.map((doc) => {
                  const avatarSrc = doc.avatarUrl || doc.photoUrl || doc.imageUrl || (doc as any).avatar;
                  return (
                    <div key={doc.doctorId || doc.id} className="p-3.5 px-4 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 truncate">
                        {avatarSrc ? (
                          <img
                            src={avatarSrc}
                            alt={doc.name}
                            className="w-7 h-7 rounded-full object-cover border border-neutral-200/80 shadow-2xs shrink-0"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-neutral-200 text-neutral-800 flex items-center justify-center font-bold text-[11px] shrink-0">
                            {doc.name ? doc.name[0].toUpperCase() : "D"}
                          </div>
                        )}
                        <div className="truncate">
                          <h4 className="font-bold text-xs text-neutral-900 truncate">{doc.name}</h4>
                          <p className="text-[10px] text-neutral-400 font-medium truncate">{doc.title || "Practitioner"}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Time Rows */}
          <div className="divide-y divide-neutral-100 overflow-x-auto">
            {TIME_SLOTS.map((time) => {
              return (
                <div
                  key={time}
                  className="grid grid-cols-[80px_1fr] sm:grid-cols-[100px_1fr] min-h-[90px] group transition-colors hover:bg-neutral-50/40"
                >
                  {/* Time Axis Column */}
                  <div className="p-3 text-center border-r border-neutral-200 font-mono text-xs font-bold text-neutral-500 bg-neutral-50/30 flex flex-col justify-start">
                    <span>{formatTimeSlot(time)}</span>
                  </div>

                  {/* Practitioner Columns */}
                  <div
                    className="grid divide-x divide-neutral-100 min-h-[90px]"
                    style={{
                      gridTemplateColumns: `repeat(${Math.max(1, visibleDoctors.length)}, minmax(200px, 1fr))`,
                    }}
                  >
                    {(visibleDoctors.length === 0 ? [{ id: "all", doctorId: "all" }] : visibleDoctors).map((doc) => {
                      const docId = doc.doctorId || doc.id;
                      // Find appointments in this hour slot for this doctor
                      const slotAppointments = filteredAppointments.filter((apt) => {
                        if (!isDoctorMatch(apt, doc, visibleDoctors)) return false;

                        let aptHour = "";
                        if (apt.schedule?.timeSlot) {
                          aptHour = String(apt.schedule.timeSlot).split(":")[0].padStart(2, "0");
                        } else if (apt.timeSlot) {
                          aptHour = String(apt.timeSlot).split(":")[0].padStart(2, "0");
                        } else if (apt.schedule?.startDateTime) {
                          const str = String(apt.schedule.startDateTime);
                          if (str.includes("T")) {
                            aptHour = str.split("T")[1].split(":")[0].padStart(2, "0");
                          } else {
                            const d = new Date(apt.schedule.startDateTime);
                            aptHour = String(d.getHours()).padStart(2, "0");
                          }
                        }

                        if (!aptHour) return false;
                        const slotHour = time.split(":")[0].padStart(2, "0");
                        return aptHour === slotHour;
                      });

                      return (
                        <div key={docId} className="p-2 relative flex flex-col gap-2">
                          {slotAppointments.length === 0 ? (
                            <button
                              onClick={() => openSlotCreator(docId !== "all" ? docId : undefined, time)}
                              className="w-full h-full min-h-[70px] rounded-xl border border-dashed border-transparent hover:border-neutral-200 hover:bg-neutral-50 flex items-center justify-center text-neutral-300 hover:text-neutral-600 transition cursor-pointer group/btn"
                            >
                              <Plus className="w-4 h-4 opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                            </button>
                          ) : (
                            slotAppointments.map((apt) => {
                              let timeFormatted = time;
                              if (apt.schedule?.timeSlot) {
                                timeFormatted = apt.schedule.timeSlot;
                              } else if (apt.timeSlot) {
                                timeFormatted = apt.timeSlot;
                              } else if (apt.schedule?.startDateTime) {
                                const str = String(apt.schedule.startDateTime);
                                if (str.includes("T")) {
                                  const timeParts = str.split("T")[1].split(":");
                                  if (timeParts.length >= 2) {
                                    const h = parseInt(timeParts[0], 10);
                                    const m = timeParts[1];
                                    const ampm = h >= 12 ? "pm" : "am";
                                    const h12 = h % 12 || 12;
                                    timeFormatted = `${String(h12).padStart(2, "0")}:${m} ${ampm}`;
                                  }
                                } else {
                                  const startParsed = new Date(apt.schedule.startDateTime);
                                  if (!isNaN(startParsed.getTime())) {
                                    timeFormatted = startParsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                                  }
                                }
                              }

                              return (
                                <div
                                  key={apt.id}
                                  onClick={() => setSelectedAppointment(apt)}
                                  className="bg-white p-3 rounded-2xl border border-neutral-200/90 shadow-2xs hover:shadow-md hover:border-neutral-900 transition-all cursor-pointer flex flex-col justify-between space-y-2 group/card"
                                >
                                  <div className="flex items-start justify-between gap-1.5">
                                    <div className="truncate">
                                      <div className="flex items-center gap-1.5 text-xs font-black text-neutral-900">
                                        <Clock className="w-3 h-3 text-neutral-500" />
                                        <span>{timeFormatted}</span>
                                      </div>
                                      <h4 className="font-bold text-xs text-neutral-900 mt-0.5 truncate">
                                        {apt.treatment?.title || "Treatment"}
                                      </h4>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider border shrink-0 ${statusBadge(
                                          apt.status
                                        )}`}
                                      >
                                        {apt.status || "CONFIRMED"}
                                      </span>
                                      {clinicId && (
                                        <AppointmentActionsMenu
                                          clinicId={clinicId}
                                          appointment={apt}
                                          onOpenRescheduleModal={(a) => openRescheduleModal(a)}
                                          onOpenCancelModal={(a) => openCancelModal(a)}
                                          onOpenCompleteModal={(a) => openCompleteModal(a)}
                                        />
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between text-[11px] text-neutral-600 pt-1.5 border-t border-neutral-100">
                                    <span className="font-semibold truncate flex items-center gap-1 text-neutral-800" title={`Patient: ${apt.patient?.name || "Anonymous"}`}>
                                      <User className="w-3 h-3 text-neutral-400 shrink-0" />
                                      <span className="text-neutral-400 font-normal text-[10px]">Patient:</span>
                                      <span className="truncate">{apt.patient?.name || "Anonymous Patient"}</span>
                                    </span>
                                    {apt.treatment?.price !== undefined && (
                                      <span className="font-bold text-neutral-900 shrink-0">
                                        £{apt.treatment.price}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ── GRID CARDS VIEW ────────────────────────────────────────────────── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAppointments.map((apt) => {
            let timeStr = "10:00 AM";
            const sched = apt.schedule;
            const timeRaw = sched?.timeSlot || apt.timeSlot || (sched?.startDateTime?.includes("T") ? sched.startDateTime.split("T")[1].substring(0, 5) : "");
            if (timeRaw) {
              const [h, min] = timeRaw.split(":");
              const hNum = parseInt(h, 10);
              const ampm = hNum >= 12 ? "PM" : "AM";
              const h12 = hNum % 12 || 12;
              timeStr = `${String(h12).padStart(2, "0")}:${min} ${ampm}`;
            } else if (sched?.startDateTime) {
              const startParsed = new Date(sched.startDateTime);
              if (!isNaN(startParsed.getTime())) {
                timeStr = startParsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
              }
            }

            return (
              <div
                key={apt.id}
                onClick={() => setSelectedAppointment(apt)}
                className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4 cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-base font-black text-neutral-900 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-neutral-900" /> {timeStr}
                    </span>
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${statusBadge(
                          apt.status
                        )}`}
                      >
                        {apt.status || "CONFIRMED"}
                      </span>
                      {clinicId && (
                        <AppointmentActionsMenu
                          clinicId={clinicId}
                          appointment={apt}
                          onOpenRescheduleModal={(a) => openRescheduleModal(a)}
                          onOpenCancelModal={(a) => openCancelModal(a)}
                          onOpenCompleteModal={(a) => openCompleteModal(a)}
                        />
                      )}
                    </div>
                  </div>

                  <div className="mt-3">
                    <h3 className="font-bold text-sm text-neutral-900">{apt.treatment?.title || "Treatment"}</h3>
                    <div className="flex items-center gap-2 text-[11px] text-neutral-500 mt-0.5">
                      {apt.treatment?.variantTitle && <span>{apt.treatment.variantTitle}</span>}
                      {apt.treatment?.durationMinutes && <span>• {apt.treatment.durationMinutes} mins</span>}
                      {apt.treatment?.price !== undefined && (
                        <span className="font-semibold text-neutral-700">• £{apt.treatment.price}</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-neutral-100 space-y-1.5 text-xs text-neutral-600">
                    <p className="flex items-center gap-2 font-semibold text-neutral-900 truncate">
                      <User className="w-3.5 h-3.5 text-neutral-400 shrink-0" /> {apt.patient?.name || "Anonymous Patient"}
                    </p>
                    {apt.patient?.phone && (
                      <p className="flex items-center gap-2 text-[11px] text-neutral-500 truncate">
                        <Phone className="w-3 h-3 text-neutral-400 shrink-0" /> {apt.patient.phone}
                      </p>
                    )}
                    {apt.patient?.email && (
                      <p className="flex items-center gap-2 text-[11px] text-neutral-500 truncate">
                        <Mail className="w-3 h-3 text-neutral-400 shrink-0" /> {apt.patient.email}
                      </p>
                    )}
                    {apt.patient?.notes && (
                      <p className="text-[11px] italic bg-neutral-50 p-2 rounded-lg text-neutral-600 mt-2 border border-neutral-100">
                        &quot;{apt.patient.notes}&quot;
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer and Quick Action Buttons */}
                <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                  <span className="text-[11px] font-medium text-neutral-400 truncate">
                    {getPractitionerDisplayName(apt, doctors)}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {apt.status === "confirmed" && (
                      <>
                        <button
                          type="button"
                          onClick={() => openCompleteModal(apt)}
                          title="Mark Completed"
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Done
                        </button>
                        <button
                          type="button"
                          onClick={() => openRescheduleModal(apt)}
                          title="Reschedule Slot"
                          className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 transition flex items-center gap-1 cursor-pointer"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          Move
                        </button>
                      </>
                    )}
                    {apt.status === "cancelled" && (
                      <span className="text-[10px] text-rose-500 font-bold uppercase tracking-wider">Cancelled</span>
                    )}
                    {apt.status === "completed" && (
                      <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider">Completed</span>
                    )}
                    {apt.status === "no_show" && (
                      <span className="text-[10px] text-amber-600 font-bold uppercase tracking-wider">No Show</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Appointment Details Modal ──────────────────────────────────────── */}
      {selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-neutral-100">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${statusBadge(
                    selectedAppointment.status
                  )}`}
                >
                  {selectedAppointment.status || "CONFIRMED"}
                </span>
                <h2 className="text-xl font-black text-neutral-900 tracking-tight mt-2">
                  {selectedAppointment.treatment?.title || "Treatment"}
                </h2>
                <p className="text-xs text-neutral-500">
                  {selectedAppointment.treatment?.variantTitle || "Standard"} •{" "}
                  {selectedAppointment.treatment?.durationMinutes || 30} mins • £
                  {selectedAppointment.treatment?.price || 0}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAppointment(null)}
                className="p-1.5 text-neutral-400 hover:text-neutral-900 rounded-xl transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs bg-neutral-50 p-4 rounded-2xl border border-neutral-200/80">
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 font-medium">Practitioner:</span>
                <span className="font-bold text-neutral-900">{getPractitionerDisplayName(selectedAppointment, doctors)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 font-medium">Scheduled Date & Time:</span>
                <span className="font-bold text-neutral-900">
                  {formatAppointmentDateTime(selectedAppointment.schedule)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 font-medium">Patient Name:</span>
                <span className="font-bold text-neutral-900">{selectedAppointment.patient?.name || "N/A"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 font-medium">Contact Phone:</span>
                <span className="font-bold text-neutral-900">{selectedAppointment.patient?.phone || "N/A"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-neutral-500 font-medium">Email:</span>
                <span className="font-bold text-neutral-900">{selectedAppointment.patient?.email || "N/A"}</span>
              </div>
              {selectedAppointment.patient?.notes && (
                <div className="pt-2 border-t border-neutral-200">
                  <span className="text-neutral-500 font-medium">Patient Notes:</span>
                  <p className="italic text-neutral-700 mt-0.5">&quot;{selectedAppointment.patient.notes}&quot;</p>
                </div>
              )}
              {selectedAppointment.staffNotes && (
                <div className="pt-2 border-t border-neutral-200 bg-white p-2.5 rounded-xl border">
                  <span className="text-neutral-500 font-bold block mb-0.5">Clinical / Staff Notes:</span>
                  <p className="text-neutral-900">{selectedAppointment.staffNotes}</p>
                </div>
              )}
              {selectedAppointment.payment?.status && (
                <div className="flex items-center justify-between pt-2 border-t border-neutral-200">
                  <span className="text-neutral-500 font-medium">Payment Status:</span>
                  <span className="font-mono font-bold uppercase text-[10px] px-2 py-0.5 rounded bg-neutral-200 text-neutral-800">
                    {selectedAppointment.payment.status}
                  </span>
                </div>
              )}
            </div>

            {/* Actions Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-100">
              <div className="flex flex-wrap items-center gap-2">
                {selectedAppointment.status === "confirmed" && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        const apt = selectedAppointment;
                        setSelectedAppointment(null);
                        openCompleteModal(apt);
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-2xs flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Complete
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const apt = selectedAppointment;
                        setSelectedAppointment(null);
                        openRescheduleModal(apt);
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-2xs flex items-center gap-1 cursor-pointer"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      Reschedule
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const apt = selectedAppointment;
                        setSelectedAppointment(null);
                        openCancelModal(apt);
                      }}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      Cancel & Refund
                    </button>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedAppointment(null)}
                className="px-4 py-2 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-700 hover:bg-neutral-50 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 1. Reschedule Modal ────────────────────────────────────────────── */}
      {rescheduleTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <form
            onSubmit={handleExecuteReschedule}
            className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-neutral-200"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <Calendar className="w-5 h-5" />
                  </span>
                  <h2 className="text-lg font-black text-neutral-900 tracking-tight">Reschedule Appointment</h2>
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  Atomically move {rescheduleTarget.patient?.name || "the patient"} to a new slot & doctor.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRescheduleTarget(null)}
                className="p-1.5 text-neutral-400 hover:text-neutral-900 rounded-xl transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Current appointment info snippet */}
            <div className="bg-neutral-50 border border-neutral-200/80 rounded-2xl p-3 text-xs space-y-1">
              <div className="flex justify-between text-neutral-500">
                <span>Treatment:</span>
                <span className="font-bold text-neutral-900">{rescheduleTarget.treatment?.title}</span>
              </div>
              <div className="flex justify-between text-neutral-500">
                <span>Current Schedule:</span>
                <span className="font-bold text-neutral-900">
                  {formatAppointmentDateTime(rescheduleTarget.schedule)}
                </span>
              </div>
              <div className="flex justify-between text-neutral-500">
                <span>Current Doctor:</span>
                <span className="font-bold text-neutral-900">{getPractitionerDisplayName(rescheduleTarget, doctors)}</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-neutral-700">New Date *</label>
                  <input
                    type="date"
                    required
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    className="w-full border border-neutral-200 rounded-xl p-2.5 text-xs mt-1 bg-neutral-50 focus:bg-white focus:outline-none focus:border-neutral-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-700">New Start Time *</label>
                  <input
                    type="time"
                    required
                    value={rescheduleTime}
                    onChange={(e) => setRescheduleTime(e.target.value)}
                    className="w-full border border-neutral-200 rounded-xl p-2.5 text-xs mt-1 bg-neutral-50 focus:bg-white focus:outline-none focus:border-neutral-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700">Assign Practitioner (Optional)</label>
                <select
                  value={rescheduleDoctorId}
                  onChange={(e) => setRescheduleDoctorId(e.target.value)}
                  className="w-full border border-neutral-200 rounded-xl p-2.5 text-xs mt-1 bg-neutral-50 focus:bg-white focus:outline-none focus:border-neutral-900"
                >
                  {doctors.map((d) => (
                    <option key={d.doctorId || d.id} value={d.doctorId || d.id}>
                      Dr. {d.name} {d.role ? `(${d.role})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700">Reason for Rescheduling</label>
                <input
                  type="text"
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="e.g. Patient requested afternoon slot"
                  className="w-full border border-neutral-200 rounded-xl p-2.5 text-xs mt-1 bg-neutral-50 focus:bg-white focus:outline-none focus:border-neutral-900"
                />
              </div>
            </div>

            <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-2xl flex items-start gap-2.5 text-[11px] text-blue-900">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                Rescheduling will automatically dispatch a <strong>Reschedule Confirmation Email</strong> with a new
                Google Calendar link and attached <code>.ics</code> calendar invite.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setRescheduleTarget(null)}
                disabled={isRescheduling}
                className="px-4 py-2.5 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-700 hover:bg-neutral-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isRescheduling}
                className="px-5 py-2.5 bg-[#768957] hover:bg-[#65774a] text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isRescheduling ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Rescheduling...
                  </>
                ) : (
                  "Confirm Reschedule"
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── 2. Smart Cancellation & Refund Modal ──────────────────────────── */}
      {cancelTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <form
            onSubmit={handleExecuteCancel}
            className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-neutral-200"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                    <Ban className="w-5 h-5" />
                  </span>
                  <h2 className="text-lg font-black text-neutral-900 tracking-tight">Cancel Appointment</h2>
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  Smart cancellation with automated refund policy calculation.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                className="p-1.5 text-neutral-400 hover:text-neutral-900 rounded-xl transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Policy evaluation box */}
            <div
              className={`p-4 rounded-2xl border text-xs space-y-2 ${isEligibleForRefund
                ? "bg-emerald-50/80 border-emerald-200 text-emerald-950"
                : "bg-amber-50/80 border-amber-200 text-amber-950"
                }`}
            >
              <div className="flex items-center justify-between font-bold">
                <span>Cancellation Policy Check:</span>
                <span className="font-mono text-[11px]">
                  {cancelHoursRemaining > 0 ? `${cancelHoursRemaining.toFixed(1)} hrs before slot` : "Past slot"}
                </span>
              </div>

              {isEligibleForRefund ? (
                <div className="space-y-1">
                  <p className="font-bold text-emerald-800 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Eligible for 100% Full Automated Refund
                  </p>
                  <p className="text-emerald-700 text-[11px]">
                    Cancellation is more than 24 hours prior to appointment time. The patient will be refunded via
                    Stripe to their original payment method.
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="font-bold text-amber-900 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    Late Cancellation Notice (&lt; 24h Policy)
                  </p>
                  <p className="text-amber-800 text-[11px]">
                    Per clinic policy, cancellations within 24 hours forfeit the deposit fee. No automated refund will
                    be issued.
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-700">Cancellation Reason</label>
              <textarea
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Patient called due to illness or schedule conflict..."
                className="w-full border border-neutral-200 rounded-xl p-2.5 text-xs mt-1 bg-neutral-50 focus:bg-white focus:outline-none focus:border-neutral-900"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                disabled={isCancelling}
                className="px-4 py-2.5 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-700 hover:bg-neutral-50 cursor-pointer"
              >
                Keep Booking
              </button>
              <button
                type="submit"
                disabled={isCancelling}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isCancelling ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                  </>
                ) : (
                  "Confirm Cancellation & Refund"
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── 3. Complete Appointment Modal ─────────────────────────────────── */}
      {completeTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <form
            onSubmit={handleExecuteComplete}
            className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-neutral-200"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <CheckCircle2 className="w-5 h-5" />
                  </span>
                  <h2 className="text-lg font-black text-neutral-900 tracking-tight">Complete Appointment</h2>
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  Mark treatment finished and record clinical notes for {completeTarget.patient?.name || "patient"}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCompleteTarget(null)}
                className="p-1.5 text-neutral-400 hover:text-neutral-900 rounded-xl transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-neutral-700">Completion Summary / Reason</label>
                <input
                  type="text"
                  required
                  value={completeReason}
                  onChange={(e) => setCompleteReason(e.target.value)}
                  className="w-full border border-neutral-200 rounded-xl p-2.5 text-xs mt-1 bg-neutral-50 focus:bg-white focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700">Clinical Aftercare & Staff Notes</label>
                <textarea
                  rows={3}
                  value={completeNotes}
                  onChange={(e) => setCompleteNotes(e.target.value)}
                  placeholder="e.g. Advised patient to apply SPF 50 daily and return for follow up in 6 weeks..."
                  className="w-full border border-neutral-200 rounded-xl p-2.5 text-xs mt-1 bg-neutral-50 focus:bg-white focus:outline-none focus:border-neutral-900"
                />
              </div>
            </div>

            <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-2xl flex items-start gap-2.5 text-[11px] text-emerald-950">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                Marking completed will automatically send the patient a <strong>Thank You & Review Request Email</strong> with
                post-treatment aftercare recommendations.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setCompleteTarget(null)}
                disabled={isCompleting}
                className="px-4 py-2.5 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-700 hover:bg-neutral-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCompleting}
                className="px-5 py-2.5 bg-[#768957] hover:bg-[#65774a] text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {isCompleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                  </>
                ) : (
                  "Mark Completed & Dispatch Email"
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Hold Cleanup Floating Toast Notification ───────────────────────── */}
      {cleanupToast && (
        <div className="fixed bottom-6 right-6 bg-[#768957] text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 z-50 text-xs font-bold border border-[#65774a] animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{cleanupToast}</span>
        </div>
      )}

      {/* ── Walk-in Booking Modal ──────────────────────────────────────────── */}
      {isNewModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <form
            onSubmit={handleCreateWalkIn}
            className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-neutral-100"
          >
            <div>
              <h2 className="text-xl font-black text-neutral-900 tracking-tight">Create Walk-in Booking</h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Schedule a manual appointment for a walk-in patient or phone booking on {selectedDate}.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-neutral-700">Patient Full Name *</label>
                <input
                  type="text"
                  required
                  value={formPatientName}
                  onChange={(e) => setFormPatientName(e.target.value)}
                  placeholder="e.g. Sarah Connor"
                  className="w-full border border-neutral-200 rounded-xl p-2.5 text-xs mt-1 bg-neutral-50 focus:bg-white focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-neutral-700">Phone Number</label>
                  <input
                    type="tel"
                    value={formPatientPhone}
                    onChange={(e) => setFormPatientPhone(e.target.value)}
                    placeholder="+44 7700 900123"
                    className="w-full border border-neutral-200 rounded-xl p-2.5 text-xs mt-1 bg-neutral-50 focus:bg-white focus:outline-none focus:border-neutral-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-700">Email Address</label>
                  <input
                    type="email"
                    value={formPatientEmail}
                    onChange={(e) => setFormPatientEmail(e.target.value)}
                    placeholder="patient@example.com"
                    className="w-full border border-neutral-200 rounded-xl p-2.5 text-xs mt-1 bg-neutral-50 focus:bg-white focus:outline-none focus:border-neutral-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-neutral-700">Practitioner *</label>
                  <select
                    required
                    value={formDoctorId}
                    onChange={(e) => setFormDoctorId(e.target.value)}
                    className="w-full border border-neutral-200 rounded-xl p-2.5 text-xs mt-1 bg-neutral-50 focus:bg-white focus:outline-none focus:border-neutral-900"
                  >
                    {doctors.length === 0 ? (
                      <option value="">No doctors created yet</option>
                    ) : (
                      doctors.map((d) => (
                        <option key={d.doctorId || d.id} value={d.doctorId || d.id}>
                          {d.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-700">Treatment *</label>
                  <select
                    required
                    value={formTreatmentId}
                    onChange={(e) => setFormTreatmentId(e.target.value)}
                    className="w-full border border-neutral-200 rounded-xl p-2.5 text-xs mt-1 bg-neutral-50 focus:bg-white focus:outline-none focus:border-neutral-900"
                  >
                    {treatments.length === 0 ? (
                      <option value="">No treatments available</option>
                    ) : (
                      treatments.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title} ({t.durationMinutes || 30} mins)
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700">Start Time *</label>
                <input
                  type="time"
                  required
                  value={formStartTime}
                  onChange={(e) => setFormStartTime(e.target.value)}
                  className="w-full border border-neutral-200 rounded-xl p-2.5 text-xs mt-1 bg-neutral-50 focus:bg-white focus:outline-none focus:border-neutral-900"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700">Patient Notes / Medical Remarks</label>
                <textarea
                  rows={2}
                  value={formPatientNotes}
                  onChange={(e) => setFormPatientNotes(e.target.value)}
                  placeholder="Optional notes or allergies..."
                  className="w-full border border-neutral-200 rounded-xl p-2.5 text-xs mt-1 bg-neutral-50 focus:bg-white focus:outline-none focus:border-[#768957]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setIsNewModalOpen(false)}
                className="px-4 py-2.5 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-700 hover:bg-neutral-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 bg-[#768957] hover:bg-[#65774a] text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                {submitting ? "Booking..." : "Confirm Booking"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
