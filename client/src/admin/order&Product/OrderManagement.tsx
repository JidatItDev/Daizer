import { useState } from "react";
import { SlidersHorizontal, ArrowUp, ArrowDown, X } from "lucide-react";

import { useAllOrders } from "../../api/auth";
import { Table, type TableColumn } from "../../components/common/Table";
import { Input } from "../../components/common/Input";
import Heading from "../../components/common/Heading";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/common/Button";

interface OrderRow {
  orderId: string;
  userName: string;
  userEmail: string;
  userId: string;
  productName: string;
  date: string;
  price: string;
  status: string;
}

interface SortState {
  field: "createdAt" | "amount" | "status" | "user";
  direction: "asc" | "desc";
}

interface DateFilter {
  from?: string;
  to?: string;
}

const OrderManagement = () => {
  const navigate = useNavigate();
  /* ---------------- Pagination ---------------- */
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const handlePageChange = (page: number, pageSize: number) => {
    setPagination((prev) => ({
      ...prev,
      current: page,
      pageSize,
    }));
  };

  /* ---------------- Sorting ---------------- */
  const [sort, setSort] = useState<SortState>({
    field: "user",
    direction: "asc",
  });

  const handleSortChange = (field: SortState["field"]) => {
    setSort((prev) => ({
      field,
      direction:
        prev.field === field && prev.direction === "asc" ? "desc" : "asc",
    }));
  };
  const handleViewDetails = (userId: string) => {
    navigate(`/admin/user/${userId}`);
  };

  /* ---------------- Date Filter ---------------- */
  const [dateFilter, setDateFilter] = useState<DateFilter>({});

  /* ---------------- Filter UI ---------------- */
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  /* ---------------- API ---------------- */
  const { data, isFetching } = useAllOrders({
    page: pagination.current,
    limit: pagination.pageSize,
    sortField: sort.field,
    sortOrder: sort.direction,
    fromDate: dateFilter.from,
    toDate: dateFilter.to,
  });

  const orders = data?.orders ?? [];
  const totalOrders = data?.pagination?.totalOrders ?? 0;

  console.log("orders", orders);

  if (pagination.total !== totalOrders) {
    setPagination((prev) => ({ ...prev, total: totalOrders }));
  }

  /* ---------------- Helpers ---------------- */
  const getProductNameFromMetadata = (metadata?: string) => {
    try {
      return JSON.parse(metadata || "{}")?.productName || "N/A";
    } catch {
      return "N/A";
    }
  };
  console.log("object");
  /* ---------------- Table Columns ---------------- */
  const orderColumns: TableColumn<OrderRow>[] = [
    { key: "orderId", title: "Order ID" },
    { key: "userName", title: "User" },
    { key: "userEmail", title: "Email" },
    { key: "productName", title: "Product" },
    { key: "date", title: "Date" },
    { key: "price", title: "Price" },
    {
      key: "status",
      title: "Status",
      render: (_, record) => (
        <span
          className={`px-2 py-1 rounded-full text-sm ${
            record.status === "completed"
              ? "text-success"
              : record.status === "pending"
              ? "text-warning"
              : "text-gray-500"
          }`}
        >
          {record.status}
        </span>
      ),
    },
    {
      key: "action",
      title: "Action",
      align: "center",
      render: (_, record) => (
        <div className="flex gap-2 justify-center">
          <Button
            variant="outline"
            size="sm"
            className="px-3 py-1 text-primary-dark border-primary-dark hover:bg-gray-50 min-w-[140px]"
            onClick={() => handleViewDetails(record.userId)}
          >
            View User
          </Button>
        </div>
      ),
    },
  ];

  /* ---------------- Map Data ---------------- */
  const orderData: OrderRow[] = orders.map((o: any) => ({
    orderId: o.orderId,
    userName: o.userName,
    userEmail: o.userEmail,
    userId: o.userId,
    productName: getProductNameFromMetadata(o.metadata),
    date: new Date(o.createdAt).toLocaleDateString(),
    price: `$${o.amount}`,
    status: o.status,
  }));

  /* ---------------- UI ---------------- */
  return (
    <div className="bg-white relative">
      <div className="flex justify-between items-center mb-6">
        <Heading>Order Management</Heading>

        <div className="relative">
          <button
            className="text-primary-dark h-9 w-9 border border-primary-dark rounded-full flex items-center justify-center"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
          >
            <SlidersHorizontal size={20} />
          </button>

          {isFilterOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white border rounded-lg shadow-lg z-10 p-4">
              <div className="flex justify-between mb-4">
                <h3 className="font-semibold">Filters & Sort</h3>
                <button onClick={() => setIsFilterOpen(false)}>
                  <X size={18} />
                </button>
              </div>

              {/* Sort */}
              <div className="mb-6">
                <h4 className="font-medium mb-3">Sort by</h4>
                {[
                  { key: "createdAt", label: "Date" },
                  { key: "amount", label: "Price" },
                  { key: "status", label: "Status" },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    className="flex justify-between w-full p-2 hover:bg-gray-50 rounded"
                    onClick={() => handleSortChange(opt.key as any)}
                  >
                    <span>{opt.label}</span>
                    {sort.field === opt.key &&
                      (sort.direction === "asc" ? (
                        <ArrowUp size={16} />
                      ) : (
                        <ArrowDown size={16} />
                      ))}
                  </button>
                ))}
              </div>

              {/* Date Filter */}
              <div>
                <h4 className="font-medium mb-3">Date Range</h4>
                <div className="space-y-3">
                  <Input
                    type="date"
                    value={dateFilter.from || ""}
                    onChange={(e) =>
                      setDateFilter((p) => ({ ...p, from: e.target.value }))
                    }
                  />
                  <Input
                    type="date"
                    value={dateFilter.to || ""}
                    onChange={(e) =>
                      setDateFilter((p) => ({ ...p, to: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Table
        columns={orderColumns}
        data={orderData}
        loading={isFetching}
        pagination={{
          ...pagination,
          onChange: handlePageChange,
        }}
      />
    </div>
  );
};

export default OrderManagement;
