"use client";

import { useRef } from "react";
import mockupImg from "@/assets/mockup.png";
import { UploadCloud } from "lucide-react";

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

  // Generate a local object URL for preview if a file is uploaded
  const previewUrl = file ? URL.createObjectURL(file) : null;
  const currentPreview = previewUrl || imageUrl;

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onChange(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-1.5 w-full">
      <div className="flex justify-between items-center">
        <label className="block text-xs font-semibold text-neutral-700">{label}</label>
        {currentPreview && onClearImage && (
          <button
            type="button"
            onClick={onClearImage}
            className="text-[11px] text-rose-500 hover:text-rose-700 font-medium focus:outline-none transition-colors"
          >
            Remove Logo
          </button>
        )}
      </div>

      {/* Mockup Frame with Interactive Dock Icon Position */}
      <div className="relative w-full rounded-2xl overflow-hidden bg-neutral-100 flex items-center justify-center p-2 group">
        {/* Mockup Base Background Image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={mockupImg.src}
          alt="App Home Mockup"
          className="w-full h-auto object-contain max-h-[300px] select-none pointer-events-none rounded-xl"
        />

        {/* Absolute Dock Icon Container - Positioned identically to the 1st app icon in dock */}
        <div
          onClick={handleButtonClick}
          className="absolute left-[31.5%] top-[77.4%] w-[8.2%] aspect-square rounded-[22%] bg-neutral-900 overflow-hidden shadow-xs border border-white/20 cursor-pointer group/icon transition-transform hover:scale-105 active:scale-95 flex items-center justify-center"
          title="Click to change clinic app logo"
        >
          {currentPreview ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={currentPreview}
              alt="App Icon"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-neutral-950 flex items-center justify-center">
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
        <div className="absolute top-2.5 right-2.5">
          <button
            type="button"
            onClick={handleButtonClick}
            className="btn-primary"
          >
            <UploadCloud className="w-4 h-4 text-white" />
            <span>{currentPreview ? "Change Logo" : "Upload App Logo"}</span>
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
