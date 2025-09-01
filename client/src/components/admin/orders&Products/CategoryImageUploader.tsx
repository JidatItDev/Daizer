import React, { useState, useRef } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";

interface CategoryImageUploadProps {
  onImageSelect: (file: File | null) => void;
  currentImage?: { name: string; url: string } | null;
  preview?: string;
  disabled?: boolean;
  label?: string;
}

const CategoryImageUpload: React.FC<CategoryImageUploadProps> = ({
  onImageSelect,
  currentImage,
  preview,
  disabled = false,
  label = "Category Image",
}) => {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const file = files[0];
      if (file.type.startsWith("image/")) {
        onImageSelect(file);
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      onImageSelect(files[0]);
    }
  };

  const handleRemoveImage = () => {
    onImageSelect(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const displayImage = preview || currentImage?.url;

  return (
    <div className="space-y-2 w-full">
      <label className="block text-sm font-medium text-gray-700">{label}</label>

      <div className="space-x-3 flex items-center">
        {/* Current/Preview Image */}
        {displayImage && (
          <div className="relative inline-block w-[45%]">
            <img
              src={displayImage}
              alt="Category"
              className=" object-cover rounded-lg border border-gray-300"
            />
            <button
              type="button"
              onClick={handleRemoveImage}
              disabled={disabled}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Upload Area */}
        <div
          className={`
            relative border-2 border-dashed p-4 rounded-lg text-center w-[45%] cursor-pointer transition-colors
            ${
              dragActive
                ? "border-primary-dark bg-primary-dark/5"
                : "border-gray-300 hover:border-primary-dark hover:bg-gray-50"
            }
            ${disabled ? "opacity-50 cursor-not-allowed" : ""}
          `}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !disabled && inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleChange}
            disabled={disabled}
            className="hidden"
          />

          <div className="space-y-2">
            <div className="mx-auto h-12 w-12 text-gray-400">
              {displayImage ? (
                <ImageIcon className="h-full w-full" />
              ) : (
                <Upload className="h-full w-full" />
              )}
            </div>
            <div className="text-sm text-gray-600">
              <span className="font-medium text-primary-dark">
                {displayImage ? "Click to change" : "Click to upload"}
              </span>{" "}
              {!displayImage && "or drag and drop"}
            </div>
            <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryImageUpload;
