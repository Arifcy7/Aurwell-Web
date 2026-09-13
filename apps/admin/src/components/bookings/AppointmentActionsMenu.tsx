"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  UserX,
  Calendar,
  Ban,
  MoreVertical,
  Loader2,
  FileText,
} from "lucide-react";
import { adminBookingService } from "@/lib/services/adminBookingService";

interface Props {
  clinicId: string;
  appointment: any;
  onRefresh?: () => void;
  onOpenRescheduleModal: (appointment: any) => void;
  onOpenCancelModal: (appointment: any) => void;
  onOpenCompleteModal: (appointment: any) => void;
}

export function AppointmentActionsMenu({
  clinicId,
  appointment,
  onRefresh,
  onOpenRescheduleModal,
  onOpenCancelModal,
  onOpenCompleteModal,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const currentStatus = appointment.status || "confirmed";

  const handleMarkNoShow = async () => {
    if (
      !confirm(
        `Are you sure you want to mark ${
          appointment.patient?.name || "this patient"
        } as No-Show? This will forfeit any deposit and send a rebooking email.`
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      await adminBookingService.updateAppointmentStatus({
        clinicId,
        appointmentId: appointment.id,
        status: "no_show",
      });
      setIsOpen(false);
      onRefresh?.();
    } catch (err: any) {
      alert(err.message || "Failed to update status.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className="p-1.5 hover:bg-neutral-100 rounded-xl text-neutral-600 transition cursor-pointer border border-neutral-200/80 bg-white shadow-2xs"
        title="Appointment Options"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-neutral-700" />
        ) : (
          <MoreVertical className="w-4 h-4" />
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop to close menu */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute right-0 mt-1.5 w-56 bg-white rounded-2xl shadow-xl border border-neutral-200/90 py-1.5 z-50 animate-in fade-in duration-100">
            {/* 1. Mark Completed */}
            {currentStatus === "confirmed" && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenCompleteModal(appointment);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition cursor-pointer text-left"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Mark as Completed
              </button>
            )}

            {/* 2. Mark No Show */}
            {currentStatus === "confirmed" && (
              <button
                type="button"
                onClick={handleMarkNoShow}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-amber-700 hover:bg-amber-50 transition cursor-pointer text-left"
              >
                <UserX className="w-4 h-4 text-amber-600" />
                Mark as No-Show
              </button>
            )}

            {/* 3. Reschedule */}
            {currentStatus !== "cancelled" && currentStatus !== "completed" && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenRescheduleModal(appointment);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-neutral-800 hover:bg-neutral-50 transition cursor-pointer text-left"
              >
                <Calendar className="w-4 h-4 text-neutral-700" />
                Reschedule Slot
              </button>
            )}

            {/* 4. Smart Cancel & Refund */}
            {currentStatus !== "cancelled" && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenCancelModal(appointment);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 transition border-t border-neutral-100 cursor-pointer text-left"
              >
                <Ban className="w-4 h-4 text-rose-600" />
                Cancel & Refund Policy
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
