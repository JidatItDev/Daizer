import { useEffect, useState } from "react";
import { Button } from "../../components/common/Button";
import { Table, type TableColumn } from "../../components/common/Table";
import Heading from "../../components/common/Heading";
import {
  Edit,
  SlidersHorizontal,
  Trash2,
  ArrowUp,
  ArrowDown,
  X,
  Loader,
  ClipboardIcon,
  LinkIcon,
} from "lucide-react";
import {
  useUsers,
  useUpdateUser,
  useDeleteUser,
  useCreateSignupLink,
  useSignupLinks,
} from "../../api/auth";
import { usePricingGroups } from "../../api/pricingGroup";
import Modal from "../../components/common/Modal";
import { Input } from "../../components/common/Input";
import ConfirmationModal from "../../components/common/ConfirmationModal";
import toast from "react-hot-toast";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  enabled: boolean;
  accountNumber?: string;
  amountSpent?: number;
  transactions?: number;
  pricingGroup?: string;
  pricingGroupId?: string;
}

interface PricingGroup {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
}

interface FilterState {
  status: {
    active: boolean;
    disable: boolean;
  };
  pricingGroups: Record<string, boolean>;
}

interface SortState {
  field: string;
  direction: "asc" | "desc";
}

interface FilterSectionProps {
  title: string;
  options: { id: string; label: string; checked: boolean }[];
  onSelect: (id: string) => void;
  isLoading?: boolean;
}

const FilterSection = ({
  title,
  options,
  onSelect,
  isLoading = false,
}: FilterSectionProps) => {
  if (isLoading) {
    return (
      <div className="mb-6">
        <h4 className="font-medium mb-3">{title}</h4>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center">
              <div className="mr-2 h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6">
      <h4 className="font-medium mb-3">{title}</h4>
      <div className="space-y-2">
        {options.map((option) => (
          <label key={option.id} className="flex items-center">
            <input
              type="checkbox"
              checked={option.checked}
              onChange={() => onSelect(option.id)}
              className="mr-2 h-4 w-4 text-primary-dark rounded accent-primary-dark"
            />
            {option.label}
          </label>
        ))}
      </div>
    </div>
  );
};

interface SortSectionProps {
  options: { key: string; label: string }[];
  currentSort: SortState;
  onSelect: (key: string) => void;
}

const SortSection = ({ options, currentSort, onSelect }: SortSectionProps) => {
  return (
    <div className="mb-6">
      <h4 className="font-medium mb-3">Sort by</h4>
      <div className="space-y-2">
        {options.map((option) => (
          <button
            key={option.key}
            className="flex items-center justify-between w-full p-2 hover:bg-gray-50 rounded"
            onClick={() => onSelect(option.key)}
          >
            <span>{option.label}</span>
            {currentSort.field === option.key &&
              (currentSort.direction === "asc" ? (
                <ArrowUp size={16} />
              ) : (
                <ArrowDown size={16} />
              ))}
          </button>
        ))}
      </div>
    </div>
  );
};

interface FilterDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onFilterChange: (filterType: keyof FilterState, value: string) => void;
  sort: SortState;
  onSortChange: (field: string) => void;
  pricingGroups: PricingGroup[];
  isLoadingPricingGroups: boolean;
}

const FilterDropdown = ({
  isOpen,
  onClose,
  filters,
  onFilterChange,
  sort,
  onSortChange,
  pricingGroups,
  isLoadingPricingGroups,
}: FilterDropdownProps) => {
  if (!isOpen) return null;

  const statusOptions = [
    { id: "active", label: "Active", checked: filters.status.active },
    { id: "disable", label: "Disable", checked: filters.status.disable },
  ];

  const pricingGroupOptions = pricingGroups.map((group) => ({
    id: group.id,
    label: group.name,
    checked: filters.pricingGroups[group.id] || false,
  }));

  const sortOptions = [{ key: "name", label: "Name" }];

  return (
    <div className="absolute top-7  right-0 md:top-full  mt-2 w-full md:w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Filters & Sort</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </div>

        <SortSection
          options={sortOptions}
          currentSort={sort}
          onSelect={onSortChange}
        />

        <FilterSection
          title="Status"
          options={statusOptions}
          onSelect={(key) => onFilterChange("status", key)}
        />

        <FilterSection
          title="Pricing Group"
          options={pricingGroupOptions}
          onSelect={(id) => onFilterChange("pricingGroups", id)}
          isLoading={isLoadingPricingGroups}
        />
      </div>
    </div>
  );
};

