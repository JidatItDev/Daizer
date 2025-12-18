import { Button } from "../../common/Button";
import Modal from "../../common/Modal";

interface AdjustmentTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectType: (type: "credit" | "debit") => void;
  wallet?: any;
}

export const AdjustmentTypeModal = ({
  isOpen,
  onClose,
  onSelectType,
}: AdjustmentTypeModalProps) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      heading="User Wallet"
      subheading="Edit User Wallet"
      widthClass="max-w-[666px]"
    >
      <div className="mt-6 space-y-4">
        <div className="text-center mb-4"></div>

        <div className="grid grid-cols-2 gap-6 pt-8">
          <Button onClick={() => onSelectType("credit")} className="px-3 py-1">
            Generate Credit
          </Button>
          <Button
            onClick={() => onSelectType("debit")}
            variant="outline"
            className="px-3 py-1"
          >
            Generate Debit
          </Button>
        </div>
      </div>
    </Modal>
  );
};
