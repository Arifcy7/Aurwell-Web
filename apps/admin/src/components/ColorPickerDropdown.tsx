"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, SlidersHorizontal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const PRESET_ACCENT_COLORS = [
  { hex: "#0F0F11", name: "Onyx Black" },
  { hex: "#2563EB", name: "Royal Sapphire" },
  { hex: "#10B981", name: "Vibrant Emerald" },
  { hex: "#8B5CF6", name: "Modern Iris" },
  { hex: "#F59E0B", name: "Warm Amber" },
];

interface ColorPickerDropdownProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
}

export default function ColorPickerDropdown({
  value,
  onChange,
  label = "Brand Accent Color",
}: ColorPickerDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Normalize color hex string
  const currentColor = value
    ? value.startsWith("#")
      ? value.toUpperCase()
      : `#${value.toUpperCase()}`
    : "#0F0F11";

  // Find if current color matches a preset
  const presetMatch = PRESET_ACCENT_COLORS.find(
    (preset) => preset.hex.toUpperCase() === currentColor
  );
  const isPreset = !!presetMatch;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {label && (
        <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-10 px-3 bg-neutral-100 hover:bg-neutral-200/80 rounded-2xl border border-neutral-200/70 focus:outline-none focus:ring-2 focus:ring-neutral-900 transition-all flex items-center justify-between text-xs cursor-pointer group active:scale-[0.99]"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Swatch */}
          <div
            className="w-5 h-5 rounded-full shrink-0 shadow-xs ring-1 ring-black/10"
            style={{ backgroundColor: currentColor }}
          />
          <span className="font-mono text-xs font-semibold text-neutral-900 shrink-0">
            {currentColor}
          </span>
          <span className="text-xs text-neutral-500 font-normal truncate">
            ({presetMatch ? presetMatch.name : "Custom"})
          </span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-neutral-600 shrink-0 ml-2 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="absolute left-0 top-full mt-1.5 w-full z-50 rounded-2xl bg-white p-2 shadow-xl border border-neutral-200/80 space-y-1"
          >
            {/* Preset Options */}
            {PRESET_ACCENT_COLORS.map((preset) => {
              const isSelected = preset.hex.toUpperCase() === currentColor && !isCustomMode;
              return (
                <button
                  key={preset.hex}
                  type="button"
                  onClick={() => {
                    onChange(preset.hex);
                    setIsCustomMode(false);
                    setIsOpen(false);
                  }}
                  className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    isSelected
                      ? "bg-neutral-100 text-neutral-900 font-semibold"
                      : "hover:bg-neutral-50 text-neutral-700"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-4 h-4 rounded-full shrink-0 ring-1 ring-black/10"
                      style={{ backgroundColor: preset.hex }}
                    />
                    <span className="font-mono text-xs font-semibold">{preset.hex}</span>
                    <span className="text-xs text-neutral-500 font-normal truncate">
                      {preset.name}
                    </span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-neutral-900 stroke-[2.5] shrink-0" />}
                </button>
              );
            })}

            {/* Custom Option */}
            <button
              type="button"
              onClick={() => {
                setIsCustomMode(true);
              }}
              className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                !isPreset || isCustomMode
                  ? "bg-neutral-100 text-neutral-900 font-semibold"
                  : "hover:bg-neutral-50 text-neutral-700"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-rose-500 via-indigo-500 to-amber-400 shrink-0 flex items-center justify-center">
                  <SlidersHorizontal className="w-2.5 h-2.5 text-white" />
                </div>
                <span>Custom...</span>
              </div>
              {(!isPreset || isCustomMode) && <Check className="w-3.5 h-3.5 text-neutral-900 stroke-[2.5] shrink-0" />}
            </button>

            {/* Custom Color Picker Input Field */}
            {(!isPreset || isCustomMode) && (
              <div className="pt-2 mt-1 border-t border-neutral-100 px-1 pb-1 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={currentColor}
                    onChange={(e) => onChange(e.target.value.toUpperCase())}
                    className="h-8 w-10 rounded-xl cursor-pointer p-0.5 bg-neutral-100 border border-neutral-200/80 shrink-0"
                  />
                  <input
                    type="text"
                    value={currentColor}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="#000000"
                    className="input-modern py-1.5 text-xs flex-1"
                  />
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
