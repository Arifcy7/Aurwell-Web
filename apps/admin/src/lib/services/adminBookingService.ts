import { auth } from "@/lib/firebase/client";

function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    return "";
  }
  return process.env.NEXT_PUBLIC_BOOKING_API_URL || "https://bookingapi-guexeyftta-nw.a.run.app";
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await auth.currentUser?.getIdToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export interface RescheduleAppointmentParams {
  clinicId: string;
  appointmentId: string;
  newStartDateTime: string;
  newDoctorId?: string;
  reason?: string;
}

export interface CancelAppointmentParams {
  clinicId: string;
  appointmentId: string;
  reason?: string;
  cancelledBy?: "clinic_staff" | "patient";
}

export interface UpdateAppointmentStatusParams {
  clinicId: string;
  appointmentId: string;
  status: "completed" | "no_show" | "confirmed" | "cancelled";
  reason?: string;
  notes?: string;
}

export const adminBookingService = {
  /**
   * Reschedule an appointment atomically to a new slot / doctor
   */
  async rescheduleAppointment(params: RescheduleAppointmentParams) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${getBaseUrl()}/api/booking/reschedule`, {
      method: "POST",
      headers,
      body: JSON.stringify(params),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || data.message || "Failed to reschedule appointment");
    }
    return data;
  },

  /**
   * Cancel an appointment with automatic policy-based Stripe refund
   */
  async cancelAppointment(params: CancelAppointmentParams) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${getBaseUrl()}/api/booking/cancel`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        ...params,
        cancelledBy: params.cancelledBy || "clinic_staff",
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || data.message || "Failed to cancel appointment");
    }
    return data;
  },

  /**
   * Update appointment status (completed, no_show, confirmed, cancelled)
   */
  async updateAppointmentStatus(params: UpdateAppointmentStatusParams) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${getBaseUrl()}/api/booking/status`, {
      method: "POST",
      headers,
      body: JSON.stringify(params),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || data.message || "Failed to update appointment status");
    }
    return data;
  },

  /**
   * Manually trigger hold cleanup garbage collection
   */
  async cleanupHolds() {
    const headers = await getAuthHeaders();
    const res = await fetch(`${getBaseUrl()}/api/booking/cleanup-expired-holds`, {
      method: "GET",
      headers,
    });
    return res.json();
  },
};
