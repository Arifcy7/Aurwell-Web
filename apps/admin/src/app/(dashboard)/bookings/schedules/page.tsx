"use client";

import { useState, useEffect, useMemo } from "react";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import BookingAccessGuard from "@/components/bookings/BookingAccessGuard";
import {
  Plus,
  Trash2,
  Save,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  CalendarOff,
} from "lucide-react";

interface TimeSlot {
  start: string;
  end: string;
}

interface DaySchedule {
  isOpen: boolean;
  slots: TimeSlot[];
}

interface DateOverride {
  date: string;
  isClosed: boolean;
  reason: string;
  slots?: TimeSlot[];
}

const DAYS: { id: string; label: string; short: string }[] = [
  { id: "monday", label: "Monday", short: "Mon" },
  { id: "tuesday", label: "Tuesday", short: "Tue" },
  { id: "wednesday", label: "Wednesday", short: "Wed" },
  { id: "thursday", label: "Thursday", short: "Thu" },
  { id: "friday", label: "Friday", short: "Fri" },
  { id: "saturday", label: "Saturday", short: "Sat" },
  { id: "sunday", label: "Sunday", short: "Sun" },
];

const DEFAULT_HOURS: Record<string, DaySchedule> = {
  monday: { isOpen: true, slots: [{ start: "09:00", end: "17:00" }] },
  tuesday: { isOpen: true, slots: [{ start: "09:00", end: "17:00" }] },
  wednesday: { isOpen: true, slots: [{ start: "09:00", end: "17:00" }] },
  thursday: { isOpen: true, slots: [{ start: "09:00", end: "17:00" }] },
  friday: { isOpen: true, slots: [{ start: "09:00", end: "17:00" }] },
  saturday: { isOpen: true, slots: [{ start: "10:00", end: "16:00" }] },
  sunday: { isOpen: false, slots: [] },
};

// Common holiday suggestion presets
const HOLIDAY_PRESETS = [
  { label: "New Year's Day", date: `${new Date().getFullYear()}-01-01`, isClosed: true },
  { label: "Good Friday", date: `${new Date().getFullYear()}-04-03`, isClosed: true },
  { label: "Easter Monday", date: `${new Date().getFullYear()}-04-06`, isClosed: true },
  { label: "Summer Bank Holiday", date: `${new Date().getFullYear()}-08-31`, isClosed: true },
  { label: "Christmas Day", date: `${new Date().getFullYear()}-12-25`, isClosed: true },
  { label: "Boxing Day", date: `${new Date().getFullYear()}-12-26`, isClosed: true },
  { label: "Staff Training (Half Day)", date: `${new Date().getFullYear()}-06-15`, isClosed: false, start: "09:00", end: "13:00" },
];

