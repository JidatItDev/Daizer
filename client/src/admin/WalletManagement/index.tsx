import { useState } from "react";
import { Button } from "../../components/common/Button";
import { Table, type TableColumn } from "../../components/common/Table";

import { usePricingGroups } from "../../api/pricingGroup";
import {
  useAllTransactions,
  useAllWallets,
  useApproveRefund,
  useGetActiveAccounts,
  useRefundRequests,
} from "../../api/Wallets";
import { CreditDebitModal } from "../../components/admin/Wallet/CreditDebitModal";
import { AdjustmentTypeModal } from "../../components/admin/Wallet/AdjustmentTypeModal";
import { RefundActionDropdown } from "../../components/admin/Wallet/RefundActionDropdown";
import { RefundApproveModal } from "../../components/admin/Wallet/RefundApproveModal";

interface Wallet {
  id: string;
  userId: string;
  balance: string;
  currency: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    pricingGroupId?: string;
  };
}

interface Transaction {
  id: string;
  walletId: string;
  userId: string;
  type: "topup" | "purchase" | "refund" | "adjustment";
  amount: string;
  currency: string;
  status: string;
  referenceId: string;
  metadata: any;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    pricingGroupId?: string;
  };
  wallet?: {
    balance: string;
    currency: string;
  };
}

interface RefundRequest {
  id: string;
  transactionId: string;
  userId: string;
  amount: number;
  reason?: string;
  status: "pending" | "approved" | "rejected";
  adminId?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    pricingGroupId?: string;
  };
  transaction?: Transaction;
}

interface PricingGroup {
  id: string;
  name: string;
  isDefault: boolean;
  createdAt: string;
}

