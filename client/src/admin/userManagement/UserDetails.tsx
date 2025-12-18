// import React, { useState } from "react";
// import { IoCaretBackOutline } from "react-icons/io5";
// import { SlidersHorizontal, ArrowUp, ArrowDown, X, User } from "lucide-react";

// // Reusable Table Component (from your code)
// interface TableColumn<T = any> {
//   key: string;
//   title: string;
//   render?: (value: any, record: T, index: number) => React.ReactNode;
//   width?: string;
//   align?: "left" | "center" | "right";
// }

// interface TableProps<T = any> {
//   columns: TableColumn<T>[];
//   data: T[];
//   className?: string;
//   loading: boolean;
//   pagination?: {
//     current: number;
//     pageSize: number;
//     total: number;
//     onChange: (page: number, pageSize: number) => void;
//   };
// }

// const Loader = ({ size = "md" }: { size?: string }) => {
//   const sizeClasses = {
//     sm: "w-4 h-4",
//     md: "w-8 h-8",
//     lg: "w-12 h-12",
//     xl: "w-16 h-16",
//   };
//   return (
//     <div
//       className={`${
//         sizeClasses[size as keyof typeof sizeClasses] || sizeClasses.md
//       } border-4 border-gray-200 border-t-primary-dark rounded-full animate-spin`}
//     ></div>
//   );
// };

// function Table<T extends Record<string, any>>({
//   columns,
//   data,
//   className = "",
//   loading,
//   pagination,
// }: TableProps<T>) {
//   return (
//     <>
//       <div className={`overflow-x-auto ${className}`}>
//         {loading ? (
//           <div className="flex items-center justify-center h-full w-full py-2">
//             <Loader size="xl" />
//           </div>
//         ) : (
//           <table className="w-full border-collapse font-poppins">
//             <thead>
//               <tr className="border-b border-gray-200">
//                 {columns.map((column) => (
//                   <th
//                     key={column.key}
//                     className={`py-4 px-4 text-left text-sm font-normal ${
//                       column.align === "center"
//                         ? "text-center"
//                         : column.align === "right"
//                         ? "text-right"
//                         : "text-left"
//                     }`}
//                     style={column.width ? { width: column.width } : {}}
//                   >
//                     {column.title}
//                   </th>
//                 ))}
//               </tr>
//             </thead>
//             <tbody>
//               {data.map((record, index) => (
//                 <tr
//                   key={index}
//                   className="hover:border-b hover:border-gray-100 hover:bg-gray-50 transition-colors"
//                 >
//                   {columns.map((column) => (
//                     <td
//                       key={`${index}-${column.key}`}
//                       className={`py-4 px-4 text-sm text-black/50 ${
//                         column.align === "center"
//                           ? "text-center"
//                           : column.align === "right"
//                           ? "text-right"
//                           : "text-left"
//                       }`}
//                     >
//                       {column.render
//                         ? column.render(
//                             record[column.key as keyof T],
//                             record,
//                             index
//                           )
//                         : (record[column.key as keyof T] as any) || "N/A"}
//                     </td>
//                   ))}
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         )}
//       </div>
//       {pagination && (
//         <div className="flex flex-wrap items-center justify-between gap-4 px-4 py-3 mt-4 border-t border-gray-200 sm:flex-nowrap">
//           <div className="text-sm text-gray-600">
//             Showing {(pagination.current - 1) * pagination.pageSize + 1} to{" "}
//             {Math.min(
//               pagination.current * pagination.pageSize,
//               pagination.total
//             )}{" "}
//             of {pagination.total} entries
//           </div>

//           <div className="flex items-center gap-2 font-poppins">
//             <div className="flex items-center space-x-2">
//               <span className="text-sm text-gray-600">Rows per page:</span>
//               <select
//                 value={pagination.pageSize}
//                 onChange={(e) => pagination.onChange(1, Number(e.target.value))}
//                 className="h-8 pl-2 pr-2 text-sm text-primary-dark transition duration-150 ease-in-out bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-dark focus:border-primary-dark"
//               >
//                 {[5, 10, 20].map((size) => (
//                   <option key={size} value={size}>
//                     {size}
//                   </option>
//                 ))}
//               </select>
//             </div>

