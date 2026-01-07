// import { useState, useEffect, useRef } from "react";
// import { Button } from "../../components/common/Button";
// import Heading from "../../components/common/Heading";
// import { useNavigate } from "react-router-dom";
// import {
//   useWalletBalance,
//   useWalletTransactions,
//   useUserRefundRequests,
// } from "../../api/Wallets";
// import { CircleCheck, CircleX, Clock4, Loader } from "lucide-react";
// import { PartialRefundModal } from "../../components/user/wallet/PartialRefundModal";
// import { Table, type TableColumn } from "../../components/common/Table";

// // Reusable transaction row component for the simple list view
// const TransactionRow = ({ transaction }: { transaction: any }) => (
//   <div className="flex justify-between items-center shadow-custom-secondary gap-4 px-5 rounded-[20px] py-3 m-3 my-5">
//     <div className="flex flex-col gap-2">
//       <span className="font-medium capitalize">{transaction.type}</span>
//       <span className="text-gray-500 text-sm">
//         {new Date(transaction.createdAt).toLocaleDateString("en-GB", {
//           day: "2-digit",
//           month: "long",
//           year: "numeric",
//         })}
//       </span>
//     </div>
//     <div className="flex flex-col items-end gap-2">
//       <p className="font-medium text-lg font-poppins">
//         {transaction?.currency} {transaction?.amount}
//       </p>
//       <p
//         className={`font-poppins text-sm flex items-center justify-center gap-1 ${
//           transaction.status === "completed"
//             ? "text-success"
//             : transaction.status === "pending"
//             ? "text-yellow-500"
//             : "text-red-500"
//         }`}
//       >
//         <span>
//           {transaction.status === "completed" ? (
//             <CircleCheck size={14} />
//           ) : transaction.status === "pending" ? (
//             <Clock4 size={14} />
//           ) : (
//             <CircleX size={14} />
//           )}
//         </span>
//         <span>{transaction?.status}</span>
//       </p>
//     </div>
//   </div>
// );

// const SkeletonCard = () => (
//   <div className="flex justify-between items-center shadow-custom-secondary gap-4 px-5 rounded-[20px] py-3 m-3 my-5 animate-pulse">
//     <div className="flex flex-col gap-2">
//       <div className="h-4 w-20 bg-gray-300 rounded"></div>
//       <div className="h-3 w-28 bg-gray-200 rounded"></div>
//     </div>
//     <div className="flex flex-col items-end gap-2">
//       <div className="h-5 w-16 bg-gray-300 rounded"></div>
//       <div className="h-3 w-20 bg-gray-200 rounded"></div>
//     </div>
//   </div>
// );

// // Table columns for credit/debit adjustments
// const adjustmentColumns: TableColumn<any>[] = [
//   {
//     key: "name",
//     title: "Name",
//     render: (_, record) => record.user?.name || "N/A",
//   },
//   {
//     key: "type",
//     title: "Type",
//     render: (_, record) => {
//       try {
//         const metadata = JSON.parse(record.metadata || "{}");
//         const actualType = metadata.type || "adjustment";
//         return actualType.charAt(0).toUpperCase() + actualType.slice(1);
//       } catch (error) {
//         return "Adjustment";
//       }
//     },
//   },
//   {
//     key: "amount",
//     title: "Amount",
//     render: (_, record) => {
//       const amountColor = record.amount.startsWith("-")
//         ? "text-red-600"
//         : "text-green-600";
//       return (
//         <span className={`font-medium ${amountColor}`}>
//           {record.amount} {record.currency}
//         </span>
//       );
//     },
//   },
//   {
//     key: "date",
//     title: "Date/Time",
//     render: (_, record) => new Date(record.createdAt).toLocaleString(),
//   },
//   {
//     key: "sentReceivedBy",
//     title: "Sent/Received By",
//     render: (_, record) => {
//       try {
//         const metadata = JSON.parse(record.metadata || "{}");
//         const actualType = metadata.type || "adjustment";

