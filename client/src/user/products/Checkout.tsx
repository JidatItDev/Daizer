// import { useState } from "react";
// import { useNavigate, useParams } from "react-router-dom";
// import { IoCaretBackOutline } from "react-icons/io5";
// import { useProduct } from "../../api/UseProducts";
// import { useAuth } from "../../context/AuthContext";
// import { Button } from "../../components/common/Button";
// import { useWalletBalance } from "../../api/Wallets";

// const Checkout = () => {
//   const { id } = useParams<{ id: string }>();
//   const navigate = useNavigate();
//   const { user } = useAuth();
//   const [gameId, setGameId] = useState("");
//   const [paymentMethod, setPaymentMethod] = useState("");

//   const { data: balanceData } = useWalletBalance();

//   const { data: productData, isLoading } = useProduct(id || "");

//   const handleBack = () => navigate(-1);

//   const handlePlaceOrder = () => {
//     console.log("Placing order with:", {
//       productId: id,
//       gameId,
//       paymentMethod,
//     });
//   };

//   const userPriceObj = productData?.data?.pricingGroupPrices?.find(
//     (p) => p.id === user?.pricingGroupId
//   );

//   // Fallback to first price if user pricing group not found
//   const displayPrice =
//     userPriceObj?.price ||
//     productData?.data?.pricingGroupPrices?.[0]?.price ||
//     0;

//   // const pricingGroupName = userPriceObj?.name || "Standard";

//   // Prices
//   const subtotal = displayPrice;
//   const taxFee = 0;
//   const total = subtotal + taxFee;

//   return (
//     <div className="bg-white min-h-screen ">
//       {/* Header */}
// <div className="flex justify-between items-center mb-8 ">
//   <div className="flex items-center gap-3">
//     <button
//       onClick={handleBack}
//       className="flex items-center text-primary-dark border border-primary-dark rounded-full p-2 hover:bg-gray-100"
//     >
//       <IoCaretBackOutline />
//     </button>
//     <h2 className="text-lg font-semibold">Place Order</h2>
//   </div>
//   <Button
//     variant="outline"
//     size="sm"
//     className="px-5 py-1 rounded-full border"
//     onClick={() => navigate("/orders")}
//   >
//     My Orders
//   </Button>
// </div>

//       {/* Main layout */}
//       <div className="grid grid-cols-1 md:grid-cols-2 gap-10  border-t-2 border-black/50 pt-6">
//         {/* Left - Product */}
//         <div>
//           {isLoading ? (
//             <div className="h-40 bg-gray-200 animate-pulse rounded-lg"></div>
//           ) : (
//             <>
//               <div className="rounded-lg overflow-hidden mb-4">
//                 {productData?.data?.image ? (
//                   <img
//                     src={productData.data.image.url}
//                     alt={productData.data.name}
//                     className="w-full h-40 object-cover"
//                   />
//                 ) : (
//                   <div className="w-full h-40 bg-gray-200 flex items-center justify-center">
//                     <span className="text-gray-400">No Image</span>
//                   </div>
//                 )}
//               </div>
//               <div className="flex justify-between items-center mb-4">
//                 <h3 className="text-lg font-medium font-poppins">
//                   {productData?.data?.name || "N/A"}
//                 </h3>
//                 <span className="text-lg text-black/70">
//                   {productData?.data?.quantity || "N/A"}
//                 </span>
//               </div>
//               <div className="bg-[#f9f6f6] p-4 rounded-lg text-base space-y-4">
//                 <div className="flex justify-between">
//                   <span>Subtotal (1 items)</span>
//                   <span>${subtotal.toFixed(0)}</span>
//                 </div>
//                 <div className="flex justify-between">
//                   <span>Tax Fee</span>
//                   <span>${taxFee.toFixed(0)}</span>
//                 </div>
//                 <div className="flex justify-between font-semibold pt-2 border-t">
//                   <span>Total:</span>
//                   <span>${total.toFixed(0)}</span>
//                 </div>
//               </div>
//             </>
//           )}
//         </div>

//         {/* Right - Payment */}
//         <div>
//           <h3 className="text-base font-semibold mb-6">Payment Details</h3>

//           <div className="space-y-6">
//             {/* Game ID */}
//             <div>
//               <input
//                 type="text"
//                 value={gameId}
//                 onChange={(e) => setGameId(e.target.value)}
//                 placeholder="Enter Game ID"
//                 className="w-full border-b border-gray-300 focus:border-primary-dark outline-none py-2 text-sm"
//               />
//             </div>

//             {/* Payment Method */}
//             {/* <div>
//               <select
//                 value={paymentMethod}
//                 onChange={(e) => setPaymentMethod(e.target.value)}
//                 className="w-full border-b border-gray-300 focus:border-primary-dark outline-none py-2 text-sm bg-transparent"
//               >
//                 <option value="">Payment Method</option>
//                 <option value="Paypal">Paypal</option>
//                 <option value="Stripe">Stripe</option>
//                 <option value="Bank">Bank Transfer</option>
//               </select>
//             </div> */}
//             <div className="flex items-center justify-start gap-2">
//               <p>Wallet Balance:</p>
//               <p>
//                 {balanceData?.balance || "0.00"}{" "}
//                 {balanceData?.currency || "USD"}
//               </p>
//             </div>

