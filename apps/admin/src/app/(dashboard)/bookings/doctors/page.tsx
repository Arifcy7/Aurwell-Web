"use client";

import { useState, useEffect } from "react";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Plus, User, Edit2, Trash2, Check, X, Shield, Phone, Mail, Award, Stethoscope } from "lucide-react";

export default function DoctorsPage() {
  const [clinicId, setClinicId] = useState<string>("");
  const [doctors, setDoctors] = useState<any[]>([]);
  const [treatments, setTreatments] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<any>(null);

  const [formName, setFormName] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formBio, setFormBio] = useState("");
  const [formAvatarUrl, setFormAvatarUrl] = useState("");
  const [formAllTreatments, setFormAllTreatments] = useState(true);
  const [formAssignedTreatments, setFormAssignedTreatments] = useState<string[]>([]);
  const [formIsActive, setFormIsActive] = useState(true);
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

    const unsubTreats = onSnapshot(collection(db, "clinics", clinicId, "treatments"), (snap) => {
      setTreatments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubDocs();
      unsubTreats();
    };
  }, [clinicId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicId || !formName) return;

    setSubmitting(true);
    try {
      const doctorId = editingDoctor ? editingDoctor.doctorId || editingDoctor.id : `doc_${Date.now()}`;
      const docRef = doc(db, "clinics", clinicId, "doctors", doctorId);

      await setDoc(
        docRef,
        {
          doctorId,
          name: formName.trim(),
          title: formTitle.trim() || "Aesthetic Practitioner",
          email: formEmail.trim(),
          phone: formPhone.trim(),
          bio: formBio.trim(),
          avatarUrl: formAvatarUrl.trim() || null,
          allTreatments: formAllTreatments,
          assignedTreatments: formAllTreatments ? ["all"] : formAssignedTreatments,
          isActive: formIsActive,
          updatedAt: serverTimestamp(),
          ...(editingDoctor ? {} : { createdAt: serverTimestamp() }),
        },
        { merge: true }
      );

      setIsModalOpen(false);
      setEditingDoctor(null);
    } catch (err) {
      console.error("Error saving practitioner:", err);
      alert("Failed to save practitioner.");
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (doctor: any) => {
    setEditingDoctor(doctor);
    setFormName(doctor.name || "");
    setFormTitle(doctor.title || "");
    setFormEmail(doctor.email || "");
    setFormPhone(doctor.phone || "");
    setFormBio(doctor.bio || "");
    setFormAvatarUrl(doctor.avatarUrl || "");
    setFormAllTreatments(doctor.allTreatments ?? true);
    setFormAssignedTreatments(doctor.assignedTreatments || []);
    setFormIsActive(doctor.isActive ?? true);
    setIsModalOpen(true);
  };

  const toggleTreatmentSelection = (treatmentId: string) => {
    setFormAssignedTreatments((prev) =>
      prev.includes(treatmentId) ? prev.filter((id) => id !== treatmentId) : [...prev, treatmentId]
    );
  };

  const toggleActiveStatus = async (doctor: any) => {
    if (!clinicId) return;
    try {
      await setDoc(
        doc(db, "clinics", clinicId, "doctors", doctor.id),
        {
          isActive: !doctor.isActive,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.error("Error toggling doctor status:", err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Practitioners & Staff</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Configure doctors, aesthetic practitioners, and assigned treatment qualifications
          </p>
        </div>
        <button
          onClick={() => {
            setEditingDoctor(null);
            setFormName("");
            setFormTitle("");
            setFormEmail("");
            setFormPhone("");
            setFormBio("");
            setFormAvatarUrl("");
            setFormAllTreatments(true);
            setFormAssignedTreatments([]);
            setFormIsActive(true);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-[#768957] hover:bg-[#65774a] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add Practitioner
        </button>
      </div>

      {/* Doctor Cards */}
      {doctors.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-neutral-200/80 p-8 shadow-xs">
          <Stethoscope className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-neutral-900">No practitioners added yet</h3>
          <p className="text-xs text-neutral-500 mt-1 max-w-md mx-auto">
            Add doctors and clinicians to enable public slot booking and staff assignment for appointments.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {doctors.map((doctor) => {
            const assignedCount = doctor.allTreatments
              ? "All Treatments"
              : `${doctor.assignedTreatments?.length || 0} Treatments`;

            return (
              <div
                key={doctor.id}
                className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {doctor.avatarUrl ? (
                        <img
                          src={doctor.avatarUrl}
                          alt={doctor.name}
                          className="w-12 h-12 rounded-full object-cover border border-neutral-200"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-[#768957]/10 text-[#586940] flex items-center justify-center font-bold text-base border border-[#768957]/20">
                          {doctor.name ? doctor.name[0].toUpperCase() : "D"}
                        </div>
                      )}
                      <div>
                        <h3 className="font-black text-sm text-neutral-900">{doctor.name}</h3>
                        <p className="text-xs font-semibold text-neutral-500">{doctor.title || "Practitioner"}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleActiveStatus(doctor)}
                      className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border cursor-pointer transition ${doctor.isActive
                          ? "bg-[#768957]/10 text-[#586940] border-[#768957]/25"
                          : "bg-neutral-100 text-neutral-600 border-neutral-200"
                        }`}
                    >
                      {doctor.isActive ? "ACTIVE" : "INACTIVE"}
                    </button>
                  </div>

                  {doctor.bio && (
                    <p className="text-xs text-neutral-600 mt-3 line-clamp-2 italic">
                      &quot;{doctor.bio}&quot;
                    </p>
                  )}

                  <div className="mt-4 pt-3 border-t border-neutral-100 text-xs space-y-1.5 text-neutral-600">
                    <p className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      <span className="truncate">{doctor.email || "No email"}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      <span>{doctor.phone || "No phone"}</span>
                    </p>
                    <p className="flex items-center gap-2 font-medium text-neutral-700">
                      <Award className="w-3.5 h-3.5 text-neutral-900 shrink-0" />
                      <span>{assignedCount}</span>
                    </p>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-neutral-100 flex items-center justify-end gap-2">
                  <button
                    onClick={() => openEditModal(doctor)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-neutral-700 hover:bg-neutral-100 transition cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-neutral-500" /> Edit
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm(`Are you sure you want to delete ${doctor.name}?`)) {
                        await deleteDoc(doc(db, "clinics", clinicId, "doctors", doctor.id));
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Practitioner Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <form
            onSubmit={handleSave}
            className="bg-white rounded-2xl max-w-lg w-full p-6 sm:p-8 space-y-4 shadow-2xl border border-neutral-100 my-8"
          >
            <div>
              <h2 className="text-xl font-black text-neutral-900 tracking-tight">
                {editingDoctor ? "Edit Practitioner" : "Add New Practitioner"}
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Configure practitioner credentials and qualifications.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-neutral-700">Full Name *</label>
                <input
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Dr. Sarah Jenkins"
                  className="w-full border border-neutral-200 rounded-xl p-2.5 text-xs mt-1 bg-neutral-50 focus:bg-white focus:outline-none focus:border-[#768957] focus:ring-1 focus:ring-[#768957]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700">Professional Title</label>
                <input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Senior Aesthetic Practitioner"
                  className="w-full border border-neutral-200 rounded-xl p-2.5 text-xs mt-1 bg-neutral-50 focus:bg-white focus:outline-none focus:border-[#768957] focus:ring-1 focus:ring-[#768957]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-neutral-700">Email Address</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="doctor@clinic.com"
                    className="w-full border border-neutral-200 rounded-xl p-2.5 text-xs mt-1 bg-neutral-50 focus:bg-white focus:outline-none focus:border-[#768957] focus:ring-1 focus:ring-[#768957]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-700">Phone</label>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="+44 7700 900123"
                    className="w-full border border-neutral-200 rounded-xl p-2.5 text-xs mt-1 bg-neutral-50 focus:bg-white focus:outline-none focus:border-[#768957] focus:ring-1 focus:ring-[#768957]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700">Avatar Image URL</label>
                <input
                  type="url"
                  value={formAvatarUrl}
                  onChange={(e) => setFormAvatarUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full border border-neutral-200 rounded-xl p-2.5 text-xs mt-1 bg-neutral-50 focus:bg-white focus:outline-none focus:border-[#768957] focus:ring-1 focus:ring-[#768957]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700">Bio & Experience</label>
                <textarea
                  rows={2}
                  value={formBio}
                  onChange={(e) => setFormBio(e.target.value)}
                  placeholder="Short introduction visible to patients during online booking..."
                  className="w-full border border-neutral-200 rounded-xl p-2.5 text-xs mt-1 bg-neutral-50 focus:bg-white focus:outline-none focus:border-[#768957] focus:ring-1 focus:ring-[#768957]"
                />
              </div>

              {/* Treatment Qualifications */}
              <div className="pt-2 border-t border-neutral-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-neutral-800">Qualified Treatments</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="allTreatments"
                      checked={formAllTreatments}
                      onChange={(e) => setFormAllTreatments(e.target.checked)}
                      className="rounded text-[#768957] focus:ring-[#768957] h-3.5 w-3.5"
                    />
                    <label htmlFor="allTreatments" className="text-xs font-semibold text-neutral-700">
                      All Treatments
                    </label>
                  </div>
                </div>

                {!formAllTreatments && (
                  <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 bg-neutral-50 rounded-xl border border-neutral-200">
                    {treatments.map((t) => (
                      <label
                        key={t.id}
                        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white cursor-pointer text-xs text-neutral-700 font-medium"
                      >
                        <input
                          type="checkbox"
                          checked={formAssignedTreatments.includes(t.id)}
                          onChange={() => toggleTreatmentSelection(t.id)}
                          className="rounded text-[#768957] focus:ring-[#768957] h-3.5 w-3.5"
                        />
                        <span className="truncate">{t.title}</span>
                      </label>
                    ))}
                  </div>
                )}
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
                className="px-5 py-2.5 bg-[#768957] hover:bg-[#65774a] text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Save Practitioner"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
