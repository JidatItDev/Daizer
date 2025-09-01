import { useState } from "react";
import Heading from "../../components/common/Heading";
import { ReusableTabs } from "../../components/common/TableTabs";
import { Button } from "../../components/common/Button";
import { Table, type TableColumn } from "../../components/common/Table";
import CategoryManagementModal from "../../components/admin/orders&Products/CategoryManagementModal";
import ConfirmationModal from "../../components/common/ConfirmationModal";
import { Edit, Trash2, Eye, Package } from "lucide-react";
import toast from "react-hot-toast";
import {
  useDeleteProduct,
  useProducts,
  type Product,
} from "../../api/UseProducts";
import { CreateProductModal } from "../../components/admin/orders&Products/CreateProductModal";
import { EditProductModal } from "../../components/admin/orders&Products/EditProductModal";
import { ProductDetailModal } from "../../components/admin/orders&Products/ProductDetailModal";
import ConfirmationModalNew from "../../components/common/NewConfirmationModal";

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

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const { data, isPending, isFetching, refetch } = useProducts({
    page: pagination.current,
    limit: pagination.pageSize,
  });

  const deleteProductMutation = useDeleteProduct();

  const products: Product[] = data?.products ?? [];

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
      | undefined
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
          <div>
            <div className="font-medium text-gray-900">{record.name}</div>
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
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Orders Management
            </h3>
            <p className="text-gray-500">
              Order management functionality will be implemented here.
            </p>
          </div>
        </div>
      ),
    },
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
        onClose={() => setIsCreateProductModalOpen(false)}
      />

      {/* Edit Product Modal */}
      <EditProductModal
        isOpen={isEditProductModalOpen}
        onClose={() => {
          setIsEditProductModalOpen(false);
          setSelectedProduct(null);
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
