"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { ref, get, set } from "firebase/database";
import { db, rtdb } from "@/lib/firebase/client";

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  clinicId: string;
}

export default function QRScannerModal({ isOpen, onClose, clinicId }: QRScannerModalProps) {
  // Status & Message state
  const [processing, setProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successResult, setSuccessResult] = useState<{
    userId: string;
    patientName: string;
    newVisits: number;
    pointsAwarded: number;
    newLoyaltyBalance: number;
  } | null>(null);

  // Initialize camera scanner only in client browser using programmatic Html5Qrcode API
  useEffect(() => {
    if (!isOpen || successResult) return;

    let html5QrCode: any = null;
    const scannerId = "qr-reader-viewport";

    // Dynamically import html5-qrcode to prevent SSR compilation errors
    import("html5-qrcode").then((module) => {
      html5QrCode = new module.Html5Qrcode(scannerId);

      const config = {
        fps: 10,
        qrbox: (width: number, height: number) => {
          const size = Math.min(width, height) * 0.7;
          return { width: size, height: size };
        },
      };

      // Automatically request camera permission and start scanning
      html5QrCode
        .start(
          { facingMode: "environment" }, // Prefer back camera
          config,
          (decodedText: string) => {
            handleScanSuccess(decodedText);
            if (html5QrCode && html5QrCode.isScanning) {
              html5QrCode.stop().catch((err: any) => console.error("Error stopping scanner:", err));
            }
          },
          (errorMessage: string) => {
            // Keep scanning, silent errors
          }
        )
        .catch((err: any) => {
          console.error("Camera startup failed:", err);
          setErrorMsg("Camera access denied or device has no camera. Please verify permissions.");
        });
    }).catch((err) => {
      console.error("Failed to load html5-qrcode library:", err);
      setErrorMsg("Failed to initialize camera scanning library.");
    });

    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch((err: any) => console.error("Cleanup error stopping camera:", err));
      }
    };
  }, [isOpen, successResult]);

  const handleScanSuccess = async (decodedText: string) => {
    setProcessing(true);
    setErrorMsg("");
    setSuccessResult(null);

    try {
      // 1. Parse JSON
      let payload: { userid?: string; visitcount?: number } = {};
      try {
        payload = JSON.parse(decodedText.trim());
      } catch (e) {
        throw new Error("Invalid QR Code. Please scan a valid Aurwell check-in QR code.");
      }

      const { userid } = payload;
      if (!userid) {
        throw new Error("Invalid QR payload: 'userid' field is missing.");
      }

      if (!clinicId) {
        throw new Error("Clinic configuration is loading. Please try again.");
      }

      // 2. Fetch loyalty bonus ratio
      const ratioDoc = await getDoc(doc(db, "clinics", clinicId, "settings", "rewards_ratio"));
      const firstVisitBonus = ratioDoc.exists() ? (ratioDoc.data().firstVisitPoints || 0) : 10;

      // 3. Retrieve patient records
      const patientDocRef = doc(db, "clinics", clinicId, "patients", userid);
      const patientDoc = await getDoc(patientDocRef);

      let currentVisits = 0;
      let patientExists = false;
      let patientName = "Registered Patient";
      let patientEmail = "";
      let patientPhone = "";

      if (patientDoc.exists()) {
        const pData = patientDoc.data();
        currentVisits = pData.visitsCount || 0;
        patientExists = true;
        patientName = pData.name || patientName;
        patientEmail = pData.email || "";
        patientPhone = pData.phone || "";
      }

      // Pre-fetch global name if new client
      if (!patientExists) {
        const userGlobalDoc = await getDoc(doc(db, "users", userid));
        if (userGlobalDoc.exists()) {
          const uData = userGlobalDoc.data();
          patientName = `${uData.firstName || ""} ${uData.lastName || ""}`.trim() || patientName;
          patientEmail = uData.email || "";
        }
      }

      // 4. Perform computations
      const newVisits = currentVisits + 1;
      let pointsAwarded = 0;

      if (currentVisits === 0) {
        pointsAwarded = firstVisitBonus;
      }

      // 5. Query RTDB loyalty balances under the specific clinicId
      const loyaltyRef = ref(rtdb, `loyalty_points/${clinicId}/${userid}`);
      const loyaltySnapshot = await get(loyaltyRef);
      const currentLoyalty = loyaltySnapshot.exists() ? (loyaltySnapshot.val() || 0) : 0;
      const newLoyaltyBalance = currentLoyalty + pointsAwarded;

      // 6. Write increments to RTDB & Firestore
      await set(loyaltyRef, newLoyaltyBalance);
      await setDoc(
        patientDocRef,
        {
          name: patientName,
          email: patientEmail,
          phone: patientPhone || "",
          visitsCount: newVisits,
          joinedAt: patientExists ? (patientDoc.data()?.joinedAt || serverTimestamp()) : serverTimestamp(),
        },
        { merge: true }
      );

      // 7. Success state
      setSuccessResult({
        userId: userid,
        patientName,
        newVisits,
        pointsAwarded,
        newLoyaltyBalance,
      });
    } catch (err: any) {
      console.error("Scan processing error:", err);
      setErrorMsg(err.message || "An unexpected error occurred during scan verification.");
    } finally {
      setProcessing(false);
    }
  };

  const handleReset = () => {
    setSuccessResult(null);
    setErrorMsg("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl space-y-6 flex flex-col justify-between">
        
        {/* Modal Header */}
        <div className="flex justify-between items-center pb-3 border-b border-neutral-100">
          <div>
            <h3 className="text-md font-bold text-neutral-900">Live QR Scanner</h3>
            <p className="text-xs text-neutral-400">Scan membership cards to check in patients</p>
          </div>
          <button
            onClick={() => {
              handleReset();
              onClose();
            }}
            className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-black transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Success State */}
        {successResult ? (
          <div className="space-y-6 py-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-50 border border-green-200 text-green-600">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-neutral-900">Scan Successful!</h4>
              <p className="text-xs text-neutral-500">Visit registered for patient profile.</p>
            </div>

            <div className="rounded-xl bg-neutral-50 border border-neutral-100 p-4 text-left text-xs space-y-2">
              <div className="flex justify-between"><span className="text-neutral-400">Client Name:</span> <strong className="text-neutral-800">{successResult.patientName}</strong></div>
              <div className="flex justify-between"><span className="text-neutral-400">Client ID:</span> <span className="font-mono text-neutral-600 select-all">{successResult.userId}</span></div>
              <div className="flex justify-between"><span className="text-neutral-400">Total Visits:</span> <strong className="text-neutral-800">{successResult.newVisits}</strong></div>
              <div className="flex justify-between items-baseline"><span className="text-neutral-400">Points Awarded:</span> <span className="text-green-600 font-bold">+{successResult.pointsAwarded} pts</span></div>
              <div className="flex justify-between border-t border-neutral-200/60 pt-2 mt-2 font-semibold text-neutral-900"><span className="text-neutral-700">RTDB Loyalty Balance:</span> <span>{successResult.newLoyaltyBalance} pts</span></div>
            </div>

            <button
              onClick={handleReset}
              className="w-full rounded-md bg-black px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-800 transition"
            >
              Scan Another Card
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Error Message */}
            {errorMsg && (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                {errorMsg}
              </div>
            )}

            {processing ? (
              <div className="flex justify-center items-center gap-2 text-xs text-neutral-500 py-12">
                <div className="h-4 w-4 animate-spin rounded-full border border-neutral-300 border-t-black"></div>
                Updating client profile and loyalty points...
              </div>
            ) : (
              <div className="relative rounded-xl border border-neutral-200 bg-neutral-50 overflow-hidden flex flex-col justify-center items-center p-2.5 min-h-[300px]">
                <div id="qr-reader-viewport" className="w-full max-w-sm rounded-lg overflow-hidden [&_video]:w-full [&_video]:h-full [&_video]:object-cover" />
                <p className="text-[10px] text-neutral-400 mt-3 text-center px-4 leading-normal">
                  Place the client's check-in QR code directly in front of the camera to scan.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
