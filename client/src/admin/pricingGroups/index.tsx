import { useState, useEffect } from "react";
import { Button } from "../../components/common/Button";
import { Table, type TableColumn } from "../../components/common/Table";
import { Input } from "../../components/common/Input";
import Heading from "../../components/common/Heading";
import { Trash2, AlertCircle, Loader } from "lucide-react";
import {
  usePricingGroups,
  useCreatePricingGroup,
  useUpdatePricingGroup,
  useDeletePricingGroup,
} from "../../api/pricingGroup";
import Modal from "../../components/common/Modal";
import ConfirmationModal from "../../components/common/ConfirmationModal"; // Assuming you have a confirmation modal
import toast from "react-hot-toast";

interface PricingGroupType {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
}

interface FormErrors {
  name?: string;
}

const PricingGroup = () => {
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<PricingGroupType | null>(
    null
  );
  const [formData, setFormData] = useState({
    name: "",
    isDefault: false,
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState({ name: false });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatingGroups, setUpdatingGroups] = useState<Set<string>>(new Set());

  const { data, isLoading, refetch } = usePricingGroups({
    page: pagination.current,
    limit: pagination.pageSize,
  });

  const createPricingGroup = useCreatePricingGroup();
  const updatePricingGroup = useUpdatePricingGroup();
  const deletePricingGroup = useDeletePricingGroup();

  const pricingGroups: PricingGroupType[] = data?.pricingGroups ?? [];
  const totalPricingGroups = data?.pagination?.totalPricingGroups ?? 0;

  // Update total when API data changes
  useEffect(() => {
    if (pagination.total !== totalPricingGroups) {
      setPagination((prev) => ({ ...prev, total: totalPricingGroups }));
    }
  }, [totalPricingGroups]);

  // Validation function
  const validateName = (name: string): string | undefined => {
    if (!name.trim()) {
      return "Group name is required";
    }
    if (name.trim().length < 2) {
      return "Group name must be at least 2 characters long";
    }
    if (name.trim().length > 255) {
      return "Group name cannot exceed 255 characters";
    }
    return undefined;
  };

  // Handle input changes
  const handleInputChange = (
    field: keyof typeof formData,
    value: string | boolean
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Real-time validation
    if (touched.name && field === "name") {
      const newErrors = { ...errors };
      const nameError = validateName(value as string);
      if (nameError) {
        newErrors.name = nameError;
      } else {
        delete newErrors.name;
      }
      setErrors(newErrors);
    }
  };

  // Handle field blur
  const handleBlur = (field: keyof typeof formData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));

    const newErrors = { ...errors };
    if (field === "name") {
      const nameError = validateName(formData.name);
      if (nameError) {
        newErrors.name = nameError;
      } else {
        delete newErrors.name;
      }
    }
    setErrors(newErrors);
  };

  const handlePageChange = (page: number, pageSize: number) => {
    setPagination((prev) => ({
      ...prev,
      current: page,
      pageSize,
    }));
  };

  const handleEdit = (group: PricingGroupType) => {
    setSelectedGroup(group);
    setFormData({
      name: group.name,
      isDefault: group.isDefault,
    });
    setErrors({});
    setTouched({ name: false });
    setIsEditModalOpen(true);
  };

  const handleDelete = (group: PricingGroupType) => {
    setSelectedGroup(group);
    setIsDeleteModalOpen(true);
  };

  // const handleToggleDefault = async (group: PricingGroupType) => {
  //   try {
  //     await updatePricingGroup.mutateAsync({
  //       id: group.id,
  //       isDefault: !group.isDefault,
  //     });
  //     toast.success(
  //       `Pricing group ${
  //         !group.isDefault ? "set as default" : "removed as default"
  //       }`
  //     );
  //   } catch (error: any) {
  //     console.error("Failed to update pricing group:", error);
  //     toast.error("Failed to update pricing group");
  //   }
  // };

  const handleToggleDefault = async (group: PricingGroupType) => {
    // Add to updating set
    setUpdatingGroups((prev) => new Set(prev).add(group.id));

    const toastId = toast.loading(
      <div className="flex items-center gap-2">Updating pricing group...</div>
    );

    try {
      await updatePricingGroup.mutateAsync({
        id: group.id,
        isDefault: !group.isDefault,
      });

      toast.success(
        `Pricing group ${
          !group.isDefault ? "set as default" : "removed as default"
        }`,
        { id: toastId }
      );
    } catch (error: any) {
      console.error("Failed to update pricing group:", error);
      toast.error("Failed to update pricing group", { id: toastId });
    } finally {
      // Remove from updating set
      setUpdatingGroups((prev) => {
        const newSet = new Set(prev);
        newSet.delete(group.id);
        return newSet;
      });
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Validate all fields
    const nameError = validateName(formData.name);
    const newErrors: FormErrors = {};
    if (nameError) newErrors.name = nameError;

    setErrors(newErrors);
    setTouched({ name: true });

    // If no errors, proceed with creation
    if (Object.keys(newErrors).length === 0) {
      try {
        await createPricingGroup.mutateAsync({
          name: formData.name.trim(),
          isDefault: formData.isDefault,
        });

        resetForm();
        setIsCreateModalOpen(false);

        toast.success("Pricing group created successfully");
      } catch (error: any) {
        handleApiError(error, "create");
      }
    }

    setIsSubmitting(false);
  };

  const handleUpdateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup) return;

    setIsSubmitting(true);

    // Validate all fields
    const nameError = validateName(formData.name);
    const newErrors: FormErrors = {};
    if (nameError) newErrors.name = nameError;

    setErrors(newErrors);
    setTouched({ name: true });

    // If no errors, proceed with update
    if (Object.keys(newErrors).length === 0) {
      try {
        await updatePricingGroup.mutateAsync({
          id: selectedGroup.id,
          name: formData.name.trim(),
          isDefault: formData.isDefault,
        });

        // Reset form and close modal on success
        resetForm();
        setIsEditModalOpen(false);
        refetch();

        toast.success("Pricing group updated successfully");
      } catch (error: any) {
        handleApiError(error, "update");
      }
    }

    setIsSubmitting(false);
  };

  const handleConfirmDelete = async () => {
    if (!selectedGroup || selectedGroup?.id) return;

    try {
      await deletePricingGroup.mutateAsync(selectedGroup?.id);
      setIsDeleteModalOpen(false);
      setSelectedGroup(null);
      toast.success("Pricing group deleted successfully");
      refetch();
    } catch (error: any) {
      console.error("Failed to delete pricing group:", error);
      toast.error("Failed to delete pricing group");
    }
  };

  const resetForm = () => {
    setFormData({ name: "", isDefault: false });
    setErrors({});
    setTouched({ name: false });
    setSelectedGroup(null);
  };

  const handleApiError = (error: any, action: string) => {
    console.error(`Failed to ${action} pricing group:`, error);

    if (error.response?.status === 409) {
      setErrors({ name: "A pricing group with this name already exists" });
      toast.error("A pricing group with this name already exists");
    } else if (error.response?.status === 400) {
      toast.error("Invalid data. Please check your inputs.");
    } else if (error.response?.status === 500) {
      toast.error("Server error. Please try again later.");
    } else {
      toast.error(`Failed to ${action} pricing group. Please try again.`);
    }
  };

  const isFormValid = Object.keys(errors).length === 0 && formData.name.trim();

  const columns: TableColumn<PricingGroupType>[] = [
    {
      key: "name",
      title: "Group Name",
    },
    {
      key: "users",
      title: "Users Assigned",
      // render: (_, record) => "0", // Placeholder
    },
    {
      key: "createdAt",
      title: "Created At",
      render: (_, record: PricingGroupType) =>
        new Date(record.createdAt).toLocaleDateString(),
    },
    {
      key: "isDefault",
      title: "Default",
      render: (_, record: PricingGroupType) => {
        const isUpdating = updatingGroups.has(record.id);
        return (
          <div className="flex justify-center">
            <button
              onClick={() => !isUpdating && handleToggleDefault(record)}
              disabled={isUpdating}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                record.isDefault ? "bg-success" : "bg-[#C60504]"
              } ${
                isUpdating ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  record.isDefault ? "translate-x-6" : "translate-x-1"
                }`}
              />
              {isUpdating && (
                <div
                  className={`absolute inset-0 flex items-center ${
                    record.isDefault ? "justify-start" : "justify-end"
                  } p-2`}
                >
                  <Loader className="h-3 w-3 animate-spin text-white" />
                </div>
              )}
            </button>
          </div>
        );
      },
    },
    {
      key: "action",
      title: "Action",
      align: "center",
      render: (_, record: PricingGroupType) => (
        <div className="flex gap-2 justify-center">
          <Button
            variant="primary"
            size="md"
            className="text-xs font-normal px-6 !py-1"
            onClick={() => handleEdit(record)}
          >
            Edit
          </Button>
          <button
            onClick={() => handleDelete(record)}
            className="text-primary-dark hover:text-black h-8 w-8 border border-primary-dark rounded-full flex items-center justify-center"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="bg-white">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 ">
        <div className="flex items-center gap-4">
          <Heading>Pricing Groups</Heading>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="primary"
            size="md"
            className="text-sm font-normal px-6 !py-2"
            onClick={() => setIsCreateModalOpen(true)}
          >
            Create Group
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border-t-2 border-black/50">
        <Table
          columns={columns}
          data={pricingGroups}
          loading={isLoading}
          pagination={{
            ...pagination,
            onChange: handlePageChange,
          }}
        />
      </div>

      {/* Create Group Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          resetForm();
        }}
        heading="Create Group"
        subheading="Create a new pricing group for your organization"
      >
        <form onSubmit={handleCreateGroup} className="space-y-6 mt-6">
          <div className="space-y-2">
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              onBlur={() => handleBlur("name")}
              placeholder="Group Name"
              error={errors.name}
              rightIcon={
                errors.name ? (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                ) : undefined
              }
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isDefaultCreate"
              checked={formData.isDefault}
              onChange={(e) => handleInputChange("isDefault", e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label
              htmlFor="isDefaultCreate"
              className="ml-2 block text-sm text-gray-700"
            >
              Set as default pricing group
            </label>
          </div>

          <Button
            type="submit"
            disabled={!isFormValid}
            loading={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? "Creating..." : "Create Group"}
          </Button>
        </form>
      </Modal>

      {/* Edit Group Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          resetForm();
        }}
        heading="Edit Group"
        subheading="Update pricing group details"
      >
        <form onSubmit={handleUpdateGroup} className="space-y-6 mt-6">
          <div className="space-y-2">
            <Input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              onBlur={() => handleBlur("name")}
              placeholder="Group Name"
              error={errors.name}
              rightIcon={
                errors.name ? (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                ) : undefined
              }
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="isDefaultEdit"
              checked={formData.isDefault}
              onChange={(e) => handleInputChange("isDefault", e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label
              htmlFor="isDefaultEdit"
              className="ml-2 block text-sm text-gray-700"
            >
              Set as default pricing group
            </label>
          </div>

          <Button
            type="submit"
            disabled={!isFormValid}
            loading={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? "Updating..." : "Update Group"}
          </Button>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedGroup(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Pricing Group"
        message={`Are you sure you want to delete the pricing group "${selectedGroup?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default PricingGroup;