const UserManagement = () => {
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 5,
    total: 0,
  });

  const [signupLinksPagination, setSignupLinksPagination] = useState({
    current: 1,
    pageSize: 5,
    total: 0,
  });

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    status: {
      active: false,
      disable: false,
    },
    pricingGroups: {},
  });

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const [createFormData, setCreateFormData] = useState({
    fullName: "",
    email: "",
    pricingGroup: "",
  });

  const [editFormData, setEditFormData] = useState({
    fullName: "",
    email: "",
    pricingGroup: "",
    balance: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: pricingGroupsData, isLoading: isLoadingPricingGroups } =
    usePricingGroups();
  const pricingGroups = pricingGroupsData?.pricingGroups || [];

  const { data: signupLinksData, isLoading: isSignupLinksLoading } =
    useSignupLinks({
      page: signupLinksPagination.current,
      limit: signupLinksPagination.pageSize,
    });
  const signupLinks = signupLinksData?.links ?? [];

  useEffect(() => {
    if (signupLinksData?.pagination?.totalLinks) {
      setSignupLinksPagination((prev) => ({
        ...prev,
        total: signupLinksData.pagination.totalLinks,
      }));
    }
  }, [signupLinksData]);

  // console.log("signupLinks", signupLinksData);

  const [sort, setSort] = useState<SortState>({
    field: "name",
    direction: "asc",
  });

  const selectedPricingGroupIds = Object.entries(filters.pricingGroups)
    .filter(([_, isSelected]) => isSelected)
    .map(([id]) => id);

  const { data, isLoading, refetch } = useUsers({
    page: pagination.current,
    limit: pagination.pageSize,
    status:
      filters.status.active && !filters.status.disable
        ? true
        : !filters.status.active && filters.status.disable
        ? false
        : undefined,
    pricingGroupIds:
      selectedPricingGroupIds.length > 0 ? selectedPricingGroupIds : undefined,
    sortField: sort.field,
    sortOrder: sort.direction,
  });

  const updateUserMutation = useUpdateUser();
  const isUpdating = updateUserMutation.isPending;
  const deleteUserMutation = useDeleteUser();

  const users = data?.users ?? [];
  const totalUsers = data?.pagination?.totalUsers ?? 0;

  if (pagination.total !== totalUsers) {
    setPagination((prev) => ({ ...prev, total: totalUsers }));
  }

  const handlePageChange = (page: number, pageSize: number) => {
    setPagination((prev) => ({
      ...prev,
      current: page,
      pageSize,
    }));
  };

  const handleViewDetails = (userId: string) => {
    console.log(userId);
    // console.log("View details for user:", userId);
  };

  const handleEdit = (user: User) => {
    setSelectedUser(user);
    setEditFormData({
      fullName: user.name,
      email: user.email,
      pricingGroup: user.pricingGroupId || "",
      balance: user.amountSpent?.toString() || "",
    });
    setIsEditModalOpen(true);
  };

  const handleDelete = (user: User) => {
    setSelectedUser(user);
    setIsDeleteModalOpen(true);
  };

  const handleSignupLinksPageChange = (page: number, pageSize: number) => {
    setSignupLinksPagination((prev) => ({
      ...prev,
      current: page,
      pageSize,
    }));
  };

  const handleToggleStatus = async (user: User) => {
    setUpdatingUserId(user.id);
    try {
      await updateUserMutation.mutateAsync({
        id: user.id,
        payload: { isActive: !user.isActive },
      });
      toast.success(
        `User ${!user.isActive ? "activated" : "deactivated"} successfully`
      );
      refetch();
      setUpdatingUserId(null);
    } catch (error: any) {
      console.error("Failed to update user status:", error);
      toast.error("Failed to update user status");
      setUpdatingUserId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedUser) return;

    try {
      await deleteUserMutation.mutateAsync(selectedUser.id);
      setIsDeleteModalOpen(false);
      setSelectedUser(null);
      toast.success("User deleted successfully");
      refetch();
    } catch (error: any) {
      console.error("Failed to delete user:", error);
      toast.error("Failed to delete user");
    }
  };
  const { mutateAsync: createSignupLink } = useCreateSignupLink();

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // console.log("Creating account with:", createFormData);
      let pricingGroupId = createFormData.pricingGroup;
      if (!pricingGroupId) {
        const defaultPricingGroup = pricingGroups.find(
          (group: PricingGroup) => group.isDefault
        );
        pricingGroupId = defaultPricingGroup?.id || null;
      }
      const payload = {
        email: createFormData?.email || "",
        name: createFormData?.fullName || "",
        pricingGroupId: pricingGroupId || null,
      };
      // console.log("payload", payload);

      await createSignupLink(payload);
      // console.log(response);

      toast.success("Signup link created successfully");

      setCreateFormData({
        fullName: "",
        email: "",
        pricingGroup: "",
      });
      setIsCreateModalOpen(false);

      // console.log("Account created successfully//");
    } catch (error: any) {
      if (error?.response?.status === 409) {
        // console.log("error if called");
        toast.error("Email already exists.");
      }
      // console.log("Failed to create account:", error);
      toast.error(`Failed to create account`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setIsSubmitting(true);

    try {
      const payload = {
        name: editFormData.fullName,
        email: editFormData.email,
        pricingGroupId: editFormData.pricingGroup,
      };

      await updateUserMutation.mutateAsync({
        id: selectedUser.id,
        payload,
      });

      setEditFormData({
        fullName: "",
        email: "",
        pricingGroup: "",
        balance: "",
      });
      setIsEditModalOpen(false);
      setSelectedUser(null);

      toast.success("User updated successfully");
      refetch();
    } catch (error: any) {
      console.error("Failed to update user:", error);
      toast.error("Failed to update user");
    } finally {
      setIsSubmitting(false);
    }
  };

  type CreateFormFields = keyof typeof createFormData;
  type EditFormFields = keyof typeof editFormData;
  type AllFormFields = CreateFormFields | EditFormFields;

  const handleInputChange = (
    formData: any,
    setFormData: any,
    field: AllFormFields,
    value: string
  ) => {
    console.log(formData);
    setFormData((prev: any) => ({ ...prev, [field]: value }));
    // console.log(formData);
  };

  const handleFilterChange = (filterType: keyof FilterState, value: string) => {
    if (filterType === "status") {
      setFilters((prev) => ({
        ...prev,
        status: {
          ...prev.status,
          [value]: !prev.status[value as keyof typeof prev.status],
        },
      }));
    } else if (filterType === "pricingGroups") {
      setFilters((prev) => ({
        ...prev,
        pricingGroups: {
          ...prev.pricingGroups,
          [value]: !prev.pricingGroups[value],
        },
      }));
    }
  };

  const handleSortChange = (field: string) => {
    setSort((prev) => ({
      field,
      direction:
        prev.field === field && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const columns: TableColumn<User>[] = [
    {
      key: "name",
      title: "Name",
    },
    {
      key: "email",
      title: "Email",
    },
    {
      key: "accountNumber",
      title: "Account Number",
    },
    {
      key: "amountSpent",
      title: "Amount Spent",
    },
    {
      key: "transactions",
      title: "Transactions",
    },

    {
      key: "status",
      title: "Status",
      align: "center",
      render: (_: any, record: User) => {
        return (
          <div className="flex justify-between gap-5 items-center">
            <span
              className={`px-2 py-1 rounded-full text-sm font-regular ${
                record.isActive ? "text-success" : "text-error"
              }`}
            >
              {record.isActive ? "Active" : "Disabled"}
            </span>
            <button
              onClick={() => !isUpdating && handleToggleStatus(record)}
              disabled={isUpdating}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                record.isActive ? "bg-success" : "bg-[#C60504]"
              } ${
                isUpdating ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  record.isActive ? "translate-x-6" : "translate-x-1"
                }`}
              />
              {isUpdating && updatingUserId === record.id && (
                <div
                  className={`absolute inset-0 flex items-center ${
                    record.isActive ? "justify-start" : "justify-end"
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
      render: (_: any, record: User) => (
        <div className="flex gap-2 justify-center">
          <Button
            variant="outline"
            size="sm"
            className="px-3 py-1 text-primary-dark border-primary-dark hover:bg-gray-50 min-w-[140px]"
            onClick={() => handleViewDetails(record.id)}
            disabled
          >
            View Details
          </Button>
          <button
            onClick={() => handleEdit(record)}
            className="text-primary-dark hover:text-black h-8 w-8 border border-primary-dark rounded-full flex items-center justify-center py-2 md:py-3"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => handleDelete(record)}
            className="text-primary-dark hover:text-black h-8 w-8 border border-primary-dark rounded-full flex items-center justify-center py-2 md:py-3"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  const signupLinkColumns: TableColumn<any>[] = [
    { key: "email", title: "Email" },
    { key: "name", title: "Name" },
    {
      key: "pricingGroupId",
      title: "Pricing Group",
      render: (_: any, record: any) => {
        const pricingGroup = pricingGroups.find(
          (group: PricingGroup) => group.id === record.pricingGroupId
        );
        return (
          <span>
            {pricingGroup ? pricingGroup.name : record.pricingGroupId}
          </span>
        );
      },
    },
    { key: "expiresAt", title: "Expires At" },
    {
      key: "isUsed",
      title: "Status",
      render: (_: any, record: any) => (
        <span
          className={`px-2 py-1 rounded-full text-sm ${
            record.isUsed ? "text-success" : "text-error"
          }`}
        >
          {record.isUsed ? "Used" : "Pending"}
        </span>
      ),
    },
    {
      key: "actions",
      title: "Actions",
      render: (_: any, record: any) => {
        const signupUrl = `${window.location.origin}/register?token=${record.token}`;

        const handleCopy = async () => {
          try {
            await navigator.clipboard.writeText(signupUrl);
            // You can swap this with a toast/snackbar
            toast.success("Signup link copied!");
          } catch (err) {
            console.error("Failed to copy link", err);
          }
        };

        return (
          <div className="flex gap-3">
            <button
              onClick={handleCopy}
              className="text-primary-dark hover:text-black h-8 w-8 border border-primary-dark rounded-full flex items-center justify-center py-2 md:py-3"
            >
              <ClipboardIcon size={16} />
            </button>

            {/* Open Link Button */}
            <a
              href={signupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-dark hover:text-black h-8 w-8 border border-primary-dark rounded-full flex items-center justify-center py-2 md:py-3"
              title="Open Link"
            >
              <LinkIcon size={16} />
            </a>
          </div>
        );
      },
    },
  ];

  return (
    <div className="bg-white relative">
      <div className="flex justify-between items-center mb-6 flex-col md:flex-row gap-4">
        <div className="flex items-center gap-4">
          <Heading>User Management</Heading>
        </div>
        <div className="flex items-center gap-4 relative ">
          <button
            className=" text-primary-dark hover:text-black h-9 w-9 border border-primary-dark rounded-full flex items-center justify-center"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
          >
            <SlidersHorizontal size={20} strokeWidth={2.5} />
          </button>
          <div>
            <FilterDropdown
              isOpen={isFilterOpen}
              onClose={() => setIsFilterOpen(false)}
              filters={filters}
              onFilterChange={handleFilterChange}
              sort={sort}
              onSortChange={handleSortChange}
              pricingGroups={pricingGroups}
              isLoadingPricingGroups={isLoadingPricingGroups}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border-t-2 border-black/50">
        <Table
          columns={columns}
          data={users}
          loading={isLoading}
          pagination={{
            ...pagination,
            onChange: handlePageChange,
          }}
        />
      </div>
      <div className="mt-12">
        <div className="flex justify-between items-center mb-6 flex-col md:flex-row gap-4">
          <div className="flex items-center gap-4">
            <Heading>User Management</Heading>
          </div>
          <div className="flex items-center gap-4 relative ">
            <Button
              variant="primary"
              size="md"
              className="text-sm font-normal px-6 !py-2"
              onClick={() => setIsCreateModalOpen(true)}
            >
              Create Signup link
            </Button>
          </div>
        </div>
        <div className="bg-white border-t-2 border-black/50 mt-4">
          <Table
            columns={signupLinkColumns}
            data={signupLinks}
            loading={isSignupLinksLoading}
            pagination={{
              ...signupLinksPagination,
              onChange: handleSignupLinksPageChange,
            }}
          />
        </div>
      </div>

      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        heading="Create Account"
        subheading="create a user signup link for your client"
        widthClass="max-w-[850px]"
      >
        <form onSubmit={handleCreateAccount} className="space-y-12 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Input
                type="text"
                value={createFormData.fullName}
                onChange={(e) =>
                  handleInputChange(
                    createFormData,
                    setCreateFormData,
                    "fullName",
                    e.target.value
                  )
                }
                placeholder="Full Name"
                required
              />
            </div>

            <div className="space-y-2">
              <Input
                type="email"
                value={createFormData.email}
                onChange={(e) =>
                  handleInputChange(
                    createFormData,
                    setCreateFormData,
                    "email",
                    e.target.value
                  )
                }
                placeholder="Email Address"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <div className="relative">
                <select
                  value={createFormData.pricingGroup}
                  onChange={(e) =>
                    handleInputChange(
                      createFormData,
                      setCreateFormData,
                      "pricingGroup",
                      e.target.value
                    )
                  }
                  className="w-full p-2 py-3 border-b-[2px] border-gray-300 lg:text-lg md:text-base text-sm bg-transparent focus:outline-none focus:border-black appearance-none"
                >
                  <option value="">Select Pricing Group</option>
                  {pricingGroups.map((group: PricingGroup) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
                {/* Custom dropdown arrow */}
                <div className="absolute right-0 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <svg
                    className="w-4 h-4 text-black"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <Button type="submit" loading={isSubmitting} className="w-full">
            {isSubmitting ? "Creating..." : "Create Account"}
          </Button>
        </form>
      </Modal>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedUser(null);
        }}
        heading="Edit Account"
        subheading="Update user account details"
        widthClass="max-w-[850px]"
      >
        <form onSubmit={handleUpdateAccount} className="space-y-12 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Input
                type="text"
                value={editFormData.fullName}
                onChange={(e) =>
                  handleInputChange(
                    editFormData,
                    setEditFormData,
                    "fullName",
                    e.target.value
                  )
                }
                placeholder="Full Name"
                required
              />
            </div>

            <div className="space-y-2">
              <Input
                type="email"
                value={editFormData.email}
                onChange={(e) =>
                  handleInputChange(
                    editFormData,
                    setEditFormData,
                    "email",
                    e.target.value
                  )
                }
                placeholder="Email Address"
                disabled
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              {/* Custom styled dropdown to match Input component */}
              <div className="relative">
                <select
                  value={editFormData.pricingGroup}
                  onChange={(e) =>
                    handleInputChange(
                      editFormData,
                      setEditFormData,
                      "pricingGroup",
                      e.target.value
                    )
                  }
                  className="w-full py-3 border-b-[2px] p-2 border-gray-300 lg:text-lg md:text-base text-sm bg-transparent focus:outline-none focus:border-black appearance-none"
                  required
                >
                  <option value="">Select Pricing Group</option>
                  {pricingGroups.map((group: PricingGroup) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
                {/* Custom dropdown arrow */}
                <div className="absolute right-0 top-1/2 transform -translate-y-1/2 pointer-events-none">
                  <svg
                    className="w-4 h-4 text-black"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Input
                type="number"
                value={editFormData.balance}
                onChange={(e) =>
                  handleInputChange(
                    editFormData,
                    setEditFormData,
                    "balance",
                    e.target.value
                  )
                }
                disabled
                placeholder="Balance"
              />
            </div>
          </div>

          <Button type="submit" loading={isSubmitting} className="w-full">
            {isSubmitting ? "Updating..." : "Update Account"}
          </Button>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedUser(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete User"
        message={`Are you sure you want to delete the user "${selectedUser?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
};

export default UserManagement;