const WalletManagement = () => {
  const [activeTab, setActiveTab] = useState<
    "wallets" | "transactions" | "refunds"
  >("wallets");
  const { data: accountsData } = useGetActiveAccounts();

  const [isAdjustmentTypeModalOpen, setIsAdjustmentTypeModalOpen] =
    useState(false);
  const [isCreditDebitModalOpen, setIsCreditDebitModalOpen] = useState(false);
  const [selectedAdjustmentType, setSelectedAdjustmentType] = useState<
    "credit" | "debit"
  >("credit");
  const [isRefundApproveModalOpen, setIsRefundApproveModalOpen] =
    useState(false);
  const [selectedRefund, setSelectedRefund] = useState<any>(null);

  // Wallets state
  const [walletsPagination, setWalletsPagination] = useState({
    current: 1,
    pageSize: 5,
    total: 0,
  });

  // Transactions state
  const [transactionsPagination, setTransactionsPagination] = useState({
    current: 1,
    pageSize: 5,
    total: 0,
  });

  // Refunds state
  const [refundsPagination, setRefundsPagination] = useState({
    current: 1,
    pageSize: 5,
    total: 0,
  });

  const [selectedItem, setSelectedItem] = useState<
    Wallet | Transaction | RefundRequest | null
  >(null);

  const { data: pricingGroupsData } = usePricingGroups();
  const pricingGroups = pricingGroupsData?.pricingGroups || [];

  const handleOpenAdjustmentModal = (wallet: Wallet | Transaction) => {
    setSelectedItem(wallet);
    setIsAdjustmentTypeModalOpen(true);
  };

  const handleSelectAdjustmentType = (type: "credit" | "debit") => {
    setSelectedAdjustmentType(type);
    setIsAdjustmentTypeModalOpen(false);
    setIsCreditDebitModalOpen(true);
  };

  const handleCloseCreditDebitModal = () => {
    setIsCreditDebitModalOpen(false);
    setSelectedItem(null);
  };

  const { data: walletsData, isLoading: isLoadingWallets } = useAllWallets({
    page: walletsPagination.current,
    limit: walletsPagination.pageSize,
  });

  // Transactions query
  const { data: transactionsData, isLoading: isLoadingTransactions } =
    useAllTransactions({
      page: transactionsPagination.current,
      limit: transactionsPagination.pageSize,
      type: "all",
    });

  // Refunds query
  const { data: refundsData, isLoading: isLoadingRefunds } = useRefundRequests({
    page: refundsPagination.current,
    limit: refundsPagination.pageSize,
    status: "all",
  });

  const wallets = walletsData?.wallets || walletsData || [];
  const transactions = transactionsData?.transactions || transactionsData || [];
  const refundRequests = refundsData?.refundRequests || refundsData || [];

  // Update pagination totals
  if (
    walletsData?.pagination?.total &&
    walletsPagination.total !== walletsData.pagination.total
  ) {
    setWalletsPagination((prev) => ({
      ...prev,
      total: walletsData.pagination.total,
    }));
  }

  if (
    transactionsData?.pagination?.total &&
    transactionsPagination.total !== transactionsData.pagination.total
  ) {
    setTransactionsPagination((prev) => ({
      ...prev,
      total: transactionsData.pagination.total,
    }));
  }

  if (
    refundsData?.pagination?.total &&
    refundsPagination.total !== refundsData.pagination.total
  ) {
    setRefundsPagination((prev) => ({
      ...prev,
      total: refundsData.pagination.total,
    }));
  }

  const handleWalletsPageChange = (page: number, pageSize: number) => {
    setWalletsPagination((prev) => ({
      ...prev,
      current: page,
      pageSize,
    }));
  };

  const handleTransactionsPageChange = (page: number, pageSize: number) => {
    setTransactionsPagination((prev) => ({
      ...prev,
      current: page,
      pageSize,
    }));
  };

  const handleRefundsPageChange = (page: number, pageSize: number) => {
    setRefundsPagination((prev) => ({
      ...prev,
      current: page,
      pageSize,
    }));
  };

  const handleRefundApproveClick = (refund: any) => {
    setSelectedRefund(refund);
    setIsRefundApproveModalOpen(true);
  };

  const approveRefund = useApproveRefund();
  // Add this function to handle refund approval submission
  const handleApproveRefundSubmit = async (
    destination: string,
    sentBy: string
  ) => {
    if (!selectedRefund) return;

    try {
      await approveRefund.mutateAsync({
        refundId: selectedRefund.id,
        destination,
        sentBy,
      });
      setIsRefundApproveModalOpen(false);
      setSelectedRefund(null);
    } catch (error) {
      console.error("Error approving refund:", error);
    }
  };
  const getAccountName = (value?: string) => {
    if (!value) return "N/A";

    const account = accountsData?.accounts?.find((acc) => acc.id === value);

    return account?.name || value;
  };

  // Wallet columns
  const walletColumns: TableColumn<Wallet>[] = [
    {
      key: "name",
      title: "Name",
      render: (_, record) => record.user?.name || "N/A", // Ensure this checks for null/undefined user
    },
    {
      key: "email",
      title: "Email",
      render: (_, record) => record.user?.email || "N/A", // Same here
    },
    {
      key: "balance",
      title: "Balance",
      render: (_, record) => `${record.balance} ${record.currency}`,
    },
    {
      key: "pricingGroup",
      title: "Pricing Group",
      render: (_, record) => {
        const pricingGroup = pricingGroups.find(
          (group: PricingGroup) => group.id === record.user?.pricingGroupId
        );
        return pricingGroup ? pricingGroup.name : "N/A"; // Ensure pricingGroup is handled safely
      },
    },
    {
      key: "action",
      title: "Action",
      align: "center",
      render: (_, record) => (
        <Button
          variant="outline"
          size="sm"
          className="px-3 py-1 text-primary-dark border-primary-dark hover:bg-gray-50"
          onClick={() => handleOpenAdjustmentModal(record)}
        >
          Edit Wallet
        </Button>
      ),
    },
  ];

  // Transaction columns
  const transactionColumns: TableColumn<Transaction>[] = [
    {
      key: "name",
      title: "Name",
      render: (_, record) => record.user?.name || "N/A",
    },

    {
      key: "type",
      title: "Type",
      render: (_, record) => {
        // For adjustment transactions, get the actual type from metadata
        if (record.type === "adjustment") {
          try {
            const metadata = JSON.parse(record.metadata || "{}");
            const actualType = metadata.type || "adjustment";
            return actualType.charAt(0).toUpperCase() + actualType.slice(1);
          } catch (error) {
            console.error("Error parsing metadata:", error);
            return "Adjustment";
          }
        }

        // For non-adjustment transactions, use the regular type
        return record.type.charAt(0).toUpperCase() + record.type.slice(1);
      },
    },
    {
      key: "amount",
      title: "Amount",
      render: (_, record) => `${record.amount} ${record.currency}`,
    },
    {
      key: "date",
      title: "Date/Time",
      render: (_, record) => new Date(record.createdAt).toLocaleString(),
    },

    // {
    //   key: "sentReceivedBy",
    //   title: "Sent/Received By",
    //   render: (_, record) => {
    //     // For adjustment transactions, get sentBy/receivedInto from metadata
    //     if (record.type === "adjustment") {
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
    //         console.error("Error parsing metadata:", error);
    //         return "N/A";
    //       }
    //     }
    //     if (record.type === "refund") {
    //       try {
    //         // const metadata = JSON.parse(record.metadata || "{}");
    //         // return metadata.sentBy || "N/A";
    //         const metadata = JSON.parse(record.metadata || "{}");
    //         const sentById = metadata.sentBy;

    //         if (!sentById) return "N/A";

    //         console.log("sentById", sentById);

    //         const account = accountsData?.accounts?.find(
    //           (acc) => acc.id === sentById
    //         );

    //         console.log("account", account);

    //         return account?.name || metadata.sentBy || "N/A";
    //       } catch (error) {
    //         console.error("Error parsing metadata:", error);
    //         return "N/A";
    //       }
    //     }

    //     // For non-adjustment transactions, show user name
    //     return record.user?.name || "N/A";
    //   },
    // },
    {
      key: "sentReceivedBy",
      title: "Sent/Received By",
      render: (_, record) => {
        if (record.type === "adjustment") {
          try {
            const metadata = JSON.parse(record.metadata || "{}");
            const actualType = metadata.type || "adjustment";

            if (actualType === "credit") {
              return getAccountName(metadata.receivedInto);
            }

            if (actualType === "debit") {
              return getAccountName(metadata.sentBy);
            }

            return "N/A";
          } catch (error) {
            console.error("Error parsing metadata:", error);
            return "N/A";
          }
        }

        if (record.type === "refund") {
          try {
            const metadata = JSON.parse(record.metadata || "{}");
            return getAccountName(metadata.sentBy);
          } catch (error) {
            console.error("Error parsing metadata:", error);
            return "N/A";
          }
        }

        return record.user?.name || "N/A";
      },
    },

    // {
    //   key: "destination",
    //   title: "Destination",
    //   render: (_, record) => {
    //     // For adjustment transactions, get destination from metadata
    //     if (record.type === "adjustment") {
    //       try {
    //         const metadata = JSON.parse(record.metadata || "{}");
    //         return metadata.destination || "N/A";
    //       } catch (error) {
    //         console.error("Error parsing metadata:", error);
    //         return "N/A";
    //       }
    //     }
    //     if (record.type === "refund") {
    //       try {
    //         // const metadata = JSON.parse(record.metadata || "{}");
    //         // return metadata.destination || "N/A";
    //         const metadata = JSON.parse(record.metadata || "{}");
    //         const destinationId = metadata.destination;

    //         if (!destinationId) return "N/A";

    //         const account = accountsData?.accounts?.find(
    //           (acc) => acc.id === destinationId
    //         );

    //         return account?.name || metadata.destination || "N/A";
    //       } catch (error) {
    //         console.error("Error parsing metadata:", error);
    //         return "N/A";
    //       }
    //     }

    //     return "N/A";
    //   },
    // },
    {
      key: "destination",
      title: "Destination",
      render: (_, record) => {
        if (record.type === "adjustment") {
          try {
            const metadata = JSON.parse(record.metadata || "{}");
            return getAccountName(metadata.destination);
          } catch (error) {
            console.error("Error parsing metadata:", error);
            return "N/A";
          }
        }

        if (record.type === "refund") {
          try {
            const metadata = JSON.parse(record.metadata || "{}");
            return getAccountName(metadata.destination);
          } catch (error) {
            console.error("Error parsing metadata:", error);
            return "N/A";
          }
        }

        return "N/A";
      },
    },
    {
      key: "action",
      title: "Action",
      align: "center",
      render: (_, record) => (
        <Button
          variant="outline"
          size="sm"
          className="px-3 py-1 text-primary-dark border-primary-dark hover:bg-gray-50"
          onClick={() => handleOpenAdjustmentModal(record)}
        >
          Edit Wallet
        </Button>
      ),
    },
  ];

  // Refund columns
  const refundColumns: TableColumn<RefundRequest>[] = [
    {
      key: "username",
      title: "Username",
      render: (_, record) => record.user?.name || "N/A",
    },
    {
      key: "amount",
      title: "Amount",
      render: (_, record) => `${record.amount} USD`,
    },
    {
      key: "sentBy",
      title: "Sent By",
      render: (_, record) => record.user?.name || "N/A",
    },
    {
      key: "date",
      title: "Date/Time",
      render: (_, record) => new Date(record.createdAt).toLocaleString(),
    },
    {
      key: "pricingGroup",
      title: "Pricing Group",
      render: (_, record) => {
        const pricingGroup = pricingGroups.find(
          (group: PricingGroup) => group.id === record.user?.pricingGroupId
        );
        return pricingGroup ? pricingGroup.name : "N/A";
      },
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
      key: "action",
      title: "Action",
      align: "center",
      render: (_, record) => (
        <RefundActionDropdown
          refund={record}
          onApproveClick={() => handleRefundApproveClick(record)}
        />
      ),
    },
  ];

  return (
    <div className="bg-white relative">
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex space-x-8">
          <button
            className={`py-2 px-1 font-medium text-sm ${
              activeTab === "wallets"
                ? "text-primary-dark border-b-2 border-primary-dark"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("wallets")}
          >
            Wallets
          </button>
          <button
            className={`py-2 px-1 font-medium text-sm ${
              activeTab === "transactions"
                ? "text-primary-dark border-b-2 border-primary-dark"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("transactions")}
          >
            Transactions
          </button>
          <button
            className={`py-2 px-1 font-medium text-sm ${
              activeTab === "refunds"
                ? "text-primary-dark border-b-2 border-primary-dark"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => setActiveTab("refunds")}
          >
            Partial Refunds
          </button>
        </div>
      </div>

      {/* Tables */}
      <div className="bg-white border-t-2 border-black/50">
        {activeTab === "wallets" && (
          <Table
            columns={walletColumns}
            data={wallets}
            loading={isLoadingWallets}
            pagination={{
              ...walletsPagination,
              onChange: handleWalletsPageChange,
            }}
          />
        )}

        {activeTab === "transactions" && (
          <Table
            columns={transactionColumns}
            data={transactions}
            loading={isLoadingTransactions}
            pagination={{
              ...transactionsPagination,
              onChange: handleTransactionsPageChange,
            }}
          />
        )}

        {activeTab === "refunds" && (
          <Table
            columns={refundColumns}
            data={refundRequests}
            loading={isLoadingRefunds}
            pagination={{
              ...refundsPagination,
              onChange: handleRefundsPageChange,
            }}
          />
        )}
      </div>

      {isAdjustmentTypeModalOpen && selectedItem && (
        <AdjustmentTypeModal
          isOpen={isAdjustmentTypeModalOpen}
          onClose={() => setIsAdjustmentTypeModalOpen(false)}
          onSelectType={handleSelectAdjustmentType}
          wallet={selectedItem}
        />
      )}

      {isCreditDebitModalOpen && selectedItem && (
        <CreditDebitModal
          isOpen={isCreditDebitModalOpen}
          onClose={handleCloseCreditDebitModal}
          wallet={selectedItem}
          type={selectedAdjustmentType}
        />
      )}
      {isRefundApproveModalOpen && selectedRefund && (
        <RefundApproveModal
          isOpen={isRefundApproveModalOpen}
          onClose={() => {
            setIsRefundApproveModalOpen(false);
            setSelectedRefund(null);
          }}
          refund={selectedRefund}
          onSubmit={handleApproveRefundSubmit}
        />
      )}
    </div>
  );
};

export default WalletManagement;