//             <div className="flex items-center gap-1">
//               <button
//                 onClick={() =>
//                   pagination.onChange(
//                     pagination.current - 1,
//                     pagination.pageSize
//                   )
//                 }
//                 disabled={pagination.current === 1}
//                 className={`flex items-center justify-center w-8 h-8 text-gray-600 transition-colors duration-150 rounded-full ${
//                   pagination.current === 1
//                     ? "text-gray-400 cursor-not-allowed"
//                     : "hover:bg-gray-100 hover:text-gray-800"
//                 }`}
//               >
//                 <svg
//                   xmlns="http://www.w3.org/2000/svg"
//                   className="w-5 h-5"
//                   viewBox="0 0 20 20"
//                   fill="currentColor"
//                 >
//                   <path
//                     fillRule="evenodd"
//                     d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
//                     clipRule="evenodd"
//                   />
//                 </svg>
//               </button>

//               {Array.from(
//                 {
//                   length: Math.min(
//                     5,
//                     Math.ceil(pagination.total / pagination.pageSize)
//                   ),
//                 },
//                 (_, i) => {
//                   const page =
//                     pagination.current <= 3
//                       ? i + 1
//                       : Math.max(
//                           1,
//                           Math.min(
//                             Math.ceil(pagination.total / pagination.pageSize) -
//                               4,
//                             pagination.current - 2
//                           )
//                         ) + i;
//                   return (
//                     <button
//                       key={page}
//                       onClick={() =>
//                         pagination.onChange(page, pagination.pageSize)
//                       }
//                       className={`flex items-center justify-center w-8 h-8 text-sm rounded-full transition-colors duration-150 ${
//                         pagination.current === page
//                           ? "bg-primary-600 text-primary-dark font-bold"
//                           : "text-gray-500 hover:bg-gray-100"
//                       }`}
//                     >
//                       {page}
//                     </button>
//                   );
//                 }
//               )}

//               <button
//                 onClick={() =>
//                   pagination.onChange(
//                     pagination.current + 1,
//                     pagination.pageSize
//                   )
//                 }
//                 disabled={
//                   pagination.current * pagination.pageSize >= pagination.total
//                 }
//                 className={`flex items-center justify-center w-8 h-8 text-gray-600 transition-colors duration-150 rounded-full ${
//                   pagination.current * pagination.pageSize >= pagination.total
//                     ? "text-gray-400 cursor-not-allowed"
//                     : "hover:bg-gray-100 hover:text-gray-800"
//                 }`}
//               >
//                 <svg
//                   xmlns="http://www.w3.org/2000/svg"
//                   className="w-5 h-5"
//                   viewBox="0 0 20 20"
//                   fill="currentColor"
//                 >
//                   <path
//                     fillRule="evenodd"
//                     d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
//                     clipRule="evenodd"
//                   />
//                 </svg>
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </>
//   );
// }

// // Filter Dropdown Components
// interface SortState {
//   field: string;
//   direction: "asc" | "desc";
// }

// interface FilterState {
//   status: string[];
// }

// const SortSection = ({ options, currentSort, onSelect }: any) => {
//   return (
//     <div className="mb-6">
//       <h4 className="font-medium mb-3">Sort by</h4>
//       <div className="space-y-2">
//         {options.map((option: any) => (
//           <button
//             key={option.key}
//             className="flex items-center justify-between w-full p-2 hover:bg-gray-50 rounded"
//             onClick={() => onSelect(option.key)}
//           >
//             <span>{option.label}</span>
//             {currentSort.field === option.key &&
//               (currentSort.direction === "asc" ? (
//                 <ArrowUp size={16} />
//               ) : (
//                 <ArrowDown size={16} />
//               ))}
//           </button>
//         ))}
//       </div>
//     </div>
//   );
// };

// const FilterSection = ({ title, options, onSelect }: any) => {
//   return (
//     <div className="mb-6">
//       <h4 className="font-medium mb-3">{title}</h4>
//       <div className="space-y-2">
//         {options.map((option: any) => (
//           <label key={option.id} className="flex items-center">
//             <input
//               type="checkbox"
//               checked={option.checked}
//               onChange={() => onSelect(option.id)}
//               className="mr-2 h-4 w-4 text-primary-dark rounded accent-primary-dark"
//             />
//             {option.label}
//           </label>
//         ))}
//       </div>
//     </div>
//   );
// };

