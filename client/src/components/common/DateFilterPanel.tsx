import { X, Calendar } from "lucide-react";

interface DateFilterPanelProps {
  selectedDate: string | null;
  onDateChange: (date: string | null) => void;
  onApply: () => void;
  onClear: () => void;
  onClose: () => void;
}

export const DateFilterPanel = ({
  selectedDate,
  onDateChange,
  onApply,
  onClear,
  onClose,
}: DateFilterPanelProps) => {
  return (
    <div className="absolute top-7 right-0 md:top-full mt-2 w-full md:w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
      <div className="p-4">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Filter Orders</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </div>

        {/* Date Picker */}
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-600 mb-2">
            Purchase Date
          </p>

          <div className="relative">
            <Calendar
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="date"
              value={selectedDate ?? ""}
              onChange={(e) => onDateChange(e.target.value || null)}
              className="w-full border border-gray-300 rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-dark"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center">
          <button
            onClick={onClear}
            className="text-sm text-red-500 hover:underline"
          >
            Clear
          </button>

          <button
            onClick={onApply}
            disabled={!selectedDate}
            className="px-4 py-2 text-sm rounded-md bg-primary-dark text-white disabled:opacity-50"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};
