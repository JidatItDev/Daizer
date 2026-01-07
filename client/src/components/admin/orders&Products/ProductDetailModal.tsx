import React from "react";
import { X, Package, Calendar, DollarSign, Tag } from "lucide-react";
import type { Product } from "../../../api/UseProducts";

interface ProductDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  isOpen,
  onClose,
  product,
}) => {
  if (!isOpen || !product) return null;

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-900">
            Product Details
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Image and Basic Info */}
            <div className="space-y-6">
              {/* Product Image */}
              <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                {product.image?.url ? (
                  <img
                    src={product.image.url}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="text-gray-400 text-center">
                    <Package size={64} />
                    <p className="mt-2 text-sm">No image available</p>
                  </div>
                )}
              </div>

              {/* Image Details */}
              {product.image && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">
                    Image Details
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center gap-4">
                      <span className="text-gray-500 shrink-0">File Name:</span>

                      <span
                        className="text-gray-900 max-w-[220px] truncate text-right"
                        title={product.image.name} // 👈 shows full name on hover
                      >
                        {product.image.name}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-gray-500">File Size:</span>
                      <span className="text-gray-900">
                        {formatFileSize(product.image.size)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Type:</span>
                      <span className="text-gray-900">
                        {product.image.mimetype}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column - Product Information */}
            <div className="space-y-6">
              {/* Basic Information */}
              <div>
                <div>
                  <h3
                    className="
      text-xl font-semibold text-gray-900 mb-4
      w-full
      break-words
      whitespace-normal
    "
                  >
                    {product.name}
                  </h3>
                </div>

                {product.description && (
                  <p className="text-gray-600 text-base leading-relaxed">
                    {product.description}
                  </p>
                )}
              </div>

              {/* Category */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Tag size={16} className="text-gray-500" />
                  <h4 className="font-medium text-gray-900">Category</h4>
                </div>
                <p className="text-gray-700">
                  {product.subcategoryName || "Uncategorized"}
                </p>
              </div>

              {/* Pricing Groups */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign size={16} className="text-gray-500" />
                  <h4 className="font-medium text-gray-900">Pricing Groups</h4>
                </div>
                <div className="space-y-3">
                  {product.pricingGroupPrices.map((pricing) => (
                    <div
                      key={pricing.id}
                      className="flex justify-between items-center py-2 px-3 bg-white rounded border"
                    >
                      <span className="text-gray-700 font-medium">
                        {pricing.name}
                      </span>
                      <span className="text-green-600 font-semibold">
                        ${pricing.price.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-sm">Price Range:</span>
                    <span className="font-semibold text-gray-900">
                      {(() => {
                        const prices = product.pricingGroupPrices.map(
                          (p) => p.price
                        );
                        const minPrice = Math.min(...prices);
                        const maxPrice = Math.max(...prices);
                        return minPrice === maxPrice
                          ? `$${minPrice.toFixed(2)}`
                          : `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`;
                      })()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar size={16} className="text-gray-500" />
                  <h4 className="font-medium text-gray-900">Timeline</h4>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Created:</span>
                    <span className="text-gray-900">
                      {formatDate(product.createdAt)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Last Updated:</span>
                    <span className="text-gray-900">
                      {formatDate(product.updatedAt)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Product ID */}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
