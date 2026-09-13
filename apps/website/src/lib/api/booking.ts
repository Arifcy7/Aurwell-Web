// Booking Backend & Stripe API Client for Public Web & Mobile
import { getFirebaseIdToken } from "@/lib/firebase/client";

const STRIPE_BACKEND_BASE =
  process.env.NEXT_PUBLIC_STRIPE_BACKEND_URL || "https://api-guexeyftta-uc.a.run.app";

function getBookingApiBase(): string {
  if (typeof window !== "undefined") {
    return "";
  }
  return process.env.NEXT_PUBLIC_BOOKING_API_URL || "https://bookingapi-guexeyftta-nw.a.run.app";
}

export interface AvailableSlot {
  time: string;
  startDateTime: string;
  endDateTime: string;
  doctorIds?: string[];
}

export interface ReserveHoldResponse {
  appointmentId: string;
  id?: string;
  holdExpiresAt?: string;
  paymentRequired: boolean;
  payment?: {
    clientSecret?: string;
    paymentIntentId?: string;
    amount?: number;
    currency?: string;
  };
}

export interface ConfirmBookingResponse {
  success: boolean;
  appointmentId: string;
  status: string;
}

export async function fetchSubdomainInfo(subdomain: string) {
  try {
    const res = await fetch(`${getBookingApiBase()}/api/subdomain/${encodeURIComponent(subdomain)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("Subdomain lookup from booking API not available, will resolve via Firestore:", err);
  }
  return null;
}

export async function fetchClinicPublicData(clinicId: string) {
  try {
    const res = await fetch(`${getBookingApiBase()}/api/clinic/${encodeURIComponent(clinicId)}/public`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("Clinic public data from booking API not available:", err);
  }
  return null;
}

export async function fetchAvailableSlots(params: {
  clinicId: string;
  treatmentId: string;
  doctorId?: string | null;
  date: string;
}): Promise<AvailableSlot[]> {
  try {
    const cleanParams: Record<string, any> = {
      clinicId: params.clinicId,
      treatmentId: params.treatmentId,
      date: params.date,
    };
    if (params.doctorId && params.doctorId !== "all") {
      cleanParams.doctorId = params.doctorId;
    }

    const res = await fetch(`${getBookingApiBase()}/api/booking/available-slots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cleanParams),
    });
    if (res.ok) {
      const data = await res.json();
      return data.slots || [];
    } else {
      const errBody = await res.json().catch(() => ({}));
      console.warn("Booking backend available-slots rejected:", res.status, errBody);
    }
  } catch (err) {
    console.warn("Booking backend available-slots call failed:", err);
  }
  return [];
}

export async function reserveBookingHold(payload: {
  clinicId: string;
  treatmentId: string;
  variantTitle: string;
  doctorId: string;
  startDateTime: string;
  patient: {
    patientId?: string | null;
    name: string;
    email: string;
    phone: string;
    notes?: string | null;
  };
  bookingSource?: string;
}): Promise<ReserveHoldResponse> {
  const authInfo = await getFirebaseIdToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authInfo?.token) {
    headers["Authorization"] = `Bearer ${authInfo.token}`;
  }

  const patientPayload = {
    ...payload.patient,
    patientId: payload.patient.patientId || authInfo?.uid || undefined,
  };

  const res = await fetch(`${getBookingApiBase()}/api/booking/reserve-hold`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      ...payload,
      patient: patientPayload,
    }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    console.error("reserveBookingHold API Error:", errBody);
    const details = errBody.details ? `: ${JSON.stringify(errBody.details)}` : "";
    const errorMsg =
      (typeof errBody.error === "object" ? errBody.error?.message : errBody.error) ||
      errBody.message ||
      "Unable to reserve appointment slot. Please try another time.";
    throw new Error(`${errorMsg}${details}`);
  }

  return await res.json();
}

