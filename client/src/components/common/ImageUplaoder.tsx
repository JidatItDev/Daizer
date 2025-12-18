import React, { useState, useRef, useEffect } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import toast from "react-hot-toast";

interface ImageUploaderProps {
  onImageChange: (file: File | null) => void;
  currentImage?: string;
  label?: string;
  error?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImageChange,
  currentImage,
  label = "",
  error,
}) => {
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update preview when currentImage prop changes
  useEffect(() => {
    setPreview(currentImage || null);
  }, [currentImage]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (10MB limit)
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
      if (file.size > MAX_FILE_SIZE) {
        toast.error(
          "File size too large. Please select an image smaller than 10MB."
        );
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        return;
      }

      // Check if file is an image
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = () => {
          setPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
        onImageChange(file);
      } else {
        toast.error("Please select a valid image file");
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    }
  };

  const handleRemoveImage = () => {
    setPreview(null);
    onImageChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>

      <div className="flex flex-col space-y-4">
        {/* Upload Button */}
        <div
          onClick={handleClick}
          className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
            ${error ? "border-red-300 bg-red-50" : "border-gray-300 hover:border-gray-400 bg-gray-50 hover:bg-gray-100"}
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-600">Click to upload an image</p>
          <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
        </div>

        {/* Image Preview */}
        {preview && (
          <div className="relative">
            <div className="relative border rounded-lg overflow-hidden bg-white">
              <img
                src={preview}
                alt="Preview"
                className="w-full h-48 object-cover"
              />
              <button
                onClick={handleRemoveImage}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                type="button"
              >
                <X size={16} />
              </button>
            </div>
            <div className="mt-2 flex items-center text-sm text-gray-600">
              <ImageIcon size={16} className="mr-2" />
              <span>Image uploaded successfully</span>
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
};
