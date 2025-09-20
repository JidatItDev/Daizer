import { useState } from "react";
import { useAdjustWallet } from "../../../api/Wallets";
import { Input } from "../../common/Input";
import { Button } from "../../common/Button";
import Modal from "../../common/Modal";

interface CreditDebitModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallet: any;
  type: "credit" | "debit";
}

const DESTINATION_OPTIONS = [
  "PayPal",
  "Oman National Bank",
  "Online Transfer",
  "Razer Pay",
  "Commercial Bank",
];

const SENT_RECEIVED_OPTIONS = [
  "PayPal",
  "Oman National Bank",
  "Online Transfer",
  "Razer Pay",
  "Commercial Bank",
];

export const CreditDebitModal = ({
  isOpen,
  onClose,
  wallet,
  type,
}: CreditDebitModalProps) => {
  const [amount, setAmount] = useState("");
  const [destination, setDestination] = useState("");
  const [sentReceived, setSentReceived] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const adjustWallet = useAdjustWallet();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !destination || !sentReceived) return;

    setIsSubmitting(true);
    try {
      await adjustWallet.mutateAsync({
        userId: wallet.user.id,
        amount: parseFloat(amount),
        type,
        destination,
        sentReceived, // This will be the sentBy/receivedInto field
      });
      onClose();
      resetForm();
    } catch (error) {
      console.error("Error adjusting wallet:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setAmount("");
    setDestination("");
    setSentReceived("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      heading={`Amount ${type === "credit" ? "Credit" : "Debit"}`}
      widthClass="max-w-[766px]"
    >
      <div className="mt-6">
        <div className="flex flex-col items-center mb-6 gap-2">
          <h3 className="font-poppins text-base text-center">
            Current Balance
          </h3>
          <div className="flex items-center gap-2 py-2 px-16 shadow-inner-box rounded-lg mx-auto">
            <p>$ {wallet.balance || wallet?.user?.wallet?.balance}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex w-full justify-between gap-8 items-center">
            <div className="w-full">
              <Input
                type="text"
                value={wallet.user.name}
                placeholder="Enter Name"
                disabled
                className="w-full py-3 border-b-[2px] p-2 border-gray-300 lg:text-lg md:text-base text-sm bg-transparent focus:outline-none focus:border-black"
              />
            </div>
            <div className="w-full">
              <Input
                type="email"
                value={wallet.user.email}
                placeholder="Enter Email"
                disabled
                className="w-full py-3 border-b-[2px] p-2 border-gray-300 lg:text-lg md:text-base text-sm bg-transparent focus:outline-none focus:border-black"
              />
            </div>
          </div>

          {/* Amount Input */}
          <div>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              required
              className="w-full py-3 border-b-[2px] p-2 border-gray-300 lg:text-lg md:text-base text-sm bg-transparent focus:outline-none focus:border-black"
            />
          </div>

          {/* Destination Dropdown */}
          <div>
            <div className="relative">
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full py-3 border-b-[2px] p-2 border-gray-300 lg:text-lg md:text-base text-sm bg-transparent focus:outline-none focus:border-black appearance-none"
                required
              >
                <option value="">Destination</option>
                {DESTINATION_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <div className="absolute right-0 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <svg
                  className="w-4 h-4 text-black"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Sent By / Received Into Dropdown */}
          <div>
            <div className="relative">
              <select
                value={sentReceived}
                onChange={(e) => setSentReceived(e.target.value)}
                className="w-full py-3 border-b-[2px] p-2 border-gray-300 lg:text-lg md:text-base text-sm bg-transparent focus:outline-none focus:border-black appearance-none"
                required
              >
                <option value="">
                  {type === "credit" ? "Received Into" : "Sent By"}
                </option>
                {SENT_RECEIVED_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <div className="absolute right-0 top-1/2 transform -translate-y-1/2 pointer-events-none">
                <svg
                  className="w-4 h-4 text-black"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-4 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1 py-3 border-2 border-gray-300 hover:border-gray-400"
            >
              Back
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3"
            >
              {isSubmitting ? "Processing..." : "Add"}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
