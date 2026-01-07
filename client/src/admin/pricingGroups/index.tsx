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
import ConfirmationModal from "../../components/common/ConfirmationModal";
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

interface DefaultChangeAction {
  type: "toggle" | "create" | "edit";
  groupId?: string;
  groupName: string;
  newDefaultState: boolean;
  formData?: {
    name: string;
    isDefault: boolean;
  };
}

const PricingGroup = () => {
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDefaultModalOpen, setIsDeleteDefaultModalOpen] =
    useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDefaultChangeModalOpen, setIsDefaultChangeModalOpen] =
    useState(false);
  const [isCannotRemoveDefaultModalOpen, setIsCannotRemoveDefaultModalOpen] =
    useState(false);
  const [pendingDefaultChange, setPendingDefaultChange] =
    useState<DefaultChangeAction | null>(null);
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
  const [deletingGroups, setDeletingGroups] = useState<Set<string>>(new Set());
  const [isUpdatingDefault, setIsUpdatingDefault] = useState(false);

  const { data, isLoading, refetch } = usePricingGroups({
    page: pagination.current,
    limit: pagination.pageSize,
  });

  const createPricingGroup = useCreatePricingGroup();
  const updatePricingGroup = useUpdatePricingGroup();
  const deletePricingGroup = useDeletePricingGroup();

  const pricingGroups: PricingGroupType[] = data?.pricingGroups ?? [];
  const totalPricingGroups = data?.pagination?.totalPricingGroups ?? 0;
  const isDeleteLoading =
    !!selectedGroup && deletingGroups.has(selectedGroup.id);

  // Get current default pricing group
  const currentDefaultGroup = pricingGroups.find((group) => group.isDefault);

  useEffect(() => {
    if (pagination.total !== totalPricingGroups) {
      setPagination((prev) => ({ ...prev, total: totalPricingGroups }));
    }
  }, [totalPricingGroups]);

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

  const handleInputChange = (
    field: keyof typeof formData,
    value: string | boolean
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

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

    if (group.isDefault && pricingGroups.length > 1) {
      setIsDeleteDefaultModalOpen(true);
      return;
    }

    setIsDeleteModalOpen(true);
  };
  const getDeleteDefaultMessage = () => {
    if (!selectedGroup) return "";

    const nextDefault = pricingGroups.find((g) => g.id !== selectedGroup.id);

    return `
"${selectedGroup.name}" is currently the default pricing group.
If you delete it, "${nextDefault?.name}" will automatically be set as the new default pricing group.
This action cannot be undone.
`;
  };

  const handleToggleDefault = async (group: PricingGroupType) => {
    const newDefaultState = !group.isDefault;

    // Prevent removing default if it's the only default group
    if (!newDefaultState && group.isDefault) {
      setIsCannotRemoveDefaultModalOpen(true);
      return;
    }

    // If trying to set as default and there's already a default group
    if (
      newDefaultState &&
      currentDefaultGroup &&
      currentDefaultGroup.id !== group.id
    ) {
      setPendingDefaultChange({
        type: "toggle",
        groupId: group.id,
        groupName: group.name,
        newDefaultState: true,
      });
      setIsDefaultChangeModalOpen(true);
      return;
    }

    // Otherwise proceed normally
    await executeToggleDefault(group.id, newDefaultState);
  };

  const executeToggleDefault = async (
    groupId: string,
    newDefaultState: boolean
  ) => {
    setUpdatingGroups((prev) => new Set(prev).add(groupId));
    setIsUpdatingDefault(true);

    const toastId = toast.loading(
      <div className="flex items-center gap-2">Updating pricing group...</div>
    );

    try {
      await updatePricingGroup.mutateAsync({
        id: groupId,
        isDefault: newDefaultState,
      });

      toast.success(
        `Pricing group ${
          newDefaultState ? "set as default" : "removed as default"
        }`,
        { id: toastId }
      );
      refetch();
    } catch (error: any) {
      console.error("Failed to update pricing group:", error);
      toast.error("Failed to update pricing group", { id: toastId });
    } finally {
      setUpdatingGroups((prev) => {
        const newSet = new Set(prev);
        newSet.delete(groupId);
        return newSet;
      });
      setIsUpdatingDefault(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const nameError = validateName(formData.name);
    const newErrors: FormErrors = {};
    if (nameError) newErrors.name = nameError;

    setErrors(newErrors);
    setTouched({ name: true });

    if (Object.keys(newErrors).length === 0) {
      // If trying to set as default and there's already a default group
      if (formData.isDefault && currentDefaultGroup) {
        setPendingDefaultChange({
          type: "create",
          groupName: formData.name.trim(),
          newDefaultState: true,
          formData: { ...formData },
        });
        setIsDefaultChangeModalOpen(true);
        setIsSubmitting(false);
        return;
      }

      await executeCreateGroup();
    }

    setIsSubmitting(false);
  };

  const executeCreateGroup = async () => {
    setIsUpdatingDefault(true);
    try {
      await createPricingGroup.mutateAsync({
        name: formData.name.trim(),
        isDefault: formData.isDefault,
      });

      resetForm();
      setIsCreateModalOpen(false);
      toast.success("Pricing group created successfully");
      refetch();
    } catch (error: any) {
      handleApiError(error, "create");
    } finally {
      setIsUpdatingDefault(false);
    }
  };

  const handleUpdateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroup) return;

    setIsSubmitting(true);

    const nameError = validateName(formData.name);
    const newErrors: FormErrors = {};
    if (nameError) newErrors.name = nameError;

    setErrors(newErrors);
    setTouched({ name: true });

    if (Object.keys(newErrors).length === 0) {
      // Prevent removing default if it's the only default group
      if (!formData.isDefault && selectedGroup.isDefault) {
        setIsCannotRemoveDefaultModalOpen(true);
        setIsSubmitting(false);
        return;
      }

      // If trying to set as default and there's already a different default group
      if (
        formData.isDefault &&
        currentDefaultGroup &&
        currentDefaultGroup.id !== selectedGroup.id
      ) {
        setPendingDefaultChange({
          type: "edit",
          groupId: selectedGroup.id,
          groupName: formData.name.trim(),
          newDefaultState: true,
          formData: { ...formData },
        });
        setIsDefaultChangeModalOpen(true);
        setIsSubmitting(false);
        return;
      }

      await executeUpdateGroup();
    }

    setIsSubmitting(false);
  };

  const executeUpdateGroup = async () => {
    if (!selectedGroup) return;

    setIsUpdatingDefault(true);
    try {
      await updatePricingGroup.mutateAsync({
        id: selectedGroup.id,
        name: formData.name.trim(),
        isDefault: formData.isDefault,
      });

      resetForm();
      setIsEditModalOpen(false);
      toast.success("Pricing group updated successfully");
      refetch();
    } catch (error: any) {
      handleApiError(error, "update");
    } finally {
      setIsUpdatingDefault(false);
    }
  };

  const handleConfirmDefaultChange = async () => {
    if (!pendingDefaultChange) return;

    setIsDefaultChangeModalOpen(false);

    const { type, groupId } = pendingDefaultChange;

    if (type === "toggle" && groupId) {
      await executeToggleDefault(groupId, true);
    } else if (type === "create") {
      setIsSubmitting(true);
      await executeCreateGroup();
      setIsSubmitting(false);
    } else if (type === "edit" && groupId) {
      setIsSubmitting(true);
      await executeUpdateGroup();
      setIsSubmitting(false);
    }

    setPendingDefaultChange(null);
  };

  const handleCancelDefaultChange = () => {
    setIsDefaultChangeModalOpen(false);
    setPendingDefaultChange(null);
  };

  const handleConfirmDelete = async () => {
    if (!selectedGroup) return;

    setDeletingGroups((prev) => new Set(prev).add(selectedGroup.id));

    try {
      await deletePricingGroup.mutateAsync(selectedGroup.id);

      toast.success(
        selectedGroup.isDefault
          ? "Default pricing group deleted. Another group was set as default."
          : "Pricing group deleted successfully"
      );

      setIsDeleteModalOpen(false);
      setIsDeleteDefaultModalOpen(false);
      setSelectedGroup(null);
      refetch();
    } catch (error) {
      toast.error("Failed to delete pricing group");
    } finally {
      setDeletingGroups((prev) => {
        const s = new Set(prev);
        s.delete(selectedGroup.id);
        return s;
      });
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

  const getDefaultChangeMessage = () => {
    if (!pendingDefaultChange || !currentDefaultGroup) return "";

    const { groupName, type } = pendingDefaultChange;

    let actionText = "";
    if (type === "toggle") {
      actionText = `set "${groupName}" as the default pricing group`;
    } else if (type === "create") {
      actionText = `create "${groupName}" as the default pricing group`;
    } else if (type === "edit") {
      actionText = `update "${groupName}" and set it as the default pricing group`;
    }

    return `Are you sure you want to ${actionText}? The current default pricing group "${currentDefaultGroup.name}" will be automatically removed as default.`;
  };

  const columns: TableColumn<PricingGroupType>[] = [
    {
      key: "name",
      title: "Group Name",
    },
    {
      key: "users",
      title: "Users Assigned",
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
              onClick={() =>
                !isUpdating && !isUpdatingDefault && handleToggleDefault(record)
              }
              disabled={isUpdating || isUpdatingDefault}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                record.isDefault ? "bg-success" : "bg-[#C60504]"
              } ${
                isUpdating || isUpdatingDefault
                  ? "opacity-50 cursor-not-allowed"
                  : "cursor-pointer"
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
            disabled={deletingGroups.has(record.id)}
            className={`text-primary-dark hover:text-black h-8 w-8 border border-primary-dark rounded-full flex items-center justify-center ${
              deletingGroups.has(record.id)
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
          >
            {deletingGroups.has(record.id) ? (
              <Loader className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 size={16} />
            )}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="bg-white">
      <div className="flex justify-between items-center mb-6">
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

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (isDeleteLoading) return;
          setIsDeleteModalOpen(false);
          setSelectedGroup(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Pricing Group"
        message={`Are you sure you want to delete the pricing group "${selectedGroup?.name}"? This action cannot be undone.`}
        confirmText={
          isDeleteLoading ? (
            <div className="flex items-center gap-2">
              <Loader className="h-4 w-4 animate-spin" />
              Deleting...
            </div>
          ) : (
            "Delete"
          )
        }
        cancelText="Cancel"
        variant="danger"
        confirmDisabled={isDeleteLoading}
        cancelDisabled={isDeleteLoading}
      />
      <ConfirmationModal
        isOpen={isDeleteDefaultModalOpen}
        onClose={() => {
          if (isDeleteLoading) return;
          setIsDeleteDefaultModalOpen(false);
          setSelectedGroup(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Default Pricing Group"
        message={getDeleteDefaultMessage()}
        confirmText={
          isDeleteLoading ? (
            <div className="flex items-center gap-2">
              <Loader className="h-4 w-4 animate-spin" />
              Deleting...
            </div>
          ) : (
            "Delete & Reassign Default"
          )
        }
        cancelText="Cancel"
        variant="danger"
      />

      <ConfirmationModal
        isOpen={isDefaultChangeModalOpen}
        onClose={handleCancelDefaultChange}
        onConfirm={handleConfirmDefaultChange}
        title="Change Default Pricing Group"
        message={getDefaultChangeMessage()}
        confirmText="Confirm"
        cancelText="Cancel"
        variant="danger"
      />

      <ConfirmationModal
        isOpen={isCannotRemoveDefaultModalOpen}
        onClose={() => setIsCannotRemoveDefaultModalOpen(false)}
        onConfirm={() => setIsCannotRemoveDefaultModalOpen(false)}
        title="Cannot Remove Default Pricing Group"
        message="At least one pricing group must be set as default. To change the default pricing group, please set another group as default first."
        confirmText="Understood"
        cancelDisabled
        cancelText={"cancel"}
        variant="danger"
      />
    </div>
  );
};

export default PricingGroup;
