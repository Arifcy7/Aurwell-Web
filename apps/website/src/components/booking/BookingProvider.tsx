"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import BookingModal from "./BookingModal";

const CALENDAR_BOOKING_URL =
  "https://calendar.google.com/calendar/appointments/schedules/AcZssZ3Qoyi_oPxXlvrt5ncSeEuuyv8nk2LsABMutyNDD0NnDyAST-iXGcLIggfxl6_iTPbA8nBJ5fyu?gv=true";

interface BookingContextType {
  isOpen: boolean;
  openBookingModal: () => void;
  closeBookingModal: () => void;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export function BookingProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  const openBookingModal = () => {
    if (typeof window !== "undefined") {
      const isMobile =
        window.innerWidth < 768 ||
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        );

      if (isMobile) {
        window.open(CALENDAR_BOOKING_URL, "_blank");
        return;
      }
    }
    setIsOpen(true);
  };

  const closeBookingModal = () => setIsOpen(false);

  return (
    <BookingContext.Provider value={{ isOpen, openBookingModal, closeBookingModal }}>
      {children}
      <BookingModal isOpen={isOpen} onClose={closeBookingModal} />
    </BookingContext.Provider>
  );
}

export function useBookingModal() {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error("useBookingModal must be used within a BookingProvider");
  }
  return context;
}
