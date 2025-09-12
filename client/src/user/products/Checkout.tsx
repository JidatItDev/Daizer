import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { IoCaretBackOutline } from "react-icons/io5";
import { useProduct } from "../../api/UseProducts";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/common/Button";

const Checkout = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [gameId, setGameId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");

  const { data: productData, isLoading } = useProduct(id || "");

  const handleBack = () => navigate(-1);

  const handlePlaceOrder = () => {
    console.log("Placing order with:", {
      productId: id,
      gameId,
      paymentMethod,
    });
  };

  const userPriceObj = productData?.data?.pricingGroupPrices?.find(
    (p) => p.id === user?.pricingGroupId
  );

  // Fallback to first price if user pricing group not found
  const displayPrice =
    userPriceObj?.price ||
    productData?.data?.pricingGroupPrices?.[0]?.price ||
    0;

  // const pricingGroupName = userPriceObj?.name || "Standard";

  // Prices
  const subtotal = displayPrice;
  const taxFee = 0;
  const total = subtotal + taxFee;

  return (
    <div className="bg-white min-h-screen ">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 ">
        <div className="flex items-center gap-3">
          <button
            onClick={handleBack}
            className="flex items-center text-primary-dark border border-primary-dark rounded-full p-2 hover:bg-gray-100"
          >
            <IoCaretBackOutline />
          </button>
          <h2 className="text-lg font-semibold">Place Order</h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="px-5 py-1 rounded-full border"
          onClick={() => navigate("/orders")}
        >
          My Orders
        </Button>
      </div>

      {/* Main layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10  border-t-2 border-black/50 pt-6">
        {/* Left - Product */}
        <div>
          {isLoading ? (
            <div className="h-40 bg-gray-200 animate-pulse rounded-lg"></div>
          ) : (
            <>
              <div className="rounded-lg overflow-hidden mb-4">
                {productData?.data?.image ? (
                  <img
                    src={productData.data.image.url}
                    alt={productData.data.name}
                    className="w-full h-40 object-cover"
                  />
                ) : (
                  <div className="w-full h-40 bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-400">No Image</span>
                  </div>
                )}
              </div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium font-poppins">
                  {productData?.data?.name || "N/A"}
                </h3>
                <span className="text-lg text-black/70">
                  {productData?.data?.quantity || "N/A"}
                </span>
              </div>
              <div className="bg-[#f9f6f6] p-4 rounded-lg text-base space-y-4">
                <div className="flex justify-between">
                  <span>Subtotal (1 items)</span>
                  <span>${subtotal.toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax Fee</span>
                  <span>${taxFee.toFixed(0)}</span>
                </div>
                <div className="flex justify-between font-semibold pt-2 border-t">
                  <span>Total:</span>
                  <span>${total.toFixed(0)}</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right - Payment */}
        <div>
          <h3 className="text-base font-semibold mb-6">Payment Details</h3>

          <div className="space-y-6">
            {/* Game ID */}
            <div>
              <input
                type="text"
                value={gameId}
                onChange={(e) => setGameId(e.target.value)}
                placeholder="Enter Game ID"
                className="w-full border-b border-gray-300 focus:border-primary-dark outline-none py-2 text-sm"
              />
            </div>

            {/* Payment Method */}
            <div>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full border-b border-gray-300 focus:border-primary-dark outline-none py-2 text-sm bg-transparent"
              >
                <option value="">Payment Method</option>
                <option value="Paypal">Paypal</option>
                <option value="Stripe">Stripe</option>
                <option value="Bank">Bank Transfer</option>
              </select>
            </div>

            <Button
              onClick={handlePlaceOrder}
              disabled={isLoading || !gameId || !paymentMethod}
              className="w-full py-3 bg-primary-dark text-white rounded-full hover:opacity-90"
            >
              Payment Confirmation
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
