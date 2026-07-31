"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string; // Default: "max-w-6xl"
}

export default function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = "max-w-6xl",
}: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when modal is open to prevent background scrolling
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!mounted) return null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen z-[9999] flex items-center justify-center p-4 sm:p-6 md:p-8 bg-black/65 backdrop-blur-sm overflow-hidden">
          {/* Backdrop Click */}
          <div
            className="absolute inset-0 cursor-pointer"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`relative z-10 w-[94vw] ${maxWidth} max-h-[88vh] sm:max-h-[90vh] bg-white rounded-3xl border border-neutral-100 shadow-2xl flex flex-col overflow-hidden my-auto`}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 sm:px-8 py-4 sm:py-5 border-b border-neutral-100 bg-white shrink-0">
              <div>
                {subtitle && (
                  <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 block mb-0.5">
                    {subtitle}
                  </span>
                )}
                <h3 className="text-lg sm:text-xl font-extrabold text-neutral-900 tracking-tight">
                  {title}
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition cursor-pointer"
              >
                <X className="w-5 h-5 text-neutral-500" />
              </button>
            </div>

            {/* Modal Body Container with Inset Visible Scrollbar */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-neutral-50 [&::-webkit-scrollbar-thumb]:bg-neutral-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-neutral-400">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
