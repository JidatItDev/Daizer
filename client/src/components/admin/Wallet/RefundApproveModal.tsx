import { useEffect, useMemo, useRef, useState } from "react";
import { Input } from "../../common/Input";
import { Button } from "../../common/Button";
import Modal from "../../common/Modal";
import { useGetActiveAccounts } from "../../../api/Wallets";
import toast from "react-hot-toast";

interface RefundApproveModalProps {
  isOpen: boolean;
  onClose: () => void;
  refund: any;
  onSubmit: (destination: string, sentBy: string) => Promise<void>;
}

interface ChartOfAccount {
  id: string;
  name: string;
  type: string;
  accountCode: string;
  balance: number;
}

interface AccountsData {
  success: boolean;
  accounts: ChartOfAccount[];
}

const ACCOUNTS_STORAGE_KEY = "cached_active_accounts_refund";

const CustomDropdown = ({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  options: ChartOfAccount[];
  placeholder: string;
  required?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
  }, []);

  const selectedAccount = options.find((opt) => opt.id === value);

  return (
    <div className="relative" ref={dropdownRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-2.5 border-b-[2px] p-2 border-gray-300 bg-transparent text-sm cursor-pointer transition-all flex items-center justify-between lg:text-lg md:text-base lg:placeholder:text-lg md:placeholder:text-base placeholder:text-sm placeholder:font-poppins placeholder:font-light placeholder:text-black placeholder:p-0"
      >
        <span className={value ? "text-black -ml-2" : "text-black"}>
          {selectedAccount
            ? `${selectedAccount.name} ${
                selectedAccount.accountCode
                  ? `(${selectedAccount.accountCode})`
                  : ""
              } - ${selectedAccount.type}`
            : placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
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

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {options.map((option) => (
            <div
              key={option.id}
              onClick={() => {
                onChange(option.id);
                setIsOpen(false);
              }}
              className="px-4 py-2 text-sm hover:bg-blue-50 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0"
            >
              <div className="font-medium text-gray-900">{option.name}</div>
              <div className="text-xs text-gray-500">
                {option.accountCode ? `${option.accountCode} • ` : ""}
                {option.type}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const RefundApproveModal = ({
  isOpen,
  onClose,
  refund,
  onSubmit,
}: RefundApproveModalProps) => {
  const [destination, setDestination] = useState("");
  const [sentBy, setSentBy] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cachedAccounts, setCachedAccounts] = useState<AccountsData | null>(
    null
  );
  const [shouldFetch, setShouldFetch] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as AccountsData;
        setCachedAccounts(parsed);
        setShouldFetch(false);
      } catch (error) {
        console.error("Error parsing cached accounts:", error);
        localStorage.removeItem(ACCOUNTS_STORAGE_KEY);
        setShouldFetch(true);
      }
    }
  }, []);

  const { data: accountsData } = useGetActiveAccounts();

  useEffect(() => {
    if (accountsData && shouldFetch) {
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accountsData));
      setCachedAccounts(accountsData);
      setShouldFetch(false);
    }
  }, [accountsData, shouldFetch]);

  const accounts = cachedAccounts || accountsData;

  const destinationAccounts = useMemo(() => {
    if (!accounts?.accounts) return [];
    return accounts.accounts;
  }, [accounts]);

  const sentReceivedAccounts = useMemo(() => {
    if (!accounts?.accounts) return [];
    return accounts.accounts;
  }, [accounts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!destination || !sentBy) {
      toast.error("Please select a destination and sent by account");
      return;
    }

    setIsSubmitting(true);
    try {
      // Call onSubmit and WAIT for everything to complete
      await onSubmit(destination, sentBy);

      // Don't show success here - parent will show it
      // Just reset and close
      resetForm();
      onClose();
    } catch (error) {
      console.error("Error submitting refund approval:", error);
      toast.error("Failed to approve refund");
      setIsSubmitting(false); // Only reset on error
    }
  };

  const resetForm = () => {
    setDestination("");
    setSentBy("");
    setIsSubmitting(false);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
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

        <form onSubmit={handleSubmit} className="space-y-4 mt-2.5">
          <div>
            <Input
              type="text"
              value={`$ ${refund.amount}`}
              disabled
              className="w-full py-3 border-b-[2px] p-2 border-gray-300 lg:text-lg md:text-base text-sm bg-gray-100"
            />
          </div>

          <CustomDropdown
            value={destination}
            onChange={setDestination}
            options={destinationAccounts}
            placeholder="Select Destination"
            required
          />

          <CustomDropdown
            value={sentBy}
            onChange={setSentBy}
            options={sentReceivedAccounts}
            placeholder={
              refund.type === "credit"
                ? "Select Received Into"
                : "Select Sent By"
            }
            required
          />

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
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
