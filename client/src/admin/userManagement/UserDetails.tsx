import  { useState, useEffect } from "react";
import { IoCaretBackOutline } from "react-icons/io5";
import { SlidersHorizontal, User } from "lucide-react";
import { useParams } from "react-router-dom";

import { Table, type TableColumn } from "../../components/common/Table";
import { useUserDetails } from "../../api/auth"; // adjust path if needed
import { DateFilterPanel } from "../../components/common/DateFilterPanel";
import { Loader } from "../../components/common/Loader";

// ------------------ Types ------------------
interface OrderRow {
  orderId: string;
  productName: string;
  date: string;
  price: string;
  quantity: number;
  time: string;
  status: string;
}

// ------------------ Component ------------------
const UserDetails = () => {
  const { id: userId } = useParams<{ id: string }>();
  const [showDateFilter, setShowDateFilter] = useState(false);
  // const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null); // applied
  const [draftDate, setDraftDate] = useState<string | null>(null); // temp

  // const { data, isLoading } = useUserDetails(userId);
  const { data, isLoading } = useUserDetails(userId, selectedDate);

  const user = data?.user;
  const wallet = user?.wallet;
  const purchases = user?.purchases ?? [];

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 5,
    total: purchases.length,
  });

  useEffect(() => {
    setPagination((prev) => ({
      ...prev,
      total: purchases.length,
    }));
  }, [purchases]);

  const handlePageChange = (page: number, pageSize: number) => {
    setPagination((prev) => ({
      ...prev,
      current: page,
      pageSize,
    }));
  };
  const getProductNameFromMetadata = (metadata?: string) => {
    try {
      return JSON.parse(metadata || "{}")?.productName || "N/A";
    } catch {
      return "N/A";
    }
  };
  // ------------------ Orders Mapping ------------------
  const orderData: OrderRow[] = purchases.map((p: any) => ({
    orderId: p.id,
    productName: getProductNameFromMetadata(p.metadata) || "N/A",
    date: new Date(p.createdAt).toLocaleDateString(),
    price: `$${p.amount}`,
    quantity: p.quantity || 1,
    time: new Date(p.createdAt).toLocaleTimeString(),
    status: p.status,
  }));

  // ------------------ Table Columns ------------------
  const columns: TableColumn<OrderRow>[] = [
    { key: "orderId", title: "Order ID" },
    {
      key: "productName",
      title: "Product Name",
    },
    { key: "date", title: "Date" },
    { key: "price", title: "Price" },
    { key: "quantity", title: "Quantity" },
    { key: "time", title: "Time" },
    {
      key: "status",
      title: "Status",
      render: (_: any, record: OrderRow) => (
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
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader size="xxl" />
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => window.history.back()}
          className="flex items-center text-primary-dark border border-primary-dark rounded-full p-2"
        >
          <IoCaretBackOutline />
        </button>
        <h1 className="text-2xl font-semibold">User Management</h1>
      </div>

      {/* User Info */}
      <div className="rounded-lg p-6 mb-6 font-poppins">
        <div className="flex justify-between items-start gap-7">
          <div className="flex items-center gap-4 bg-[#F9F6FE] w-full py-5 justify-center rounded-2xl shadow-custom-primary">
            <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
              <User size={32} className="text-gray-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{user?.name}</h2>
              <p className="text-gray-500">{user?.email}</p>
            </div>
          </div>

          <div className="bg-[#F9F6FE] w-full py-5 flex flex-col items-center justify-center rounded-2xl shadow-custom-primary">
            <p className="text-sm text-gray-500 mb-1">Current Balance</p>
            <p className="text-3xl font-bold">${wallet?.balance ?? "0.00"}</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mt-6 bg-[#F9F6FE] rounded-2xl shadow-custom-primary py-9 px-8">
          <div>
            <p className="text-sm text-gray-500 mb-1">Full Name</p>
            <p className="font-medium">{user?.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Email Address</p>
            <p className="font-medium">{user?.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Group Name</p>
            <p className="font-medium">{user?.pricingGroup?.name || "N/A"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 mb-1">Status</p>
            <p
              className={`font-medium ${
                user?.status ? "text-success" : "text-error"
              }`}
            >
              {user?.status ? "Active" : "Disabled"}
            </p>
          </div>
        </div>
      </div>

      {/* Order History */}
      <div className="bg-white border-t-2 border-black/50 pt-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Order History</h2>
          {/* <button className="text-primary-dark h-9 w-9 border border-primary-dark rounded-full flex items-center justify-center">
            <SlidersHorizontal size={20} strokeWidth={2.5} />
          </button> */}
          <div className="relative">
            <button
              onClick={() => setShowDateFilter((prev) => !prev)}
              className="text-primary-dark h-9 w-9 border border-primary-dark rounded-full flex items-center justify-center"
            >
              <SlidersHorizontal size={20} strokeWidth={2.5} />
            </button>

            {/* {showDateFilter && (
              <DateFilterPanel
                selectedDate={selectedDate}
                onDateChange={(date) => {
                  setSelectedDate(date);
                  setShowDateFilter(false);
                }}
                onClose={() => setShowDateFilter(false)}
              />
            )} */}
            {showDateFilter && (
              <DateFilterPanel
                selectedDate={draftDate}
                onDateChange={setDraftDate}
                onApply={() => {
                  setSelectedDate(draftDate);
                  setShowDateFilter(false);
                }}
                onClear={() => {
                  setDraftDate(null);
                  setSelectedDate(null);
                  setShowDateFilter(false);
                }}
                onClose={() => setShowDateFilter(false)}
              />
            )}
          </div>
        </div>

        <Table
          columns={columns}
          data={orderData}
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

export default UserDetails;
