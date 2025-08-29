import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "../../common/Button";
import { Input } from "../../common/Input";
import { usePricingGroups } from "../../../api/pricingGroup";
import { useCategoriesTree } from "../../../api/UseCategories";

import { TreeSelect } from "../../common/TreeSelect";

import toast from "react-hot-toast";
import {
  useUpdateProduct,
  type PricingGroup,
  type Product,
} from "../../../api/UseProducts";
import { ImageUploader } from "../../common/ImageUplaoder";

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

interface FormData {
  name: string;
  description: string;
  subcategoryId: string;
  image: File | null;
  pricingGroupPrices: Record<string, string>;
}

export const EditProductModal: React.FC<EditProductModalProps> = ({
  isOpen,
  onClose,
  product,
}) => {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    description: "",
    subcategoryId: "",
    image: null,
    pricingGroupPrices: {},
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: pricingGroupsData, isLoading: isLoadingPricingGroups } =
    usePricingGroups();
  const { data: categoriesData, isLoading: isLoadingCategories } =
    useCategoriesTree();
  const updateProductMutation = useUpdateProduct();

  const pricingGroups = pricingGroupsData?.pricingGroups || [];
  const categories = categoriesData?.categories || [];

  // Initialize form data when product changes
  useEffect(() => {
    if (product && isOpen) {
      const pricingGroupPrices: Record<string, string> = {};

      if (Array.isArray(product.pricingGroupPrices)) {
        // ✅ Convert array to Record<string, string>
        product.pricingGroupPrices.forEach((pg) => {
          pricingGroupPrices[pg.id] = pg.price.toString();
        });
      }

      setFormData({
        name: product.name,
        description: product.description || "",
        subcategoryId: product.subcategoryId,
        image: null,
        pricingGroupPrices,
      });
    }
  }, [product, isOpen]);

  const handleInputChange = <K extends keyof FormData>(
    field: K,
    value: FormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handlePricingGroupPriceChange = (groupId: string, price: string) => {
    setFormData((prev) => ({
      ...prev,
      pricingGroupPrices: {
        ...prev.pricingGroupPrices,
        [groupId]: price,
      },
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Product name is required";
    }

    if (!formData.subcategoryId) {
      newErrors.subcategoryId = "Please select a category";
    }

    // Validate that at least one pricing group has a price
    const hasValidPrice = Object.values(formData.pricingGroupPrices).some(
      (price) => price && parseFloat(price) > 0
    );

    if (!hasValidPrice) {
      newErrors.pricingGroupPrices =
        "At least one pricing group must have a valid price";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!product || !validateForm()) {
      return;
    }

    try {
      // Convert string prices to numbers
      const pricingGroupPrices: Record<string, number> = {};
      Object.entries(formData.pricingGroupPrices).forEach(
        ([groupId, price]) => {
          if (price && parseFloat(price) > 0) {
            pricingGroupPrices[groupId] = parseFloat(price);
          }
        }
      );

      await updateProductMutation.mutateAsync({
        id: product.id,
        name: formData.name,
        description: formData.description,
        subcategoryId: formData.subcategoryId,
        image: formData.image || undefined,
        pricingGroupPrices,
      });

      toast.success("Product updated successfully");
      handleClose();
    } catch (error) {
      console.error("Failed to update product:", error);

      if (error instanceof Error) {
        toast.error(error.message);
        toast.error(error.message || "Failed to update product");
      } else {
        toast.error("Failed to update product");
      }
    }
  };

  const handleClose = () => {
    setFormData({
      name: "",
      description: "",
      subcategoryId: "",
      image: null,
      pricingGroupPrices: {},
    });
    setErrors({});
    onClose();
  };

  if (!isOpen || !product) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Edit Product
              </h3>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Left and Right Column Layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column */}
                <div className="space-y-6">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Name
                    </label>
                    <Input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        handleInputChange("name", e.target.value)
                      }
                      placeholder=""
                      error={errors.name}
                      required
                    />
                  </div>

                  {/* Select Category */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Category
                    </label>
                    <TreeSelect
                      data={categories}
                      value={formData.subcategoryId}
                      onChange={(value) =>
                        handleInputChange("subcategoryId", value)
                      }
                      placeholder="Select Category"
                      error={errors.subcategoryId}
                    />
                  </div>

                  {/* Pricing Groups */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-4">
                      Pricing Groups
                    </label>
                    {errors.pricingGroupPrices && (
                      <p className="text-sm text-red-600 mb-3">
                        {errors.pricingGroupPrices}
                      </p>
                    )}
                    <div className="space-y-4">
                      {pricingGroups.map((group: PricingGroup) => (
                        <div key={group.id}>
                          <label className="block text-sm text-gray-600 mb-1">
                            Enter {group.name} Price:
                          </label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.pricingGroupPrices[group.id] || ""}
                            onChange={(e) =>
                              handlePricingGroupPriceChange(
                                group.id,
                                e.target.value
                              )
                            }
                            placeholder="Type here..."
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  {/* Upload Image */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload Image
                    </label>
                    <ImageUploader
                      onImageChange={(file) => handleInputChange("image", file)}
                      currentImage={product.image?.url}
                      error={errors.image}
                    />
                  </div>

                  {/* Multiple API Links Section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Multiple API Links
                    </label>
                    <div className="border border-gray-300 rounded-md p-4 bg-gray-50">
                      <p className="text-sm text-gray-500">
                        API Links functionality can be added here
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description - Full width below columns */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  placeholder=""
                  rows={4}
                  className="w-full py-3 px-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-center pt-6 border-t border-gray-200">
                <Button
                  type="submit"
                  loading={updateProductMutation.isPending}
                  disabled={isLoadingPricingGroups || isLoadingCategories}
                  className="px-12 py-3"
                >
                  Update Product
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