// const FilterDropdown = ({
//   isOpen,
//   onClose,
//   filters,
//   onFilterChange,
//   sort,
//   onSortChange,
// }: any) => {
//   if (!isOpen) return null;

//   const statusOptions = [
//     {
//       id: "pending",
//       label: "Pending",
//       checked: filters.status.includes("pending"),
//     },
//     {
//       id: "approved",
//       label: "Approved",
//       checked: filters.status.includes("approved"),
//     },
//     {
//       id: "inprogress",
//       label: "In Progress",
//       checked: filters.status.includes("inprogress"),
//     },
//   ];

//   const sortOptions = [
//     { key: "date", label: "Date" },
//     { key: "price", label: "Price" },
//     { key: "status", label: "Status" },
//   ];

//   return (
//     <div className="absolute top-7 right-0 md:top-full mt-2 w-full md:w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
//       <div className="p-4">
//         <div className="flex justify-between items-center mb-4">
//           <h3 className="font-semibold">Filters & Sort</h3>
//           <button
//             onClick={onClose}
//             className="text-gray-500 hover:text-gray-700"
//           >
//             <X size={18} />
//           </button>
//         </div>

//         <SortSection
//           options={sortOptions}
//           currentSort={sort}
//           onSelect={onSortChange}
//         />

//         <FilterSection
//           title="Status"
//           options={statusOptions}
//           onSelect={(id: string) => onFilterChange("status", id)}
//         />
//       </div>
//     </div>
//   );
// };

// // Main User Details Component
// const UserDetails = () => {
//   const [pagination, setPagination] = useState({
//     current: 1,
//     pageSize: 5,
//     total: 50,
//   });

//   const [isFilterOpen, setIsFilterOpen] = useState(false);
//   const [filters, setFilters] = useState<FilterState>({
//     status: [],
//   });
//   const [sort, setSort] = useState<SortState>({
//     field: "date",
//     direction: "asc",
//   });

//   const handleBack = () => {
//     console.log("Going back");
//   };

//   const handlePageChange = (page: number, pageSize: number) => {
//     setPagination((prev) => ({
//       ...prev,
//       current: page,
//       pageSize,
//     }));
//   };

//   const handleFilterChange = (filterType: string, value: string) => {
//     if (filterType === "status") {
//       setFilters((prev) => ({
//         ...prev,
//         status: prev.status.includes(value)
//           ? prev.status.filter((s) => s !== value)
//           : [...prev.status, value],
//       }));
//     }
//   };

//   const handleSortChange = (field: string) => {
//     setSort((prev) => ({
//       field,
//       direction:
//         prev.field === field && prev.direction === "asc" ? "desc" : "asc",
//     }));
//   };

//   // Mock data for order history
//   const orderData = [
//     {
//       orderId: "Lorem",
//       productName: "PUBG 325 UC",
//       date: "20 May 2025",
//       price: "$500",
//       quantity: 3,
//       time: "12:00 Pm",
//       status: "Pending",
//     },
//     {
//       orderId: "Lorem",
//       productName: "PUBG 325 UC",
//       date: "20 May 2025",
//       price: "$500",
//       quantity: 3,
//       time: "12:00 Pm",
//       status: "Approved",
//     },
//     {
//       orderId: "Lorem",
//       productName: "PUBG 325 UC",
//       date: "20 May 2025",
//       price: "$500",
//       quantity: 3,
//       time: "12:00 Pm",
//       status: "Inprogress",
//     },
//     {
//       orderId: "Lorem",
//       productName: "PUBG 325 UC",
//       date: "20 May 2025",
//       price: "$500",
//       quantity: 3,
//       time: "12:00 Pm",
//       status: "Pending",
//     },
//     {
//       orderId: "Lorem",
//       productName: "PUBG 325 UC",
//       date: "20 May 2025",
//       price: "$500",
//       quantity: 3,
//       time: "12:00 Pm",
//       status: "Pending",
//     },
//   ];

//   const columns: TableColumn[] = [
//     { key: "orderId", title: "Order ID" },
//     { key: "productName", title: "Product Name" },
//     { key: "date", title: "Date" },
//     { key: "price", title: "Price" },
//     { key: "quantity", title: "Quantity" },
//     { key: "time", title: "Time" },
//     {
//       key: "status",
//       title: "Status",
//       render: (value: string) => {
//         const statusColors = {
//           Pending: "text-orange-500",
//           Approved: "text-green-500",
//           Inprogress: "text-yellow-500",
//         };
//         return (
//           <span
//             className={
//               statusColors[value as keyof typeof statusColors] ||
//               "text-gray-500"
//             }
//           >
//             {value}
//           </span>
//         );
//       },
//     },
//   ];

