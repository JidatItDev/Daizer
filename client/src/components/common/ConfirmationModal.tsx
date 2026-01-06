import React from "react";
import Modal from "./Modal";
import { Button } from "./Button";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: React.ReactNode; // 🔁 change string → ReactNode
  cancelText?: string;
  variant?: "danger" | "primary";
  confirmDisabled?: boolean; // ✅ NEW
  cancelDisabled?: boolean; // ✅ NEW
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "primary",
  confirmDisabled = false,
  cancelDisabled = false,
}) => {
  if (!isOpen) return null;

  const buttonClass =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-700"
      : "bg-blue-600 hover:bg-blue-700";

  return (
    <Modal
      isOpen={isOpen}
      onClose={confirmDisabled ? () => {} : onClose} // ⛔ prevent close
      heading={title}
      subheading={message}
    >
      <div className="flex gap-4 justify-center mt-6">
        <Button
          onClick={onClose}
          disabled={cancelDisabled}
          className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {cancelText}
        </Button>

        <Button
          onClick={onConfirm}
          disabled={confirmDisabled}
          className={`px-4 py-2 text-white ${buttonClass} disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {confirmText}
        </Button>
      </div>
    </Modal>
  );
};

export default ConfirmationModal;
