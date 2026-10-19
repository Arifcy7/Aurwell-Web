"use client";

import { useState, useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, getDocs, doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import { uploadImageFile } from "@/lib/firebase/upload";
import ImageUploader from "@/components/ImageUploader";
import AdminSplashScreen from "@/components/AdminSplashScreen";
import { Send } from "lucide-react";
import { MotionContainer, MotionCard } from "@/components/ui/motion-container";

interface Client {
  id: string;
  name: string;
  email: string;
  visitsCount: number;
}

export default function NotificationsPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [targetType, setTargetType] = useState<"all" | "visits">("all");
  const [operator, setOperator] = useState<">=" | "<=" | "==">(">=");
  const [visitsValue, setVisitsValue] = useState<string>("1");

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [clinicId, setClinicId] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const uClinicId = userDoc.data().clinicId;
          setClinicId(uClinicId);

          if (uClinicId) {
            const clientsSnapshot = await getDocs(
              query(collection(db, "clinics", uClinicId, "patients"))
            );
            const clientsList: Client[] = [];
            clientsSnapshot.forEach((docSnap) => {
              const data = docSnap.data();
              clientsList.push({
                id: docSnap.id,
                name: data.name || "Unnamed Client",
                email: data.email || "",
                visitsCount: data.visitsCount || 0,
              });
            });
            setClients(clientsList);
          }
        }
      } catch (err) {
        console.error("Error fetching clients:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !body) return;

    setIsSending(true);
    setStatusMessage(null);

    try {
      // 1. Get current user Auth ID Token for server verification
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error("You must be logged in as an administrator to dispatch notifications.");
      }
      const token = await currentUser.getIdToken();

      let finalImageUrl = imageUrl;
      if (imageFile) {
        finalImageUrl = await uploadImageFile(imageFile, "notifications");
      }

      const res = await fetch("/api/notifications/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clinicId,
          title,
          body,
          imageUrl: finalImageUrl,
          targetType,
          operator,
          visitsValue: parseInt(visitsValue, 10) || 0,
          visitsFilter:
            targetType === "visits"
              ? {
                  operator,
                  value: parseInt(visitsValue, 10) || 0,
                }
              : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send notification.");

      const dispatchedCount = data.sentCount ?? data.recipientCount ?? 0;
      setStatusMessage({
        type: "success",
        text: `Success! Broadcast dispatched to ${dispatchedCount} active client devices.`,
      });
      setTitle("");
      setBody("");
      setImageFile(null);
      setImageUrl("");
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: err.message || "An unexpected error occurred while sending.",
      });
    } finally {
      setIsSending(false);
    }
  };

  // Filter clients locally for real-time live estimation
  const matchedClients = clients.filter((c) => {
    if (targetType === "all") return true;
    const v = parseInt(visitsValue, 10);
    if (isNaN(v)) return true;
    if (operator === ">=") return c.visitsCount >= v;
    if (operator === "<=") return c.visitsCount <= v;
    if (operator === "==") return c.visitsCount === v;
    return true;
  });

  if (loading) {
    return (
      <div className="w-full min-h-[calc(100vh-12rem)] flex items-center justify-center">
        <AdminSplashScreen fullScreen={false} label="Loading notifications..." />
      </div>
    );
  }

  return (
    <MotionContainer className="space-y-4 max-w-6xl mx-auto" staggerDelay={0.08}>
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Send Notification Form */}
        <MotionCard className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 space-y-5" hoverLift={false}>
          <div>
            <h3 className="text-base sm:text-lg font-bold tracking-tight text-neutral-900">
              Compose Broadcast
            </h3>
            <p className="text-xs text-neutral-400 font-normal">Send instant announcements or targeted reminders</p>
          </div>

          <form onSubmit={handleSendNotification} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Notification Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Exclusive Weekend Offer! ✨"
                className="input-modern"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Body Message</label>
              <textarea
                required
                rows={3}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your push notification message here..."
                className="textarea-modern"
              />
            </div>

            <ImageUploader
              file={imageFile}
              onChange={setImageFile}
              imageUrl={imageUrl}
              onClearImage={() => setImageUrl("")}
              label="Notification Image (Optional)"
            />

            {/* Targeting controls */}
            <div className="bg-neutral-50 rounded-2xl p-4 space-y-3">
              <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                Target Audience Configuration
              </span>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs font-medium text-neutral-700 cursor-pointer">
                  <input
                    type="radio"
                    checked={targetType === "all"}
                    onChange={() => setTargetType("all")}
                    className="accent-neutral-900 h-4 w-4"
                  />
                  All Clients
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-neutral-700 cursor-pointer">
                  <input
                    type="radio"
                    checked={targetType === "visits"}
                    onChange={() => setTargetType("visits")}
                    className="accent-neutral-900 h-4 w-4"
                  />
                  Target by Visits Count
                </label>
              </div>

              {targetType === "visits" && (
                <div className="flex items-center gap-2.5 animate-fadeIn flex-wrap pt-1">
                  <span className="text-xs text-neutral-600">Clients with visits</span>
                  <select
                    value={operator}
                    onChange={(e) => setOperator(e.target.value as any)}
                    className="select-modern text-xs px-3 py-1.5 w-auto"
                  >
                    <option value=">=">At least (≥)</option>
                    <option value="<=">At most (≤)</option>
                    <option value="==">Exactly (=)</option>
                  </select>
                  <input
                    type="number"
                    min="0"
                    value={visitsValue}
                    onChange={(e) => setVisitsValue(e.target.value)}
                    className="input-modern text-xs px-3 py-1.5 w-20"
                  />
                  <span className="text-xs text-neutral-600">session(s)</span>
                </div>
              )}
            </div>

            {statusMessage && (
              <div
                className={`rounded-2xl px-4 py-3 text-xs font-semibold ${
                  statusMessage.type === "success"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-rose-100 text-rose-800"
                }`}
              >
                {statusMessage.text}
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSending || matchedClients.length === 0}
                className="btn-primary"
              >
                {isSending ? (
                  <>
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                    <span>Dispatching...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-white" />
                    <span>Send Broadcast ({matchedClients.length} Recipients)</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </MotionCard>

        {/* Live Estimator Sidebar Card */}
        <MotionCard className="bg-white border border-neutral-200/80 rounded-3xl p-6 sm:p-7 flex flex-col justify-between shadow-xs relative overflow-hidden" hoverLift={false}>
          <div className="space-y-4">
            <div>
              <span className="text-[10px] font-bold tracking-wider uppercase text-neutral-400">
                Audience Preview
              </span>
              <h4 className="text-xl font-bold mt-1 text-neutral-900 tracking-tight">Live Recipient Estimate</h4>
            </div>

            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200/70 space-y-1">
              <span className="text-xs font-medium text-neutral-500">Matching Clients</span>
              <div className="text-3xl font-extrabold text-neutral-900 tracking-tight">
                {matchedClients.length}{" "}
                <span className="text-xs font-normal text-neutral-400">/ {clients.length} total</span>
              </div>
            </div>

            <p className="text-xs text-neutral-500 leading-relaxed">
              Targeted notifications are delivered in real-time to client iOS and Android devices via Firebase Cloud Messaging.
            </p>
          </div>

          <div className="pt-6 border-t border-neutral-100 text-[11px] text-neutral-400 flex items-center justify-between">
            <span>Powered by Aurwell FCM</span>
            <span className="font-mono text-[10px] text-neutral-400">v2.4 Engine</span>
          </div>
        </MotionCard>
      </div>
    </MotionContainer>
  );
}
