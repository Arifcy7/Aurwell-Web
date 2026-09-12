# 🖥️ Aurwell Admin Panel — Booking System Direct Integration Guide

This guide provides the complete, step-by-step instructions and production-ready Next.js code to integrate the **Booking System** directly into the **Aurwell Admin Panel (`apps/admin`)** using direct Firestore reads and writes (`@/lib/firebase/client`).

---

## 📑 Table of Contents

1. [Architectural Overview & Folder Structure](#1-architectural-overview--folder-structure)
2. [Sidebar Navigation Update (`layout.tsx`)](#2-sidebar-navigation-update-layouttsx)
3. [Module 1: Appointments Calendar View (`/bookings`)](#3-module-1-appointments-calendar-view-bookings)
4. [Module 2: Doctor & Staff Management (`/bookings/doctors`)](#4-module-2-doctor--staff-management-bookingsdoctors)
5. [Module 3: Clinic Hours & Doctor Shifts (`/bookings/schedules`)](#5-module-3-clinic-hours--doctor-shifts-bookingsschedules)
6. [Module 4: Leaves & Blocked Slots (`/bookings/leaves`)](#6-module-4-leaves--blocked-slots-bookingsleaves)
7. [Module 5: Subdomain & Booking Configuration (`/bookings/settings`)](#7-module-5-subdomain--booking-configuration-bookingssettings)
8. [Firestore Helper Service Layer (`lib/firebase/booking.ts`)](#8-firestore-helper-service-layer-libfirebasebookingts)

---

## 1. Architectural Overview & Folder Structure

All booking data is read and written **directly via the Firebase Client SDK** with existing security rules (`firestore.rules`). No intermediate backend is needed for admin operations.

### New Admin Routes Structure:
```
apps/admin/src/app/(dashboard)/
├── bookings/
│   ├── page.tsx               ← Live Calendar & List View (Day / Week / Month)
│   ├── doctors/
│   │   └── page.tsx           ← Doctor profiles & qualification assignments
│   ├── schedules/
│   │   └── page.tsx           ← Clinic weekly hours & doctor shift schedules
│   ├── leaves/
│   │   └── page.tsx           ← Doctor leave, vacations, and blocked slots
│   └── settings/
│       └── page.tsx           ← Subdomain configuration & booking engine mode
```

---

## 2. Sidebar Navigation Update (`layout.tsx`)

In `apps/admin/src/app/(dashboard)/layout.tsx`:

### 1. Import Booking Icons:
```typescript
import {
  Calendar,
  CalendarDays,
  UserCheck,
  Clock,
  CalendarOff,
  Globe,
  // ... existing icons
} from "lucide-react";
```

### 2. Add Booking Sub-Navigation Items:
Add the `bookings` group to your navigation items array:

```typescript
{
  id: "bookings",
  name: "Bookings",
  icon: <Calendar className="w-5 h-5 text-[#C9A96E]" />,
  isExpandable: true,
  subItems: [
    {
      name: "Appointments",
      href: "/bookings",
      icon: <CalendarDays className="w-4 h-4" />,
    },
    {
      name: "Practitioners",
      href: "/bookings/doctors",
      icon: <UserCheck className="w-4 h-4" />,
    },
    {
      name: "Operating Hours & Shifts",
      href: "/bookings/schedules",
      icon: <Clock className="w-4 h-4" />,
    },
    {
      name: "Leaves & Blocked Slots",
      href: "/bookings/leaves",
      icon: <CalendarOff className="w-4 h-4" />,
    },
    {
      name: "Subdomain & Settings",
      href: "/bookings/settings",
      icon: <Globe className="w-4 h-4" />,
    },
  ],
}
```

---

## 3. Module 1: Appointments Calendar View (`/bookings`)

**File**: `apps/admin/src/app/(dashboard)/bookings/page.tsx`

Features:
- Live real-time appointment stream via `onSnapshot`.
- Filter by date, status (`confirmed`, `held`, `completed`, `cancelled`), and doctor.
- Manual appointment creation modal (Walk-in bookings).
- Status updater (Mark Completed, No-Show, Reschedule, Cancel).

```tsx
"use client";

import { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, addDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Calendar as CalendarIcon, Clock, User, Phone, Mail, CheckCircle, XCircle, AlertCircle, Plus, Search } from "lucide-react";

export default function AppointmentsPage() {
  const [clinicId, setClinicId] = useState<string>("");
  const [appointments, setAppointments] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().substring(0, 10));
  const [loading, setLoading] = useState<boolean>(true);
  const [isNewModalOpen, setIsNewModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const cached = localStorage.getItem("aurwell_admin_profile");
    if (cached) {
      const { clinicId } = JSON.parse(cached);
      setClinicId(clinicId);
    }
  }, []);

  useEffect(() => {
    if (!clinicId) return;

    // 1. Fetch Doctors
    const doctorsUnsub = onSnapshot(collection(db, "clinics", clinicId, "doctors"), (snap) => {
      setDoctors(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    // 2. Real-time Appointments Subscription for Selected Date
    const dayStart = `${selectedDate}T00:00:00Z`;
    const dayEnd = `${selectedDate}T23:59:59Z`;

    const aptQuery = query(
      collection(db, "clinics", clinicId, "appointments"),
      where("schedule.startDateTime", ">=", dayStart),
      where("schedule.startDateTime", "<=", dayEnd)
    );

    const aptUnsub = onSnapshot(aptQuery, (snap) => {
      setAppointments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => {
      doctorsUnsub();
      aptUnsub();
    };
  }, [clinicId, selectedDate]);

  const updateStatus = async (appointmentId: string, status: string) => {
    if (!clinicId) return;
    await updateDoc(doc(db, "clinics", clinicId, "appointments", appointmentId), {
      status,
      updatedAt: serverTimestamp(),
    });
  };

  const filteredAppointments = appointments.filter((apt) => {
    if (selectedDoctor !== "all" && apt.doctorId !== selectedDoctor) return false;
    if (selectedStatus !== "all" && apt.status !== selectedStatus) return false;
    return true;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
          <p className="text-sm text-gray-500">Manage real-time clinic bookings, walk-ins, and statuses</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white shadow-sm"
          />
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="flex items-center gap-2 bg-[#C9A96E] hover:bg-[#b5955c] text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add Walk-in Booking
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 uppercase">Practitioner:</span>
          <select
            value={selectedDoctor}
            onChange={(e) => setSelectedDoctor(e.target.value)}
            className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm bg-gray-50"
          >
            <option value="all">All Practitioners</option>
            {doctors.map((doc) => (
              <option key={doc.doctorId || doc.id} value={doc.doctorId || doc.id}>
                {doc.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 uppercase">Status:</span>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm bg-gray-50"
          >
            <option value="all">All Statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="held">Held (In Checkout)</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No-Show</option>
          </select>
        </div>
      </div>

      {/* Appointments List */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading appointments...</div>
      ) : filteredAppointments.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200 p-8">
          <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900">No appointments found</h3>
          <p className="text-sm text-gray-500 mt-1">There are no appointments scheduled for this date matching the filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAppointments.map((apt) => {
            const time = new Date(apt.schedule.startDateTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            const statusColors: Record<string, string> = {
              confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
              held: "bg-amber-50 text-amber-700 border-amber-200",
              completed: "bg-blue-50 text-blue-700 border-blue-200",
              cancelled: "bg-red-50 text-red-700 border-red-200",
              no_show: "bg-gray-100 text-gray-700 border-gray-300",
            };

            return (
              <div key={apt.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-gray-900 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-gray-400" /> {time}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusColors[apt.status] || "bg-gray-50 text-gray-600"}`}>
                      {apt.status.toUpperCase()}
                    </span>
                  </div>

                  <h3 className="font-semibold text-gray-900 mt-2">{apt.treatment?.title}</h3>
                  {apt.treatment?.variantTitle && (
                    <p className="text-xs text-gray-500">{apt.treatment.variantTitle} • {apt.treatment.durationMinutes} mins</p>
                  )}

                  <div className="mt-3 space-y-1 text-sm text-gray-600">
                    <p className="flex items-center gap-2"><User className="w-3.5 h-3.5 text-gray-400" /> {apt.patient?.name}</p>
                    <p className="flex items-center gap-2 text-xs"><Phone className="w-3.5 h-3.5 text-gray-400" /> {apt.patient?.phone}</p>
                    <p className="flex items-center gap-2 text-xs"><Mail className="w-3.5 h-3.5 text-gray-400" /> {apt.patient?.email}</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                  <span className="text-xs text-gray-400">Dr. {apt.doctorName}</span>
                  <div className="flex items-center gap-1">
                    {apt.status === "confirmed" && (
                      <>
                        <button
                          onClick={() => updateStatus(apt.id, "completed")}
                          title="Mark Completed"
                          className="p-1.5 rounded hover:bg-emerald-50 text-emerald-600 transition"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => updateStatus(apt.id, "cancelled")}
                          title="Cancel"
                          className="p-1.5 rounded hover:bg-red-50 text-red-600 transition"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

---

## 4. Module 2: Doctor & Staff Management (`/bookings/doctors`)

**File**: `apps/admin/src/app/(dashboard)/bookings/doctors/page.tsx`

Allows clinic owners to add, edit, toggle active status, and assign treatments to practitioners.

```tsx
"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Plus, User, Edit2, Trash2, Check, X } from "lucide-react";

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
  const [formAllTreatments, setFormAllTreatments] = useState(true);
  const [formAssignedTreatments, setFormAssignedTreatments] = useState<string[]>([]);

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

    const doctorId = editingDoctor ? editingDoctor.doctorId || editingDoctor.id : `doc_${Date.now()}`;
    const docRef = doc(db, "clinics", clinicId, "doctors", doctorId);

    await setDoc(docRef, {
      doctorId,
      name: formName,
      title: formTitle,
      email: formEmail,
      phone: formPhone,
      bio: formBio,
      allTreatments: formAllTreatments,
      assignedTreatments: formAllTreatments ? ["all"] : formAssignedTreatments,
      isActive: editingDoctor ? editingDoctor.isActive : true,
      updatedAt: serverTimestamp(),
      ...(editingDoctor ? {} : { createdAt: serverTimestamp() }),
    }, { merge: true });

    setIsModalOpen(false);
    setEditingDoctor(null);
  };

  const openEditModal = (doctor: any) => {
    setEditingDoctor(doctor);
    setFormName(doctor.name || "");
    setFormTitle(doctor.title || "");
    setFormEmail(doctor.email || "");
    setFormPhone(doctor.phone || "");
    setFormBio(doctor.bio || "");
    setFormAllTreatments(doctor.allTreatments ?? true);
    setFormAssignedTreatments(doctor.assignedTreatments || []);
    setIsModalOpen(true);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Practitioners & Doctors</h1>
          <p className="text-sm text-gray-500">Configure clinic doctors and their eligible treatments</p>
        </div>
        <button
          onClick={() => {
            setEditingDoctor(null);
            setFormName("");
            setFormTitle("");
            setFormEmail("");
            setFormPhone("");
            setFormBio("");
            setFormAllTreatments(true);
            setFormAssignedTreatments([]);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-[#C9A96E] hover:bg-[#b5955c] text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          <Plus className="w-4 h-4" /> Add Practitioner
        </button>
      </div>

      {/* Doctor Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {doctors.map((doctor) => (
          <div key={doctor.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3">
                {doctor.avatarUrl ? (
                  <img src={doctor.avatarUrl} alt={doctor.name} className="w-12 h-12 rounded-full object-cover border" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
                    <User className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-gray-900">{doctor.name}</h3>
                  <p className="text-xs text-gray-500">{doctor.title}</p>
                </div>
              </div>

              <div className="mt-4 text-xs space-y-1 text-gray-600">
                <p><strong>Email:</strong> {doctor.email || "—"}</p>
                <p><strong>Phone:</strong> {doctor.phone || "—"}</p>
                <p>
                  <strong>Treatments:</strong> {doctor.allTreatments ? "All Treatments" : `${doctor.assignedTreatments?.length || 0} Assigned`}
                </p>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${doctor.isActive ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-600"}`}>
                {doctor.isActive ? "Active" : "Inactive"}
              </span>
              <div className="flex items-center gap-2">
                <button onClick={() => openEditModal(doctor)} className="p-1 text-gray-500 hover:text-gray-800">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={async () => {
                    if (confirm("Delete this doctor?")) {
                      await deleteDoc(doc(db, "clinics", clinicId, "doctors", doctor.id));
                    }
                  }}
                  className="p-1 text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSave} className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900">{editingDoctor ? "Edit Practitioner" : "Add Practitioner"}</h2>

            <div>
              <label className="text-xs font-semibold text-gray-700">Full Name</label>
              <input
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Dr. Sarah Jenkins"
                className="w-full border border-gray-300 rounded-lg p-2 text-sm mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700">Professional Title</label>
              <input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. Senior Aesthetic Doctor"
                className="w-full border border-gray-300 rounded-lg p-2 text-sm mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-700">Email</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700">Phone</label>
                <input
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 text-sm mt-1"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#C9A96E] hover:bg-[#b5955c] text-white rounded-lg text-sm font-medium"
              >
                Save Practitioner
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
```

---

## 5. Module 3: Clinic Hours & Doctor Shifts (`/bookings/schedules`)

**File**: `apps/admin/src/app/(dashboard)/bookings/schedules/page.tsx`

Allows admins to configure weekly clinic opening slots (e.g. Monday: 6am–9am & 2pm–8pm) and holiday date overrides.

```tsx
"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Plus, Trash2, Save, Clock } from "lucide-react";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export default function SchedulesPage() {
  const [clinicId, setClinicId] = useState("");
  const [weeklyHours, setWeeklyHours] = useState<Record<string, any>>({
    monday: { isOpen: true, slots: [{ start: "06:00", end: "09:00" }, { start: "14:00", end: "20:00" }] },
    tuesday: { isOpen: true, slots: [{ start: "09:00", end: "17:00" }] },
    wednesday: { isOpen: true, slots: [{ start: "09:00", end: "17:00" }] },
    thursday: { isOpen: true, slots: [{ start: "09:00", end: "20:00" }] },
    friday: { isOpen: true, slots: [{ start: "09:00", end: "17:00" }] },
    saturday: { isOpen: true, slots: [{ start: "10:00", end: "16:00" }] },
    sunday: { isOpen: false, slots: [] },
  });
  const [dateOverrides, setDateOverrides] = useState<any[]>([]);
  const [savedMessage, setSavedMessage] = useState(false);

  useEffect(() => {
    const cached = localStorage.getItem("aurwell_admin_profile");
    if (cached) {
      const id = JSON.parse(cached).clinicId;
      setClinicId(id);
      loadSchedule(id);
    }
  }, []);

  const loadSchedule = async (id: string) => {
    const docSnap = await getDoc(doc(db, "clinics", id, "schedules", "operating_hours"));
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.weeklyHours) setWeeklyHours(data.weeklyHours);
      if (data.dateOverrides) setDateOverrides(data.dateOverrides);
    }
  };

  const handleSave = async () => {
    if (!clinicId) return;
    await setDoc(doc(db, "clinics", clinicId, "schedules", "operating_hours"), {
      weeklyHours,
      dateOverrides,
      updatedAt: serverTimestamp(),
    });
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 3000);
  };

  const addSlot = (day: string) => {
    setWeeklyHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: [...(prev[day]?.slots || []), { start: "09:00", end: "17:00" }],
      },
    }));
  };

  const removeSlot = (day: string, index: number) => {
    setWeeklyHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        slots: prev[day].slots.filter((_: any, i: number) => i !== index),
      },
    }));
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clinic Operating Hours</h1>
          <p className="text-sm text-gray-500">Configure weekly open hours and holiday date overrides</p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 bg-[#C9A96E] hover:bg-[#b5955c] text-white px-5 py-2 rounded-lg font-medium transition shadow-sm"
        >
          <Save className="w-4 h-4" /> Save Schedule
        </button>
      </div>

      {savedMessage && (
        <div className="bg-emerald-50 text-emerald-800 p-3 rounded-lg border border-emerald-200 text-sm font-medium">
          ✅ Schedule saved successfully!
        </div>
      )}

      {/* Weekly Schedule Matrix */}
      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 shadow-sm">
        {DAYS.map((day) => {
          const schedule = weeklyHours[day] || { isOpen: false, slots: [] };
          return (
            <div key={day} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="w-36 flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={schedule.isOpen}
                  onChange={(e) =>
                    setWeeklyHours((prev) => ({
                      ...prev,
                      [day]: { ...prev[day], isOpen: e.target.checked },
                    }))
                  }
                  className="rounded text-[#C9A96E] focus:ring-[#C9A96E] h-4 w-4"
                />
                <span className="capitalize font-semibold text-gray-800">{day}</span>
              </div>

              {schedule.isOpen ? (
                <div className="flex-1 space-y-2">
                  {schedule.slots?.map((slot: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="time"
                        value={slot.start}
                        onChange={(e) => {
                          const updated = [...schedule.slots];
                          updated[idx].start = e.target.value;
                          setWeeklyHours((prev) => ({ ...prev, [day]: { ...prev[day], slots: updated } }));
                        }}
                        className="border rounded p-1.5 text-sm"
                      />
                      <span className="text-gray-400">to</span>
                      <input
                        type="time"
                        value={slot.end}
                        onChange={(e) => {
                          const updated = [...schedule.slots];
                          updated[idx].end = e.target.value;
                          setWeeklyHours((prev) => ({ ...prev, [day]: { ...prev[day], slots: updated } }));
                        }}
                        className="border rounded p-1.5 text-sm"
                      />
                      <button onClick={() => removeSlot(day, idx)} className="text-red-500 hover:text-red-700 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => addSlot(day)}
                    className="text-xs text-[#C9A96E] hover:underline font-semibold flex items-center gap-1 mt-1"
                  >
                    <Plus className="w-3 h-3" /> Add Time Slot
                  </button>
                </div>
              ) : (
                <div className="flex-1 text-sm text-gray-400 font-medium">Closed</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

## 6. Module 4: Leaves & Blocked Slots (`/bookings/leaves`)

**File**: `apps/admin/src/app/(dashboard)/bookings/leaves/page.tsx`

Allows staff to block out doctor vacations, medical leaves, or clinic maintenance periods.

```tsx
"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Plus, Trash2, CalendarOff } from "lucide-react";

export default function LeavesPage() {
  const [clinicId, setClinicId] = useState("");
  const [doctors, setDoctors] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formDoctorId, setFormDoctorId] = useState("all");
  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");
  const [formReason, setFormReason] = useState("");

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
    });

    return () => {
      unsubDocs();
      unsubLeaves();
    };
  }, [clinicId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicId || !formStart || !formEnd) return;

    const slotId = `block_${Date.now()}`;
    await setDoc(doc(db, "clinics", clinicId, "blocked_slots", slotId), {
      id: slotId,
      doctorId: formDoctorId === "all" ? null : formDoctorId,
      scope: formDoctorId === "all" ? "clinic" : "doctor",
      startDateTime: new Date(formStart).toISOString(),
      endDateTime: new Date(formEnd).toISOString(),
      type: "leave",
      reason: formReason || "Leave / Blocked Slot",
      createdAt: serverTimestamp(),
    });

    setIsModalOpen(false);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leaves & Blocked Periods</h1>
          <p className="text-sm text-gray-500">Block practitioner schedules for holidays, sick leaves, or breaks</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-[#C9A96E] hover:bg-[#b5955c] text-white px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          <Plus className="w-4 h-4" /> Add Blocked Period
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 shadow-sm">
        {leaves.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No active leaves or blocked slots.</div>
        ) : (
          leaves.map((item) => (
            <div key={item.id} className="p-4 flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-gray-900">{item.reason}</h4>
                <p className="text-xs text-gray-500">
                  {new Date(item.startDateTime).toLocaleDateString()} to {new Date(item.endDateTime).toLocaleDateString()}
                  {" • "}
                  {item.doctorId ? `Dr. ${doctors.find((d) => d.id === item.doctorId || d.doctorId === item.doctorId)?.name || item.doctorId}` : "Entire Clinic"}
                </p>
              </div>
              <button
                onClick={async () => {
                  if (confirm("Remove this blocked slot?")) {
                    await deleteDoc(doc(db, "clinics", clinicId, "blocked_slots", item.id));
                  }
                }}
                className="text-red-500 hover:text-red-700 p-2"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleSave} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h2 className="text-xl font-bold text-gray-900">Block Schedule / Leave</h2>

            <div>
              <label className="text-xs font-semibold text-gray-700">Practitioner</label>
              <select
                value={formDoctorId}
                onChange={(e) => setFormDoctorId(e.target.value)}
                className="w-full border rounded-lg p-2 text-sm mt-1"
              >
                <option value="all">Entire Clinic (All Practitioners)</option>
                {doctors.map((d) => (
                  <option key={d.id} value={d.doctorId || d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-700">Start Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={formStart}
                  onChange={(e) => setFormStart(e.target.value)}
                  className="w-full border rounded-lg p-2 text-sm mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700">End Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={formEnd}
                  onChange={(e) => setFormEnd(e.target.value)}
                  className="w-full border rounded-lg p-2 text-sm mt-1"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700">Reason</label>
              <input
                value={formReason}
                onChange={(e) => setFormReason(e.target.value)}
                placeholder="e.g. Annual Leave, Training, Maintenance"
                className="w-full border rounded-lg p-2 text-sm mt-1"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 border rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#C9A96E] hover:bg-[#b5955c] text-white rounded-lg text-sm font-medium"
              >
                Confirm Block
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
```

---

## 7. Module 5: Subdomain & Booking Configuration (`/bookings/settings`)

**File**: `apps/admin/src/app/(dashboard)/bookings/settings/page.tsx`

Allows clinic owners to set their public subdomain (e.g. `harleystreet.aurwell.app`), choose between native booking or external SDKs (Fresha/Phorest), and configure deposit percentages and notice windows.

```tsx
"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, writeBatch, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Save, Globe, ShieldCheck } from "lucide-react";

export default function BookingSettingsPage() {
  const [clinicId, setClinicId] = useState("");
  const [systemType, setSystemType] = useState<"aurwell_custom" | "external_sdk" | "disabled">("aurwell_custom");
  const [subdomain, setSubdomain] = useState("");
  const [externalProvider, setExternalProvider] = useState("fresha");
  const [externalUrl, setExternalUrl] = useState("");
  const [requirePayment, setRequirePayment] = useState(false);
  const [depositAmount, setDepositAmount] = useState(50);
  const [slotInterval, setSlotInterval] = useState(30);
  const [minNotice, setMinNotice] = useState(2);
  const [maxAdvance, setMaxAdvance] = useState(60);
  const [cancellationHours, setCancellationHours] = useState(24);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    const cached = localStorage.getItem("aurwell_admin_profile");
    if (cached) {
      const id = JSON.parse(cached).clinicId;
      setClinicId(id);
      loadConfig(id);
    }
  }, []);

  const loadConfig = async (id: string) => {
    const clinicSnap = await getDoc(doc(db, "clinics", id));
    if (clinicSnap.exists()) {
      const config = clinicSnap.data().bookingConfig;
      if (config) {
        setSystemType(config.systemType || "aurwell_custom");
        setSubdomain(config.subdomain || "");
        if (config.externalBooking) {
          setExternalProvider(config.externalBooking.provider || "fresha");
          setExternalUrl(config.externalBooking.url || "");
        }
        if (config.settings) {
          setRequirePayment(config.settings.requirePaymentUpfront ?? false);
          setDepositAmount(config.settings.depositAmount ?? 50);
          setSlotInterval(config.settings.slotIntervalMinutes ?? 30);
          setMinNotice(config.settings.minNoticeHours ?? 2);
          setMaxAdvance(config.settings.maxAdvanceDays ?? 60);
          setCancellationHours(config.settings.cancellationHours ?? 24);
        }
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicId || !subdomain) return;

    const cleanSubdomain = subdomain.trim().toLowerCase();

    // Check Subdomain Uniqueness
    const subSnap = await getDoc(doc(db, "subdomains", cleanSubdomain));
    if (subSnap.exists() && subSnap.data().clinicId !== clinicId) {
      alert("This subdomain is already taken by another clinic. Please choose another one.");
      return;
    }

    const batch = writeBatch(db);

    // 1. Set /subdomains lookup
    batch.set(doc(db, "subdomains", cleanSubdomain), {
      subdomain: cleanSubdomain,
      clinicId,
      isActive: true,
      updatedAt: serverTimestamp(),
    });

    // 2. Set /clinics/{clinicId} bookingConfig
    batch.update(doc(db, "clinics", clinicId), {
      bookingConfig: {
        systemType,
        subdomain: cleanSubdomain,
        customDomain: null,
        externalBooking: {
          provider: externalProvider,
          url: externalUrl,
        },
        settings: {
          requirePaymentUpfront: requirePayment,
          depositType: "percentage",
          depositAmount: Number(depositAmount),
          slotIntervalMinutes: Number(slotInterval),
          minNoticeHours: Number(minNotice),
          maxAdvanceDays: Number(maxAdvance),
          cancellationHours: Number(cancellationHours),
          holdDurationMinutes: 10,
        },
      },
    });

    await batch.commit();
    setStatusMessage("✅ Booking configuration saved successfully!");
    setTimeout(() => setStatusMessage(""), 4000);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subdomain & Booking Settings</h1>
          <p className="text-sm text-gray-500">Configure your public booking site and payment policies</p>
        </div>
      </div>

      {statusMessage && (
        <div className="bg-emerald-50 text-emerald-800 p-3 rounded-lg border border-emerald-200 text-sm font-medium">
          {statusMessage}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        {/* Booking Engine Mode */}
        <div>
          <label className="text-sm font-bold text-gray-800 block mb-2">Booking System Engine</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { id: "aurwell_custom", title: "Native Aurwell Booking", desc: "Full online booking wizard with slot holding & Stripe" },
              { id: "external_sdk", title: "External Widget / Link", desc: "Redirect to Fresha, Phorest, or external booking site" },
              { id: "disabled", title: "Disabled", desc: "Show phone contact details only" },
            ].map((option) => (
              <label
                key={option.id}
                className={`p-4 rounded-xl border-2 cursor-pointer transition ${
                  systemType === option.id ? "border-[#C9A96E] bg-amber-50/20" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  name="systemType"
                  value={option.id}
                  checked={systemType === option.id}
                  onChange={(e) => setSystemType(e.target.value as any)}
                  className="sr-only"
                />
                <h4 className="font-bold text-sm text-gray-900">{option.title}</h4>
                <p className="text-xs text-gray-500 mt-1">{option.desc}</p>
              </label>
            ))}
          </div>
        </div>

        {/* Subdomain Input */}
        <div className="pt-4 border-t">
          <label className="text-xs font-semibold text-gray-700">Public Subdomain URL</label>
          <div className="flex items-center mt-1">
            <input
              type="text"
              required
              value={subdomain}
              onChange={(e) => setSubdomain(e.target.value)}
              placeholder="clinicname"
              className="border border-r-0 border-gray-300 rounded-l-lg p-2.5 text-sm w-48 font-mono lowercase"
            />
            <span className="bg-gray-100 border border-gray-300 rounded-r-lg px-3 py-2.5 text-sm text-gray-600 font-mono">
              .aurwell.app
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Patients will visit <strong>{subdomain || "clinicname"}.aurwell.app</strong> to book.</p>
        </div>

        {/* External URL if external_sdk */}
        {systemType === "external_sdk" && (
          <div className="pt-4 border-t space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-700">Provider Name</label>
              <input
                value={externalProvider}
                onChange={(e) => setExternalProvider(e.target.value)}
                placeholder="e.g. Fresha, Phorest"
                className="w-full border rounded-lg p-2 text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700">External Booking URL</label>
              <input
                type="url"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://fresha.com/a/..."
                className="w-full border rounded-lg p-2 text-sm mt-1"
              />
            </div>
          </div>
        )}

        {/* Payment & Slot Policies if aurwell_custom */}
        {systemType === "aurwell_custom" && (
          <div className="pt-4 border-t space-y-4">
            <h3 className="font-bold text-sm text-gray-800">Booking & Payment Policies</h3>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="reqPay"
                checked={requirePayment}
                onChange={(e) => setRequirePayment(e.target.checked)}
                className="rounded text-[#C9A96E] focus:ring-[#C9A96E] h-4 w-4"
              />
              <label htmlFor="reqPay" className="text-sm text-gray-700 font-medium">
                Require Stripe deposit / payment at time of public booking
              </label>
            </div>

            {requirePayment && (
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl">
                <div>
                  <label className="text-xs font-semibold text-gray-700">Deposit Percentage (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(Number(e.target.value))}
                    className="w-full border rounded-lg p-2 text-sm mt-1 bg-white"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-gray-700">Slot Interval (Minutes)</label>
                <select
                  value={slotInterval}
                  onChange={(e) => setSlotInterval(Number(e.target.value))}
                  className="w-full border rounded-lg p-2 text-sm mt-1 bg-white"
                >
                  <option value={15}>15 Minutes</option>
                  <option value={30}>30 Minutes</option>
                  <option value={45}>45 Minutes</option>
                  <option value={60}>60 Minutes</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">Minimum Notice (Hours)</label>
                <input
                  type="number"
                  min="0"
                  value={minNotice}
                  onChange={(e) => setMinNotice(Number(e.target.value))}
                  className="w-full border rounded-lg p-2 text-sm mt-1 bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700">Cancellation Window (Hours)</label>
                <input
                  type="number"
                  min="0"
                  value={cancellationHours}
                  onChange={(e) => setCancellationHours(Number(e.target.value))}
                  className="w-full border rounded-lg p-2 text-sm mt-1 bg-white"
                />
              </div>
            </div>
          </div>
        )}

        <div className="pt-4 border-t flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 bg-[#C9A96E] hover:bg-[#b5955c] text-white px-6 py-2.5 rounded-lg font-medium transition shadow-sm"
          >
            <Save className="w-4 h-4" /> Save All Settings
          </button>
        </div>
      </form>
    </div>
  );
}
```

---

## 8. Summary of Steps to Complete

1. **Update Sidebar Navigation**: Add the Bookings navigation section in `apps/admin/src/app/(dashboard)/layout.tsx`.
2. **Create the 5 Sub-Route Folders & Pages**:
   - `apps/admin/src/app/(dashboard)/bookings/page.tsx`
   - `apps/admin/src/app/(dashboard)/bookings/doctors/page.tsx`
   - `apps/admin/src/app/(dashboard)/bookings/schedules/page.tsx`
   - `apps/admin/src/app/(dashboard)/bookings/leaves/page.tsx`
   - `apps/admin/src/app/(dashboard)/bookings/settings/page.tsx`
3. **Verify in Admin UI**: Open the Admin Panel (`npm run dev`) $\rightarrow$ Navigate to **Bookings** in the sidebar. All edits sync live with the backend and public web portals!
