import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const clinicId = url.searchParams.get("clinicId");
    const appointmentId = url.searchParams.get("appointmentId");

    if (!appointmentId) {
      return NextResponse.json(
        { error: "appointmentId query parameter is required." },
        { status: 400 }
      );
    }

    let aptDoc: FirebaseFirestore.DocumentSnapshot | null = null;

    // 1. If clinicId is provided, try direct document lookup
    if (clinicId) {
      const directSnap = await adminDb
        .collection("clinics")
        .doc(clinicId)
        .collection("appointments")
        .doc(appointmentId)
        .get();

      if (directSnap.exists) {
        aptDoc = directSnap;
      } else {
        // 2. Query subcollection by appointmentId field
        const querySnap = await adminDb
          .collection("clinics")
          .doc(clinicId)
          .collection("appointments")
          .where("appointmentId", "==", appointmentId)
          .limit(1)
          .get();

        if (!querySnap.empty) {
          aptDoc = querySnap.docs[0];
        }
      }
    }

    // 3. Fallback: Search across all appointments collectionGroup
    if (!aptDoc || !aptDoc.exists) {
      const groupSnap = await adminDb
        .collectionGroup("appointments")
        .where("appointmentId", "==", appointmentId)
        .limit(1)
        .get();

      if (!groupSnap.empty) {
        aptDoc = groupSnap.docs[0];
      }
    }

    if (!aptDoc || !aptDoc.exists) {
      return NextResponse.json(
        { error: `Appointment #${appointmentId} not found.` },
        { status: 404 }
      );
    }

    const data = aptDoc.data() || {};
    // Extract clinicId from parent path if not present in document
    const extractedClinicId =
      data.clinicId || clinicId || aptDoc.ref.parent.parent?.id || "";

    return NextResponse.json({
      id: aptDoc.id,
      appointmentId: data.appointmentId || aptDoc.id,
      clinicId: extractedClinicId,
      doctorId: data.doctorId || "",
      doctorName: data.doctorName || "",
      patient: data.patient || {
        name: data.patientName || "",
        email: data.patientEmail || "",
        phone: data.patientPhone || "",
      },
      treatment: data.treatment || {
        title: data.treatmentTitle || "",
        variantTitle: data.variantTitle || "",
        durationMinutes: data.durationMinutes || 30,
        price: data.price || 0,
      },
      schedule: data.schedule || {},
      status: data.status || "confirmed",
      payment: data.payment || {},
      cancellation: data.cancellation || null,
      bookingSource: data.bookingSource || "public_web",
      createdAt: data.createdAt || null,
      updatedAt: data.updatedAt || null,
    });
  } catch (error: any) {
    console.error("Error fetching appointment details:", error);
    return NextResponse.json(
      { error: error.message || "Failed to load appointment details." },
      { status: 500 }
    );
  }
}
