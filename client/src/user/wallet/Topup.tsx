import { useState, useEffect } from "react";
import Heading from "../../components/common/Heading";
import { IoCaretBackOutline } from "react-icons/io5";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useCreatePayPalOrder, useCapturePayPalOrder } from "../../api/Wallets";
import Modal from "../../components/common/Modal";
import { CheckCircle } from "lucide-react";

const Topup = () => {
  const navigate = useNavigate();
  const { mutateAsync, isPending: isLoading } = useCreatePayPalOrder();
  const {
    mutate: captureOrder,
    data: captureData,
    isPending: isCapturing,
    isError: captureError,
  } = useCapturePayPalOrder();

  const [amount, setAmount] = useState<number | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const predefinedAmounts = [100, 500, 1000];

  const handleBack = () => {
    navigate("/dashboard");
  };

  const handleTopUp = async () => {
    if (!amount) return;

    try {
      const res = await mutateAsync({ amount, currency: "USD" });
      if (res?.approvalUrl) {
        setRedirecting(true);
        window.location.href = res.approvalUrl; // redirect to PayPal
      }
    } catch (error) {
      setRedirecting(false);

      console.error("PayPal order creation failed:", error);
    }
  };

  // Handle PayPal redirect with token + payerId
  useEffect(() => {
    const orderId = searchParams.get("token");

    if (orderId) {
      captureOrder(
        { orderId },
        {
          onSuccess: () => setShowModal(true),
          onError: () => setShowModal(true),
        }
      );

      // clear query params after processing
      setSearchParams({});
    }
  }, [searchParams, captureOrder, setSearchParams]);

  return (
    <div className="bg-white relative min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 flex-col md:flex-row gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBack}
            className="flex items-center text-primary-dark hover:text-black transition-colors border border-primary-dark rounded-full p-2"
          >
            <IoCaretBackOutline />
          </button>
          <Heading>{"Top Up"}</Heading>
        </div>
      </div>

      <div className="border-t-2 border-black/50 pt-6"></div>

      {/* Content */}
      <div className="mx-auto px-4">
        {/* Top Up Method */}
        <div className="mb-6">
          <p className="mb-2 font-medium">Top Up Method</p>
          <div className="flex items-center gap-3 border rounded-xl p-4 shadow-sm">
            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-[#635bff] text-white font-bold">
              P
            </div>
            <span className="text-gray-700 font-medium">PayPal</span>
          </div>
        </div>

        {/* Top Up Amount */}
        <div className="mb-6">
          <p className="mb-2 font-medium">Top Up Amount</p>
          <div className="flex gap-4">
            {predefinedAmounts.map((amt) => (
              <button
                key={amt}
                onClick={() => setAmount(amt)}
                className={`px-6 py-3 border rounded-lg shadow-sm ${
                  amount === amt
                    ? "border-primary-dark bg-primary-dark text-white"
                    : "border-gray-300 bg-white"
                }`}
              >
                ${amt}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Amount */}
        <div className="mb-10">
          <p className="mb-2 font-medium">Enter Amount</p>
          {/* <input
            type="number"
            placeholder="Write Here"
            value={amount ?? ""}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-full border-b p-2 outline-none focus:border-primary-dark"
          /> */}
          <input
            type="number"
            min={1} // enforce positive numbers at the HTML level
            placeholder="Enter amount in USD"
            value={amount !== null ? amount : ""}
            onChange={(e) => {
              const value = e.target.value;

              // allow empty input (so user can clear field)
              if (value === "") {
                setAmount(null);
                return;
              }

              // parse as integer, disallow negatives and leading zeros
              const parsed = parseInt(value, 10);

              if (!isNaN(parsed) && parsed > 0) {
                setAmount(parsed);
              }
            }}
            className="w-full border-b p-2 outline-none focus:border-primary-dark"
          />
        </div>

        <div className="text-center">
          <button
            onClick={handleTopUp}
            disabled={!amount || isLoading || redirecting}
            className="bg-primary-dark text-white px-10 py-2 rounded-full disabled:opacity-50"
          >
            {isLoading
              ? "Processing..."
              : redirecting
              ? "Redirecting"
              : "Top Up"}
          </button>
        </div>
      </div>

      {/* Success / Failure Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        heading="Top Up Amount"
      >
        {isCapturing && <p className="text-center">Please wait...</p>}
        {!isCapturing && captureData?.success && (
          <div className="flex flex-col items-center gap-3">
            <CheckCircle className="h-16 w-16 text-green-500" />

            <p>Amount has Successfully Topup</p>
          </div>
        )}
        {!isCapturing && captureError && (
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 bg-red-500 text-white flex items-center justify-center rounded-full">
              ✕
            </div>
            <p>amount Topup is Unsuccessfull</p>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Topup;