function timeToMinutes(time: string): number {
  if (!time || !time.includes(":")) return 0;
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function formatDuration(minutes: number): string {
  if (minutes <= 0) return "0 hrs";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatDateDisplay(dateStr: string) {
  try {
    const d = new Date(`${dateStr}T12:00:00`);
    if (isNaN(d.getTime())) return { month: "", day: dateStr, weekday: "", year: "" };
    return {
      month: d.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
      day: String(d.getDate()).padStart(2, "0"),
      weekday: d.toLocaleDateString("en-US", { weekday: "short" }),
      year: String(d.getFullYear()),
    };
  } catch {
    return { month: "", day: dateStr, weekday: "", year: "" };
  }
}

export default function SchedulesPage() {
  const [clinicId, setClinicId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Active View Tab
  const [activeTab, setActiveTab] = useState<"weekly" | "overrides">("weekly");

  // Schedule Data
  const [weeklyHours, setWeeklyHours] = useState<Record<string, DaySchedule>>(DEFAULT_HOURS);
  const [initialWeeklyHours, setInitialWeeklyHours] = useState<string>(JSON.stringify(DEFAULT_HOURS));

  // Date Overrides Data
  const [dateOverrides, setDateOverrides] = useState<DateOverride[]>([]);
  const [initialDateOverrides, setInitialDateOverrides] = useState<string>("[]");
  const [overrideFilter, setOverrideFilter] = useState<"all" | "upcoming" | "past">("upcoming");

  // Date Override Modal Form
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [overrideDate, setOverrideDate] = useState("");
  const [overrideReason, setOverrideReason] = useState("");
  const [overrideIsClosed, setOverrideIsClosed] = useState(true);
  const [overrideStartTime, setOverrideStartTime] = useState("09:00");
  const [overrideEndTime, setOverrideEndTime] = useState("13:00");


  // Initialize Clinic
  useEffect(() => {
    const cached = localStorage.getItem("aurwell_admin_profile");
    if (cached) {
      const id = JSON.parse(cached).clinicId;
      setClinicId(id);
    }
  }, []);

  // Load schedule whenever clinicId changes
  useEffect(() => {
    if (!clinicId) return;
    loadScheduleData(clinicId);
  }, [clinicId]);

  const loadScheduleData = async (cid: string) => {
    setLoading(true);
    try {
      const docSnap = await getDoc(doc(db, "clinics", cid, "schedules", "operating_hours"));
      if (docSnap.exists()) {
        const data = docSnap.data();
        const loadedWeekly = data.weeklyHours || DEFAULT_HOURS;
        const loadedOverrides = data.dateOverrides || [];
        setWeeklyHours(loadedWeekly);
        setDateOverrides(loadedOverrides);
        setInitialWeeklyHours(JSON.stringify(loadedWeekly));
        setInitialDateOverrides(JSON.stringify(loadedOverrides));
      } else {
        setWeeklyHours(DEFAULT_HOURS);
        setDateOverrides([]);
        setInitialWeeklyHours(JSON.stringify(DEFAULT_HOURS));
        setInitialDateOverrides("[]");
      }
    } catch (err) {
      console.error("Error loading schedule data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Has unsaved changes detection
  const hasUnsavedChanges = useMemo(() => {
    const weeklyChanged = JSON.stringify(weeklyHours) !== initialWeeklyHours;
    const overridesChanged = JSON.stringify(dateOverrides) !== initialDateOverrides;
    return weeklyChanged || overridesChanged;
  }, [weeklyHours, initialWeeklyHours, dateOverrides, initialDateOverrides]);

  // Dynamic Weekly Stats
  const weeklyStats = useMemo(() => {
    let totalMinutes = 0;
    let openDaysCount = 0;

    DAYS.forEach((day) => {
      const schedule = weeklyHours[day.id];
      if (schedule && schedule.isOpen && schedule.slots) {
        openDaysCount += 1;
        schedule.slots.forEach((slot) => {
          const startM = timeToMinutes(slot.start);
          const endM = timeToMinutes(slot.end);
          if (endM > startM) {
            totalMinutes += endM - startM;
          }
        });
      }
    });

    return {
      totalHoursStr: formatDuration(totalMinutes),
      openDaysCount,
    };
  }, [weeklyHours]);

  // Handle Save
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
      setInitialWeeklyHours(JSON.stringify(weeklyHours));
      setInitialDateOverrides(JSON.stringify(dateOverrides));
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    } catch (err) {
      console.error("Error saving operating schedule:", err);
      alert("Failed to save schedule. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Discard Changes
  const handleDiscard = () => {
    setWeeklyHours(JSON.parse(initialWeeklyHours));
    setDateOverrides(JSON.parse(initialDateOverrides));
  };

  // Toggle Day Open / Closed
  const handleToggleDay = (dayId: string) => {
    setWeeklyHours((prev) => {
      const current = prev[dayId] || { isOpen: false, slots: [] };
      const nextIsOpen = !current.isOpen;
      const slots =
        nextIsOpen && (!current.slots || current.slots.length === 0)
          ? [{ start: "09:00", end: "17:00" }]
          : current.slots;
      return {
        ...prev,
        [dayId]: {
          isOpen: nextIsOpen,
          slots: slots || [],
        },
      };
    });
  };

  // Add Time Slot (Intelligent: calculates next break and shift without overlap)
  const handleAddSlot = (dayId: string) => {
    setWeeklyHours((prev) => {
      const current = prev[dayId] || { isOpen: true, slots: [] };
      const currentSlots = current.slots || [];

      let newStart = "09:00";
      let newEnd = "17:00";

      if (currentSlots.length > 0) {
        const lastSlot = currentSlots[currentSlots.length - 1];
        const lastEndM = timeToMinutes(lastSlot.end);
        const nextStartM = Math.min(lastEndM + 60, 23 * 60);
        const nextEndM = Math.min(nextStartM + 4 * 60, 23 * 60 + 30);
        newStart = minutesToTime(nextStartM);
        newEnd = minutesToTime(nextEndM);
      }

      return {
        ...prev,
        [dayId]: {
          isOpen: true,
          slots: [...currentSlots, { start: newStart, end: newEnd }],
        },
      };
    });
  };

  // Remove Slot
  const handleRemoveSlot = (dayId: string, slotIndex: number) => {
    setWeeklyHours((prev) => {
      const currentSlots = prev[dayId]?.slots || [];
      const updated = currentSlots.filter((_, i) => i !== slotIndex);
      return {
        ...prev,
        [dayId]: {
          ...prev[dayId],
          slots: updated,
          isOpen: updated.length > 0,
        },
      };
    });
  };

  // Update Slot Start or End
  const handleUpdateSlot = (
    dayId: string,
    slotIndex: number,
    field: "start" | "end",
    value: string
  ) => {
    setWeeklyHours((prev) => {
      const slots = [...(prev[dayId]?.slots || [])];
      if (slots[slotIndex]) {
        slots[slotIndex] = {
          ...slots[slotIndex],
          [field]: value,
        };
      }
      return {
        ...prev,
        [dayId]: {
          ...prev[dayId],
          slots,
        },
      };
    });
  };


  // Add Date Override
  const handleAddOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideDate) return;

    const newOverride: DateOverride = {
      date: overrideDate,
      isClosed: overrideIsClosed,
      reason: overrideReason.trim() || (overrideIsClosed ? "Full Day Closure" : "Special Operating Hours"),
      slots: overrideIsClosed ? [] : [{ start: overrideStartTime, end: overrideEndTime }],
    };

    setDateOverrides((prev) => {
      const filtered = prev.filter((o) => o.date !== overrideDate);
      return [...filtered, newOverride].sort((a, b) => a.date.localeCompare(b.date));
    });

    setOverrideDate("");
    setOverrideReason("");
    setIsOverrideModalOpen(false);
  };

  const handleRemoveOverride = (date: string) => {
    setDateOverrides((prev) => prev.filter((o) => o.date !== date));
  };

  // Filtered Date Overrides
  const filteredOverrides = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return dateOverrides.filter((item) => {
      if (overrideFilter === "upcoming") return item.date >= today;
      if (overrideFilter === "past") return item.date < today;
      return true;
    });
  }, [dateOverrides, overrideFilter]);

  if (loading && !clinicId) {
    return (
      <div className="max-w-5xl mx-auto py-24 text-center space-y-3">
        <div className="w-10 h-10 border-3 border-neutral-900 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-neutral-400 font-medium">Loading clinic operating schedules...</p>
      </div>
    );
  }

  return (
    <BookingAccessGuard>
      <div className="max-w-6xl mx-auto space-y-5 pb-24">
        {/* ── Top Header Card with Integrated Stats & Actions ──────────────── */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Title, Subtitle & Actions */}
          <div className="space-y-3 max-w-md">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <span className="p-1.5 rounded-lg bg-neutral-100 text-neutral-800">
                  <Clock className="w-4 h-4" />
                </span>
                <h1 className="text-lg font-bold text-neutral-900 tracking-tight">
                  Operating Hours & Shifts
                </h1>
              </div>
              <p className="text-xs text-neutral-500 leading-relaxed">
                Configure weekly clinic opening times, split shifts, and holiday closures.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-0.5">
              <button
                onClick={handleSave}
                disabled={saving || !hasUnsavedChanges}
                className={`btn-primary px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs transition ${
                  !hasUnsavedChanges ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? "Saving..." : "Save Schedule"}
              </button>

              {hasUnsavedChanges && (
                <button
                  onClick={handleDiscard}
                  className="px-3 py-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-800 transition cursor-pointer"
                >
                  Discard
                </button>
              )}

              {savedSuccess && (
                <span className="text-xs font-medium text-neutral-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-neutral-900" />
                  Saved!
                </span>
              )}
            </div>
          </div>

          {/* Right side: Two Prominent Stat Cards */}
          <div className="flex flex-col sm:flex-row items-stretch gap-3">
            {/* Stat 1: Weekly Hours */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-neutral-50/80 border border-neutral-200/80 shadow-2xs flex flex-col justify-between sm:w-48 shrink-0">
              <div>
                <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">
                  Weekly Hours
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <p className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
                    {weeklyStats.totalHoursStr}
                  </p>
                  <span className="text-xs text-neutral-400 font-medium">/ week</span>
                </div>
              </div>
              <p className="text-[11px] text-neutral-900 font-medium flex items-center gap-1 pt-1">
                <Clock className="w-3 h-3" /> Active operating capacity
              </p>
            </div>

            {/* Stat 2: Open Days */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-neutral-50/80 border border-neutral-200/80 shadow-2xs flex flex-col justify-between sm:w-48 shrink-0">
              <div>
                <span className="text-[10px] font-semibold text-neutral-400 uppercase tracking-wider block">
                  Open Days
                </span>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <p className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight">
                    {weeklyStats.openDaysCount}
                  </p>
                  <span className="text-xs text-neutral-400 font-medium">/ 7 days active</span>
                </div>
              </div>
              <p className="text-[11px] text-neutral-500 font-medium pt-1">
                {7 - weeklyStats.openDaysCount} days marked closed
              </p>
            </div>
          </div>
        </div>

      {/* ── View Navigation Tabs (Weekly Matrix vs Holiday Overrides) ─────── */}
      <div className="flex items-center gap-2 border-b border-neutral-200">
        <button
          onClick={() => setActiveTab("weekly")}
          className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${activeTab === "weekly"
              ? "border-neutral-900 text-neutral-900 font-semibold"
              : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
        >
          <Clock className="w-4 h-4" />
          Weekly Operating Schedule
        </button>

        <button
          onClick={() => setActiveTab("overrides")}
          className={`pb-3 px-3 text-xs font-bold flex items-center gap-2 border-b-2 transition cursor-pointer ${activeTab === "overrides"
              ? "border-neutral-900 text-neutral-900 font-semibold"
              : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
        >
          <Calendar className="w-4 h-4" />
          Holiday & Date Overrides
          {dateOverrides.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-neutral-100 text-neutral-800">
              {dateOverrides.length}
            </span>
          )}
        </button>
      </div>

      {/* ── TAB 1: WEEKLY OPERATING SCHEDULE ───────────────────────────────── */}
      {activeTab === "weekly" && (
        <div className="space-y-2.5">
          {DAYS.map((day) => {
            const schedule = weeklyHours[day.id] || { isOpen: false, slots: [] };
            const isOpen = schedule.isOpen;

            // Calculate total daily duration
            let dayTotalMinutes = 0;
            schedule.slots?.forEach((s) => {
              const sm = timeToMinutes(s.start);
              const em = timeToMinutes(s.end);
              if (em > sm) dayTotalMinutes += em - sm;
            });

            return (
              <div
                key={day.id}
                className={`bg-white rounded-2xl border transition-all p-3.5 sm:p-4 shadow-xs ${
                  isOpen
                    ? "border-neutral-200/90 hover:border-neutral-900/30"
                    : "border-neutral-200/60 bg-neutral-50/50 opacity-80"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
                  {/* Left: Toggle + Day Badge & Label */}
                  <div className="flex items-center gap-3 w-48 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleDay(day.id)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        isOpen ? "bg-neutral-950" : "bg-neutral-300"
                      }`}
                      role="switch"
                      aria-checked={isOpen}
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                          isOpen ? "translate-x-4" : "translate-x-0"
                        }`}
                      />
                    </button>

                    {/* Day Badge & Label */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs transition-colors shrink-0 ${
                          isOpen
                            ? "bg-neutral-100 text-neutral-800"
                            : "bg-neutral-100 text-neutral-400 border border-neutral-200/60"
                        }`}
                      >
                        {day.short}
                      </span>
                      <div className="min-w-0">
                        <h3 className={`text-xs font-semibold truncate ${isOpen ? "text-neutral-900" : "text-neutral-500"}`}>
                          {day.label}
                        </h3>
                        <span
                          className={`text-[10px] font-medium ${
                            isOpen ? "text-neutral-900" : "text-neutral-400"
                          }`}
                        >
                          {isOpen ? formatDuration(dayTotalMinutes) : "Closed"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Middle: Shift Slots */}
                  <div className="flex-1 min-w-0">
                    {isOpen ? (
                      <div className="space-y-2">
                        {schedule.slots.map((slot, idx) => {
                          const isInvalid = timeToMinutes(slot.start) >= timeToMinutes(slot.end);
                          const slotDur = timeToMinutes(slot.end) - timeToMinutes(slot.start);

                          return (
                            <div key={idx} className="flex flex-wrap items-center gap-2">
                              {/* Shift Window Box */}
                              <div
                                className={`flex items-center gap-1.5 bg-neutral-50/80 border rounded-lg px-2.5 py-1.5 transition ${
                                  isInvalid
                                    ? "border-rose-300 bg-rose-50/50"
                                    : "border-neutral-200/80 hover:border-neutral-900/40"
                                }`}
                              >
                                <Clock className="w-3.5 h-3.5 text-neutral-400" />
                                <input
                                  type="time"
                                  value={slot.start}
                                  onChange={(e) =>
                                    handleUpdateSlot(day.id, idx, "start", e.target.value)
                                  }
                                  className="bg-transparent text-xs font-semibold text-neutral-800 focus:outline-none cursor-pointer"
                                />
                                <span className="text-[11px] text-neutral-400 font-medium px-0.5">to</span>
                                <input
                                  type="time"
                                  value={slot.end}
                                  onChange={(e) =>
                                    handleUpdateSlot(day.id, idx, "end", e.target.value)
                                  }
                                  className="bg-transparent text-xs font-semibold text-neutral-800 focus:outline-none cursor-pointer"
                                />
                                <span className="text-[10px] font-semibold text-neutral-900 bg-neutral-100 px-1.5 py-0.5 rounded ml-1">
                                  {isInvalid ? (
                                    <span className="text-rose-600 font-bold">Invalid</span>
                                  ) : (
                                    formatDuration(slotDur)
                                  )}
                                </span>
                              </div>

                              {/* Remove Slot */}
                              <button
                                type="button"
                                onClick={() => handleRemoveSlot(day.id, idx)}
                                className="p-1 text-neutral-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition cursor-pointer"
                                title="Remove time slot"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>

                              {isInvalid && (
                                <span className="text-[10px] text-rose-600 font-medium flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" /> End must be after start
                                </span>
                              )}
                            </div>
                          );
                        })}

                        {/* Sub-action: Add Split Shift Only */}
                        <div className="pt-0.5">
                          <button
                            type="button"
                            onClick={() => handleAddSlot(day.id)}
                            className="text-xs font-semibold text-neutral-900 hover:text-[#465433] flex items-center gap-1.5 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Split Shift / Break
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-neutral-400 italic font-medium py-1">
                        Closed all day
                      </div>
                    )}
                  </div>

                  {/* Right: Visual Mini Timeline Bar (08:00 to 20:00) */}
                  {isOpen && (
                    <div className="hidden xl:block w-32 shrink-0 pl-2">
                      <div className="text-[9px] text-neutral-400 font-mono mb-1 flex justify-between">
                        <span>8 AM</span>
                        <span>8 PM</span>
                      </div>
                      <div className="h-1.5 w-full bg-neutral-100 rounded-full relative overflow-hidden flex">
                        {schedule.slots.map((s, idx) => {
                          const baseStart = 8 * 60; // 08:00
                          const baseTotal = 12 * 60; // 12 hrs
                          const sm = Math.max(0, timeToMinutes(s.start) - baseStart);
                          const em = Math.min(baseTotal, timeToMinutes(s.end) - baseStart);
                          if (em <= sm) return null;
                          const leftPct = (sm / baseTotal) * 100;
                          const widthPct = ((em - sm) / baseTotal) * 100;

                          return (
                            <div
                              key={idx}
                              style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                              className="absolute h-full bg-neutral-950 rounded-sm"
                              title={`${s.start} - ${s.end}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── TAB 2: HOLIDAY & SPECIAL DATE OVERRIDES ─────────────────────────── */}
      {activeTab === "overrides" && (
        <div className="space-y-4">
          {/* Controls Bar */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-neutral-900 tracking-tight">
                Scheduled Date Overrides & Closures
              </h2>
              <p className="text-xs text-neutral-500">
                Override weekly operating times for public holidays, vacations, or renovations.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Filter Tabs */}
              <div className="flex items-center bg-neutral-100 p-0.5 rounded-lg border border-neutral-200/80 text-xs font-medium">
                <button
                  onClick={() => setOverrideFilter("upcoming")}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                    overrideFilter === "upcoming" ? "bg-white text-neutral-900 shadow-2xs font-semibold" : "text-neutral-500"
                  }`}
                >
                  Upcoming
                </button>
                <button
                  onClick={() => setOverrideFilter("all")}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                    overrideFilter === "all" ? "bg-white text-neutral-900 shadow-2xs font-semibold" : "text-neutral-500"
                  }`}
                >
                  All ({dateOverrides.length})
                </button>
                <button
                  onClick={() => setOverrideFilter("past")}
                  className={`px-2.5 py-1 rounded-md transition cursor-pointer ${
                    overrideFilter === "past" ? "bg-white text-neutral-900 shadow-2xs font-semibold" : "text-neutral-500"
                  }`}
                >
                  Past
                </button>
              </div>

              {/* Add Override Button */}
              <button
                onClick={() => setIsOverrideModalOpen(true)}
                className="btn-primary px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Add Date Override
              </button>
            </div>
          </div>

          {/* Overrides Cards List */}
          {filteredOverrides.length === 0 ? (
            <div className="bg-white rounded-2xl border border-neutral-200/80 p-10 text-center shadow-xs space-y-2.5">
              <span className="w-10 h-10 rounded-xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto">
                <CalendarOff className="w-5 h-5" />
              </span>
              <h3 className="text-xs font-semibold text-neutral-900">
                No {overrideFilter !== "all" ? overrideFilter : ""} overrides configured
              </h3>
              <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                Add public holiday closures or adjusted holiday hours to prevent clients from booking on closed dates.
              </p>
              <button
                onClick={() => setIsOverrideModalOpen(true)}
                className="btn-outline px-3.5 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer mt-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add New Override
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredOverrides.map((item) => {
                const dateDisplay = formatDateDisplay(item.date);
                const isPast = item.date < new Date().toISOString().split("T")[0];

                return (
                  <div
                    key={item.date}
                    className={`bg-white rounded-xl border p-3.5 shadow-xs flex items-center justify-between gap-3 transition ${
                      isPast
                        ? "opacity-60 border-neutral-200"
                        : "border-neutral-200/80 hover:border-neutral-900/30"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Date Badge */}
                      <div className="w-11 h-12 rounded-lg bg-neutral-100 border border-neutral-200 flex flex-col items-center justify-center shrink-0">
                        <span className="text-[9px] font-bold text-neutral-500 tracking-wider">
                          {dateDisplay.month}
                        </span>
                        <span className="text-sm font-bold text-neutral-900 leading-tight">
                          {dateDisplay.day}
                        </span>
                        <span className="text-[8px] font-medium text-neutral-400">
                          {dateDisplay.weekday}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-semibold text-neutral-900 truncate">
                            {item.reason}
                          </h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`notion-pill ${
                              item.isClosed
                                ? "bg-rose-50 text-rose-700 border-rose-200/80"
                                : "bg-neutral-100 text-neutral-800"
                            }`}
                          >
                            {item.isClosed ? "CLOSED ALL DAY" : "MODIFIED HOURS"}
                          </span>
                          {!item.isClosed && item.slots?.[0] && (
                            <span className="text-[11px] font-semibold text-neutral-700">
                              {item.slots[0].start} – {item.slots[0].end}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Delete Button */}
                    <button
                      onClick={() => handleRemoveOverride(item.date)}
                      className="p-1.5 text-neutral-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                      title="Remove date override"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── FLOATING UNSAVED CHANGES BAR ─────────────────────────────────────── */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 bg-neutral-900 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-4 border border-neutral-800 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="flex items-center gap-2 text-xs font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-950 animate-ping" />
            <span>You have unsaved schedule changes</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDiscard}
              className="px-2.5 py-1 text-xs font-medium text-neutral-300 hover:text-white rounded-lg hover:bg-neutral-800 transition cursor-pointer"
            >
              Discard
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary px-3 py-1 text-xs font-semibold shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? "Saving..." : "Save Now"}
            </button>
          </div>
        </div>
      )}

      {/* ── TOAST NOTIFICATION ON SUCCESSFUL SAVE ─────────────────────────────── */}
      {savedSuccess && (
        <div className="fixed top-5 right-5 z-50 bg-neutral-950 text-white px-4 py-2.5 rounded-full shadow-2xl flex items-center gap-2.5 text-xs font-semibold border-0 animate-in fade-in slide-in-from-top-4 duration-200">
          <CheckCircle2 className="w-4 h-4" />
          Operating hours saved successfully!
        </div>
      )}

      {/* ── ADD DATE OVERRIDE MODAL ─────────────────────────────────────────── */}
      {isOverrideModalOpen && (
        <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleAddOverride}
            className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-xl border border-neutral-200/80 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 tracking-tight">
                  Add Date Override
                </h3>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Set holiday closures or adjusted shifts for specific calendar dates.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOverrideModalOpen(false)}
                className="p-1 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Quick Holiday Suggestion Pills */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide">
                Quick Holiday Presets
              </label>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                {HOLIDAY_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setOverrideDate(preset.date);
                      setOverrideReason(preset.label);
                      setOverrideIsClosed(preset.isClosed);
                      if (preset.start && preset.end) {
                        setOverrideStartTime(preset.start);
                        setOverrideEndTime(preset.end);
                      }
                    }}
                    className="px-2 py-0.5 text-[10px] font-medium bg-neutral-100 hover:bg-neutral-100 hover:text-neutral-900 rounded-md text-neutral-700 transition cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-neutral-700 mb-1 block">
                  Override Date *
                </label>
                <input
                  type="date"
                  required
                  value={overrideDate}
                  onChange={(e) => setOverrideDate(e.target.value)}
                  className="input-modern w-full"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 mb-1 block">
                  Reason / Holiday Title
                </label>
                <input
                  type="text"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Bank Holiday, Christmas, Staff Training"
                  className="input-modern w-full"
                />
              </div>

              {/* Segmented Closure vs Adjusted Hours Toggle */}
              <div className="pt-0.5">
                <label className="text-xs font-semibold text-neutral-700 mb-1 block">
                  Operating Status
                </label>
                <div className="grid grid-cols-2 gap-1.5 bg-neutral-100 p-0.5 rounded-lg border border-neutral-200/60">
                  <button
                    type="button"
                    onClick={() => setOverrideIsClosed(true)}
                    className={`py-1.5 text-xs font-semibold rounded-md transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      overrideIsClosed
                        ? "bg-rose-50 text-rose-700 shadow-2xs border border-rose-200"
                        : "text-neutral-600 hover:text-neutral-900"
                    }`}
                  >
                    <CalendarOff className="w-3.5 h-3.5" />
                    Closed All Day
                  </button>
                  <button
                    type="button"
                    onClick={() => setOverrideIsClosed(false)}
                    className={`py-1.5 text-xs font-semibold rounded-md transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      !overrideIsClosed
                        ? "bg-white text-neutral-900 shadow-2xs border border-neutral-200"
                        : "text-neutral-600 hover:text-neutral-900"
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    Adjusted Shifts
                  </button>
                </div>
              </div>

              {/* Adjusted Hours Range */}
              {!overrideIsClosed && (
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <div>
                    <label className="text-xs font-semibold text-neutral-700 mb-1 block">
                      Opening Time
                    </label>
                    <input
                      type="time"
                      value={overrideStartTime}
                      onChange={(e) => setOverrideStartTime(e.target.value)}
                      className="input-modern w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-neutral-700 mb-1 block">
                      Closing Time
                    </label>
                    <input
                      type="time"
                      value={overrideEndTime}
                      onChange={(e) => setOverrideEndTime(e.target.value)}
                      className="input-modern w-full"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setIsOverrideModalOpen(false)}
                className="btn-secondary px-3.5 py-1.5 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary px-4 py-1.5 text-xs font-semibold cursor-pointer shadow-xs"
              >
                Add Override
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
    </BookingAccessGuard>
  );
}