export async function fetchClinicStripeConfig(clinicId: string) {
  try {
    const res = await fetch(`${STRIPE_BACKEND_BASE}/clinic/${encodeURIComponent(clinicId)}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("fetchClinicStripeConfig warning:", err);
  }
  return null;
}

export async function createStripePaymentIntent(payload: {
  clinicId: string;
  patientId?: string;
  userUid?: string;
  treatmentId: string;
  variantTitle: string;
  amount: number;
  currency?: string;
  couponCode?: string | null;
  metadata?: Record<string, any>;
}): Promise<{
  paymentIntentId: string;
  clientSecret: string;
  amount: number;
  discountAmount?: number;
  taxAmount?: number;
  finalAmount?: number;
  currency: string;
  status?: string;
}> {
  const authInfo = await getFirebaseIdToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authInfo?.token) {
    headers["Authorization"] = `Bearer ${authInfo.token}`;
  }

  const effectiveUid = payload.userUid || payload.patientId || authInfo?.uid || "guest_patient";

  const bodyData = {
    clinicId: payload.clinicId,
    patientId: effectiveUid,
    userUid: effectiveUid,
    treatmentId: payload.treatmentId,
    variantTitle: payload.variantTitle,
    amount: Number(payload.amount),
    currency: (payload.currency || "GBP").toUpperCase(),
    availedRewardId: null,
    couponCode: payload.couponCode || null,
    taxAmount: 0.00,
    metadata: {
      bookingType: "appointment_deposit",
      ...(payload.metadata || {}),
    },
  };

  const res = await fetch(`${STRIPE_BACKEND_BASE}/payments/create-intent`, {
    method: "POST",
    headers,
    body: JSON.stringify(bodyData),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    console.error("createStripePaymentIntent API Error:", errBody);
    const errorMsg =
      (typeof errBody.error === "object" ? errBody.error?.message : errBody.error) ||
      errBody.message ||
      "Failed to initialize payment checkout. Please try again.";
    throw new Error(errorMsg);
  }

  return await res.json();
}

export async function confirmStripePayment(payload: {
  clinicId: string;
  paymentIntentId: string;
  userUid?: string;
}): Promise<{
  success: boolean;
  status: string;
  paymentIntentId: string;
  amount?: number;
  currency?: string;
}> {
  const authInfo = await getFirebaseIdToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authInfo?.token) {
    headers["Authorization"] = `Bearer ${authInfo.token}`;
  }

  const res = await fetch(`${STRIPE_BACKEND_BASE}/payments/confirm`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      clinicId: payload.clinicId,
      paymentIntentId: payload.paymentIntentId,
      userUid: payload.userUid || authInfo?.uid || "guest_patient",
    }),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    console.warn("confirmStripePayment API warning:", errBody);
  }

  return await res.json().catch(() => ({
    success: true,
    status: "succeeded",
    paymentIntentId: payload.paymentIntentId,
  }));
}

export async function confirmBooking(payload: {
  clinicId: string;
  appointmentId: string;
  paymentIntentId?: string | null;
}): Promise<ConfirmBookingResponse> {
  const authInfo = await getFirebaseIdToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authInfo?.token) {
    headers["Authorization"] = `Bearer ${authInfo.token}`;
  }

  const res = await fetch(`${getBookingApiBase()}/api/booking/confirm`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody.error || errBody.message || "Failed to confirm appointment booking. Please contact the clinic.");
  }

  return await res.json();
}

/**
 * Reschedule an appointment to a new date/time or new practitioner
 */
export async function rescheduleAppointment(params: {
  clinicId: string;
  appointmentId: string;
  newStartDateTime: string;
  newDoctorId?: string;
  reason?: string;
}) {
  const authInfo = await getFirebaseIdToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authInfo?.token) {
    headers["Authorization"] = `Bearer ${authInfo.token}`;
  }

  const res = await fetch(`${getBookingApiBase()}/api/booking/reschedule`, {
    method: "POST",
    headers,
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to reschedule appointment");
  }
  return data;
}

/**
 * Fetch appointment details by ID or paymentIntentId (handles both document ID and appointmentId field)
 */
export async function fetchAppointmentDetails(
  clinicId: string,
  appointmentIdOrParams: string | { appointmentId?: string; paymentIntentId?: string }
) {
  let appointmentId = "";
  let paymentIntentId = "";
  if (typeof appointmentIdOrParams === "string") {
    appointmentId = appointmentIdOrParams;
  } else if (appointmentIdOrParams) {
    appointmentId = appointmentIdOrParams.appointmentId || "";
    paymentIntentId = appointmentIdOrParams.paymentIntentId || "";
  }

  const queryParams = new URLSearchParams();
  if (clinicId) queryParams.set("clinicId", clinicId);
  if (appointmentId) queryParams.set("appointmentId", appointmentId);
  if (paymentIntentId) queryParams.set("paymentIntentId", paymentIntentId);

  const url = `/api/booking/appointment?${queryParams.toString()}`;

  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to load appointment details");
  }
  return data;
}

/**
 * Cancel an appointment with automatic policy-based Stripe refund
 */
export async function cancelAppointment(params: {
  clinicId: string;
  appointmentId: string;
  reason?: string;
  cancelledBy?: "clinic_staff" | "patient";
}) {
  const authInfo = await getFirebaseIdToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authInfo?.token) {
    headers["Authorization"] = `Bearer ${authInfo.token}`;
  }

  const res = await fetch(`${getBookingApiBase()}/api/booking/cancel`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      ...params,
      cancelledBy: params.cancelledBy || "patient",
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to cancel appointment");
  }
  return data;
}

/**
 * Update appointment status (completed, no_show, confirmed, cancelled)
 */
export async function updateAppointmentStatus(params: {
  clinicId: string;
  appointmentId: string;
  status: "completed" | "no_show" | "confirmed" | "cancelled";
  reason?: string;
  notes?: string;
}) {
  const authInfo = await getFirebaseIdToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authInfo?.token) {
    headers["Authorization"] = `Bearer ${authInfo.token}`;
  }

  const res = await fetch(`${getBookingApiBase()}/api/booking/status`, {
    method: "POST",
    headers,
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to update appointment status");
  }
  return data;
}

/**
 * Manually trigger hold cleanup
 */
export async function cleanupHolds() {
  const authInfo = await getFirebaseIdToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (authInfo?.token) {
    headers["Authorization"] = `Bearer ${authInfo.token}`;
  }

  const res = await fetch(`${getBookingApiBase()}/api/booking/cleanup-expired-holds`, {
    method: "GET",
    headers,
  });
  return res.json();
}

