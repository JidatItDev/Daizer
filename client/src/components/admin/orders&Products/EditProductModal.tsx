import React, { useState, useEffect } from "react";
import { Button } from "../../common/Button";
import { Input } from "../../common/Input";
import { usePricingGroups } from "../../../api/pricingGroup";
import { useCategoriesTree } from "../../../api/UseCategories";

import { TreeSelect } from "../../common/TreeSelect";

import toast from "react-hot-toast";
import {
  type ExternalService,
  useUpdateProduct,
  type PricingGroup,
  type Product,
} from "../../../api/UseProducts";
import { ImageUploader } from "../../common/ImageUplaoder";
import Modal from "../../common/Modal";
import { useProductServices } from "../../../api/UseProducts";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "../../ui/command";
import { Button as PopButton } from "../../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "../../../lib/utils";

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
}

interface FormData {
  name: string;
  quantity: string;
  description: string;
  subcategoryId: string;
  image: File | null;
  pricingGroupPrices: Record<string, string>;
  serviceId?: string;
}

interface ServiceResponse {
  services?: ExternalService[];
}

export const EditProductModal: React.FC<EditProductModalProps> = ({
  isOpen,
  onClose,
  product,
}) => {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    quantity: "",
    description: "",
    subcategoryId: "",
    image: null,
    pricingGroupPrices: {},
    serviceId: "",
  });
  // const { data: services = [] } = useProductServices();
  const { data: servicesData } = useProductServices();
  const services = (servicesData as ServiceResponse)?.services || [];

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
        quantity: product.quantity || "",
        description: product.description || "",
        subcategoryId: product.subcategoryId,
        image: null,
        pricingGroupPrices,
        serviceId: product.serviceId?.toString() || "",
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

    if (formData.quantity && isNaN(parseFloat(formData.quantity))) {
      newErrors.quantity = "Quantity must be a valid number";
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
        quantity: formData.quantity || undefined,
        description: formData.description,
        subcategoryId: formData.subcategoryId,
        image: formData.image || undefined,
        pricingGroupPrices,
        serviceId: formData.serviceId?.toString() || "",
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
      quantity: "",
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      heading="Edit Product"
      subheading=""
      widthClass="max-w-[920px] max-h-[90vh] overflow-y-auto "
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Left and Right Column Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Name */}
            <div className="flex gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity
                </label>
                <Input
                  type="text"
                  value={formData.quantity}
                  onChange={(e) =>
                    handleInputChange("quantity", e.target.value)
                  }
                  placeholder="Optional quantity"
                  error={errors.quantity}
                />
              </div>
            </div>

            {/* Select Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Category
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
                        handlePricingGroupPriceChange(group.id, e.target.value)
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
            {/* Select Service */}
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Service
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <PopButton
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                  >
                    {/* {formData.serviceId
                      ? services?.find(
                          (s: any) =>
                            s.ServiceApiID.toString() === formData.serviceId
                        )?.ServiceName
                      : "Select service..."} */}
                    {formData.serviceId
                      ? (() => {
                          const selectedService = services?.find(
                            (s: any) =>
                              s.ServiceApiID.toString() === formData.serviceId
                          );
                          return selectedService
                            ? `${selectedService.ServiceName} - $${selectedService.Price}`
                            : "Select service...";
                        })()
                      : "Select service..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </PopButton>
                </PopoverTrigger>
                <PopoverContent
                  className="p-0 w-[var(--radix-popover-trigger-width)]"
                  align="start"
                >
                  <Command>
                    <CommandInput placeholder="Search services..." />
                    <CommandList>
                      <CommandEmpty>No services found.</CommandEmpty>
                      <CommandGroup>
                        {services?.map((service: any) => (
                          <CommandItem
                            key={service.ServiceApiID}
                            value={service.ServiceName}
                            onSelect={() => {
                              handleInputChange(
                                "serviceId",
                                service.ServiceApiID.toString()
                              );
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.serviceId ===
                                  service.ServiceApiID.toString()
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            {service.ServiceName} - {service.Price}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* Description - Full width below columns */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <Input
            value={formData.description}
            onChange={(e) => handleInputChange("description", e.target.value)}
            placeholder=""
            className="w-full py-3 px-4 "
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
    </Modal>
  );
};
