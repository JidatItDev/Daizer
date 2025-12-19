import { useMemo, useState, useEffect, useRef } from "react";
import { useAdjustWallet, useGetActiveAccounts } from "../../../api/Wallets";
import { Input } from "../../common/Input";
import { Button } from "../../common/Button";
import Modal from "../../common/Modal";

interface CreditDebitModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallet: any;
  type: "credit" | "debit";
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

const ACCOUNTS_STORAGE_KEY = "cached_active_accounts";

// Custom Dropdown Component
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
        className="w-full py-2.5  border-b-[2px] p-2 border-gray-300  bg-transparent text-sm cursor-pointer transition-all flex items-center justify-between lg:text-lg md:text-base lg:placeholder:text-lg md:placeholder:text-base  placeholder:text-sm placeholder:font-poppins placeholder:font-light placeholder:text-black placeholder:p-0"
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
  const [cachedAccounts, setCachedAccounts] = useState<AccountsData | null>(
    null
  );
  const [shouldFetch, setShouldFetch] = useState(true);

  // Check localStorage first
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
  const adjustWallet = useAdjustWallet();

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

  const handleSubmit = async () => {
    if (!amount || !destination || !sentReceived) return;

    setIsSubmitting(true);
    try {
      await adjustWallet.mutateAsync({
        userId: wallet.user.id,
        amount: parseFloat(amount),
        type,
        destination,
        sentReceived,
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

        <div className="space-y-6">
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

          <CustomDropdown
            value={destination}
            onChange={setDestination}
            options={destinationAccounts}
            placeholder="Select Destination"
            required
          />

          <CustomDropdown
            value={sentReceived}
            onChange={setSentReceived}
            options={sentReceivedAccounts}
            placeholder={
              type === "credit" ? "Select Received Into" : "Select Sent By"
            }
            required
          />

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
              onClick={handleSubmit}
              className="flex-1 py-3"
            >
              {isSubmitting ? "Processing..." : "Add"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
