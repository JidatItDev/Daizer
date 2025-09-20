// components/admin/Wallet/RefundApproveModal.tsx
import { useState } from "react";
import { Input } from "../../common/Input";
import { Button } from "../../common/Button";
import Modal from "../../common/Modal";

interface RefundApproveModalProps {
  isOpen: boolean;
  onClose: () => void;
  refund: any;
  onSubmit: (destination: string, sentBy: string) => void;
}

const DESTINATION_OPTIONS = [
  "PayPal",
  "Oman National Bank",
  "Online Transfer",
  "Razer Pay",
  "Commercial Bank",
];

const SENT_BY_OPTIONS = [
  "PayPal",
  "Oman National Bank",
  "Online Transfer",
  "Razer Pay",
  "Commercial Bank",
];

export const RefundApproveModal = ({
  isOpen,
  onClose,
  refund,
  onSubmit,
}: RefundApproveModalProps) => {
  const [destination, setDestination] = useState("");
  const [sentBy, setSentBy] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination || !sentBy) return;

    setIsSubmitting(true);
    try {
      await onSubmit(destination, sentBy);
      resetForm();
    } catch (error) {
      console.error("Error submitting refund approval:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setDestination("");
    setSentBy("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      heading="Approve Refund"
      subheading={`Approve refund for ${refund.user?.name || "user"}`}
      widthClass="max-w-[766px]"
    >
      <div className="mt-6">
        <div className="flex flex-col items-center mb-6 gap-2">
          <h3 className="font-poppins text-base text-center">
            Current Balance
          </h3>
          <div className="flex items-center gap-2 py-2 px-16 shadow-inner-box rounded-lg mx-auto">
            <p>$ {refund?.user?.wallet?.balance}</p>
          </div>
        </div>
        {/* Refund Details */}

        <div className="flex w-full justify-between gap-8 items-center">
          <div className="w-full">
            <Input
              type="text"
              value={refund.user?.name}
              placeholder="Enter Name"
              disabled
              className="w-full py-3 border-b-[2px] p-2 border-gray-300 lg:text-lg md:text-base text-sm bg-transparent focus:outline-none focus:border-black"
            />
          </div>
          <div className="w-full">
            <Input
              type="email"
              value={refund.user.email}
              placeholder="Enter Email"
              disabled
              className="w-full py-3 border-b-[2px] p-2 border-gray-300 lg:text-lg md:text-base text-sm bg-transparent focus:outline-none focus:border-black"
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount Input (disabled) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount
            </label>
            <Input
              type="text"
              value={`$ ${refund.amount}`}
              disabled
              className="w-full py-3 border-b-[2px] p-2 border-gray-300 lg:text-lg md:text-base text-sm bg-gray-100"
            />
          </div>

          {/* Destination Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Destination
            </label>
            <div className="relative">
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full py-3 border-b-[2px] p-2 border-gray-300 lg:text-lg md:text-base text-sm bg-transparent focus:outline-none focus:border-black appearance-none"
                required
              >
                <option value="">Select Destination</option>
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

          {/* Sent By Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sent By
            </label>
            <div className="relative">
              <select
                value={sentBy}
                onChange={(e) => setSentBy(e.target.value)}
                className="w-full py-3 border-b-[2px] p-2 border-gray-300 lg:text-lg md:text-base text-sm bg-transparent focus:outline-none focus:border-black appearance-none"
                required
              >
                <option value="">Select Sent By</option>
                {SENT_BY_OPTIONS.map((option) => (
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
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? "Processing..." : "Approve Refund"}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