//         if (actualType === "credit") {
//           return metadata.receivedInto || "N/A";
//         } else if (actualType === "debit") {
//           return metadata.sentBy || "N/A";
//         }
//         return "N/A";
//       } catch (error) {
//         return "N/A";
//       }
//     },
//   },
//   {
//     key: "destination",
//     title: "Destination",
//     render: (_, record) => {
//       try {
//         const metadata = JSON.parse(record.metadata || "{}");
//         return metadata.destination || "N/A";
//       } catch (error) {
//         return "N/A";
//       }
//     },
//   },
// ];

// // Table columns for refund requests
// const refundRequestColumns: TableColumn<any>[] = [
//   {
//     key: "amount",
//     title: "Amount",
//     render: (_, record) => `${record.amount} USD`,
//   },
//   {
//     key: "status",
//     title: "Status",
//     render: (_, record) => (
//       <span
//         className={`px-2 py-1 rounded-full text-sm ${
//           record.status === "approved"
//             ? "text-success"
//             : record.status === "rejected"
//             ? "text-error"
//             : "text-warning"
//         }`}
//       >
//         {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
//       </span>
//     ),
//   },
//   {
//     key: "date",
//     title: "Date/Time",
//     render: (_, record) => new Date(record.createdAt).toLocaleString(),
//   },
//   {
//     key: "reason",
//     title: "Reason",
//     render: (_, record) => record.reason || "No reason provided",
//   },
// ];

// const Wallet = () => {
//   const navigate = useNavigate();
//   const [activeTab, setActiveTab] = useState<
//     "topup" | "purchase" | "refund" | "credit-debit"
//   >("topup");
//   const [page, setPage] = useState(1);
//   const [allTransactions, setAllTransactions] = useState<any[]>([]);
//   const [hasMore, setHasMore] = useState(true);
//   const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);

//   const observer = useRef<IntersectionObserver | null>(null);
//   const loadingRef = useRef<HTMLDivElement>(null);
//   const limit = 5;

//   const {
//     data: transactionsData,
//     isLoading: isLoadingTransactions,
//     isFetching: isFetchingTransactions,
//   } = useWalletTransactions({
//     page,
//     limit,
//     type:
//       activeTab === "credit-debit"
//         ? "adjustment"
//         : activeTab === "refund"
//         ? "all"
//         : activeTab,
//   });

//   const { data: balanceData } = useWalletBalance();

//   // Get refund requests for the refund tab
//   const { data: refundRequestsData, isLoading: isLoadingRefunds } =
//     useUserRefundRequests({
//       page: 1,
//       limit: 50,
//       status: "all",
//     });

//   const refundRequests = refundRequestsData?.refundRequests || [];

//   // Filter only adjustment transactions for credit/debit tab
//   const adjustmentTransactions = allTransactions.filter(
//     (transaction) => transaction.type === "adjustment"
//   );

//   const handlePartialRefundClick = () => {
//     setIsRefundModalOpen(true);
//   };

//   // Merge new transactions with existing ones
//   useEffect(() => {
//     if (transactionsData?.transactions) {
//       setAllTransactions((prev) => {
//         const newTxns = transactionsData.transactions.filter(
//           (newTxn: any) => !prev.some((existing) => existing.id === newTxn.id)
//         );
//         return [...prev, ...newTxns];
//       });

//       const totalPages = transactionsData.pagination?.totalPages || 1;
//       if (transactionsData.transactions.length < limit || page >= totalPages) {
//         setHasMore(false);
//       } else {
//         setHasMore(true);
//       }
//     }
//   }, [transactionsData, page, limit]);

//   // Intersection Observer for infinite scroll
//   useEffect(() => {
//     if (isLoadingTransactions || !hasMore) return;

//     const observerOptions = {
//       root: null,
//       rootMargin: "100px",
//       threshold: 0.1,
//     };

//     const handleObserver: IntersectionObserverCallback = (entries) => {
//       const target = entries[0];
//       if (target.isIntersecting && !isFetchingTransactions && hasMore) {
//         setPage((prev) => prev + 1);
//       }
//     };

//     observer.current = new IntersectionObserver(
//       handleObserver,
//       observerOptions
//     );

//     if (loadingRef.current) {
//       observer.current.observe(loadingRef.current);
//     }

//     return () => {
//       if (observer.current) {
//         observer.current.disconnect();
//       }
//     };
//   }, [isLoadingTransactions, isFetchingTransactions, hasMore]);

