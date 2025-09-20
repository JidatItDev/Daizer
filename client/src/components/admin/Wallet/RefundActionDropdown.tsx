// components/admin/Wallet/RefundActionDropdown.tsx
import { useState, useRef } from "react";
import { Edit } from "lucide-react";
import { useRejectRefund } from "../../../api/Wallets";
import toast from "react-hot-toast";

interface RefundActionDropdownProps {
  refund: any;
  onApproveClick: () => void;
}

export const RefundActionDropdown = ({
  refund,
  onApproveClick,
}: RefundActionDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const rejectRefund = useRejectRefund();

  const handleReject = async () => {
    try {
      await rejectRefund.mutateAsync(refund.id);
      setIsOpen(false);
      toast.success("Refund Request rejected successfully");
    } catch (error) {
      console.error("Error rejecting refund:", error);
    }
  };

  const handleApprove = () => {
    onApproveClick();
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useState(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  });

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="text-primary-dark hover:text-black h-8 w-8 border border-primary-dark rounded-full flex items-center justify-center py-2 md:py-3"
      >
        <Edit size={16} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-8 w-full min-w-40  bg-white border border-gray-200 rounded-lg shadow-lg z-10">
          <button
            disabled={refund.status !== "pending"}
            onClick={handleApprove}
            className="w-full flex items-center px-3 py-2 text-xs text-slate-700 hover:bg-slate-50   disabled:hover:bg-gray-100 disabled:text-gray-400"
          >
            Generate Refund
          </button>
          <button
            disabled={refund.status !== "pending"}
            onClick={handleReject}
            className="w-full flex items-center px-3 py-2 text-xs  text-slate-700 hover:bg-slate-50 disabled:hover:bg-gray-100 disabled:text-gray-400"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  );
};
