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
import Modal from "../../common/Modal";

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
    // Clear pricing group errors when user starts typing
    if (errors.pricingGroupPrices) {
      setErrors((prev) => ({ ...prev, pricingGroupPrices: "" }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = "Product name is required";
    }

    // Description validation
    if (!formData.description.trim()) {
      newErrors.description = "Product description is required";
    }

    // Category validation
    if (!formData.subcategoryId) {
      newErrors.subcategoryId = "Please select a category";
    }

    // Image validation
    if (!formData.image) {
      newErrors.image = "Product image is required";
    }

    // Pricing groups validation - ALL pricing groups must have valid prices
    const missingPrices: string[] = [];
    const invalidPrices: string[] = [];

    pricingGroups.forEach((group: PricingGroup) => {
      const price = formData.pricingGroupPrices[group.id];

      if (!price || price.trim() === "") {
        missingPrices.push(group.name);
      } else if (parseFloat(price) <= 0 || isNaN(parseFloat(price))) {
        invalidPrices.push(group.name);
      }
    });

    if (missingPrices.length > 0) {
      newErrors.pricingGroupPrices = `Price is required for: ${missingPrices.join(", ")}`;
    } else if (invalidPrices.length > 0) {
      newErrors.pricingGroupPrices = `Invalid price for: ${invalidPrices.join(", ")}`;
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      heading="Create Product"
      subheading=""
      widthClass="w-[920px] max-h-[90vh] overflow-y-auto "
    >
      {/* Content */}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Left and Right Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder=""
                error={errors.name}
                required
              />
            </div>

            {/* Select Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Category <span className="text-red-500">*</span>
              </label>
              <TreeSelect
                data={categories}
                value={formData.subcategoryId}
                onChange={(value) => handleInputChange("subcategoryId", value)}
                placeholder="Select Category"
                error={errors.subcategoryId}
              />
            </div>

            {/* Pricing Groups */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Pricing Groups <span className="text-red-500">*</span>
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
                      Enter {group.name} Price:{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      className="py-1.5"
                      value={formData.pricingGroupPrices[group.id] || ""}
                      onChange={(e) =>
                        handlePricingGroupPriceChange(group.id, e.target.value)
                      }
                      placeholder="Type here..."
                      required
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
                Upload Image <span className="text-red-500">*</span>
              </label>
              <ImageUploader
                onImageChange={(file) => handleInputChange("image", file)}
                error={errors.image}
              />
            </div>

            {/* Multiple API Links Section */}
            {/* <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Multiple API Links
                    </label>
                    <div className="border border-gray-300 rounded-md p-4 bg-gray-50">
                      <p className="text-sm text-gray-500">
                        API Links functionality can be added here
                      </p>
                    </div>
                  </div> */}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description <span className="text-red-500">*</span>
          </label>
          <Input
            value={formData.description}
            onChange={(e) => handleInputChange("description", e.target.value)}
            placeholder=""
            className="w-full py-3 px-4 "
            required
          />
          {errors.description && (
            <p className="text-sm text-red-600 mt-1">{errors.description}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-center pt-6 border-t border-gray-200">
          <Button
            type="submit"
            loading={createProductMutation.isPending}
            disabled={isLoadingPricingGroups || isLoadingCategories}
            className="px-12 py-3"
          >
            Create Product
          </Button>
        </div>
      </form>
    </Modal>
  );
};
