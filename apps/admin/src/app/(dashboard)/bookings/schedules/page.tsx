"use client";

import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Plus, Trash2, Save, Clock, Calendar, AlertCircle, CheckCircle2 } from "lucide-react";

const DAYS = [
  { id: "monday", label: "Monday" },
  { id: "tuesday", label: "Tuesday" },
  { id: "wednesday", label: "Wednesday" },
  { id: "thursday", label: "Thursday" },
  { id: "friday", label: "Friday" },
  { id: "saturday", label: "Saturday" },
  { id: "sunday", label: "Sunday" },
];

export default function SchedulesPage() {
  const [clinicId, setClinicId] = useState("");
  const [weeklyHours, setWeeklyHours] = useState<Record<string, any>>({
    monday: { isOpen: true, slots: [{ start: "09:00", end: "17:00" }] },
    tuesday: { isOpen: true, slots: [{ start: "09:00", end: "17:00" }] },
    wednesday: { isOpen: true, slots: [{ start: "09:00", end: "17:00" }] },
    thursday: { isOpen: true, slots: [{ start: "09:00", end: "20:00" }] },
    friday: { isOpen: true, slots: [{ start: "09:00", end: "17:00" }] },
    saturday: { isOpen: true, slots: [{ start: "10:00", end: "16:00" }] },
    sunday: { isOpen: false, slots: [] },
  });
  const [dateOverrides, setDateOverrides] = useState<any[]>([]);
  const [overrideDate, setOverrideDate] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideIsClosed, setOverrideIsClosed] = useState(true);
  const [overrideStartTime, setOverrideStartTime] = useState("09:00");
  const [overrideEndTime, setOverrideEndTime] = useState("13:00");
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = localStorage.getItem("aurwell_admin_profile");
    if (cached) {
      const id = JSON.parse(cached).clinicId;
      setClinicId(id);
      loadSchedule(id);
    }
  }, []);

  const loadSchedule = async (id: string) => {
    try {
      const docSnap = await getDoc(doc(db, "clinics", id, "schedules", "operating_hours"));
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.weeklyHours) setWeeklyHours(data.weeklyHours);
        if (data.dateOverrides) setDateOverrides(data.dateOverrides);
      }
    } catch (err) {
      console.error("Error loading schedules:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!clinicId) return;
    setSaving(true);
    try {
      await setDoc(
        doc(db, "clinics", clinicId, "schedules", "operating_hours"),
        {
          weeklyHours,
          dateOverrides,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setSavedMessage(true);
      setTimeout(() => setSavedMessage(false), 3500);
    } catch (err) {
      console.error("Error saving operating hours:", err);
      alert("Failed to save schedule.");
    } finally {
      setSaving(false);
    }
  };

  const addSlot = (day: string) => {
    setWeeklyHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        isOpen: true,
        slots: [...(prev[day]?.slots || []), { start: "09:00", end: "17:00" }],
      },
    }));
  };

  const removeSlot = (day: string, index: number) => {
    setWeeklyHours((prev) => {
      const updatedSlots = (prev[day]?.slots || []).filter((_: any, i: number) => i !== index);
      return {
        ...prev,
        [day]: {
          ...prev[day],
          slots: updatedSlots,
          isOpen: updatedSlots.length > 0,
        },
      };
    });
  };

  const handleAddOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideDate) return;

    const newOverride = {
      date: overrideDate,
      isClosed: overrideIsClosed,
      reason: overrideReason.trim() || (overrideIsClosed ? "Holiday Closure" : "Special Hours"),
      slots: overrideIsClosed ? [] : [{ start: overrideStartTime, end: overrideEndTime }],
    };

    setDateOverrides((prev) => [...prev.filter((o) => o.date !== overrideDate), newOverride]);
    setOverrideDate("");
    setOverrideReason("");
    setIsOverrideModalOpen(false);
  };

  const removeOverride = (date: string) => {
    setDateOverrides((prev) => prev.filter((o) => o.date !== date));
  };

  if (loading) {
    return (
      <div className="text-center py-20 text-neutral-400 text-sm animate-pulse">
        Loading clinic operating schedule...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-neutral-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Clinic Operating Hours</h1>
          <p className="text-xs text-neutral-500 mt-0.5">
            Configure weekly recurring opening slots and custom holiday overrides
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-neutral-900 hover:bg-black text-white px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Schedule"}
        </button>
      </div>

      {savedMessage && (
        <div className="bg-emerald-50 text-emerald-800 p-4 rounded-2xl border border-emerald-200 text-xs font-bold flex items-center gap-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          Operating hours and date overrides saved successfully!
        </div>
      )}

      {/* Weekly Matrix */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-black text-neutral-900 uppercase tracking-wider">Weekly Schedule Matrix</h2>
        <div className="divide-y divide-neutral-100">
          {DAYS.map((day) => {
            const schedule = weeklyHours[day.id] || { isOpen: false, slots: [] };
            return (
              <div
                key={day.id}
                className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 first:pt-0 last:pb-0"
              >
                <div className="w-44 flex items-center gap-3">
                  <input
                    type="checkbox"
                    id={`check_${day.id}`}
                    checked={schedule.isOpen}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setWeeklyHours((prev) => ({
                        ...prev,
                        [day.id]: {
                          ...prev[day.id],
                          isOpen: checked,
                          slots: checked && (!prev[day.id]?.slots || prev[day.id]?.slots.length === 0)
                            ? [{ start: "09:00", end: "17:00" }]
                            : prev[day.id]?.slots || [],
                        },
                      }));
                    }}
                    className="rounded text-neutral-900 focus:ring-neutral-900 h-4 w-4"
                  />
                  <label htmlFor={`check_${day.id}`} className="font-bold text-xs text-neutral-800 cursor-pointer">
                    {day.label}
                  </label>
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
                            setWeeklyHours((prev) => ({
                              ...prev,
                              [day.id]: { ...prev[day.id], slots: updated },
                            }));
                          }}
                          className="border border-neutral-200 rounded-xl p-2 text-xs bg-neutral-50 font-semibold focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                        />
                        <span className="text-xs text-neutral-400 font-medium">to</span>
                        <input
                          type="time"
                          value={slot.end}
                          onChange={(e) => {
                            const updated = [...schedule.slots];
                            updated[idx].end = e.target.value;
                            setWeeklyHours((prev) => ({
                              ...prev,
                              [day.id]: { ...prev[day.id], slots: updated },
                            }));
                          }}
                          className="border border-neutral-200 rounded-xl p-2 text-xs bg-neutral-50 font-semibold focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                        />
                        <button
                          onClick={() => removeSlot(day.id, idx)}
                          className="text-neutral-400 hover:text-rose-600 p-1.5 transition cursor-pointer"
                          title="Remove time slot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => addSlot(day.id)}
                      className="text-[11px] text-neutral-900 hover:underline font-bold flex items-center gap-1 mt-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Add Split Shift / Extra Slot
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 text-xs text-neutral-400 font-semibold italic">Closed all day</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Holiday / Date Overrides */}
      <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-black text-neutral-900 uppercase tracking-wider">
              Holiday & Date Overrides
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Specific calendar dates where normal weekly hours are changed or clinic is closed
            </p>
          </div>
          <button
            onClick={() => setIsOverrideModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 border border-neutral-200 hover:bg-neutral-50 rounded-xl text-xs font-bold text-neutral-800 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-neutral-900" /> Add Date Override
          </button>
        </div>

        {dateOverrides.length === 0 ? (
          <div className="text-center py-8 text-xs text-neutral-400 font-medium">
            No date overrides configured.
          </div>
        ) : (
          <div className="divide-y divide-neutral-100">
            {dateOverrides.map((item) => (
              <div key={item.date} className="py-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-neutral-900">{item.date}</span>
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                        item.isClosed
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-emerald-50 text-emerald-700 border-emerald-200"
                      }`}
                    >
                      {item.isClosed ? "CLOSED" : "MODIFIED HOURS"}
                    </span>
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    {item.reason} {!item.isClosed && item.slots?.[0] ? `(${item.slots[0].start} - ${item.slots[0].end})` : ""}
                  </p>
                </div>
                <button
                  onClick={() => removeOverride(item.date)}
                  className="text-neutral-400 hover:text-rose-600 p-1.5 transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Override Modal */}
      {isOverrideModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleAddOverride}
            className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-neutral-100"
          >
            <div>
              <h2 className="text-lg font-black text-neutral-900 tracking-tight">Add Date Override</h2>
              <p className="text-xs text-neutral-500 mt-0.5">Specify a date and adjusted hours or full closure.</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-neutral-700">Date *</label>
                <input
                  type="date"
                  required
                  value={overrideDate}
                  onChange={(e) => setOverrideDate(e.target.value)}
                  className="w-full border border-neutral-200 rounded-xl p-2.5 text-xs mt-1 bg-neutral-50 focus:bg-white focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700">Reason / Holiday Name</label>
                <input
                  type="text"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Christmas Day, Bank Holiday"
                  className="w-full border border-neutral-200 rounded-xl p-2.5 text-xs mt-1 bg-neutral-50 focus:bg-white focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isClosed"
                  checked={overrideIsClosed}
                  onChange={(e) => setOverrideIsClosed(e.target.checked)}
                  className="rounded text-neutral-900 focus:ring-neutral-900 h-4 w-4"
                />
                <label htmlFor="isClosed" className="text-xs font-bold text-neutral-800 cursor-pointer">
                  Clinic is fully closed all day
                </label>
              </div>

              {!overrideIsClosed && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-xs font-bold text-neutral-700">Opening Time</label>
                    <input
                      type="time"
                      value={overrideStartTime}
                      onChange={(e) => setOverrideStartTime(e.target.value)}
                      className="w-full border border-neutral-200 rounded-xl p-2 text-xs mt-1 bg-neutral-50 focus:bg-white focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-neutral-700">Closing Time</label>
                    <input
                      type="time"
                      value={overrideEndTime}
                      onChange={(e) => setOverrideEndTime(e.target.value)}
                      className="w-full border border-neutral-200 rounded-xl p-2 text-xs mt-1 bg-neutral-50 focus:bg-white focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setIsOverrideModalOpen(false)}
                className="px-4 py-2 border border-neutral-200 rounded-xl text-xs font-bold text-neutral-700 hover:bg-neutral-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-neutral-900 hover:bg-black text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Add Override
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
