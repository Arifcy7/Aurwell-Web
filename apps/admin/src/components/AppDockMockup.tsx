"use client";

import { useRef } from "react";
import mockupImg from "@/assets/mockup.png";

interface AppDockMockupProps {
  file: File | null;
  onChange: (file: File | null) => void;
  imageUrl?: string;
  onClearImage?: () => void;
  label?: string;
}

export default function AppDockMockup({
  file,
  onChange,
  imageUrl = "",
  onClearImage,
  label = "Clinic App Logo",
}: AppDockMockupProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate instant local blob URL for file preview if file selected
  const currentPreview = file
    ? URL.createObjectURL(file)
    : imageUrl || null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onChange(e.target.files[0]);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    if (onClearImage) onClearImage();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-neutral-700">
          {label}
        </label>
        {currentPreview && (
          <button
            type="button"
            onClick={handleRemove}
            className="text-[11px] font-semibold text-red-600 hover:text-red-800 transition-colors cursor-pointer"
          >
            Remove Logo
          </button>
        )}
      </div>

      {/* Interactive Phone Dock Mockup Container as the Logo Uploader */}
      <div className="relative w-full aspect-[3/2] overflow-hidden rounded-2xl border border-neutral-200/80 bg-neutral-50 shadow-xs group">
        {/* Base Mockup Image */}
        <img
          src={mockupImg.src}
          alt="App Dock Mockup"
          className="w-full h-full object-cover block select-none pointer-events-none"
        />

        {/* Overlaid App Icon - Positioned exactly over dock icon with clean edges */}
        <div
          onClick={handleButtonClick}
          className="absolute rounded-[22%] overflow-hidden bg-white flex items-center justify-center border-0 cursor-pointer group/icon shadow-2xs"
          style={{
            left: "16.85%",
            top: "49.50%",
            width: "12.55%",
            height: "18.55%",
          }}
        >
          {currentPreview ? (
            <img
              src={currentPreview}
              alt="Clinic App Logo"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="relative w-full h-full bg-gradient-to-tr from-neutral-950 via-neutral-800 to-neutral-700 flex items-center justify-center">
              <span className="text-white font-black text-xs sm:text-sm">
                +
              </span>
            </div>
          )}

          {/* Hover Overlay on Dock Icon to Upload/Change */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/icon:opacity-100 flex items-center justify-center transition-opacity text-[10px] text-white font-bold text-center px-1">
            {currentPreview ? "Change" : "Upload"}
          </div>
        </div>

        {/* Corner Action Button */}
        <div className="absolute top-3 right-3">
          <button
            type="button"
            onClick={handleButtonClick}
            className="px-3.5 py-1.5 bg-neutral-900/85 hover:bg-neutral-900 text-white text-xs font-semibold rounded-full backdrop-blur-md shadow-xs transition-all cursor-pointer"
          >
            {currentPreview ? "Change Logo" : "Upload App Logo"}
          </button>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
}