//             <Button
//               onClick={handlePlaceOrder}
//               disabled={isLoading || !gameId || !paymentMethod}
//               className="w-full py-3 bg-primary-dark text-white rounded-full hover:opacity-90"
//             >
//               Payment Confirmation
//             </Button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Checkout;

import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { IoCaretBackOutline } from "react-icons/io5";
import { useProduct } from "../../api/UseProducts";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../../components/common/Button";
import { useWalletBalance } from "../../api/Wallets";
import { usePurchaseProduct } from "../../api/UseProducts"; // Import the new hook
import toast from "react-hot-toast";
// import { useConfigContext } from "../../context/ConfigContext";

const Checkout = () => {
  const { id } = useParams<{ id: string }>();
  // const config = useConfigContext();

  const navigate = useNavigate();
  const { user } = useAuth();
  const [gameId, setGameId] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: balanceData } = useWalletBalance();
  const { data: productData, isLoading } = useProduct(id || "");
  const purchaseProduct = usePurchaseProduct();

  const handleBack = () => navigate(-1);

  const handlePlaceOrder = async () => {
    if (!id || !gameId) return;

    setIsProcessing(true);
    try {
      const result = await purchaseProduct.mutateAsync({
        productId: id,
        playerId: gameId,
      });

      if (result.success) {
        // Show success message or redirect
        // You can show a success notification here
        toast.success("Purchase successful! Your order has been processed.");
        navigate(-1); // Redirect to orders page
      } else {
        toast.error(`Purchase failed: ${result.message}`);
      }
    } catch (error: any) {
      console.error("Purchase error:", error);
      toast.error(
        error.response?.data?.message || "Purchase failed. Please try again."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const userPriceObj = productData?.data?.pricingGroupPrices?.find(
    (p) => p.id === user?.pricingGroupId
  );

  // Fallback to first price if user pricing group not found
  const displayPrice =
    userPriceObj?.price ||
    productData?.data?.pricingGroupPrices?.[0]?.price ||
    0;

  // Prices
  const subtotal = displayPrice;
  const taxFee = 0;
  const total = subtotal + taxFee;

  // Check if user has sufficient balance
  const hasSufficientBalance =
    balanceData && parseFloat(balanceData.balance) >= total;

  // const hasMinimumBalance =
  //   config?.minimumBalanceRequirement &&
  //   parseFloat(balanceData?.balance) >=
  //     parseFloat(config?.minimumBalanceRequirement);

  const canPurchase = gameId && hasSufficientBalance && !isProcessing;

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

        <div>
          <h3 className="text-base font-semibold mb-6">Payment Details</h3>

          <div className="space-y-6">
            {/* Game ID */}
            <div>
              <input
                type="text"
                value={gameId}
                onChange={(e) => setGameId(e.target.value)}
                placeholder="Player ID"
                className="w-full border-b border-gray-300 focus:border-primary-dark outline-none py-2 text-sm"
              />
            </div>

            {/* Balance and validation messages */}
            <div className="space-y-2">
              <div className="flex items-center justify-start gap-2">
                <p className="text-sm">Payment Method:</p>
                <p className="text-sm font-medium">Daizer Wallet</p>
              </div>

              {!hasSufficientBalance && balanceData && (
                <p className="text-sm text-red-600">
                  Insufficient balance. You need ${total.toFixed(0)} but have{" "}
                  {balanceData.balance} {balanceData.currency}
                </p>
              )}
              {/* {!hasMinimumBalance && balanceData && hasSufficientBalance && (
                <p className="text-sm text-red-600">
                  Insufficient Minimum Balance. You need atleast{" "}
                  {balanceData.currency} {config?.minimumBalanceRequirement} to
                  purchase a product but have {balanceData.balance}{" "}
                  {balanceData.currency} in your Wallet
                </p>
              )} */}

              {purchaseProduct.isError && (
                <p>{"Purchase failed. Please try again."}</p>
              )}
            </div>

            <Button
              onClick={handlePlaceOrder}
              disabled={!canPurchase || purchaseProduct.isPending}
              className="w-full py-3 bg-primary-dark text-white rounded-full hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {purchaseProduct.isPending ? (
                <span>Processing...</span>
              ) : isProcessing ? (
                <span>Confirming...</span>
              ) : (
                <span>Confirm Purchase</span>
              )}
            </Button>

            {!hasSufficientBalance && (
              <Button
                variant="outline"
                onClick={() => navigate("/topup")}
                className="w-full py-3 border-primary-dark text-primary-dark rounded-full hover:bg-primary-dark hover:text-white"
              >
                Top Up Wallet
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
