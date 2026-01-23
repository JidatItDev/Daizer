import { useState } from "react";
import Heading from "../../components/common/Heading";
import { ReusableTabs } from "../../components/common/TableTabs";
import { Button } from "../../components/common/Button";
import { Table, type TableColumn } from "../../components/common/Table";
import CategoryManagementModal from "../../components/admin/orders&Products/CategoryManagementModal";
import { Edit, Trash2, Eye, Package } from "lucide-react";
import toast from "react-hot-toast";
import {
  useDeleteProduct,
  useProducts,
  useUpdateProduct,
  type Product,
} from "../../api/UseProducts";
import { CreateProductModal } from "../../components/admin/orders&Products/CreateProductModal";
import { EditProductModal } from "../../components/admin/orders&Products/EditProductModal";
import { ProductDetailModal } from "../../components/admin/orders&Products/ProductDetailModal";
import ConfirmationModalNew from "../../components/common/NewConfirmationModal";
import OrderManagement from "./OrderManagement";
import {
  useManualOrderTransactions,
  useUpdateTransactionStatus,
} from "../../api/Wallets";

// Updated Product interface to match API response

const ProductsManagement = () => {
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isCreateProductModalOpen, setIsCreateProductModalOpen] =
    useState(false);
  const [isEditProductModalOpen, setIsEditProductModalOpen] = useState(false);
  const [isProductDetailModalOpen, setIsProductDetailModalOpen] =
    useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [updatingProductId, setUpdatingProductId] = useState<string | null>(
    null,
  );
  const [isAnyStatusUpdating, setIsAnyStatusUpdating] = useState(false);

  const [isTransactionStatusUpdatingId, setIsTransactionStatusUpdatingId] =
    useState<string | null>(null);

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const updateProductMutation = useUpdateProduct();
  const { data, isFetching, refetch } = useProducts({
    page: pagination.current,
    limit: pagination.pageSize,
  });

  const {
    data: manualOrders,
    isFetching: is_manualTransactionsFetching,
    refetch: manualRefetch,
  } = useManualOrderTransactions({
    page: pagination.current,
    limit: pagination.pageSize,
  });

  const updateTransactionStatusMutation = useUpdateTransactionStatus();

  const manualOrdersList = manualOrders?.transactions ?? [];
  const manualOrdersCount = manualOrders?.pagination?.total ?? 0;

  const handleUpdateManualOrderStatus = async (
    transactionId: string,
    status: string,
  ) => {
    try {
      setIsTransactionStatusUpdatingId(transactionId);
      await updateTransactionStatusMutation.mutateAsync({
        transactionId,
        status,
      });

      toast.success("Transaction status updated");
      manualRefetch();
      setIsTransactionStatusUpdatingId(null);
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  console.log("manualOrders", manualOrders);

  const deleteProductMutation = useDeleteProduct();

  const products: Product[] = data?.products ?? [];
  // console.log("products", products);

  const totalProducts = data?.pagination?.totalProducts ?? 0;

  if (pagination.total !== totalProducts) {
    setPagination((prev) => ({ ...prev, total: totalProducts }));
  }

  const handlePageChange = (page: number, pageSize: number) => {
    setPagination((prev) => ({
      ...prev,
      current: page,
      pageSize,
    }));
  };

  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsProductDetailModalOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsEditProductModalOpen(true);
  };

  const handleDeleteProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedProduct) return;

    try {
      await deleteProductMutation.mutateAsync(selectedProduct.id);
      setIsDeleteModalOpen(false);
      setSelectedProduct(null);
      toast.success("Product deleted successfully");
      refetch();
    } catch (error) {
      console.error("Failed to delete product:", error);
      toast.error("Failed to delete product");
    }
  };

  // Updated formatPrice function to work with new data structure
  const formatPrice = (
    pricingGroups:
      | Array<{ id: string; name: string; price: number }>
      | null
      | undefined,
  ) => {
    if (!Array.isArray(pricingGroups) || pricingGroups.length === 0) {
      return "N/A";
    }

    const prices = pricingGroups.map((group) => group?.price ?? 0);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    return minPrice === maxPrice
      ? `$${minPrice.toFixed(2)}`
      : `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`;
  };
  // Updated getCategoryPath function to work with new data structure
  const getCategoryPath = (product: Product) => {
    return product.subcategoryName || "Uncategorized";
  };

  // const getStatus = (product: Product) => {
  //   // console.log("product", product);

  //   return product.isActive ? (
  //     <span className="text-success"> Active</span>
  //   ) : (
  //     <span className="text-error"> Disabled</span>
  //   );
  // };

  const handleToggleStatus = async (product: Product) => {
    setUpdatingProductId(product.id);
    setIsAnyStatusUpdating(true); // 🔒 lock all switches

    try {
      await updateProductMutation.mutateAsync({
        id: product.id,
        isActive: !product.isActive,
      });

      toast.success("Product Status updated");
      refetch();
    } catch (error) {
      toast.error("Failed to update status");
    } finally {
      setUpdatingProductId(null);
      setIsAnyStatusUpdating(false); // 🔓 unlock
    }
  };

  const productColumns: TableColumn<Product>[] = [
    {
      key: "name",
      title: "Product",
      render: (_, record) => (
        <div className="flex items-center">
          {record.image?.url ? (
            <img
              src={record.image.url}
              alt={record.name}
              className="h-10 w-10 rounded-lg object-cover mr-3"
            />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center mr-3">
              <Package size={20} className="text-gray-400" />
            </div>
          )}

          <div className="min-w-0">
            {/* Product name */}
            <div
              className="font-medium text-gray-900 truncate max-w-[220px]"
              title={record.name} // 👈 native tooltip
            >
              {record.name}
            </div>

            {record.description && (
              <div className="text-sm text-gray-500 truncate max-w-xs">
                {record.description}
              </div>
            )}
          </div>
        </div>
      ),
    },

    {
      key: "category",
      title: "Category",
      render: (_, record) => (
        <span className="text-sm text-gray-900">{getCategoryPath(record)}</span>
      ),
    },
    {
      key: "price",
      title: "Price Range",
      render: (_, record) => (
        <span className="text-sm font-medium text-gray-900">
          {formatPrice(record.pricingGroupPrices)}
        </span>
      ),
    },
    {
      key: "createdAt",
      title: "Created",
      render: (_, record) => (
        <span className="text-sm text-gray-500">
          {new Date(record.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "status",
      title: "Status",
      align: "center",
      render: (_, record) => (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg">
          {/* Toggle Switch */}
          <button
            type="button"
            disabled={isAnyStatusUpdating}
            onClick={() => handleToggleStatus(record)}
            className={`
  relative inline-flex h-6 w-11 items-center rounded-full
  transition-colors duration-200 ease-in-out
  focus:outline-none focus:ring-2 focus:ring-offset-2
  ${
    record.isActive
      ? "bg-green-500 focus:ring-green-500"
      : "bg-gray-300 focus:ring-gray-400"
  }
  ${isAnyStatusUpdating ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
`}
            title={record.isActive ? "Disable product" : "Activate product"}
          >
            <span
              className={`
            inline-block h-4 w-4 transform rounded-full bg-white shadow-lg
            transition-transform duration-200 ease-in-out
            ${record.isActive ? "translate-x-6" : "translate-x-1"}
          `}
            >
              {updatingProductId === record.id && (
                <svg
                  className="h-4 w-4 animate-spin text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              )}
            </span>
          </button>

          {/* Status Text */}
          <span
            className={`text-xs font-medium whitespace-nowrap ${
              record.isActive ? "text-green-700" : "text-gray-600"
            }`}
          >
            {updatingProductId === record.id
              ? "Updating..."
              : record.isActive
                ? "Active"
                : "Inactive"}
          </span>
        </div>
      ),
    },
    {
      key: "action",
      title: "Actions",
      align: "center",
      render: (_, record) => (
        <div className="flex gap-2 justify-center">
          <button
            onClick={() => handleViewProduct(record)}
            className="text-primary-dark hover:text-black h-8 w-8 border border-primary-dark rounded-full flex items-center justify-center"
            title="View Product"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => handleEditProduct(record)}
            className="text-primary-dark hover:text-black h-8 w-8 border border-primary-dark rounded-full flex items-center justify-center"
            title="Edit Product"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => handleDeleteProduct(record)}
            className="text-primary-dark hover:text-black h-8 w-8 border border-primary-dark rounded-full flex items-center justify-center"
            title="Delete Product"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  const manualOrderColumns: TableColumn<any>[] = [
    {
      key: "id",
      title: "Transaction ID",
      render: (_, r) => <span className="text-sm font-mono">{r.id}</span>,
    },
    {
      key: "productName",
      title: "Product Name",
      render: (_, r) => {
        let productName = "-";

        try {
          const metadata =
            typeof r.metadata === "string"
              ? JSON.parse(r.metadata)
              : r.metadata;

          productName = metadata?.productName ?? "-";
        } catch (e) {
          productName = "-";
        }

        return <span className="text-sm">{productName}</span>;
      },
    },
    {
      key: "productId",
      title: "Product ID",
      render: (_, r) => {
        let productId = "-";

        try {
          const metadata =
            typeof r.metadata === "string"
              ? JSON.parse(r.metadata)
              : r.metadata;

          productId = metadata?.productId ?? "-";
        } catch (e) {
          productId = "-";
        }

        return <span className="text-sm">{productId}</span>;
      },
    },
    {
      key: "userGameId",
      title: "User Game ID",
      render: (_, r) => {
        let playerId = "-";

        try {
          const metadata =
            typeof r.metadata === "string"
              ? JSON.parse(r.metadata)
              : r.metadata;

          playerId = metadata?.playerId ?? "-";
        } catch (e) {
          playerId = "-";
        }

        return <span className="text-sm">{playerId}</span>;
      },
    },
    {
      key: "amount",
      title: "Amount",
      render: (_, r) => <span className="font-medium ">{r.amount}</span>,
    },
    {
      key: "status",
      title: "Status",
      render: (_, r) => (
        <span className="px-2 py-1 rounded  text-red-500">
          {r.status === "manual_order" ? "Pending" : r.status}
        </span>
      ),
    },
    {
      key: "createdAt",
      title: "Created",
      render: (_, r) => new Date(r.createdAt).toLocaleString(),
    },
    {
      key: "action",
      title: "Action",
      align: "center",
      render: (_, r) => (
        <div className="flex gap-2 justify-center">
          <Button
            size="sm"
            disabled={isTransactionStatusUpdatingId === r.id}
            onClick={() => handleUpdateManualOrderStatus(r.id, "completed")}
          >
            {isTransactionStatusUpdatingId === r.id
              ? "Updating..."
              : "Complete Order"}
          </Button>
        </div>
      ),
    },
  ];

  const manualOrdersTab = {
    label: (
      <div className="flex items-center gap-2">
        <span>Manual Orders</span>

        {manualOrdersCount > 0 && (
          <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
            {manualOrdersCount}
          </span>
        )}
      </div>
    ),
    content: (
      <div className="space-y-6">
        <div className="bg-white border-t-2 border-black/50">
          <Table
            columns={manualOrderColumns}
            data={manualOrdersList}
            loading={is_manualTransactionsFetching}
            pagination={{
              ...pagination,
              onChange: handlePageChange,
            }}
          />
        </div>
      </div>
    ),
  };

  const tabsData = [
    {
      label: "Product Management",
      content: (
        <div className="space-y-6">
          <div className="bg-white border-t-2 border-black/50">
            <Table
              columns={productColumns}
              data={products}
              loading={isFetching}
              pagination={{
                ...pagination,
                onChange: handlePageChange,
              }}
            />
          </div>
        </div>
      ),
    },
    {
      label: "Order Management",
      content: (
        <div className="space-y-6">
          {/* <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Orders Management
            </h3>
            <p className="text-gray-500">
              Order management functionality will be implemented here.
            </p>
          </div> */}
          <OrderManagement />
        </div>
      ),
    },
    manualOrdersTab,
  ];

  return (
    <>
      <div className="bg-white relative">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 flex-col md:flex-row gap-4">
          <div className="flex items-center gap-4">
            <Heading>Order & Product Management</Heading>
          </div>
        </div>

        {/* Tabs and Buttons Row */}
        <div className="flex justify-between items-center mb-6 flex-col md:flex-row gap-4 border-b border-gray-300">
          <div className="flex items-center gap-4 flex-1">
            <ReusableTabs
              tabs={tabsData}
              defaultTab={0}
              onTabChange={setActiveTabIndex}
              showContent={false}
            />
          </div>
          <div className="flex items-center gap-4 mb-1">
            <Button
              variant="outline"
              size="sm"
              className="px-3 py-1 text-primary-dark border-primary-dark hover:bg-gray-50 min-w-[140px]"
              onClick={() => setIsCategoryModalOpen(true)}
            >
              Manage Categories
            </Button>
            {activeTabIndex === 0 && (
              <Button
                variant="outline"
                size="sm"
                className="px-3 py-1 text-primary-dark border-primary-dark hover:bg-gray-50 min-w-[140px]"
                onClick={() => setIsCreateProductModalOpen(true)}
              >
                Add New Product
              </Button>
            )}
          </div>
        </div>

        {/* Tab Content Area */}
        <div className="mt-6">{tabsData[activeTabIndex]?.content}</div>
      </div>

      {/* Category Management Modal */}
      <CategoryManagementModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
      />

      {/* Create Product Modal */}
      <CreateProductModal
        isOpen={isCreateProductModalOpen}
        onClose={() => {
          setIsCreateProductModalOpen(false);
        }}
        onSuccess={() => refetch()}
      />

      {/* Edit Product Modal */}
      <EditProductModal
        isOpen={isEditProductModalOpen}
        onClose={() => {
          setIsEditProductModalOpen(false);
          setSelectedProduct(null);
        }}
        onSuccess={() => {
          refetch(); // ✅ only after success
        }}
        product={selectedProduct}
      />

      {/* Product Detail Modal */}
      <ProductDetailModal
        isOpen={isProductDetailModalOpen}
        onClose={() => {
          setIsProductDetailModalOpen(false);
          setSelectedProduct(null);
        }}
        product={selectedProduct}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModalNew
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedProduct(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Product"
        message={`Are you sure you want to delete "${selectedProduct?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isLoading={deleteProductMutation.isPending}
        variant="danger"
      />
    </>
  );
};

export default ProductsManagement;