//   useEffect(() => {
//     setPage(1);
//     setAllTransactions([]);
//     setHasMore(true);
//   }, [activeTab]);

//   return (
//     <div className="bg-white relative min-h-screen">
//       {/* Header */}
//       <div className="flex justify-between items-center mb-8 flex-col md:flex-row gap-4">
//         <div className="flex items-center gap-4">
//           <Heading>Wallet Management</Heading>
//         </div>
//       </div>

//       {/* Balance Section */}
//       <div className="shadow-custom-secondary rounded-lg p-6 mb-6 flex justify-center items-center">
//         <div className="flex flex-col items-center justify-center gap-6">
//           <h3 className="font-poppins text-base">Current Balance</h3>
//           <div className="flex items-center gap-2 py-2 px-16 shadow-inner-box rounded-lg">
//             <p>
//               {balanceData?.balance || "0.00"} {balanceData?.currency || "USD"}
//             </p>
//           </div>
//           <div className="flex gap-4">
//             <Button
//               onClick={() => navigate("/topup")}
//               className="px-6 !py-2"
//               variant="outline"
//             >
//               Top Up Now
//             </Button>
//             <Button onClick={handlePartialRefundClick} className="px-6 !py-2">
//               Partial Refund
//             </Button>
//           </div>
//         </div>
//       </div>

//       {/* Tabs */}
//       <div className="flex gap-4 border-b border-gray-200 mb-6">
//         {["topup", "purchase", "refund", "credit-debit"].map((tab) => (
//           <button
//             key={tab}
//             onClick={() => setActiveTab(tab as any)}
//             className={`px-4 py-2 capitalize font-medium border-b-2 transition-colors ${
//               activeTab === tab
//                 ? "border-primary-dark text-primary-dark"
//                 : "border-transparent text-gray-500 hover:text-black"
//             }`}
//           >
//             {tab === "credit-debit" ? "Credit/Debit" : tab}
//           </button>
//         ))}
//       </div>

//       {/* Topup, Purchase, and Refund Transaction Tabs */}
//       {(activeTab === "topup" || activeTab === "purchase") && (
//         <>
//           {/* Transactions List */}
//           <div className="overflow-hidden divide-y">
//             {allTransactions.map((transaction) => (
//               <TransactionRow key={transaction.id} transaction={transaction} />
//             ))}
//           </div>

//           {/* Loading and end messages */}
//           <div ref={loadingRef} className="mt-8 flex justify-center">
//             {isFetchingTransactions && allTransactions.length > 0 ? (
//               <div className="flex items-center justify-center py-4">
//                 <Loader className="h-6 w-6 animate-spin text-primary-dark mr-2" />
//                 <span>Loading more transactions...</span>
//               </div>
//             ) : !hasMore && allTransactions.length > 0 ? (
//               <div className="text-gray-500 py-4">
//                 No more transactions to load
//               </div>
//             ) : allTransactions.length === 0 && !isLoadingTransactions ? (
//               <div className="text-gray-500 py-4">No transactions found</div>
//             ) : null}
//           </div>

//           {/* Initial loading state */}
//           {isLoadingTransactions && allTransactions.length === 0 && (
//             <div className="grid grid-cols-1">
//               {Array.from({ length: 6 }).map((_, index) => (
//                 <SkeletonCard key={index} />
//               ))}
//             </div>
//           )}
//         </>
//       )}

//       {/* Refund Requests Tab (uses the refund tab but shows requests instead of transactions) */}
//       {activeTab === "refund" && (
//         <div className="bg-white border-t-2 border-black/50">
//           <Table
//             columns={refundRequestColumns}
//             data={refundRequests}
//             loading={isLoadingRefunds}
//           />
//           {refundRequests.length === 0 && !isLoadingRefunds && (
//             <div className="text-center py-8 text-gray-500">
//               No refund requests found
//             </div>
//           )}
//         </div>
//       )}

//       {/* Credit/Debit Tab */}
//       {activeTab === "credit-debit" && (
//         <div className="bg-white border-t-2 border-black/50">
//           <Table
//             columns={adjustmentColumns}
//             data={adjustmentTransactions}
//             loading={isLoadingTransactions}
//           />
//           {adjustmentTransactions.length === 0 && !isLoadingTransactions && (
//             <div className="text-center py-8 text-gray-500">
//               No credit/debit adjustments found
//             </div>
//           )}
//         </div>
//       )}

