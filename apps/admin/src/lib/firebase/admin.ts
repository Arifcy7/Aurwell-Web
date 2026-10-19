// Server-side Firebase Admin SDK initialization
// Used only in Server Components, API routes, and Server Actions
// NEVER import this in client components

import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

let adminApp: App;

function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error(
      "Missing FIREBASE_ADMIN_PRIVATE_KEY in server environment. Please define FIREBASE_ADMIN_PRIVATE_KEY."
    );
  }

  // Handle literal escaped newlines if passed in single-line env var
  privateKey = privateKey.replace(/\\n/g, "\n");

  adminApp = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || "aurwell-2e48c",
      clientEmail:
        process.env.FIREBASE_ADMIN_CLIENT_EMAIL ||
        "firebase-adminsdk-fbsvc@aurwell-2e48c.iam.gserviceaccount.com",
      privateKey: privateKey,
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });

  return adminApp;
}

export const adminAuth = getAuth(getAdminApp());
export const adminDb = getFirestore(getAdminApp());
export const adminStorage = getStorage(getAdminApp());
