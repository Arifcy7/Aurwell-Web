"use client";

import { useState, useEffect, useMemo } from "react";
import { onAuthStateChanged, sendPasswordResetEmail, User } from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import {
  COUNTRIES,
  CURRENCIES,
  TIMEZONES,
  LANGUAGES,
} from "@/lib/constants";
import Modal from "@/components/Modal";
import DeleteConfirmModal from "@/components/DeleteConfirmModal";
import AdminSplashScreen from "@/components/AdminSplashScreen";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sliders,
  Building2,
  Users,
  Bell,
  ShieldCheck,
  Sun,
  Moon,
  Monitor,
  Globe,
  DollarSign,
  Clock,
  Calendar,
  Save,
  CheckCircle2,
  AlertCircle,
  Plus,
  Search,
  Mail,
  Phone,
  Edit2,
  Trash2,
  Check,
  Lock,
  Volume2,
  X,
} from "lucide-react";

type SettingsTab = "general" | "clinic" | "employees" | "notifications" | "security";

interface Employee {
  id: string;
  doctorId?: string;
  name: string;
  title: string;
  role?: string;
  email: string;
  phone: string;
  bio?: string;
  avatarUrl?: string | null;
  isActive: boolean;
  allTreatments?: boolean;
  assignedTreatments?: string[];
  createdAt?: any;
}

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [clinicId, setClinicId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");

  // General Preferences
  const [theme, setTheme] = useState<"light" | "dark" | "system">("light");
  const [language, setLanguage] = useState("en-US");
  const [currency, setCurrency] = useState(CURRENCIES[0].code);
  const [timezone, setTimezone] = useState(TIMEZONES[0].value);
  const [dateFormat, setDateFormat] = useState<"DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD">("DD/MM/YYYY");
  const [timeFormat, setTimeFormat] = useState<"12h" | "24h">("24h");

  // Clinic Details
  const [merchantName, setMerchantName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [address, setAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState(COUNTRIES[0].code);
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [description, setDescription] = useState("");

  // Notification Preferences
  const [emailBookings, setEmailBookings] = useState(true);
  const [whatsappAlerts, setWhatsappAlerts] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(true);
  const [soundAlerts, setSoundAlerts] = useState(true);

  // Employee Management
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [treatments, setTreatments] = useState<any[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState<"all" | "active" | "inactive" | "practitioners">("all");
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [savingEmployee, setSavingEmployee] = useState(false);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Employee Form State
  const [formName, setFormName] = useState("");
  const [formTitle, setFormTitle] = useState("Senior Aesthetic Practitioner");
  const [formRole, setFormRole] = useState("practitioner");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formBio, setFormBio] = useState("");
  const [formIsActive, setFormIsActive] = useState(true);
  const [formAllTreatments, setFormAllTreatments] = useState(true);
  const [formAssignedTreatments, setFormAssignedTreatments] = useState<string[]>([]);

  // Security
  const [sendingReset, setSendingReset] = useState(false);
  const [resetMessage, setResetMessage] = useState("");

  // 1. Initialize user and theme
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("aurwell_admin_theme") as "light" | "dark" | "system" | null;
      if (savedTheme) {
        setTheme(savedTheme);
      }
      const savedLang = localStorage.getItem("aurwell_admin_language");
      if (savedLang) {
        setLanguage(savedLang);
      }
    } catch (e) {
      console.error("Local preference read error:", e);
    }

    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) return;
      setUser(currentUser);

      try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const cId = userDoc.data().clinicId;
          if (cId) {
            setClinicId(cId);
            await loadClinicData(cId);
          }
        }
      } catch (err) {
        console.error("Error loading user/clinic:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubAuth();
  }, []);

  // 2. Load Clinic Data
  const loadClinicData = async (cId: string) => {
    try {
      const clinicSnap = await getDoc(doc(db, "clinics", cId));
      if (clinicSnap.exists()) {
        const cData = clinicSnap.data();
        setMerchantName(cData.merchantName || cData.name || "");
        setEmail(cData.contactEmail || cData.email || "");
        setPhone(cData.phone || "");
        setWhatsappNumber(cData.whatsappNumber || "");
        setAddress(cData.address || "");
        setPostalCode(cData.postalCode || "");
        setCountry(cData.country || COUNTRIES[0].code);
        setWebsiteUrl(cData.websiteUrl || "");
        setDescription(cData.description || "");

        if (cData.currency) setCurrency(cData.currency);
        if (cData.timezone) setTimezone(cData.timezone);

        const prefs = cData.adminPreferences;
        if (prefs) {
          if (prefs.theme) setTheme(prefs.theme);
          if (prefs.language) setLanguage(prefs.language);
          if (prefs.dateFormat) setDateFormat(prefs.dateFormat);
          if (prefs.timeFormat) setTimeFormat(prefs.timeFormat);
          if (prefs.notifications) {
            setEmailBookings(prefs.notifications.emailBookings ?? true);
            setWhatsappAlerts(prefs.notifications.whatsappAlerts ?? true);
            setDailyDigest(prefs.notifications.dailyDigest ?? true);
            setSoundAlerts(prefs.notifications.soundAlerts ?? true);
          }
        }
      }
    } catch (err) {
      console.error("Error loading clinic data:", err);
    }
  };

  // 3. Real-time Employee & Treatments Subscriptions
  useEffect(() => {
    if (!clinicId) return;

    const unsubEmployees = onSnapshot(collection(db, "clinics", clinicId, "doctors"), (snapshot) => {
      const list = snapshot.docs.map((d) => ({
        id: d.id,
        doctorId: d.data().doctorId || d.id,
        name: d.data().name || "",
        title: d.data().title || "Practitioner",
        role: d.data().role || (d.data().title?.toLowerCase().includes("doctor") || d.data().title?.toLowerCase().includes("practitioner") ? "practitioner" : "staff"),
        email: d.data().email || "",
        phone: d.data().phone || "",
        bio: d.data().bio || "",
        avatarUrl: d.data().avatarUrl || null,
        isActive: d.data().isActive ?? true,
        allTreatments: d.data().allTreatments ?? true,
        assignedTreatments: d.data().assignedTreatments || [],
        createdAt: d.data().createdAt,
      }));
      setEmployees(list);
    });

    const unsubTreatments = onSnapshot(collection(db, "clinics", clinicId, "treatments"), (snapshot) => {
      setTreatments(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubEmployees();
      unsubTreatments();
    };
  }, [clinicId]);

  // Apply Theme Helper
  const applyTheme = (selectedTheme: "light" | "dark" | "system") => {
    setTheme(selectedTheme);
    try {
      localStorage.setItem("aurwell_admin_theme", selectedTheme);
      const isDark =
        selectedTheme === "dark" ||
        (selectedTheme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      if (isDark) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } catch (e) {
      console.error("Theme toggle error:", e);
    }
  };

  // Apply Language Helper
  const applyLanguage = (selectedLang: string) => {
    setLanguage(selectedLang);
    try {
      localStorage.setItem("aurwell_admin_language", selectedLang);
      setSaveSuccess("Language preference updated.");
      setTimeout(() => setSaveSuccess(""), 3000);
    } catch (e) {
      console.error("Language save error:", e);
    }
  };

  // Save General Preferences
  const handleSaveGeneral = async () => {
    if (!clinicId) return;
    setSaving(true);
    setSaveSuccess("");
    setErrorMessage("");

    try {
      const clinicRef = doc(db, "clinics", clinicId);
      await updateDoc(clinicRef, {
        currency,
        timezone,
        "adminPreferences.theme": theme,
        "adminPreferences.language": language,
        "adminPreferences.dateFormat": dateFormat,
        "adminPreferences.timeFormat": timeFormat,
        updatedAt: serverTimestamp(),
      });

      const cachedStr = localStorage.getItem("aurwell_admin_profile");
      if (cachedStr) {
        const cached = JSON.parse(cachedStr);
        cached.currency = currency;
        cached.timezone = timezone;
        localStorage.setItem("aurwell_admin_profile", JSON.stringify(cached));
        window.dispatchEvent(new Event("storage"));
      }

      setSaveSuccess("Preferences saved successfully.");
      setTimeout(() => setSaveSuccess(""), 4000);
    } catch (err: any) {
      console.error("Error saving general preferences:", err);
      setErrorMessage("Failed to save preferences.");
    } finally {
      setSaving(false);
    }
  };

  // Save Clinic Details
  const handleSaveClinicDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicId) return;

    if (!merchantName.trim()) {
      setErrorMessage("Clinic name cannot be empty.");
      return;
    }

    setSaving(true);
    setSaveSuccess("");
    setErrorMessage("");

    try {
      const clinicRef = doc(db, "clinics", clinicId);
      await updateDoc(clinicRef, {
        merchantName: merchantName.trim(),
        name: merchantName.trim(),
        email: email.trim(),
        contactEmail: email.trim(),
        phone: phone.trim(),
        whatsappNumber: whatsappNumber.trim() || null,
        address: address.trim(),
        postalCode: postalCode.trim(),
        country,
        websiteUrl: websiteUrl.trim(),
        description: description.trim(),
        updatedAt: serverTimestamp(),
      });

      const cachedStr = localStorage.getItem("aurwell_admin_profile");
      if (cachedStr) {
        const cached = JSON.parse(cachedStr);
        cached.clinicName = merchantName.trim();
        localStorage.setItem("aurwell_admin_profile", JSON.stringify(cached));
        window.dispatchEvent(new Event("storage"));
      }

      setSaveSuccess("Clinic details updated.");
      setTimeout(() => setSaveSuccess(""), 4000);
    } catch (err: any) {
      console.error("Error updating clinic details:", err);
      setErrorMessage("Failed to save clinic details.");
    } finally {
      setSaving(false);
    }
  };

  // Save Notification Preferences
  const handleSaveNotifications = async () => {
    if (!clinicId) return;
    setSaving(true);
    setSaveSuccess("");
    setErrorMessage("");

    try {
      const clinicRef = doc(db, "clinics", clinicId);
      await updateDoc(clinicRef, {
        "adminPreferences.notifications": {
          emailBookings,
          whatsappAlerts,
          dailyDigest,
          soundAlerts,
        },
        updatedAt: serverTimestamp(),
      });

      setSaveSuccess("Notification preferences saved.");
      setTimeout(() => setSaveSuccess(""), 4000);
    } catch (err: any) {
      console.error("Error saving notifications:", err);
      setErrorMessage("Failed to save notification preferences.");
    } finally {
      setSaving(false);
    }
  };

  // Employee Management Helpers
  const handleOpenAddEmployee = () => {
    setEditingEmployee(null);
    setFormName("");
    setFormTitle("Senior Aesthetic Practitioner");
    setFormRole("practitioner");
    setFormEmail("");
    setFormPhone("");
    setFormBio("");
    setFormIsActive(true);
    setFormAllTreatments(true);
    setFormAssignedTreatments([]);
    setIsEmployeeModalOpen(true);
  };

  const handleOpenEditEmployee = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormName(emp.name || "");
    setFormTitle(emp.title || "Aesthetic Practitioner");
    setFormRole(emp.role || "practitioner");
    setFormEmail(emp.email || "");
    setFormPhone(emp.phone || "");
    setFormBio(emp.bio || "");
    setFormIsActive(emp.isActive ?? true);
    setFormAllTreatments(emp.allTreatments ?? true);
    setFormAssignedTreatments(emp.assignedTreatments || []);
    setIsEmployeeModalOpen(true);
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinicId || !formName.trim()) return;

    setSavingEmployee(true);
    try {
      const doctorId = editingEmployee ? editingEmployee.doctorId || editingEmployee.id : `doc_${Date.now()}`;
      const docRef = doc(db, "clinics", clinicId, "doctors", doctorId);

      await setDoc(
        docRef,
        {
          doctorId,
          name: formName.trim(),
          title: formTitle.trim() || "Staff Member",
          role: formRole,
          email: formEmail.trim(),
          phone: formPhone.trim(),
          bio: formBio.trim(),
          isActive: formIsActive,
          allTreatments: formAllTreatments,
          assignedTreatments: formAllTreatments ? ["all"] : formAssignedTreatments,
          updatedAt: serverTimestamp(),
          ...(editingEmployee ? {} : { createdAt: serverTimestamp() }),
        },
        { merge: true }
      );

      setIsEmployeeModalOpen(false);
      setEditingEmployee(null);
      setSaveSuccess(editingEmployee ? "Employee updated successfully." : "New employee added successfully.");
      setTimeout(() => setSaveSuccess(""), 4000);
    } catch (err) {
      console.error("Error saving employee:", err);
      alert("Failed to save employee.");
    } finally {
      setSavingEmployee(false);
    }
  };

  const handleToggleEmployeeActive = async (emp: Employee) => {
    if (!clinicId) return;
    try {
      const docRef = doc(db, "clinics", clinicId, "doctors", emp.id);
      await updateDoc(docRef, {
        isActive: !emp.isActive,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Error toggling employee status:", err);
    }
  };

  const handleConfirmDeleteEmployee = async () => {
    if (!clinicId || !deletingEmployee) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "clinics", clinicId, "doctors", deletingEmployee.id));
      setIsDeleteModalOpen(false);
      setDeletingEmployee(null);
      setSaveSuccess("Employee removed.");
      setTimeout(() => setSaveSuccess(""), 4000);
    } catch (err) {
      console.error("Error deleting employee:", err);
      alert("Failed to delete employee.");
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleTreatmentAssignment = (treatmentId: string) => {
    setFormAssignedTreatments((prev) =>
      prev.includes(treatmentId) ? prev.filter((id) => id !== treatmentId) : [...prev, treatmentId]
    );
  };

  const handleSendPasswordReset = async () => {
    if (!user?.email) return;
    setSendingReset(true);
    setResetMessage("");
    try {
      await sendPasswordResetEmail(auth, user.email);
      setResetMessage(`Reset link sent to ${user.email}.`);
    } catch (err: any) {
      console.error("Password reset error:", err);
      setResetMessage("Could not send reset email. Try again later.");
    } finally {
      setSendingReset(false);
    }
  };

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch =
        emp.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
        emp.email.toLowerCase().includes(employeeSearch.toLowerCase()) ||
        emp.title.toLowerCase().includes(employeeSearch.toLowerCase());

      if (!matchesSearch) return false;

      if (employeeFilter === "active") return emp.isActive;
      if (employeeFilter === "inactive") return !emp.isActive;
      if (employeeFilter === "practitioners") {
        return (
          emp.role === "practitioner" ||
          emp.title.toLowerCase().includes("practitioner") ||
          emp.title.toLowerCase().includes("doctor")
        );
      }
      return true;
    });
  }, [employees, employeeSearch, employeeFilter]);

  const activeEmployeeCount = useMemo(() => employees.filter((e) => e.isActive).length, [employees]);
  const practitionerCount = useMemo(
    () =>
      employees.filter(
        (e) =>
          e.role === "practitioner" ||
          e.title.toLowerCase().includes("practitioner") ||
          e.title.toLowerCase().includes("doctor")
      ).length,
    [employees]
  );

  if (loading) {
    return <AdminSplashScreen fullScreen={false} label="Loading Settings..." />;
  }

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: "general", label: "General", icon: <Sliders className="w-3.5 h-3.5" /> },
    { id: "clinic", label: "Clinic Profile", icon: <Building2 className="w-3.5 h-3.5" /> },
    { id: "employees", label: "Employees", icon: <Users className="w-3.5 h-3.5" />, badge: String(employees.length) },
    { id: "notifications", label: "Notifications", icon: <Bell className="w-3.5 h-3.5" /> },
    { id: "security", label: "Security", icon: <ShieldCheck className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-12">
      {/* Toast Messages */}
      <AnimatePresence>
        {saveSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="p-3 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-between shadow-2xs"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-xs font-semibold">{saveSuccess}</span>
            </div>
            <button
              onClick={() => setSaveSuccess("")}
              className="p-1 text-emerald-600 hover:text-emerald-900 rounded-lg transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}

        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="p-3 rounded-2xl bg-rose-50 text-rose-800 flex items-center justify-between shadow-2xs"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="text-xs font-semibold">{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage("")}
              className="p-1 text-rose-600 hover:text-rose-900 rounded-lg transition"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Segmented Navbar (Less Rounded, Consistent Gaps, Matching Theme Switcher) */}
      <div className="flex justify-center w-full">
        <div className="inline-flex items-center gap-1 p-1 bg-[#edf0f4] rounded-2xl shadow-xs">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs transition-all cursor-pointer whitespace-nowrap select-none ${
                  isActive
                    ? "bg-white text-neutral-900 font-bold shadow-xs"
                    : "text-neutral-600 hover:text-neutral-950 font-semibold"
                }`}
              >
                <span className={isActive ? "text-neutral-900" : "text-neutral-500"}>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive ? "bg-neutral-100 text-neutral-800" : "bg-white/80 text-neutral-700"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* 1. GENERAL TAB (Card-in-Card, Consistent Small Gaps)       */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === "general" && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16 }}
          className="bg-white rounded-3xl p-4 space-y-4 shadow-xs"
        >
          <div>
            <h3 className="text-base font-bold text-neutral-900 tracking-tight">
              General Preferences
            </h3>
            <p className="text-xs text-neutral-400 font-medium">
              Workspace appearance, language, currency, and date formatting.
            </p>
          </div>

          {/* Inner Card 1: Theme Selector (Less rounded, consistent gaps) */}
          <div className="bg-[#f8f9fb] rounded-2xl p-4 space-y-2">
            <label className="text-xs font-bold text-neutral-700 block">
              Workspace Theme
            </label>
            <div className="inline-grid grid-cols-3 gap-1 p-1 bg-[#edf0f4] rounded-xl w-full max-w-sm">
              {[
                { id: "light" as const, label: "Light", icon: <Sun className="w-3.5 h-3.5 text-amber-500" /> },
                { id: "dark" as const, label: "Dark", icon: <Moon className="w-3.5 h-3.5 text-indigo-400" /> },
                { id: "system" as const, label: "System", icon: <Monitor className="w-3.5 h-3.5 text-neutral-500" /> },
              ].map((opt) => {
                const isSelected = theme === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => applyTheme(opt.id)}
                    className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs transition-all cursor-pointer select-none ${
                      isSelected
                        ? "bg-white text-neutral-900 font-bold shadow-xs"
                        : "text-neutral-600 hover:text-neutral-950 font-semibold"
                    }`}
                  >
                    {opt.icon}
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Inner Card 2: Language, Currency, Timezone (Consistent 3-Column Gap) */}
          <div className="bg-[#f8f9fb] rounded-2xl p-4 space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Language */}
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1.5 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-neutral-400" />
                  Language
                </label>
                <select
                  value={language}
                  onChange={(e) => applyLanguage(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white text-xs sm:text-sm font-medium text-neutral-800 shadow-2xs focus:outline-none cursor-pointer border-none"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code}>
                      {lang.flag} {lang.name} ({lang.nativeName})
                    </option>
                  ))}
                </select>
              </div>

              {/* Currency */}
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1.5 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-neutral-400" />
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white text-xs sm:text-sm font-medium text-neutral-800 shadow-2xs focus:outline-none cursor-pointer border-none"
                >
                  {CURRENCIES.map((curr) => (
                    <option key={curr.code} value={curr.code}>
                      {curr.code} ({curr.symbol}) — {curr.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Timezone */}
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-neutral-400" />
                  Timezone
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white text-xs sm:text-sm font-medium text-neutral-800 shadow-2xs focus:outline-none cursor-pointer border-none"
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Inner Card 3: Formats (Consistent 2-Column Gap) */}
          <div className="bg-[#f8f9fb] rounded-2xl p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                  Date Format
                </label>
                <div className="inline-flex p-1 bg-[#edf0f4] rounded-xl gap-1">
                  {(["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"] as const).map((fmt) => {
                    const isSelected = dateFormat === fmt;
                    return (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => setDateFormat(fmt)}
                        className={`px-3 py-1.5 rounded-lg text-xs transition cursor-pointer select-none ${
                          isSelected
                            ? "bg-white text-neutral-900 font-bold shadow-xs"
                            : "text-neutral-600 hover:text-neutral-950 font-semibold"
                        }`}
                      >
                        {fmt}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-neutral-700 block mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-neutral-400" />
                  Time Clock Format
                </label>
                <div className="inline-flex p-1 bg-[#edf0f4] rounded-xl gap-1">
                  {(["24h", "12h"] as const).map((fmt) => {
                    const isSelected = timeFormat === fmt;
                    return (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => setTimeFormat(fmt)}
                        className={`px-3 py-1.5 rounded-lg text-xs transition cursor-pointer select-none ${
                          isSelected
                            ? "bg-white text-neutral-900 font-bold shadow-xs"
                            : "text-neutral-600 hover:text-neutral-950 font-semibold"
                        }`}
                      >
                        {fmt === "24h" ? "24-Hour (14:30)" : "12-Hour (2:30 PM)"}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSaveGeneral}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold shadow-xs transition cursor-pointer active:scale-[0.98]"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? "Saving..." : "Save Preferences"}
            </button>
          </div>
        </motion.div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* 2. CLINIC PROFILE TAB (Card-in-Card, Consistent Small Gaps) */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === "clinic" && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16 }}
        >
          <form onSubmit={handleSaveClinicDetails} className="bg-white rounded-3xl p-4 space-y-4 shadow-xs">
            <div>
              <h3 className="text-base font-bold text-neutral-900 tracking-tight">
                Clinic Profile
              </h3>
              <p className="text-xs text-neutral-400 font-medium">
                Practice branding, contact lines, and location address.
              </p>
            </div>

            {/* Inner Card 1: Primary Identity */}
            <div className="bg-[#f8f9fb] rounded-2xl p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-neutral-700 block mb-1">
                    Clinic Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={merchantName}
                    onChange={(e) => setMerchantName(e.target.value)}
                    placeholder="e.g. Mayfair Aesthetic Clinic"
                    className="w-full px-3 py-2 rounded-xl bg-white text-xs sm:text-sm font-semibold text-neutral-900 shadow-2xs focus:outline-none border-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">
                    Official Website URL
                  </label>
                  <input
                    type="url"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://aurwellclinic.com"
                    className="w-full px-3 py-2 rounded-xl bg-white text-xs sm:text-sm text-neutral-800 shadow-2xs focus:outline-none border-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">
                    Country
                  </label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white text-xs sm:text-sm font-medium text-neutral-800 shadow-2xs focus:outline-none border-none cursor-pointer"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-neutral-700 block mb-1">
                    Short Bio
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Premier aesthetic and wellness clinic providing restorative treatments."
                    className="w-full px-3 py-2 rounded-xl bg-white text-xs sm:text-sm text-neutral-800 shadow-2xs focus:outline-none border-none resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Inner Card 2: Contact Details */}
            <div className="bg-[#f8f9fb] rounded-2xl p-4 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                Direct Contact Channels
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@clinic.com"
                    className="w-full px-3 py-2 rounded-xl bg-white text-xs sm:text-sm text-neutral-800 shadow-2xs focus:outline-none border-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+44 20 7946 0813"
                    className="w-full px-3 py-2 rounded-xl bg-white text-xs sm:text-sm text-neutral-800 shadow-2xs focus:outline-none border-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">
                    WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="+44 7123 456789"
                    className="w-full px-3 py-2 rounded-xl bg-white text-xs sm:text-sm text-neutral-800 shadow-2xs focus:outline-none border-none"
                  />
                </div>
              </div>
            </div>

            {/* Inner Card 3: Location */}
            <div className="bg-[#f8f9fb] rounded-2xl p-4 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                Physical Location
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-neutral-700 block mb-1">
                    Street Address
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="14 Harley Street, Marylebone"
                    className="w-full px-3 py-2 rounded-xl bg-white text-xs sm:text-sm text-neutral-800 shadow-2xs focus:outline-none border-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-neutral-700 block mb-1">
                    Postal / ZIP Code
                  </label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="W1G 9PQ"
                    className="w-full px-3 py-2 rounded-xl bg-white text-xs sm:text-sm text-neutral-800 shadow-2xs focus:outline-none border-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold shadow-xs transition cursor-pointer active:scale-[0.98]"
              >
                <Save className="w-3.5 h-3.5" />
                {saving ? "Saving..." : "Update Clinic Profile"}
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* 3. EMPLOYEES TAB (Card-in-Card, Consistent Small Gaps)     */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === "employees" && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16 }}
          className="bg-white rounded-3xl p-4 space-y-4 shadow-xs"
        >
          {/* Header & Add Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-neutral-900 tracking-tight">
                Employees & Staff
              </h3>
              <p className="text-xs text-neutral-400 font-medium">
                Manage clinic doctors, aesthetic practitioners, and support team.
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenAddEmployee}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold shadow-xs transition cursor-pointer active:scale-[0.98] self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Employee
            </button>
          </div>

          {/* Inner Card 1: Metrics Strip (Consistent 3-Column Gap) */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#f8f9fb] rounded-2xl p-3 sm:p-3.5 text-center sm:text-left">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-0.5">
                Total Team
              </span>
              <div className="text-lg font-black text-neutral-900">{employees.length}</div>
            </div>
            <div className="bg-[#f8f9fb] rounded-2xl p-3 sm:p-3.5 text-center sm:text-left">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block mb-0.5">
                Active Staff
              </span>
              <div className="text-lg font-black text-emerald-700">{activeEmployeeCount}</div>
            </div>
            <div className="bg-[#f8f9fb] rounded-2xl p-3 sm:p-3.5 text-center sm:text-left">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-0.5">
                Practitioners
              </span>
              <div className="text-lg font-black text-neutral-900">{practitionerCount}</div>
            </div>
          </div>

          {/* Inner Card 2: Filter & Search Bar */}
          <div className="bg-[#f8f9fb] rounded-2xl p-2.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            <div className="relative flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search staff..."
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white text-xs font-medium text-neutral-800 shadow-2xs focus:outline-none border-none"
              />
            </div>

            <div className="inline-flex p-1 bg-[#edf0f4] rounded-xl gap-1 overflow-x-auto">
              {[
                { id: "all", label: "All" },
                { id: "active", label: "Active" },
                { id: "practitioners", label: "Practitioners" },
                { id: "inactive", label: "Inactive" },
              ].map((f) => {
                const isSelected = employeeFilter === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setEmployeeFilter(f.id as any)}
                    className={`px-3 py-1 rounded-lg text-xs transition cursor-pointer select-none ${
                      isSelected
                        ? "bg-white text-neutral-900 font-bold shadow-xs"
                        : "text-neutral-600 hover:text-neutral-950 font-semibold"
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Inner Card 3: Employees List */}
          <div className="bg-[#f8f9fb] rounded-2xl p-2.5 space-y-2">
            {filteredEmployees.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-xl shadow-2xs">
                <Users className="w-7 h-7 text-neutral-300 mx-auto mb-1.5" />
                <p className="text-xs font-bold text-neutral-700">No staff members found</p>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  {employeeSearch ? "Try different keywords" : "Add an employee using the button above"}
                </p>
              </div>
            ) : (
              filteredEmployees.map((emp) => (
                <div
                  key={emp.id}
                  className="bg-white rounded-xl p-3 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 hover:bg-neutral-50/50 transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[#f0f2f5] text-neutral-800 font-bold text-xs flex items-center justify-center shrink-0">
                      {emp.name ? emp.name.charAt(0).toUpperCase() : "E"}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-neutral-900 truncate">
                          {emp.name}
                        </span>
                        <span className="px-2 py-0.5 text-[9px] font-semibold rounded-full bg-[#f0f2f5] text-neutral-700">
                          {emp.title || "Staff"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-neutral-400 mt-0.5">
                        {emp.email && <span className="truncate max-w-[160px] sm:max-w-[200px]">{emp.email}</span>}
                        {emp.phone && <span>{emp.phone}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2.5 self-end sm:self-center shrink-0">
                    {/* Active toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleEmployeeActive(emp)}
                      className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border-none transition-colors duration-200 ease-in-out ${
                        emp.isActive ? "bg-neutral-900" : "bg-neutral-200"
                      }`}
                      title={emp.isActive ? "Active (Click to deactivate)" : "Inactive (Click to activate)"}
                    >
                      <span
                        className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out my-0.5 ${
                          emp.isActive ? "translate-x-4" : "translate-x-0.5"
                        }`}
                      />
                    </button>

                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEditEmployee(emp)}
                        className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-[#edf0f4] transition"
                        title="Edit employee"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setDeletingEmployee(emp);
                          setIsDeleteModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg text-neutral-300 hover:text-rose-600 hover:bg-rose-50 transition"
                        title="Delete employee"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* 4. NOTIFICATIONS TAB (Card-in-Card, Consistent Small Gaps) */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === "notifications" && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16 }}
          className="bg-white rounded-3xl p-4 space-y-4 shadow-xs"
        >
          <div>
            <h3 className="text-base font-bold text-neutral-900 tracking-tight">
              Notification Preferences
            </h3>
            <p className="text-xs text-neutral-400 font-medium">
              Automated booking alerts and clinic appointment reminders.
            </p>
          </div>

          <div className="bg-[#f8f9fb] rounded-2xl p-4 divide-y divide-neutral-200/40">
            {/* Email alerts */}
            <div className="py-3 first:pt-0 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-neutral-900 shrink-0" />
                <div>
                  <div className="text-xs sm:text-sm font-bold text-neutral-900">
                    Email Booking Alerts
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Receive email notifications for scheduled or cancelled treatments.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEmailBookings(!emailBookings)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-none transition-colors duration-200 ease-in-out ${
                  emailBookings ? "bg-neutral-900" : "bg-neutral-200"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out my-0.5 ${
                    emailBookings ? "translate-x-4.5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            {/* WhatsApp */}
            <div className="py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-neutral-900 shrink-0" />
                <div>
                  <div className="text-xs sm:text-sm font-bold text-neutral-900">
                    WhatsApp Patient Confirmations
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Send automated WhatsApp booking reminders to patients.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWhatsappAlerts(!whatsappAlerts)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-none transition-colors duration-200 ease-in-out ${
                  whatsappAlerts ? "bg-neutral-900" : "bg-neutral-200"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out my-0.5 ${
                    whatsappAlerts ? "translate-x-4.5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            {/* Daily Digest */}
            <div className="py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-neutral-900 shrink-0" />
                <div>
                  <div className="text-xs sm:text-sm font-bold text-neutral-900">
                    Morning Schedule Digest
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Receive daily morning timetable overview at 08:00 AM.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDailyDigest(!dailyDigest)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-none transition-colors duration-200 ease-in-out ${
                  dailyDigest ? "bg-neutral-900" : "bg-neutral-200"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out my-0.5 ${
                    dailyDigest ? "translate-x-4.5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            {/* Sound */}
            <div className="py-3 last:pb-0 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Volume2 className="w-4 h-4 text-neutral-900 shrink-0" />
                <div>
                  <div className="text-xs sm:text-sm font-bold text-neutral-900">
                    Booking Notification Chime
                  </div>
                  <p className="text-[11px] text-neutral-400 mt-0.5">
                    Play a discreet audio tone on new calendar bookings.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSoundAlerts(!soundAlerts)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-none transition-colors duration-200 ease-in-out ${
                  soundAlerts ? "bg-neutral-900" : "bg-neutral-200"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out my-0.5 ${
                    soundAlerts ? "translate-x-4.5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSaveNotifications}
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold shadow-xs transition cursor-pointer active:scale-[0.98]"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? "Saving..." : "Save Preferences"}
            </button>
          </div>
        </motion.div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* 5. SECURITY TAB (Card-in-Card, Consistent Small Gaps)      */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === "security" && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16 }}
          className="bg-white rounded-3xl p-4 space-y-4 shadow-xs"
        >
          <div>
            <h3 className="text-base font-bold text-neutral-900 tracking-tight">
              Security & Credentials
            </h3>
            <p className="text-xs text-neutral-400 font-medium">
              Active admin account and credential controls.
            </p>
          </div>

          {/* Inner Card 1: Session metadata */}
          <div className="bg-[#f8f9fb] rounded-2xl p-4 space-y-2">
            <div className="bg-white rounded-xl p-3 shadow-2xs flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-500">Administrator</span>
              <span className="text-xs font-bold text-neutral-900">{user?.email}</span>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-2xs flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-500">Access Role</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#f0f2f5] text-neutral-800">
                Clinic Administrator
              </span>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-2xs flex items-center justify-between">
              <span className="text-xs font-semibold text-neutral-500">Tenant ID</span>
              <span className="text-xs font-mono text-neutral-600">{clinicId || "clinic_active"}</span>
            </div>
          </div>

          {/* Inner Card 2: Password Reset */}
          <div className="bg-[#f8f9fb] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs sm:text-sm font-bold text-neutral-900">
                Reset Account Password
              </div>
              <p className="text-[11px] text-neutral-400 mt-0.5">
                Send an encrypted password reset link to your email.
              </p>
              {resetMessage && (
                <p className="text-xs font-semibold text-emerald-700 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {resetMessage}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={handleSendPasswordReset}
              disabled={sendingReset}
              className="px-5 py-2.5 rounded-full bg-white text-neutral-800 hover:bg-neutral-100 text-xs font-semibold shadow-2xs transition cursor-pointer shrink-0 self-start sm:self-auto border-none active:scale-[0.98]"
            >
              <Lock className="w-3.5 h-3.5 inline mr-1 text-neutral-500" />
              {sendingReset ? "Sending..." : "Send Reset Link"}
            </button>
          </div>
        </motion.div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* ADD / EDIT EMPLOYEE MODAL (Flat & Stroke-free)             */}
      {/* ────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={isEmployeeModalOpen}
        onClose={() => setIsEmployeeModalOpen(false)}
        title={editingEmployee ? "Edit Employee" : "Add Employee"}
        subtitle="Staff & Practitioner Management"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSaveEmployee} className="space-y-3">
          <div>
            <label className="text-xs font-bold text-neutral-700 block mb-1">
              Full Legal Name *
            </label>
            <input
              type="text"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. Dr. Sarah Jenkins"
              className="w-full px-3 py-2 rounded-xl bg-[#f8f9fb] text-xs sm:text-sm font-semibold text-neutral-900 shadow-2xs focus:outline-none border-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="text-xs font-bold text-neutral-700 block mb-1">
                Category
              </label>
              <select
                value={formRole}
                onChange={(e) => setFormRole(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#f8f9fb] text-xs font-semibold text-neutral-800 shadow-2xs focus:outline-none border-none cursor-pointer"
              >
                <option value="practitioner">Aesthetic Practitioner / Doctor</option>
                <option value="manager">Clinic Manager</option>
                <option value="receptionist">Front Desk</option>
                <option value="nurse">Nurse / Assistant</option>
                <option value="staff">Support Staff</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-700 block mb-1">
                Professional Title
              </label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Senior Aesthetic Practitioner"
                className="w-full px-3 py-2 rounded-xl bg-[#f8f9fb] text-xs text-neutral-800 shadow-2xs focus:outline-none border-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="text-xs font-bold text-neutral-700 block mb-1">
                Work Email
              </label>
              <input
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="sarah@clinic.com"
                className="w-full px-3 py-2 rounded-xl bg-[#f8f9fb] text-xs text-neutral-800 shadow-2xs focus:outline-none border-none"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-700 block mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="+44 7911 123456"
                className="w-full px-3 py-2 rounded-xl bg-[#f8f9fb] text-xs text-neutral-800 shadow-2xs focus:outline-none border-none"
              />
            </div>
          </div>

          {/* Qualified Treatments (if practitioner) */}
          {formRole === "practitioner" && (
            <div className="p-3 rounded-2xl bg-[#f8f9fb] space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-neutral-900 block">Qualified for All Services</span>
                  <span className="text-[10px] text-neutral-400">
                    Appears available for all clinic treatments
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setFormAllTreatments(!formAllTreatments)}
                  className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border-none transition-colors duration-200 ease-in-out ${
                    formAllTreatments ? "bg-neutral-900" : "bg-neutral-200"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out my-0.5 ${
                      formAllTreatments ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              {!formAllTreatments && treatments.length > 0 && (
                <div className="pt-2 border-t border-neutral-200/40 space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {treatments.map((t) => {
                      const isSelected = formAssignedTreatments.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => toggleTreatmentAssignment(t.id)}
                          className={`flex items-center gap-1.5 p-2 rounded-xl text-left text-xs transition cursor-pointer select-none ${
                            isSelected
                              ? "bg-white text-neutral-900 font-semibold shadow-xs"
                              : "bg-[#f0f2f5] text-neutral-600 hover:bg-white"
                          }`}
                        >
                          <div
                            className={`w-3.5 h-3.5 rounded-sm flex items-center justify-center shrink-0 ${
                              isSelected ? "bg-neutral-900 text-white" : "bg-neutral-200"
                            }`}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                          </div>
                          <span className="truncate">{t.title}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Active Status */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-[#f8f9fb]">
            <div>
              <span className="text-xs font-bold text-neutral-900 block">Active Status</span>
              <span className="text-[10px] text-neutral-400">
                Staff member is active and available for bookings
              </span>
            </div>
            <button
              type="button"
              onClick={() => setFormIsActive(!formIsActive)}
              className={`relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer rounded-full border-none transition-colors duration-200 ease-in-out ${
                formIsActive ? "bg-neutral-900" : "bg-neutral-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out my-0.5 ${
                  formIsActive ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsEmployeeModalOpen(false)}
              className="px-5 py-2 rounded-full text-xs font-semibold text-neutral-600 hover:bg-neutral-100 transition cursor-pointer border-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingEmployee}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold shadow-xs transition cursor-pointer active:scale-[0.98]"
            >
              {savingEmployee ? "Saving..." : editingEmployee ? "Update Employee" : "Save Employee"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDeleteEmployee}
        isDeleting={isDeleting}
        title="Remove Employee"
        description={`Remove ${deletingEmployee?.name}? They will no longer be listed on clinic schedules.`}
        itemName={deletingEmployee?.name}
      />
    </div>
  );
}
