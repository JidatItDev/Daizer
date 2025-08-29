import { useLocation, useParams } from "react-router-dom";
import { Button } from "../../components/common/Button";
import Heading from "../../components/common/Heading";
import { useNavigate } from "react-router-dom";
import { IoCaretBackOutline } from "react-icons/io5";
import { useProductsByCategory } from "../../api/UseProducts";
import { useAuth } from "../../context/AuthContext";

interface Product {
  id: string;
  name: string;
  description?: string; // Change from string to string | undefined
  pricingGroupPrices: Array<{
    id: string;
    name: string;
    price: number;
  }>;
  image?: {
    url: string;
    name: string;
    size: number;
    mimetype: string;
  };
  subcategoryId: string;
  subcategoryName: string;
  createdAt: string;
  updatedAt: string;
}

interface ProductCardProps {
  product: Product;
  userPricingGroupId: string;
}

const ProductCard = ({ product, userPricingGroupId }: ProductCardProps) => {
  // Find the price for the user's pricing group
  const userPrice = product.pricingGroupPrices.find(
    (price) => price.id === userPricingGroupId
  );

  // Fallback to first price if user's pricing group not found
  const displayPrice =
    userPrice?.price || product.pricingGroupPrices[0]?.price || 0;
  const pricingGroupName = userPrice?.name || "Standard";

  return (
    <div className="bg-white rounded-[20px] border border-gray-200 relative overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
      <div
        className="
            absolute top-[16px] left-[16px] 
            w-[26px] h-[26px] 
            rounded-full 
            bg-white 
            border-[3px] border-[#656565] 
            opacity-100 
            shadow-[inset_0px_4px_5px_0px_rgba(0,0,0,0.7)]
          "
      />
      <div className="h-[190px] bg-gray-100 flex items-center justify-center">
        {product.image ? ( // Handle optional image
          <img
            src={product.image.url}
            alt={product.name}
            className="h-full w-full object-cover border-primary-dark border-2 rounded-tl-[20px] rounded-tr-[20px]"
          />
        ) : (
          <div className="text-gray-400 text-lg font-medium">No Image</div>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <p>{product.name}</p>
          <p className="font-semibold text-primary-dark text-lg  mt-1 flex items-center gap-1">
            <span className="h-2 w-2 bg-success rounded-full"></span>
            <span>{pricingGroupName}</span>
          </p>
        </div>
        <h3 className="font-poppins text-lg mb-1 truncate flex items-center justify-center bg-primary-dark text-white rounded-full px-3 py-1.5 mt-4">
          ${displayPrice.toFixed(2)}
        </h3>
      </div>
    </div>
  );
};

const Products = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const categoryName = location.state?.name;
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: productsData, isLoading } = useProductsByCategory(id || "");

  // Handle back navigation
  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="bg-white relative min-h-screen p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 flex-col md:flex-row gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="flex items-center text-primary-dark hover:text-black transition-colors border border-primary-dark rounded-full p-2"
          >
            <IoCaretBackOutline />
          </button>
          <Heading>{categoryName || "Products"}</Heading>
        </div>
        <div className="flex items-center gap-4 relative">
          <Button
            variant="outline"
            size="md"
            className="border-2 border-primary-dark px-6 !py-2"
          >
            My orders
          </Button>
        </div>
      </div>

      {/* Products Grid */}
      {productsData?.products && productsData.products.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 border-t-2 border-black/50 pt-6">
          {productsData.products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              userPricingGroupId={user?.pricingGroupId || ""}
            />
          ))}
        </div>
      )}

      {/* Loading and empty states */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
          {Array.from({ length: 10 }).map((_, index) => (
            <div
              key={index}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm"
            >
              <div className="h-40 bg-gray-200 animate-pulse"></div>
              <div className="p-4">
                <div className="h-6 bg-gray-200 rounded animate-pulse mb-2"></div>
                <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading &&
        (!productsData?.products || productsData.products.length === 0) && (
          <div className="text-gray-500 py-4 text-center">
            No products found for this category
          </div>
        )}
    </div>
  );
};

export default Products;
