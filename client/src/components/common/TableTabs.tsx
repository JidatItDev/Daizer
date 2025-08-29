import React, { useState, type ReactNode } from "react";

// Types
interface Tab {
  label: string;
  content: ReactNode;
}

interface ReusableTabsProps {
  tabs: Tab[];
  defaultTab?: number;
  onTabChange?: (index: number) => void;
  showContent?: boolean; // New prop to control content display
}
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "outline";
  size?: "sm" | "md";
  className?: string;
}

interface HeadingProps {
  children: ReactNode;
  className?: string;
}

// Reusable Tabs Component
export const ReusableTabs: React.FC<ReusableTabsProps> = ({
  tabs,
  defaultTab = 0,
  onTabChange,
  showContent = true,
}) => {
  const [activeTab, setActiveTab] = useState<number>(defaultTab);

  const handleTabChange = (index: number) => {
    setActiveTab(index);
    onTabChange?.(index);
  };

  return (
    <div className="w-full">
      {/* Tab Headers */}
      <div className="flex">
        {tabs.map((tab, index) => (
          <button
            key={index}
            onClick={() => handleTabChange(index)}
            className={`px-6 py-3 font-medium text-sm transition-colors duration-200 border-b-2 ${
              activeTab === index
                ? "text-primary-dark border-primary-dark"
                : "text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content - Only show if showContent is true */}
      {showContent && <div className="mt-6">{tabs[activeTab]?.content}</div>}
    </div>
  );
};

// Mock Button component for demo
export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}) => {
  const baseClasses = "font-medium rounded-lg transition-colors duration-200";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    outline: "border border-gray-300 text-gray-700 bg-white hover:bg-gray-50",
  };
  const sizes = {
    sm: "px-3 py-1 text-sm",
    md: "px-4 py-2",
  };

  return (
    <button
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export const Heading: React.FC<HeadingProps> = ({
  children,
  className = "",
}) => {
  return (
    <h2 className={`text-2xl font-bold text-gray-800 ${className}`}>
      {children}
    </h2>
  );
};
