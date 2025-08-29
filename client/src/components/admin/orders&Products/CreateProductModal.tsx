import React, { useState } from "react";
import { X } from "lucide-react";
import { Button } from "../../common/Button";
import { Input } from "../../common/Input";

import toast from "react-hot-toast";
import { usePricingGroups } from "../../../api/pricingGroup";
import { useCategoriesTree } from "../../../api/UseCategories";
import { useCreateProduct, type PricingGroup } from "../../../api/UseProducts";
import { TreeSelect } from "../../common/TreeSelect";
import { ImageUploader } from "../../common/ImageUplaoder";
import { AxiosError } from "axios";

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormData {
  name: string;
  description: string;
  subcategoryId: string;
  image: File | null;
  pricingGroupPrices: Record<string, string>;
}

export const CreateProductModal: React.FC<CreateProductModalProps> = ({
  isOpen,
  onClose,
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
  const createProductMutation = useCreateProduct();

  const pricingGroups = pricingGroupsData?.pricingGroups || [];
  const categories = categoriesData?.categories || [];

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

    if (!validateForm()) {
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

      await createProductMutation.mutateAsync({
        name: formData.name,
        description: formData.description,
        subcategoryId: formData.subcategoryId,
        image: formData.image || undefined,
        pricingGroupPrices,
      });

      toast.success("Product created successfully");
      handleClose();
    } catch (error) {
      if (error instanceof AxiosError) {
        toast.error(
          error.response?.data?.message || "Failed to create product"
        );
      } else {
        toast.error("Failed to create product");
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Create New Product
              </h3>
              <p className="text-sm text-gray-500">
                Add a new product to your inventory
              </p>
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
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Product Name"
                    error={errors.name}
                    required
                  />
                </div>

                <div>
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
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    handleInputChange("description", e.target.value)
                  }
                  placeholder="Product description..."
                  rows={3}
                  className="w-full py-3 px-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Image Upload */}
              <div>
                <ImageUploader
                  onImageChange={(file) => handleInputChange("image", file)}
                  label="Product Image"
                  error={errors.image}
                />
              </div>

              {/* Pricing Groups */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-md font-medium text-gray-900">
                    Pricing Groups
                  </h4>
                  {isLoadingPricingGroups && (
                    <div className="text-sm text-gray-500">
                      Loading pricing groups...
                    </div>
                  )}
                </div>

                {errors.pricingGroupPrices && (
                  <p className="text-sm text-red-600 mb-3">
                    {errors.pricingGroupPrices}
                  </p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pricingGroups.map((group: PricingGroup) => (
                    <div key={group.id} className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        {group.name}
                        {group.isDefault && (
                          <span className="text-xs text-blue-600 ml-1">
                            (Default)
                          </span>
                        )}
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
                        placeholder="0.00"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={createProductMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={createProductMutation.isPending}
                  disabled={isLoadingPricingGroups || isLoadingCategories}
                >
                  Create Product
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
