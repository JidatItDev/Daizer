import React from "react";
import Modal from "./Modal";
import { Button } from "./Button";
import { Loader2 } from "lucide-react";

interface ConfirmationModalNewProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isLoading?: boolean;
  variant?: "danger" | "primary" | "warning";
}

const ConfirmationModalNew: React.FC<ConfirmationModalNewProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isLoading = false,
  variant = "primary",
}) => {
  if (!isOpen) return null;

  const getButtonColors = () => {
    switch (variant) {
      case "danger":
        return "bg-red-600 hover:bg-red-700 text-white";
      case "warning":
        return "bg-yellow-600 hover:bg-yellow-700 text-white";
      default:
        return "bg-blue-600 hover:bg-blue-700 text-white";
    }
  };
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      heading={title}
      subheading={message}
    >
      <div className="flex gap-4 justify-center mt-6">
        <Button
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          {cancelText}
        </Button>
        <Button
          onClick={onConfirm}
          disabled={isLoading}
          className={`px-6 py-2 flex items-center gap-2 ${getButtonColors()}`}
        >
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
};

export default ConfirmationModalNew;