//   return (
//     <div className="bg-white min-h-screen ">
//       {/* Header */}
//       <div className="flex justify-between items-center mb-6">
//         <div className="flex items-center gap-4">
//           <button
//             onClick={handleBack}
//             className="flex items-center text-primary-dark border border-primary-dark rounded-full p-2 hover:bg-gray-100"
//           >
//             <IoCaretBackOutline />
//           </button>
//           <h1 className="text-2xl font-semibold">User Management</h1>
//         </div>
//       </div>

//       {/* User Info Card */}
//       <div className=" rounded-lg p-6 mb-6 font-poppins">
//         <div className="flex justify-between items-start h-28 gap-7 ">
//           <div className="flex items-center gap-4 bg-[#F9F6FE]  w-full py-5 justify-center rounded-2xl shadow-custom-primary">
//             <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
//               <User size={32} className="text-gray-500" />
//             </div>
//             <div>
//               <h2 className="text-xl font-semibold">Esther Horward</h2>
//               <p className="text-gray-500">Esther@gmail.com</p>
//             </div>
//           </div>
//           <div className="text-right bg bg-[#F9F6FE] w-full py-5 flex flex-col  items-center justify-center rounded-2xl shadow-custom-primary">
//             <p className="text-sm text-gray-500 mb-1">Current Balance</p>
//             <p className="text-3xl font-bold">$ 4836.900</p>
//           </div>
//         </div>

//         <div className="grid grid-cols-4 gap-4 mt-6  bg-[#F9F6FE] rounded-2xl shadow-custom-primary py-9 px-8">
//           <div>
//             <p className="text-sm text-gray-500 mb-1">Full Name</p>
//             <p className="font-medium">Esther Horward</p>
//           </div>
//           <div>
//             <p className="text-sm text-gray-500 mb-1">Email Address</p>
//             <p className="font-medium">Esther@gmail.com</p>
//           </div>
//           <div>
//             <p className="text-sm text-gray-500 mb-1">Group Name</p>
//             <p className="font-medium">VIP</p>
//           </div>
//           <div>
//             <p className="text-sm text-gray-500 mb-1">Status</p>
//             <p className="font-medium text-green-500">Active</p>
//           </div>
//         </div>
//       </div>

//       {/* Order History Section */}
//       <div className="bg-white border-t-2 border-black/50 pt-6">
//         <div className="flex justify-between items-center mb-6 relative">
//           <h2 className="text-xl font-semibold">Order History</h2>
//           <button
//             className="text-primary-dark hover:text-black h-9 w-9 border border-primary-dark rounded-full flex items-center justify-center"
//             onClick={() => setIsFilterOpen(!isFilterOpen)}
//           >
//             <SlidersHorizontal size={20} strokeWidth={2.5} />
//           </button>
//           <FilterDropdown
//             isOpen={isFilterOpen}
//             onClose={() => setIsFilterOpen(false)}
//             filters={filters}
//             onFilterChange={handleFilterChange}
//             sort={sort}
//             onSortChange={handleSortChange}
//           />
//         </div>

//         <Table
//           columns={columns}
//           data={orderData}
//           loading={false}
//           pagination={{
//             ...pagination,
//             onChange: handlePageChange,
//           }}
//         />
//       </div>
//     </div>
//   );
// };

// export default UserDetails;
import React, { useState, useEffect } from "react";
import { IoCaretBackOutline } from "react-icons/io5";
import { SlidersHorizontal, User } from "lucide-react";
import { useParams } from "react-router-dom";

import { Table, type TableColumn } from "../../components/common/Table";
import { Loader } from "lucide-react";
import { useUserDetails } from "../../api/auth"; // adjust path if needed

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

  const { data, isLoading } = useUserDetails(userId);

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
        <Loader className="h-10 w-10 animate-spin" />
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
          <button className="text-primary-dark h-9 w-9 border border-primary-dark rounded-full flex items-center justify-center">
            <SlidersHorizontal size={20} strokeWidth={2.5} />
          </button>
        </div>

        <Table
          columns={columns}
          data={orderData}
          loading={false}
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
