import { useState } from "react";
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
} from "lucide-react";
import { useUsers } from "../../api/auth";
import { usePricingGroups } from "../../api/pricingGroup";

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
  pricingGroups: Record<string, boolean>; // key: pricingGroupId, value: checked state
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
              className="mr-2 h-4 w-4 text-primary-dark rounded"
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
    <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
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

        {/* Sort Section */}
        <SortSection
          options={sortOptions}
          currentSort={sort}
          onSelect={onSortChange}
        />

        {/* Status Filter */}
        <FilterSection
          title="Status"
          options={statusOptions}
          onSelect={(key) => onFilterChange("status", key)}
        />

        {/* Pricing Group Filter */}
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
    pageSize: 10,
    total: 0,
  });

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    status: {
      active: false,
      disable: false,
    },
    pricingGroups: {}, // Empty object to store pricing group selections
  });

  const { data: pricingGroupsData, isLoading: isLoadingPricingGroups } =
    usePricingGroups();
  const pricingGroups = pricingGroupsData?.pricingGroups || [];

  const [sort, setSort] = useState<SortState>({
    field: "name",
    direction: "asc",
  });

  // Get selected pricing group IDs for API call
  const selectedPricingGroupIds = Object.entries(filters.pricingGroups)
    .filter(([_, isSelected]) => isSelected)
    .map(([id]) => id);

  const { data, isLoading } = useUsers({
    page: pagination.current,
    limit: pagination.pageSize,
    status:
      filters.status.active && !filters.status.disable
        ? true // isActive=true
        : !filters.status.active && filters.status.disable
        ? false // isActive=false
        : undefined,
    pricingGroupIds:
      selectedPricingGroupIds.length > 0 ? selectedPricingGroupIds : undefined,
    sortField: sort.field,
    sortOrder: sort.direction,
  });

  const users = data?.users ?? [];
  const totalUsers = data?.pagination?.totalUsers ?? 0;

  // Update total when data arrives
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

  const handleSendRequest = (userId: string) => {
    console.log("Send request for user:", userId);
  };

  const handleViewDetails = (userId: string) => {
    console.log("View details for user:", userId);
  };

  const handleEdit = (userId: string) => {
    console.log("Edit user:", userId);
  };

  const handleDelete = (userId: string) => {
    console.log("Delete user:", userId);
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
      key: "resetPassword",
      title: "Reset Password",
      render: (_: any, record: User) => (
        <Button
          variant="outline"
          size="sm"
          className="text-error border-rose-200 hover:bg-rose-50  min-w-[140px]"
          onClick={() => handleSendRequest(record.id)}
        >
          Send Request
        </Button>
      ),
    },
    {
      key: "status",
      title: "Status",
      render: (_: any, record: User) => (
        <span
          className={`px-2 py-1 rounded-full text-sm font-regular ${
            record.isActive ? "text-success" : "text-error"
          }`}
        >
          {record.isActive ? "Active" : "Disabled"}
        </span>
      ),
    },
    {
      key: "enabled",
      title: "Enable",
      align: "center",
      render: (_: any, record: User) => (
        <div className="flex justify-center">
          <button
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              record.enabled ? "bg-success" : "bg-[#C60504]"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                record.enabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      ),
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
            className="px-3 py-1 text-primary-dark border-primary-dark hover:bg-gray-50  min-w-[140px]"
            onClick={() => handleViewDetails(record.id)}
          >
            View Details
          </Button>
          <button
            onClick={() => handleEdit(record.id)}
            className=" text-primary-dark hover:text-black  h-8 w-8 border border-primary-dark rounded-full flex items-center justify-center  py-2 md:py-3  "
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => handleDelete(record.id)}
            className=" text-primary-dark hover:text-black  h-8 w-8 border border-primary-dark rounded-full flex items-center justify-center  py-2 md:py-3  "
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="bg-white relative">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 ">
        <div className="flex items-center gap-4">
          <Heading>User Management</Heading>
        </div>
        <div className="flex items-center gap-4 relative">
          <button
            className=" text-primary-dark hover:text-black h-9 w-9 border border-primary-dark rounded-full flex items-center justify-center"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
          >
            <SlidersHorizontal size={20} strokeWidth={2.5} />
          </button>

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

          <Button
            variant="primary"
            size="md"
            className="text-sm font-normal px-6 !py-2"
          >
            Create Account
          </Button>
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
    </div>
  );
};

export default UserManagement;
