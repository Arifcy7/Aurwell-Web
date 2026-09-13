import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export interface BookingConfig {
  systemType?: "aurwell_custom" | "external_sdk" | "disabled" | "custom" | "external_url" | "none";
  subdomain?: string;
  customDomain?: string | null;
  externalBooking?: {
    provider?: string;
    url?: string;
  };
  settings?: {
    requirePaymentUpfront?: boolean;
    depositType?: "full" | "percentage" | "fixed";
    depositAmount?: number;
    slotIntervalMinutes?: number;
    minNoticeHours?: number;
    maxAdvanceDays?: number;
    cancellationHours?: number;
    holdDurationMinutes?: number;
  };
}

export interface DoctorProfile {
  id: string;
  doctorId: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  bio?: string;
  avatarUrl?: string;
  assignedTreatments?: string[];
  allTreatments?: boolean;
  isActive?: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface AppointmentRecord {
  id: string;
  appointmentId?: string;
  clinicId: string;
  doctorId: string;
  doctorName: string;
  patient: {
    patientId?: string | null;
    name: string;
    email: string;
    phone: string;
    notes?: string | null;
  };
  treatment: {
    treatmentId: string;
    title: string;
    variantTitle?: string;
    price: number;
    durationMinutes: number;
    bufferMinutes?: number;
  };
  schedule: {
    startDateTime: string;
    endDateTime: string;
    slotEndDateTimeWithBuffer?: string;
    timezone?: string;
  };
  status: "held" | "pending_payment" | "confirmed" | "completed" | "cancelled" | "no_show" | "expired";
  bookingSource?: "public_web" | "mobile_app" | "admin_staff";
  payment?: {
    required?: boolean;
    status?: "not_required" | "pending" | "paid" | "partially_paid" | "refunded";
    amountPaid?: number;
    depositType?: string;
    currency?: string;
    stripePaymentIntentId?: string | null;
    stripeCustomerId?: string | null;
    transactionId?: string | null;
  };
  cancellation?: {
    isCancelled?: boolean;
    cancelledAt?: any;
    cancelledBy?: string | null;
    reason?: string | null;
  };
  createdAt?: any;
  updatedAt?: any;
}

/**
 * Check if a given user UID is registered in the /admin collection as Super Admin
 */
export async function checkIsSuperAdmin(uid: string): Promise<boolean> {
  if (!uid) return false;
  try {
    // 1. Query document with field `uid == uid`
    const q = query(collection(db, "admin"), where("uid", "==", uid));
    const snap = await getDocs(q);
    if (!snap.empty) return true;

    // 2. Direct document check (doc ID = uid)
    const directSnap = await getDoc(doc(db, "admin", uid));
    return directSnap.exists();
  } catch (error: any) {
    // Gracefully handle permission errors when firestore rules are not yet published
    if (error?.code === "permission-denied" || error?.message?.includes("permissions")) {
      console.warn("Firestore /admin read permission denied. Please publish updated firestore.rules to Firebase Console.");
    } else {
      console.error("Error checking super admin status:", error);
    }
    return false;
  }
}

/**
 * Check if custom booking is enabled for a clinic
 */
export function isCustomBookingEnabled(config?: BookingConfig | null): boolean {
  if (!config) return false;
  const sys = config.systemType;
  return sys === "aurwell_custom" || sys === "custom";
}
