"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, SlidersHorizontal } from "lucide-react";

export const PRESET_ACCENT_COLORS = [
  { hex: "#3B1B36", name: "Deep Plum" },
  { hex: "#2F3F20", name: "Forest Olive" },
  { hex: "#84441E", name: "Warm Chestnut" },
  { hex: "#9B71B1", name: "Soft Lavender" },
  { hex: "#D39757", name: "Warm Amber" },
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
    : "#9B71B1";

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

      {/* Pill-shaped Trigger Button - Symmetrical, balanced padding & spacing */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-[42px] p-1.5 pl-2 pr-5 bg-neutral-50/85 hover:bg-white rounded-full border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all flex items-center justify-between text-sm cursor-pointer group"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Symmetrical Pill Swatch */}
          <div
            className="w-14 h-7 rounded-full shadow-2xs border border-black/10 shrink-0 transition-transform group-hover:scale-95"
            style={{ backgroundColor: currentColor }}
          />
          <span className="font-mono text-sm font-bold text-neutral-900 shrink-0">
            {currentColor}
          </span>
          <span className="text-sm text-neutral-500 font-normal truncate">
            ({presetMatch ? presetMatch.name : "Custom"})
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-neutral-900 shrink-0 ml-2 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu Popover */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-full z-50 bg-white rounded-2xl border border-neutral-200/90 p-2 shadow-xl animate-fadeIn space-y-1">
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
                className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? "bg-neutral-100 text-neutral-900 font-bold"
                    : "hover:bg-neutral-50 text-neutral-700"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-10 h-5 rounded-full shadow-2xs border border-black/10 shrink-0"
                    style={{ backgroundColor: preset.hex }}
                  />
                  <span className="font-mono text-xs font-bold">{preset.hex}</span>
                  <span className="text-xs text-neutral-500 font-normal truncate">
                    {preset.name}
                  </span>
                </div>
                {isSelected && <Check className="w-4 h-4 text-neutral-900 stroke-[2.5] shrink-0" />}
              </button>
            );
          })}

          {/* Custom Option */}
          <button
            type="button"
            onClick={() => {
              setIsCustomMode(true);
            }}
            className={`flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              !isPreset || isCustomMode
                ? "bg-neutral-100 text-neutral-900 font-bold"
                : "hover:bg-neutral-50 text-neutral-700"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-5 rounded-full bg-gradient-to-tr from-rose-500 via-indigo-500 to-amber-400 shadow-2xs shrink-0 flex items-center justify-center">
                <SlidersHorizontal className="w-2.5 h-2.5 text-white" />
              </div>
              <span>Custom...</span>
            </div>
            {(!isPreset || isCustomMode) && <Check className="w-4 h-4 text-neutral-900 stroke-[2.5] shrink-0" />}
          </button>

          {/* Custom Color Picker Input Field */}
          {(!isPreset || isCustomMode) && (
            <div className="pt-2 mt-1 border-t border-neutral-100 px-2 pb-1 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={currentColor}
                  onChange={(e) => onChange(e.target.value.toUpperCase())}
                  className="h-8 w-9 rounded-lg border border-neutral-200 cursor-pointer p-0.5 bg-white shrink-0"
                />
                <input
                  type="text"
                  value={currentColor}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder="#000000"
                  className="w-full px-3 py-1.5 text-xs font-mono font-semibold rounded-full border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 bg-neutral-50/50"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
