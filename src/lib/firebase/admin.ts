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
  if (!privateKey || !privateKey.includes("-----BEGIN PRIVATE KEY-----")) {
    privateKey = "-----BEGIN PRIVATE KEY-----\nMIICdgIBADANBgkqhkiG9w0BAQEFAASCAmAwggJcAgEAAoGBAPCOjdtRD8RCSMKM\n4K5gGMT18JRyiCj8SQyb5hqbgbzj9anc8tMrlNouJD2+gGROhbjQTlP+pTbtSuPh\nMA6xg34Gxi+KxrUX/Wsm9iPsnmTAxfFPI+twiMvJH9Jy0qbS33Hr2J3hXBLQ9Yrm\nV+UN4DPAwepialKW4Vnq6mQCOo4jAgMBAAECgYEAhssqfBFRJ2UJBlMQd0WLu5og\nQ95lo6myeSlGZ/RpX2HRP2x6eI+8KgGe9yYvJYXGcofuzCwtgbi3tTdyyVj412hZ\nRKR1VYIz4263D/2Z2RHffTbZl4+/JVUKyc5rjqsargsnSs3U+S0tcZQB78432ZY/\nSP4KxS/Z1OJ+M6yZh9ECQQD+zOPetWsc4z7Mgnn/Tsu6sT1JG8uw1j60Y/ogrUKh\n6i2+h0wVCpup0vQr9iDfJE+wr4Pi/ErpF5/G8BW5Mx1ZAkEA8bB/EnA8V3WttkPL\nlDGDQwvZa9NAlJOD4oGPhSh40/0rp2EhWuLKxS/M/O51YxUYMvMANyQdHh7MIXXo\ny1ar2wJAdAquEKSA5sQbupoFo5+oKxtDNQOCrcO1BQSvSqh9uy3irW4C2WZeZGZd\nq5PJfraT0HzuzLZoC2Yl7z0yN4ku6QJAWc5baV6LDXSMt805ODetrpwYjhhRRuQJ\nfYDm83O2cg8AyZEt87eR4POCF/oDZG3SMBxbWCHzL94Bu+00M1phQQJAd9H4BGKu\naCg7hCf1cWgYu1fk29anTevwEcK2GsJ/EKxE8rmwRkZq+Y4jpjcx2h6sTENcjVOo\nT/+IR7Ue9oOWkQ==\n-----END PRIVATE KEY-----\n";
  } else {
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  adminApp = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID || "aurwell-2e48c",
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL || "firebase-adminsdk-fbsvc@aurwell-2e48c.iam.gserviceaccount.com",
      privateKey: privateKey,
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });

  return adminApp;
}

export const adminAuth = getAuth(getAdminApp());
export const adminDb = getFirestore(getAdminApp());
export const adminStorage = getStorage(getAdminApp());
