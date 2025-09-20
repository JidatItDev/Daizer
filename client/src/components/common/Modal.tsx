import React from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  heading: string;
  subheading?: string;
  children: React.ReactNode;
  widthClass?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  heading,
  subheading = "",
  children,
  widthClass = "max-w-lg",
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`relative max-h-[90%] overflow-auto bg-white rounded-xl shadow-xl w-full mx-4 modal-content ${widthClass}`}
      >
        <div className="py-[56px] px-[34px]">
          {/* Heading */}
          <h2 className="font-roboto font-medium text-3xl text-center leading-[52px] tracking-tight mb-2 text-primary-dark">
            {heading}
          </h2>

          {/* Subheading */}
          <p className="font-poppins font-normal text-base text-center leading-[25px] tracking-tight text-gray-600 mb-6">
            {subheading}
          </p>

          {/* Child content */}
          <div className="mt-6">{children}</div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close modal"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Modal;
