import { useState } from "react";
import { useRequestRefund } from "../../../api/Wallets";
import Modal from "../../common/Modal";
import { Input } from "../../common/Input";
import { Button } from "../../common/Button";
import toast from "react-hot-toast";

interface PartialRefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number;
  currency: string;
}

export const PartialRefundModal = ({
  isOpen,
  onClose,
  currentBalance,
}: PartialRefundModalProps) => {
  const [amount, setAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const requestRefund = useRequestRefund();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;

    setIsSubmitting(true);
    try {
      await requestRefund.mutateAsync({
        amount: parseFloat(amount),
      });
      onClose();
      resetForm();
      toast.success("Refund request sent successfully");
    } catch (error) {
      console.error("Error requesting refund:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setAmount("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const maxAmount = currentBalance;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      heading="Partial Refund"
      subheading="Request a partial refund from your wallet balance"
      widthClass="max-w-[766px]"
    >
      <div className="mt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Enter Amount
            </label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              max={maxAmount}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`write here`}
              required
              className="w-full py-3 border-b-[2px] p-2 border-gray-300 lg:text-lg md:text-base text-sm bg-transparent focus:outline-none focus:border-black"
            />
          </div>

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
              {isSubmitting ? "Processing..." : "Request Refund"}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
