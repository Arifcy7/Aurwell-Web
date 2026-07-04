"use client";

import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

type Status = "idle" | "loading" | "success" | "error";

export default function FirestoreTestButton() {
  const [status, setStatus] = useState<Status>("idle");
  const [docId, setDocId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleWrite = async () => {
    setStatus("loading");
    setDocId(null);
    setError(null);

    try {
      const docRef = await addDoc(collection(db, "test_writes"), {
        message: "Hello from Aurwell! 🔥",
        createdAt: serverTimestamp(),
        source: "FirestoreTestButton",
      });
      setDocId(docRef.id);
      setStatus("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStatus("error");
    }
  };

  return (
    <div className="flex flex-col items-start gap-2 rounded-xl border border-dashed border-orange-300 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30 p-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-orange-500">
        🔥 Firebase Test
      </p>

      <button
        id="firestore-test-btn"
        onClick={handleWrite}
        disabled={status === "loading"}
        className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-orange-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "loading" ? "Writing…" : "Write to Firestore"}
      </button>

      {status === "success" && (
        <p className="text-xs text-green-600 dark:text-green-400">
          ✅ Written! Doc ID:{" "}
          <code className="rounded bg-green-100 dark:bg-green-900 px-1">{docId}</code>
        </p>
      )}

      {status === "error" && (
        <p className="text-xs text-red-600 dark:text-red-400">
          ❌ Error: <span className="font-mono">{error}</span>
        </p>
      )}
    </div>
  );
}
