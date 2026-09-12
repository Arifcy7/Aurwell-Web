"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Plus, Trash2, CalendarOff, AlertTriangle, CheckCircle2, User } from "lucide-react";

export default function LeavesPage() {
  const [clinicId, setClinicId] = useState("");
  const [doctors, setDoctors] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [formDoctorId, setFormDoctorId] = useState("all");
  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");
  const [formReason, setFormReason] = useState("");
  const [formType, setFormType] = useState<"leave" | "break" | "clinic_closure">("leave");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const cached = localStorage.getItem("aurwell_admin_profile");
    if (cached) setClinicId(JSON.parse(cached).clinicId);
  }, []);

  useEffect(() => {
    if (!clinicId) return;

    const unsubDocs = onSnapshot(collection(db, "clinics", clinicId, "doctors"), (snap) => {
      setDoctors(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const unsubLeaves = onSnapshot(collection(db, "clinics", clinicId, "blocked_slots"), (snap) => {
      setLeaves(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => {
      unsubDocs();
      unsubLeaves();
    };
  }, [clinicId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicId || !formStart || !formEnd) return;

    if (new Date(formStart) >= new Date(formEnd)) {
      alert("End date & time must be after the start date & time.");
      return;
    }

    setSubmitting(true);
    try {
      const slotId = `block_${Date.now()}`;
      await setDoc(doc(db, "clinics", clinicId, "blocked_slots", slotId), {
        id: slotId,
        doctorId: formDoctorId === "all" ? null : formDoctorId,
        scope: formDoctorId === "all" ? "clinic" : "doctor",
        startDateTime: new Date(formStart).toISOString(),
        endDateTime: new Date(formEnd).toISOString(),
        type: formType,
        reason: formReason.trim() || (formDoctorId === "all" ? "Clinic Closure" : "Practitioner Leave"),
        createdAt: serverTimestamp(),
      });

      setIsModalOpen(false);
      setFormStart("");
      setFormEnd("");
      setFormReason("");
      setFormDoctorId("all");
    } catch (err) {
      console.error("Error creating blocked slot:", err);
      alert("Failed to block period.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateTime = (isoString: string) => {
    if (!isoString) return "N/A";
    const d = new Date(isoString);
    return isNaN(d.getTime())
      ? isoString
      : d.toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Leaves & Blocked Periods</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Block out doctor vacations, medical leaves, or entire clinic maintenance closures
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-neutral-900 hover:bg-black text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Blocked Period
        </button>
      </div>

      {/* Blocked Slots List */}
      {loading ? (
        <div className="text-center py-20 text-neutral-400 text-sm animate-pulse">
          Loading blocked schedule periods...
        </div>
      ) : leaves.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-neutral-200/80 p-8 shadow-xs">
          <CalendarOff className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-neutral-900">No active leaves or blocked slots</h3>
          <p className="text-xs text-neutral-500 mt-1 max-w-md mx-auto">
            All practitioners and clinic slots are operating on regular hours.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-neutral-200/80 divide-y divide-neutral-100 shadow-xs overflow-hidden">
          {leaves.map((item) => {
            const matchedDoc = doctors.find((d) => d.id === item.doctorId || d.doctorId === item.doctorId);
            const targetLabel = item.doctorId ? `Dr. ${matchedDoc?.name || item.doctorId}` : "Entire Clinic";

            return (
              <div key={item.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <h4 className="font-bold text-sm text-neutral-900">{item.reason}</h4>
                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border uppercase ${
                        item.doctorId
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-rose-50 text-rose-700 border-rose-200"
                      }`}
                    >
                      {item.type || (item.doctorId ? "LEAVE" : "CLOSURE")}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                    <span className="font-semibold text-neutral-700">
                      {formatDateTime(item.startDateTime)} → {formatDateTime(item.endDateTime)}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 font-bold text-neutral-800">
                      <User className="w-3.5 h-3.5 text-neutral-400" /> {targetLabel}
                    </span>
                  </div>
                </div>

                <button
                  onClick={async () => {
                    if (confirm("Remove this blocked slot?")) {
                      await deleteDoc(doc(db, "clinics", clinicId, "blocked_slots", item.id));
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition cursor-pointer self-end sm:self-center"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove Block
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleSave}
            className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-4 shadow-2xl border border-neutral-100"
          >
            <div>
              <h2 className="text-xl font-black text-neutral-900 tracking-tight">Block Schedule Period</h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Temporarily disable public booking for a doctor or the entire clinic.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-neutral-700">Practitioner Scope *</label>
                <select
                  value={formDoctorId}
                  onChange={(e) => setFormDoctorId(e.target.value)}
                  className="w-full border border-neutral-200 rounded-xl p-2.5 text-xs mt-1 bg-neutral-50 focus:bg-white focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                >
                  <option value="all">Entire Clinic (All Practitioners)</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.doctorId || d.id}>
                      Dr. {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-neutral-700">Start Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formStart}
                    onChange={(e) => setFormStart(e.target.value)}
                    className="w-full border border-neutral-200 rounded-xl p-2 text-xs mt-1 bg-neutral-50 focus:bg-white focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-700">End Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formEnd}
                    onChange={(e) => setFormEnd(e.target.value)}
                    className="w-full border border-neutral-200 rounded-xl p-2 text-xs mt-1 bg-neutral-50 focus:bg-white focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700">Block Category</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as any)}
                  className="w-full border border-neutral-200 rounded-xl p-2.5 text-xs mt-1 bg-neutral-50 focus:bg-white focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                >
                  <option value="leave">Vacation / Annual Leave</option>
                  <option value="break">Personal Break / Training</option>
                  <option value="clinic_closure">Clinic Maintenance / Closure</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700">Reason / Description</label>
                <input
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  placeholder="e.g. Annual Medical Conference, Renovations"
                  className="w-full border border-neutral-200 rounded-xl p-2.5 text-xs mt-1 bg-neutral-50 focus:bg-white focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2.5 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-700 hover:bg-neutral-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 bg-neutral-900 hover:bg-black text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                {submitting ? "Confirming..." : "Confirm Block"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
