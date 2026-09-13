import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const clinicId = url.searchParams.get("clinicId");
    const appointmentId = url.searchParams.get("appointmentId");
    const paymentIntentId =
      url.searchParams.get("paymentIntentId") || url.searchParams.get("payment_intent");

    if (!appointmentId && !paymentIntentId) {
      return NextResponse.json(
        { error: "appointmentId or paymentIntentId query parameter is required." },
        { status: 400 }
      );
    }

    let aptDoc: FirebaseFirestore.DocumentSnapshot | null = null;

    // 1. Lookup by appointmentId
    if (appointmentId) {
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
    }

    // 2. Lookup by paymentIntentId (for redirect payments like Amazon Pay, Apple Pay, Link, Revolut)
    if ((!aptDoc || !aptDoc.exists) && paymentIntentId) {
      if (clinicId) {
        const snap1 = await adminDb
          .collection("clinics")
          .doc(clinicId)
          .collection("appointments")
          .where("payment.stripePaymentIntentId", "==", paymentIntentId)
          .limit(1)
          .get();

        if (!snap1.empty) {
          aptDoc = snap1.docs[0];
        }
      }

      if (!aptDoc || !aptDoc.exists) {
        const groupSnap = await adminDb
          .collectionGroup("appointments")
          .where("payment.stripePaymentIntentId", "==", paymentIntentId)
          .limit(1)
          .get();

        if (!groupSnap.empty) {
          aptDoc = groupSnap.docs[0];
        }
      }
    }

    if (!aptDoc || !aptDoc.exists) {
      return NextResponse.json(
        { error: `Appointment not found.` },
        { status: 404 }
      );
    }

    const data = aptDoc.data() || {};
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
