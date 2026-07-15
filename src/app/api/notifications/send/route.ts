import { NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { getMessaging } from "firebase-admin/messaging";

export async function POST(request: Request) {
  try {
    // 1. Authenticate the Admin calling the API
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized: Missing authorization header" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];
    let decodedToken;
    try {
      decodedToken = await adminAuth.verifyIdToken(idToken);
    } catch (err) {
      console.error("Token verification failed:", err);
      return NextResponse.json({ error: "Unauthorized: Invalid authentication token" }, { status: 401 });
    }

    const adminUid = decodedToken.uid;

    // 2. Load the admin's profile to verify their clinicId
    const adminDoc = await adminDb.collection("users").doc(adminUid).get();
    if (!adminDoc.exists) {
      return NextResponse.json({ error: "Forbidden: Admin user record not found" }, { status: 403 });
    }

    const adminData = adminDoc.data();
    const clinicId = adminData?.clinicId;
    if (!clinicId) {
      return NextResponse.json({ error: "Forbidden: User is not linked to any clinic" }, { status: 403 });
    }

    // 3. Parse and validate the notification body
    const bodyJson = await request.json();
    const { title, body, imageUrl, targetType, operator, visitsValue } = bodyJson;

    if (!title || !body) {
      return NextResponse.json({ error: "Bad Request: Title and Body are required" }, { status: 400 });
    }

    if (!targetType || !["all", "visits"].includes(targetType)) {
      return NextResponse.json({ error: "Bad Request: Invalid targetType" }, { status: 400 });
    }

    // 4. Query matching patients
    let patientsQuery = adminDb.collection("clinics").doc(clinicId).collection("patients");
    let targetPatientsDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];

    if (targetType === "visits") {
      const vVal = Number(visitsValue);
      if (isNaN(vVal)) {
        return NextResponse.json({ error: "Bad Request: visitsValue must be a number" }, { status: 400 });
      }

      let q;
      if (operator === ">=") {
        q = patientsQuery.where("visitsCount", ">=", vVal);
      } else if (operator === "<=") {
        q = patientsQuery.where("visitsCount", "<=", vVal);
      } else if (operator === "==") {
        q = patientsQuery.where("visitsCount", "==", vVal);
      } else {
        return NextResponse.json({ error: "Bad Request: Invalid operator. Use >=, <=, or ==" }, { status: 400 });
      }

      const snapshot = await q.get();
      targetPatientsDocs = snapshot.docs;
    } else {
      // Fetch all patients
      const snapshot = await patientsQuery.get();
      targetPatientsDocs = snapshot.docs;
    }

    const patientIds = targetPatientsDocs.map(doc => doc.id);
    if (patientIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No patients matched the criteria",
        recipientCount: 0,
        successCount: 0,
        failureCount: 0
      });
    }

    // 5. Query user documents to collect FCM tokens (users collection contains uid corresponding to patientId)
    // Firestore limit for 'in' queries is 30 elements, so fetch in batches of 30.
    const fcmTokens: string[] = [];
    const batchSize = 30;
    const batches = [];

    for (let i = 0; i < patientIds.length; i += batchSize) {
      batches.push(patientIds.slice(i, i + batchSize));
    }

    const fetchPromises = batches.map(async (batch) => {
      const snapshot = await adminDb
        .collection("users")
        .where("__name__", "in", batch) // __name__ represents document ID
        .get();
      return snapshot.docs;
    });

    const results = await Promise.all(fetchPromises);
    const userDocs = results.flat();

    userDocs.forEach((doc) => {
      const userData = doc.data();
      if (userData && Array.isArray(userData.fcmTokens)) {
        userData.fcmTokens.forEach((token: string) => {
          if (token && typeof token === "string" && !fcmTokens.includes(token)) {
            fcmTokens.push(token);
          }
        });
      }
    });

    if (fcmTokens.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Matched patients do not have any registered devices/FCM tokens",
        recipientCount: 0,
        successCount: 0,
        failureCount: 0
      });
    }

    // 6. Send the FCM notifications using sendEachForMulticast
    let successCount = 0;
    let failureCount = 0;
    try {
      const messaging = getMessaging();
      const messagePayload = {
        tokens: fcmTokens,
        notification: {
          title,
          body,
          ...(imageUrl ? { imageUrl } : {}),
        },
        data: {
          clinicId,
          click_action: "FLUTTER_NOTIFICATION_CLICK",
        },
        android: {
          notification: {
            sound: "default",
            clickAction: "FLUTTER_NOTIFICATION_CLICK",
            ...(imageUrl ? { imageUrl } : {}),
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: 1,
              mutableContent: true,
            },
          },
          fcmOptions: imageUrl ? {
            imageUrl,
          } : undefined,
        },
      };

      const response = await messaging.sendEachForMulticast(messagePayload);
      successCount = response.successCount;
      failureCount = response.failureCount;

      // Handle cleaning up invalid tokens if we wanted to, but simple reporting is fine.
    } catch (sendError) {
      console.error("FCM Send Error:", sendError);
      return NextResponse.json({ error: "Failed to dispatch FCM messages" }, { status: 500 });
    }

    // 7. Log notification history to Firestore
    const audienceDesc = targetType === "all"
      ? "All Users"
      : `Users with visits ${operator} ${visitsValue}`;

    const historyDoc = {
      title,
      body,
      imageUrl: imageUrl || null,
      sentAt: new Date(),
      targetAudience: targetType,
      visitsCriteria: audienceDesc,
      recipientCount: fcmTokens.length,
      successCount,
      failureCount,
    };

    await adminDb
      .collection("clinics")
      .doc(clinicId)
      .collection("notifications")
      .add(historyDoc);

    return NextResponse.json({
      success: true,
      message: `Notification successfully dispatched to ${successCount} devices.`,
      recipientCount: fcmTokens.length,
      successCount,
      failureCount,
    });

  } catch (error: any) {
    console.error("Send notifications route error:", error);
    const errMessage = error?.message?.toLowerCase() || "";
    if (
      errMessage.includes("invalid authentication credentials") ||
      errMessage.includes("credential") ||
      errMessage.includes("unauthenticated") ||
      error?.code === 16 ||
      error?.codePrefix === "app"
    ) {
      return NextResponse.json(
        {
          error: "Firebase Admin Credentials Error: The private key in your .env.local (FIREBASE_ADMIN_PRIVATE_KEY) is invalid or not authorized. Please make sure you have generated a valid Firebase Service Account Private Key from the Firebase Console (Project Settings > Service accounts) and copied its contents into your .env.local.",
        },
        { status: 401 }
      );
    }
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