//       <PartialRefundModal
//         isOpen={isRefundModalOpen}
//         onClose={() => setIsRefundModalOpen(false)}
//         currentBalance={parseFloat(balanceData?.balance || "0")}
//         currency={balanceData?.currency || "USD"}
//       />
//     </div>
//   );
// };

// export default Wallet;

import { useState, useEffect, useRef } from "react";
import { Button } from "../../components/common/Button";
import Heading from "../../components/common/Heading";
import { useNavigate } from "react-router-dom";
import {
  useWalletBalance,
  useWalletTransactions,
  useUserRefundRequests,
} from "../../api/Wallets";
import { CircleCheck, CircleX, Clock4, Loader } from "lucide-react";
import { PartialRefundModal } from "../../components/user/wallet/PartialRefundModal";
import { Table, type TableColumn } from "../../components/common/Table";

// Reusable transaction row component for the simple list view
const TransactionRow = ({ transaction }: { transaction: any }) => (
  <div className="flex justify-between items-center shadow-custom-secondary gap-4 px-5 rounded-[20px] py-3 m-3 my-5">
    <div className="flex flex-col gap-2">
      <span className="font-medium capitalize">{transaction.type}</span>
      <span className="text-gray-500 text-sm">
        {new Date(transaction.createdAt).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })}
      </span>
    </div>
    <div className="flex flex-col items-end gap-2">
      <p className="font-medium text-lg font-poppins">
        {transaction?.currency} {transaction?.amount}
      </p>
      <p
        className={`font-poppins text-sm flex items-center justify-center gap-1 ${
          transaction.status === "completed"
            ? "text-success"
            : transaction.status === "pending"
            ? "text-yellow-500"
            : "text-red-500"
        }`}
      >
        <span>
          {transaction.status === "completed" ? (
            <CircleCheck size={14} />
          ) : transaction.status === "pending" ? (
            <Clock4 size={14} />
          ) : (
            <CircleX size={14} />
          )}
        </span>
        <span>{transaction?.status}</span>
      </p>
    </div>
  </div>
);

const SkeletonCard = () => (
  <div className="flex justify-between items-center shadow-custom-secondary gap-4 px-5 rounded-[20px] py-3 m-3 my-5 animate-pulse">
    <div className="flex flex-col gap-2">
      <div className="h-4 w-20 bg-gray-300 rounded"></div>
      <div className="h-3 w-28 bg-gray-200 rounded"></div>
    </div>
    <div className="flex flex-col items-end gap-2">
      <div className="h-5 w-16 bg-gray-300 rounded"></div>
      <div className="h-3 w-20 bg-gray-200 rounded"></div>
    </div>
  </div>
);

// Table columns for credit/debit adjustments
const adjustmentColumns: TableColumn<any>[] = [
  {
    key: "name",
    title: "Name",
    render: (_, record) => record.user?.name || "N/A",
  },
  {
    key: "type",
    title: "Type",
    render: (_, record) => {
      try {
        const metadata = JSON.parse(record.metadata || "{}");
        const actualType = metadata.type || "adjustment";
        return actualType.charAt(0).toUpperCase() + actualType.slice(1);
      } catch {
        return "Adjustment";
      }
    },
  },
  {
    key: "amount",
    title: "Amount",
    render: (_, record) => {
      const amountColor = record.amount.startsWith("-")
        ? "text-red-600"
        : "text-green-600";
      return (
        <span className={`font-medium ${amountColor}`}>
          {record.amount} {record.currency}
        </span>
      );
    },
  },
  {
    key: "date",
    title: "Date/Time",
    render: (_, record) => new Date(record.createdAt).toLocaleString(),
  },
  {
    key: "sentReceivedBy",
    title: "Sent/Received By",
    render: (_, record) => {
      try {
        const metadata = JSON.parse(record.metadata || "{}");
        const actualType = metadata.type || "adjustment";

        if (actualType === "credit") {
          return metadata.receivedInto || "N/A";
        } else if (actualType === "debit") {
          return metadata.sentBy || "N/A";
        }
        return "N/A";
      } catch {
        return "N/A";
      }
    },
  },
  {
    key: "destination",
    title: "Destination",
    render: (_, record) => {
      try {
        const metadata = JSON.parse(record.metadata || "{}");
        return metadata.destination || "N/A";
      } catch {
        return "N/A";
      }
    },
  },
];

