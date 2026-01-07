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
import { useApiProviders } from "../../../api/useExternalProvider";

interface CreateProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormData {
  name: string;
  quantity: string;
  description: string;
  subcategoryId: string;
  image: File | null;
  imageUrl: string | undefined;
  pricingGroupPrices: Record<string, string>;
  apiProviderId?: string;
  serviceId?: string;
  isActive: boolean;
}

interface ApiProvider {
  id: string;
  providerName: string;
  hostUrl: string;
  username: string;
  password: string;
  token?: string;
  active: boolean;
  createdAt: string;
}

interface ServiceResponse {
  services?: ExternalService[];
}

export const CreateProductModal: React.FC<CreateProductModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    quantity: "",
    description: "",
    subcategoryId: "",
    image: null,
    imageUrl: undefined,
    pricingGroupPrices: {},
    serviceId: "",
    isActive: true,
  });

  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(
    null
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: pricingGroupsData, isLoading: isLoadingPricingGroups } =
    usePricingGroups();
  const { data: categoriesData, isLoading: isLoadingCategories } =
    useCategoriesTree();
  const createProductMutation = useCreateProduct();

  const { data: apiProviders, isLoading: isLoadingApiProviders } =
    useApiProviders();

  const providers: ApiProvider[] = apiProviders ?? [];

  // const { data: services = [] } = useProductServices();
  // const { data: servicesData } = useProductServices();

  const { data: servicesData, isLoading: isLoadingServices } =
    useProductServices(selectedProviderId);

  const services = (servicesData as ServiceResponse)?.services || [];

  const pricingGroups = pricingGroupsData?.pricingGroups || [];
  const categories = categoriesData?.categories || [];

  const handleInputChange = <K extends keyof FormData>(
    field: K,
    value: FormData[K]
  ) => {
    if (field === "image") {
      // When image changes, also update imageUrl
      const file = value as File | null;
      const imageUrl = file ? URL.createObjectURL(file) : undefined;
      setFormData((prev) => ({ ...prev, [field]: value, imageUrl }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
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
    if (!formData.quantity) {
      newErrors.quantity = "Quantity is required";
    }
    // ✅ API Provider validation
    if (!formData.apiProviderId) {
      newErrors.apiProviderId = "Please select an API provider";
    }
    // ✅ Service validation - only validate if provider is selected
    if (formData.apiProviderId && !formData.serviceId) {
      newErrors.serviceId = "Please select a service";
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

    // if (!formData.serviceId) {
    //   newErrors.serviceId = "Please select a service";
    // }

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
  console.log("formdata", formData);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fill in all the required fields", errors);
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
        quantity: String(formData.quantity) || undefined,
        description: formData.description,
        subcategoryId: formData.subcategoryId,
        image: formData.image || undefined,
        pricingGroupPrices,
        apiProviderId: formData.apiProviderId!,
        serviceId: formData.serviceId?.toString() || "",
        isActive: formData.isActive,
      });

      toast.success("Product created successfully");
      handleClose();
      onSuccess();
    } catch (error) {
      if (error instanceof AxiosError) {
        const errorMessage = error.response?.data?.message || error.message;

        // Handle Multer file size error specifically
        if (
          errorMessage.includes("File too large") ||
          errorMessage.includes("multer") ||
          error.code === "LIMIT_FILE_SIZE"
        ) {
          toast.error(
            "File size too large. Please select an image smaller than 10MB."
          );
        } else if (errorMessage.includes("Unexpected field")) {
          toast.error("Invalid file format. Please select a valid image file.");
        } else if (errorMessage.includes("Too many files")) {
          toast.error("Too many files selected. Please select only one image.");
        } else {
          toast.error(errorMessage || "Failed to create product");
        }
      } else if (error instanceof Error) {
        // Handle other types of errors
        if (error.message.includes("File too large")) {
          toast.error(
            "File size too large. Please select an image smaller than 10MB."
          );
        } else {
          toast.error(error.message || "Failed to create product");
        }
      } else {
        toast.error("Failed to create product");
      }
    }
  };

  const handleClose = () => {
    // Clean up object URL if exists
    if (formData.imageUrl) {
      URL.revokeObjectURL(formData.imageUrl);
    }

    setFormData({
      name: "",
      quantity: "",
      description: "",
      subcategoryId: "",
      image: null,
      imageUrl: undefined,
      pricingGroupPrices: {},
      serviceId: "",
      apiProviderId: undefined,
      isActive: true,
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      heading="Create Product"
      subheading=""
      widthClass="max-w-[920px] max-h-[90vh] overflow-y-auto "
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-3  py-3 border-b-[2px] border-gray-300">
              <label className="block text-sm font-medium text-gray-700  ">
                Active Status
              </label>
              <button
                type="button"
                onClick={() =>
                  handleInputChange("isActive", !formData.isActive)
                }
                className={`w-12 h-6 flex items-center rounded-full p-1 transition ${
                  formData.isActive ? "bg-green-500" : "bg-gray-300"
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition ${
                    formData.isActive ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
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
                currentImage={formData.imageUrl}
                error={errors.image}
              />
            </div>

            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                External API Provider <span className="text-red-500">*</span>
              </label>

              <Popover>
                <PopoverTrigger asChild>
                  <PopButton
                    variant="outline"
                    role="combobox"
                    className={`w-full justify-between ${
                      errors.apiProviderId ? "border-red-500" : ""
                    }`}
                    disabled={isLoadingApiProviders}
                  >
                    {selectedProviderId
                      ? providers.find((p) => p.id === selectedProviderId)
                          ?.providerName
                      : "Select API Provider..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                  </PopButton>
                </PopoverTrigger>

                <PopoverContent className="p-0 w-full">
                  <Command>
                    <CommandInput placeholder="Search provider..." />
                    <CommandList>
                      <CommandEmpty>No providers found.</CommandEmpty>
                      <CommandGroup>
                        {providers
                          .filter((p) => p.active)
                          .map((provider) => (
                            <CommandItem
                              key={provider.id}
                              value={provider.providerName}
                              onSelect={() => {
                                setSelectedProviderId(provider.id);
                                handleInputChange("apiProviderId", provider.id);
                                handleInputChange("serviceId", ""); // reset service
                                // Clear error when selected
                                if (errors.apiProviderId) {
                                  setErrors((prev) => ({
                                    ...prev,
                                    apiProviderId: "",
                                  }));
                                }
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedProviderId === provider.id
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {provider.providerName}
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {/* ✅ Show error message */}
              {errors.apiProviderId && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.apiProviderId}
                </p>
              )}
            </div>

            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service{" "}
                {formData.apiProviderId && (
                  <span className="text-red-500">*</span>
                )}
              </label>

              <Popover>
                <PopoverTrigger asChild>
                  <PopButton
                    variant="outline"
                    role="combobox"
                    className={`w-full justify-between ${
                      errors.serviceId ? "border-red-500" : ""
                    }`}
                    disabled={!selectedProviderId || isLoadingServices}
                  >
                    <span className="truncate">
                      {isLoadingServices
                        ? "Loading services..."
                        : formData.serviceId
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
                    </span>
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
                      {isLoadingServices ? (
                        <div className="p-4 text-center text-sm text-gray-500">
                          Loading services...
                        </div>
                      ) : (
                        <>
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
                                  // Clear error when selected
                                  if (errors.serviceId) {
                                    setErrors((prev) => ({
                                      ...prev,
                                      serviceId: "",
                                    }));
                                  }
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
                                {service.ServiceName} - ${service.Price}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {/* ✅ Show error message */}
              {errors.serviceId && (
                <p className="text-sm text-red-600 mt-1">{errors.serviceId}</p>
              )}
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
