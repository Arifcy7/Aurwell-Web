"use client";

import { useEffect, useState, useMemo } from "react";
import { collection, query, getDocs, doc, getDoc, orderBy, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase/client";
import ImageUploader from "@/components/ImageUploader";
import { uploadImageFile } from "@/lib/firebase/upload";
import { TableSkeleton } from "@/components/Loader";

interface ClientProfile {
  id: string;
  name: string;
  visitsCount: number;
}

interface NotificationHistory {
  id: string;
  title: string;
  body: string;
  imageUrl?: string;
  sentAt: any;
  targetAudience: string;
  visitsCriteria: string;
  recipientCount: number;
  successCount: number;
  failureCount: number;
}

export default function NotificationsPage() {
  const [clinicId, setClinicId] = useState<string>("");
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [history, setHistory] = useState<NotificationHistory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Form states
  const [title, setTitle] = useState<string>("");
  const [body, setBody] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [targetType, setTargetType] = useState<"all" | "visits">("all");
  const [operator, setOperator] = useState<">=" | "<=" | "==">(">=");
  const [visitsValue, setVisitsValue] = useState<string>("5");
  const [isSending, setIsSending] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load clinic and client data
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) return;

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const cId = userDoc.data().clinicId;
          setClinicId(cId);

          // 1. Fetch clients for real-time count estimation
          const patientsSnapshot = await getDocs(collection(db, "clinics", cId, "patients"));
          const loadedClients: ClientProfile[] = [];
          patientsSnapshot.forEach((d) => {
            const data = d.data();
            loadedClients.push({
              id: d.id,
              name: data.name || "Anonymous Client",
              visitsCount: typeof data.visitsCount === "number" ? data.visitsCount : 0,
            });
          });
          setClients(loadedClients);

          // 2. Set up realtime listener for notifications history
          const histQuery = query(
            collection(db, "clinics", cId, "notifications"),
            orderBy("sentAt", "desc")
          );

          const unsubHistory = onSnapshot(histQuery, (snapshot) => {
            const loadedHistory: NotificationHistory[] = [];
            snapshot.forEach((d) => {
              const data = d.data();
              loadedHistory.push({
                id: d.id,
                title: data.title,
                body: data.body,
                imageUrl: data.imageUrl || "",
                sentAt: data.sentAt,
                targetAudience: data.targetAudience,
                visitsCriteria: data.visitsCriteria,
                recipientCount: data.recipientCount || 0,
                successCount: data.successCount || 0,
                failureCount: data.failureCount || 0,
              });
            });
            setHistory(loadedHistory);
          });

          return () => unsubHistory();
        }
      } catch (err) {
        console.error("Error loading panel data:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Compute matched clients in real-time
  const matchedClients = useMemo(() => {
    if (targetType === "all") {
      return clients;
    }
    const val = Number(visitsValue);
    if (isNaN(val)) return [];

    return clients.filter((c) => {
      if (operator === ">=") return c.visitsCount >= val;
      if (operator === "<=") return c.visitsCount <= val;
      if (operator === "==") return c.visitsCount === val;
      return false;
    });
  }, [clients, targetType, operator, visitsValue]);

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim() || !clinicId) return;

    setIsSending(true);
    setStatusMessage(null);

    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        throw new Error("Authentication credentials not found");
      }

      let finalImageUrl = imageUrl;
      if (imageFile) {
        finalImageUrl = await uploadImageFile(imageFile, "notifications");
      }

      const response = await fetch("/api/notifications/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          title,
          body,
          imageUrl: finalImageUrl.trim() || undefined,
          targetType,
          operator,
          visitsValue,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send notifications");
      }

      setStatusMessage({
        type: "success",
        text: data.message || "Notification sent successfully!",
      });

      // Clear input fields
      setTitle("");
      setBody("");
      setImageUrl("");
      setImageFile(null);
    } catch (err: any) {
      console.error(err);
      setStatusMessage({
        type: "error",
        text: err.message || "An unexpected error occurred while sending.",
      });
    } finally {
      setIsSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-300 border-t-black"></div>
          <p className="text-sm font-medium text-neutral-500">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      <div>
        <h2 className="text-lg font-bold tracking-tight">Push Notifications</h2>
        <p className="text-sm text-neutral-500">Broadcast updates or targeted loyalty reminders directly to client devices</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Send Notification Form */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-neutral-100 p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-5">
          <h3 className="text-md font-bold tracking-tight text-neutral-900 border-b border-neutral-100 pb-3">
            Compose Broadcast
          </h3>

          <form onSubmit={handleSendNotification} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">Notification Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Exclusive Weekend Offer! 🌟"
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
            <div className="bg-neutral-50/80 rounded-2xl p-4 border border-neutral-200/60 space-y-4">
              <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                Target Audience Configuration
              </span>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs font-semibold text-neutral-700 cursor-pointer">
                  <input
                    type="radio"
                    checked={targetType === "all"}
                    onChange={() => setTargetType("all")}
                    className="h-4 w-4 border-neutral-300 text-black focus:ring-black"
                  />
                  All Clients
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-neutral-700 cursor-pointer">
                  <input
                    type="radio"
                    checked={targetType === "visits"}
                    onChange={() => setTargetType("visits")}
                    className="h-4 w-4 border-neutral-300 text-black focus:ring-black"
                  />
                  Target by Visits Count
                </label>
              </div>

              {targetType === "visits" && (
                <div className="flex items-center gap-3 animate-fadeIn flex-wrap">
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
                    className="input-modern text-xs px-3 py-1.5 w-24"
                  />
                  <span className="text-xs text-neutral-600">session(s)</span>
                </div>
              )}
            </div>

            {statusMessage && (
              <div
                className={`rounded-full px-4 py-2 text-xs font-semibold ${statusMessage.type === "success"
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
                  }`}
              >
                {statusMessage.text}
              </div>
            )}

            <button
              type="submit"
              disabled={isSending || matchedClients.length === 0}
              className="w-full rounded-full bg-neutral-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-neutral-800 shadow-sm transition disabled:bg-neutral-300 disabled:text-neutral-500 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSending ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></div>
                  Dispatching Broadcast...
                </>
              ) : (
                `Send Push Broadcast (${matchedClients.length} Recipients)`
              )}
            </button>
          </form>
        </div>

        {/* Live Estimator Sidebar Card */}
        <div className="bg-neutral-900 text-white rounded-3xl p-6 flex flex-col justify-between shadow-[0_8px_30px_rgb(0,0,0,0.08)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl transform translate-x-8 -translate-y-8"></div>

          <div className="space-y-4 z-10">
            <span className="bg-white/10 text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-full border border-white/20 uppercase tracking-wider inline-block">
              Audience Estimate
            </span>
            <div className="space-y-1">
              <div className="text-5xl font-black tracking-tight">{matchedClients.length}</div>
              <p className="text-sm text-neutral-400 font-medium">Estimated Target Recipients</p>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed border-t border-white/10 pt-3">
              This represents active clients within your database meeting the defined parameters. Push notifications are only received by users with valid device registrations.
            </p>
          </div>

          <div className="mt-8 border-t border-white/10 pt-4 space-y-2.5 z-10">
            <div className="flex justify-between items-center text-xs">
              <span className="text-neutral-400">Total Clients:</span>
              <span className="font-semibold">{clients.length}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-neutral-400">Filter Applied:</span>
              <span className="font-semibold text-neutral-200 capitalize">
                {targetType === "all" ? "None (All Clients)" : `Visits ${operator} ${visitsValue}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dispatch History log */}
      <div className="bg-white rounded-3xl border border-neutral-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <div className="p-6 border-b border-neutral-200">
          <h3 className="text-md font-bold tracking-tight text-neutral-900">Broadcast Dispatch History</h3>
          <p className="text-xs text-neutral-500">Track and review delivery logs for previously sent messages</p>
        </div>

        {loading ? (
          <TableSkeleton rows={4} cols={4} />
        ) : history.length === 0 ? (
          <div className="p-8 text-center text-sm text-neutral-400">No push notifications have been sent yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-neutral-200 text-left">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-6 py-3.5 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Message Details
                  </th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Target Criteria
                  </th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
                    Date Sent
                  </th>
                  <th className="px-6 py-3.5 text-xs font-semibold text-neutral-500 uppercase tracking-wider text-right">
                    FCM Delivery Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 bg-white text-sm">
                {history.map((h) => {
                  const dateStr = h.sentAt
                    ? new Date(h.sentAt.seconds * 1000).toLocaleString()
                    : "Pending...";

                  return (
                    <tr key={h.id} className="hover:bg-neutral-50/50 transition-colors">
                      <td className="px-6 py-4 max-w-sm">
                        <div className="flex items-start gap-3">
                          {h.imageUrl && (
                            <div className="h-10 w-10 flex-shrink-0 rounded-md overflow-hidden bg-neutral-100 border border-neutral-200">
                              <img
                                src={h.imageUrl}
                                alt="Sent media"
                                className="h-full w-full object-cover"
                              />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-neutral-900 text-sm truncate">{h.title}</div>
                            <div className="text-xs text-neutral-500 mt-1 line-clamp-2 leading-relaxed">{h.body}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-neutral-700 text-xs">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-neutral-100 border border-neutral-200 text-neutral-800">
                          {h.visitsCriteria}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-neutral-500 text-xs">
                        {dateStr}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs">
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-semibold text-neutral-900">
                            {h.recipientCount} target(s)
                          </span>
                          <span className="text-[10px] text-neutral-500">
                            <span className="text-green-600 font-semibold">{h.successCount} success</span>
                            {" · "}
                            <span className="text-red-500 font-semibold">{h.failureCount} failed</span>
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
