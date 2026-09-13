import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, Firestore } from "firebase/firestore";
import {
  getAuth,
  signInAnonymously,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  Auth,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCL3qJDZSQPbLqC0VZTNlgsMwJj2iI36uQ",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "aurwell-2e48c.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "aurwell-2e48c",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "aurwell-2e48c.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "552826454183",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:552826454183:web:ef1bffb4e75cdd1c7d1b82",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-X16L8VVRB2",
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://aurwell-2e48c-default-rtdb.firebaseio.com",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db: Firestore = getFirestore(app);
export const auth: Auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export async function signInWithGoogle(): Promise<{ user: User; token: string; uid: string }> {
  const result = await signInWithPopup(auth, googleProvider);
  const token = await result.user.getIdToken();
  return { user: result.user, token, uid: result.user.uid };
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export async function getFirebaseIdToken(): Promise<{ token: string; uid: string } | null> {
  try {
    let currentUser = auth.currentUser;
    if (!currentUser) {
      const userCred = await signInAnonymously(auth);
      currentUser = userCred.user;
    }
    const token = await currentUser.getIdToken();
    return { token, uid: currentUser.uid };
  } catch (err) {
    console.warn("Could not obtain Firebase auth token for booking:", err);
    return null;
  }
}

export default app;
