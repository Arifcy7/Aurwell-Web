"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import BookingAccessGuard from "@/components/bookings/BookingAccessGuard";
import Modal from "@/components/Modal";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import { Plus, Trash2, CalendarOff, AlertTriangle, CheckCircle2, User } from "lucide-react";

export default function LeavesPage() {
  const [clinicId, setClinicId] = useState("");
  const [doctors, setDoctors] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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
      alert("End date/time must be strictly after the start date/time.");
      return;
    }

    setSubmitting(true);
    try {
      const slotId = `block_${Date.now()}`;
      await setDoc(doc(db, "clinics", clinicId, "blocked_slots", slotId), {
        slotId,
        doctorId: formDoctorId === "all" ? null : formDoctorId,
        type: formType,
        reason: formReason.trim() || null,
        startDateTime: formStart,
        endDateTime: formEnd,
        createdAt: serverTimestamp(),
      });

      setIsModalOpen(false);
      setFormStart("");
      setFormEnd("");
      setFormReason("");
      setFormDoctorId("all");
    } catch (err) {
      console.error("Error creating blocked slot:", err);
      alert("Failed to block slot.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSlot = async () => {
    if (!deleteTarget || !clinicId) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "clinics", clinicId, "blocked_slots", deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error("Error removing blocked slot:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDateTime = (dtStr: string) => {
    if (!dtStr) return "N/A";
    const d = new Date(dtStr);
    return d.toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <BookingAccessGuard>
      <div className="space-y-6 max-w-5xl mx-auto pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200/80 shadow-xs">
          <div>
            <h1 className="text-lg font-bold text-neutral-900 tracking-tight">Schedule Blackouts & Leaves</h1>
            <p className="text-xs text-neutral-500 mt-0.5">
              Block practitioner dates, clinic maintenance periods, or public holidays to prevent patient booking conflicts.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="btn-primary flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Block Time Slot</span>
          </button>
        </div>

        {/* Leaves Listing */}
        {loading ? (
          <div className="text-center py-16 text-neutral-400 text-xs animate-pulse">
            Loading blocked slots...
          </div>
        ) : leaves.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-neutral-200/80 p-8 shadow-xs">
            <CalendarOff className="w-10 h-10 text-neutral-300 mx-auto mb-2.5" />
            <h3 className="text-sm font-bold text-neutral-800">No blackout periods scheduled</h3>
            <p className="text-xs text-neutral-400 mt-0.5 max-w-sm mx-auto">
              All practitioner working hours are open for public booking according to their active weekly schedule.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {leaves.map((item) => {
              const docObj = doctors.find((d) => (d.doctorId || d.id) === item.doctorId);
              const targetLabel = item.doctorId ? `Dr. ${docObj?.name || "Practitioner"}` : "Entire Clinic";

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-neutral-200/80 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs hover:border-neutral-300 transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs sm:text-sm text-neutral-900">
                        {item.reason || "Scheduled Blackout"}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          item.doctorId
                            ? "bg-amber-50 text-amber-700 border-amber-200/80"
                            : "bg-rose-50 text-rose-700 border-rose-200/80"
                        }`}
                      >
                        {item.type || (item.doctorId ? "LEAVE" : "CLOSURE")}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500">
                      <span className="font-medium text-neutral-700">
                        {formatDateTime(item.startDateTime)} &rarr; {formatDateTime(item.endDateTime)}
                      </span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1 font-medium text-neutral-800">
                        <User className="w-3.5 h-3.5 text-neutral-400" /> {targetLabel}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setDeleteTarget(item)}
                    className="btn-card-delete self-end sm:self-center"
                    title="Remove this blocked slot"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove Block</span>
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Modal with Unified Modal Component */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Block Schedule Period"
          subtitle="Calendar Blackouts"
          maxWidth="max-w-md"
        >
          <form onSubmit={handleSave} className="space-y-4">
            <p className="text-xs text-neutral-500">
              Temporarily disable public booking for a specific clinician or the entire clinic.
            </p>

            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-neutral-700 mb-1 block">Practitioner Scope *</label>
                <select
                  value={formDoctorId}
                  onChange={(e) => setFormDoctorId(e.target.value)}
                  className="select-modern w-full"
                >
                  <option value="all">Entire Clinic (All Practitioners)</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.doctorId || d.id}>
                      Dr. {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-neutral-700 mb-1 block">Start Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formStart}
                    onChange={(e) => setFormStart(e.target.value)}
                    className="input-modern w-full"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-700 mb-1 block">End Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formEnd}
                    onChange={(e) => setFormEnd(e.target.value)}
                    className="input-modern w-full"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 mb-1 block">Block Category</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as any)}
                  className="select-modern w-full"
                >
                  <option value="leave">Vacation / Annual Leave</option>
                  <option value="break">Personal Break / Training</option>
                  <option value="clinic_closure">Clinic Maintenance / Closure</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 mb-1 block">Reason / Description</label>
                <input
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  placeholder="e.g. Annual Medical Conference, Renovations"
                  className="input-modern w-full"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary px-5 py-2 text-xs font-semibold shadow-xs cursor-pointer disabled:opacity-50"
              >
                {submitting ? "Confirming..." : "Confirm Block"}
              </button>
            </div>
          </form>
        </Modal>

        {/* Delete Confirm Modal */}
        <DeleteConfirmModal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteSlot}
          isDeleting={isDeleting}
          title="Remove Blocked Slot"
          description="Are you sure you want to remove this blocked time slot? The schedule will reopen for patient bookings immediately."
          itemName={deleteTarget?.reason || "Scheduled Blackout"}
        />
      </div>
    </BookingAccessGuard>
  );
}