// Table columns for refund requests
const refundRequestColumns: TableColumn<any>[] = [
  {
    key: "amount",
    title: "Amount",
    render: (_, record) => `${record.amount} USD`,
  },
  {
    key: "status",
    title: "Status",
    render: (_, record) => (
      <span
        className={`px-2 py-1 rounded-full text-sm ${
          record.status === "approved"
            ? "text-success"
            : record.status === "rejected"
            ? "text-error"
            : "text-warning"
        }`}
      >
        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
      </span>
    ),
  },
  {
    key: "date",
    title: "Date/Time",
    render: (_, record) => new Date(record.createdAt).toLocaleString(),
  },
  // {
  //   key: "reason",
  //   title: "Reason",
  //   render: (_, record) => record.reason || "No reason provided",
  // },
];

const Wallet = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<
    "topup" | "purchase" | "refund" | "credit-debit"
  >("topup");
  const [page, setPage] = useState(1);
  const [transactionsByTab, setTransactionsByTab] = useState<
    Record<string, any[]>
  >({});
  const [hasMore, setHasMore] = useState(true);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [isRefundProcessing, setIsRefundProcessing] = useState(false);
  const observer = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);
  const limit = 5;

  // API call
  const {
    data: transactionsData,
    isLoading: isLoadingTransactions,
    isFetching: isFetchingTransactions,
    refetch: refetchTransactions,
  } = useWalletTransactions({
    page,
    limit,
    type:
      activeTab === "credit-debit"
        ? "adjustment"
        : activeTab === "refund"
        ? "all"
        : activeTab,
  });

  const { data: balanceData, refetch: refetchBalance } = useWalletBalance();

  // Refund requests (for refund tab)
  const {
    data: refundRequestsData,
    isLoading: isLoadingRefunds,
    isFetching: isFetchingRefunds,
    refetch: refetchRefundRequests,
  } = useUserRefundRequests({
    page: 1,
    limit: 50,
    status: "all",
  });

  const refundRequests = refundRequestsData?.refundRequests || [];

  // Transactions for current tab
  const allTransactions = transactionsByTab[activeTab] || [];

  // Merge new transactions with existing ones (per tab)
  useEffect(() => {
    if (transactionsData?.transactions) {
      setTransactionsByTab((prev) => {
        const prevTabTxns = prev[activeTab] || [];
        const newTxns = transactionsData.transactions.filter(
          (newTxn: any) =>
            !prevTabTxns.some((existing) => existing.id === newTxn.id)
        );
        return {
          ...prev,
          [activeTab]: [...prevTabTxns, ...newTxns],
        };
      });

      const totalPages = transactionsData.pagination?.totalPages || 1;
      if (transactionsData.transactions.length < limit || page >= totalPages) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }
    }
  }, [transactionsData, page, limit, activeTab]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (isLoadingTransactions || !hasMore) return;

    const observerOptions = {
      root: null,
      rootMargin: "100px",
      threshold: 0.1,
    };

    const handleObserver: IntersectionObserverCallback = (entries) => {
      const target = entries[0];
      if (target.isIntersecting && !isFetchingTransactions && hasMore) {
        setPage((prev) => prev + 1);
      }
    };

    observer.current = new IntersectionObserver(
      handleObserver,
      observerOptions
    );

    if (loadingRef.current) {
      observer.current.observe(loadingRef.current);
    }

    return () => {
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [isLoadingTransactions, isFetchingTransactions, hasMore]);

  // Reset pagination and data when tab changes
  useEffect(() => {
    setPage(1);
    setHasMore(true);
  }, [activeTab]);

  const handlePartialRefundClick = () => {
    setIsRefundModalOpen(true);
  };
  const handleRefundSuccess = () => {
    setIsRefundProcessing(true);
  };
  return (
    <div className="bg-white relative ">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 flex-col md:flex-row gap-4">
        <div className="flex items-center gap-4">
          <Heading>Wallet Management</Heading>
        </div>
      </div>

      {/* Balance Section */}
      <div className="shadow-custom-secondary rounded-lg p-6 mb-6 flex justify-center items-center">
        <div className="flex flex-col items-center justify-center gap-6">
          <h3 className="font-poppins text-base">Current Balance</h3>
          <div className="flex items-center gap-2 py-2 px-16 shadow-inner-box rounded-lg min-w-[120px] justify-center">
            {balanceData ? (
              <p>
                {balanceData.balance} {balanceData.currency || "USD"}
              </p>
            ) : (
              <div className="flex items-center gap-2">
                <Loader className="h-5 w-5 animate-spin text-primary-dark" />
                <span className="text-gray-400">Loading...</span>
              </div>
            )}
          </div>
          <div className="flex gap-4">
            <Button
              onClick={() => navigate("/topup")}
              className="px-6 !py-2"
              variant="outline"
            >
              Top Up Now
            </Button>
            <Button onClick={handlePartialRefundClick} className="px-6 !py-2">
              Partial Refund
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 mb-6">
        {["topup", "purchase", "refund", "credit-debit"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-2 capitalize font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-primary-dark text-primary-dark"
                : "border-transparent text-gray-500 hover:text-black"
            }`}
          >
            {tab === "credit-debit" ? "Credit/Debit" : tab}
          </button>
        ))}
      </div>
      <div className="h-[40vh]">
        {/* Topup, Purchase */}
        {(activeTab === "topup" || activeTab === "purchase") && (
          <div className="h-full">
            <div className="overflow-y-auto overflow-x-hidden divide-y  ">
              {allTransactions.map((transaction) => (
                <TransactionRow
                  key={transaction.id}
                  transaction={transaction}
                />
              ))}
            </div>

            {/* Loading & End States */}
            <div ref={loadingRef} className="mt-8 flex justify-center">
              {isFetchingTransactions && allTransactions.length > 0 ? (
                <div className="flex items-center justify-center py-4">
                  <Loader className="h-6 w-6 animate-spin text-primary-dark mr-2" />
                  <span>Loading more transactions...</span>
                </div>
              ) : !hasMore && allTransactions.length > 0 ? (
                <div className="text-gray-500 py-4">
                  No more transactions to load
                </div>
              ) : allTransactions.length === 0 && !isLoadingTransactions ? (
                <div className="text-gray-500 py-4">No transactions found</div>
              ) : null}
            </div>

            {/* Initial loading */}
            {isLoadingTransactions && allTransactions.length === 0 && (
              <div className="grid grid-cols-1">
                {Array.from({ length: 6 }).map((_, index) => (
                  <SkeletonCard key={index} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Refund Tab */}
        {activeTab === "refund" && (
          <div className="bg-white border-t-2 border-black/50 h-full overflow-y-auto overflow-x-hidden">
            <Table
              columns={refundRequestColumns}
              data={refundRequests}
              loading={
                isLoadingRefunds || isFetchingRefunds || isRefundProcessing
              }
            />
            {refundRequests.length === 0 &&
              !isLoadingRefunds &&
              !isRefundProcessing && (
                <div className="text-center py-8 text-gray-500">
                  No refund requests found
                </div>
              )}
          </div>
        )}

        {/* Credit/Debit Tab */}
        {activeTab === "credit-debit" && (
          <div className="bg-white border-t-2 border-black/50 h-full overflow-y-auto overflow-x-hidden">
            <Table
              columns={adjustmentColumns}
              data={allTransactions}
              loading={isLoadingTransactions}
            />
            {allTransactions.length === 0 && !isLoadingTransactions && (
              <div className="text-center py-8 text-gray-500">
                No credit/debit adjustments found
              </div>
            )}
          </div>
        )}
      </div>

      <PartialRefundModal
        isOpen={isRefundModalOpen}
        onClose={() => setIsRefundModalOpen(false)}
        onSuccess={async () => {
          setIsRefundProcessing(true);

          await Promise.all([
            refetchRefundRequests(),
            refetchBalance(),
            refetchTransactions(),
          ]);

          setIsRefundProcessing(false);
        }}
        currentBalance={parseFloat(balanceData?.balance || "0")}
        currency={balanceData?.currency || "USD"}
      />
    </div>
  );
};

export default Wallet;
