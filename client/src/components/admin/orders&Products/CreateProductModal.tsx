import React, { useState } from "react";
import { Button } from "../../common/Button";
import { Input } from "../../common/Input";

import toast from "react-hot-toast";
import { usePricingGroups } from "../../../api/pricingGroup";
import { useCategoriesTree } from "../../../api/UseCategories";
import {
  useCreateProduct,
  useProductServices,
  type ExternalService,
  type PricingGroup,
} from "../../../api/UseProducts";
import { TreeSelect } from "../../common/TreeSelect";
import { ImageUploader } from "../../common/ImageUplaoder";
import { AxiosError } from "axios";
import Modal from "../../common/Modal";
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

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
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

export const CreateProductModal: React.FC<CreateProductModalProps> = ({
  isOpen,
  onClose,
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


  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: pricingGroupsData, isLoading: isLoadingPricingGroups } =
    usePricingGroups();
  const { data: categoriesData, isLoading: isLoadingCategories } =
    useCategoriesTree();
  const createProductMutation = useCreateProduct();

  // const { data: services = [] } = useProductServices();
  const { data: servicesData } = useProductServices();
  const services = (servicesData as ServiceResponse)?.services || [];

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

    // Quantity validation (optional field)
    if (formData.quantity && isNaN(parseFloat(formData.quantity))) {
      newErrors.quantity = "Quantity must be a valid number";
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

    if (!formData.serviceId) {
      newErrors.serviceId = "Please select a service";
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
      newErrors.pricingGroupPrices = `Price is required for: ${missingPrices.join(
        ", "
      )}`;
    } else if (invalidPrices.length > 0) {
      newErrors.pricingGroupPrices = `Invalid price for: ${invalidPrices.join(
        ", "
      )}`;
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
        quantity: formData.quantity || undefined,
        description: formData.description,
        subcategoryId: formData.subcategoryId,
        image: formData.image || undefined,
        pricingGroupPrices,
        serviceId: formData.serviceId?.toString() || "",
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
      quantity: "",
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
      widthClass="max-w-[920px] max-h-[90vh] overflow-y-auto "
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="flex gap-2">
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
              {/* Quantity - Add this section */}
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
                  placeholder="e.g 80 uc"
                  error={errors.quantity}
                />
              </div>
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

            <div className="w-full">
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
