import { useLocation, useParams } from "react-router-dom";
import { Button } from "../../components/common/Button";
import Heading from "../../components/common/Heading";
import { useNavigate } from "react-router-dom";
import { IoCaretBackOutline } from "react-icons/io5";
import { useProductsByCategory } from "../../api/UseProducts";
import { useAuth } from "../../context/AuthContext";
import {
  useDefaultPricingGroup,
  useMyPricingGroup,
} from "../../api/pricingGroup";

interface Product {
  id: string;
  quantity?: string;
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
  defaultPricingGroupId?: string;
  defaultPricingGroupName?: string;
}

const ProductCard = ({
  product,
  userPricingGroupId,
  defaultPricingGroupId,
  defaultPricingGroupName,
}: ProductCardProps) => {
  const navigate = useNavigate();
  // Find the price for the user's pricing group
  const userPrice = product.pricingGroupPrices.find(
    (price) => price.id === userPricingGroupId
  );

  // Fallback to first price if user's pricing group not found
  // const displayPrice =
  //   userPrice?.price || product.pricingGroupPrices[0]?.price || 0;
  // const pricingGroupName = userPrice?.name || "Standard";
  // const isPriceAvailable = Boolean(userPrice);
  // const displayPrice = userPrice?.price;
  // const pricingGroupName = userPrice?.name;
  // 1️⃣ Try user pricing group

  // 2️⃣ Try default pricing group (fallback)
  const defaultPrice = product.pricingGroupPrices.find(
    (price) => price.id === defaultPricingGroupId
  );

  // 3️⃣ Decide which one to use
  const activePrice = userPrice || defaultPrice;
  const isPriceAvailable = Boolean(activePrice);

  const displayPrice = activePrice?.price;
  const pricingGroupName = userPrice?.name || defaultPricingGroupName;

  console.log("product", userPricingGroupId);
  return (
    <div
      className={`bg-white rounded-[20px] border border-gray-200 relative overflow-hidden shadow-sm transition-shadow duration-200
    ${!isPriceAvailable ? "opacity-100" : "hover:shadow-md"}
  `}
    >
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
          <p className="max-w-[80%] truncate font-medium" title={product.name}>
            {product.name}
          </p>
        </div>
        <div className="flex items-center justify-between mt-4">
          <p className="font-poppins text-sm ">{product.quantity}</p>
          <p className="font-semibold text-primary-dark text-lg flex items-center gap-1">
            <span className="h-2 w-2 bg-success rounded-full"></span>
            <span>{pricingGroupName}</span>
          </p>
        </div>

        {/* <button
          onClick={() => {
            navigate(`/checkout/${product.id}`);
          }}
          className="font-poppins w-full text-lg mb-1 truncate flex items-center justify-center bg-primary-dark text-white rounded-full px-3 py-1.5 mt-4"
        >
          ${displayPrice?.toFixed(2) || 0}
        </button> */}
        <button
          disabled={!isPriceAvailable}
          onClick={() => {
            if (!isPriceAvailable) return;
            navigate(`/checkout/${product.id}`);
          }}
          className={`font-poppins w-full text-lg mb-1 truncate flex items-center justify-center rounded-full px-3 py-1.5 mt-4
    ${
      isPriceAvailable
        ? "bg-primary-dark text-white hover:opacity-90"
        : "bg-gray-300 text-gray-500 cursor-not-allowed"
    }`}
        >
          {isPriceAvailable ? `$${displayPrice!.toFixed(2)}` : "Unavailable"}
        </button>
        {!isPriceAvailable && (
          <p className="text-xs text-red-800 mt-3 text-center">
            Price not set for this product
          </p>
        )}
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

  // Fetch products
  const { data: productsData, isLoading: productsLoading } =
    useProductsByCategory(id || "");

  // Fetch default pricing group
  const { data: defaultPGData, isLoading: defaultLoading } =
    useDefaultPricingGroup();

  // Fetch current user pricing group
  const { data: userPGData, isLoading: userPGLoading } = useMyPricingGroup();

  const userPricingGroupId = userPGData?.pricingGroup?.id;
  const defaultPricingGroupId = defaultPGData?.pricingGroup?.id;
  const defaultPricingGroupName = defaultPGData?.pricingGroup?.name;

  const isLoading = productsLoading || userPGLoading || defaultLoading;

  const handleBack = () => navigate(-1);

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
            onClick={() => navigate("/myOrders")}
          >
            My orders
          </Button>
        </div>
      </div>

      {/* Products Grid */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
          {Array.from({ length: 10 }).map((_, index) => (
            <div
              key={index}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm animate-pulse"
            >
              <div className="h-40 bg-gray-200"></div>
              <div className="p-4">
                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                <div className="h-8 bg-gray-200 rounded mt-4"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading &&
        productsData?.products &&
        productsData.products.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 border-t-2 border-black/50 pt-6">
            {productsData.products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                userPricingGroupId={userPricingGroupId || ""}
                defaultPricingGroupId={defaultPricingGroupId}
                defaultPricingGroupName={defaultPricingGroupName}
              />
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
