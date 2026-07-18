"use client";

import React, { useState, useRef, useEffect } from "react";

interface ImageUploaderProps {
  file: File | null;
  onChange: (file: File | null) => void;
  imageUrl?: string;
  onClearImage?: () => void;
  label?: string;
}

export default function ImageUploader({
  file,
  onChange,
  imageUrl,
  onClearImage,
  label = "Upload Image",
}: ImageUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manage preview object URL lifetimes
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (selectedFile: File) => {
    if (!selectedFile.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    if (selectedFile.size > 5 * 1024 * 1024) {
      setError("File is too large. Maximum size is 5MB.");
      return;
    }

    setError(null);
    onChange(selectedFile);
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering open file explorer
    onChange(null);
    if (onClearImage) {
      onClearImage();
    }
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  // Determine current active preview
  const currentPreview = previewUrl || imageUrl;

  return (
    <div className="space-y-2 w-full">
      <div className="flex justify-between items-center">
        <label className="block text-sm font-medium text-neutral-700">{label}</label>
        {currentPreview && (
          <button
            type="button"
            onClick={handleRemove}
            className="text-xs text-red-500 hover:text-red-700 font-semibold focus:outline-none transition-colors"
          >
            Remove Image
          </button>
        )}
      </div>

      {currentPreview ? (
        /* Image Preview Box with Replace Button Overlay */
        <div className="relative group w-full h-40 rounded-lg overflow-hidden border border-neutral-200 bg-neutral-50 flex items-center justify-center shadow-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentPreview}
            alt="Preview"
            className="w-full h-full object-cover"
          />
          {/* Hover Overlay */}
          <div
            onClick={onButtonClick}
            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200 cursor-pointer"
          >
            <span className="text-white text-xs font-semibold px-3 py-1.5 bg-black/60 rounded-full hover:bg-black/80 transition-colors">
              Change Image
            </span>
          </div>
          {/* Hidden Input for Changing */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleChange}
            className="hidden"
          />
        </div>
      ) : (
        /* Drag & Drop File Upload Zone when no image is selected */
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={onButtonClick}
          className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-5 cursor-pointer transition-all duration-200 ${
            dragActive
              ? "border-black bg-neutral-50 scale-[1.01]"
              : "border-neutral-300 hover:border-neutral-400 bg-white hover:bg-neutral-50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleChange}
            className="hidden"
          />

          <div className="flex flex-col items-center space-y-2 text-center select-none">
            {/* Upload Icon */}
            <svg
              className="h-8 w-8 text-neutral-400 group-hover:text-neutral-500 transition-colors"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-xs font-medium text-neutral-600">
              <span className="font-semibold text-black underline">Upload an image</span> or drag and drop
            </p>
            <p className="text-[10px] text-neutral-400">PNG, JPG, GIF up to 5MB</p>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-500 font-medium">
          ⚠️ {error}
        </p>
      )}
    </div>
  );
}
