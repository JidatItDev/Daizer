import type React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  children,
  className = "",
  ...props
}: ButtonProps) {
  const baseStyles =
    " text-base font-medium rounded-[100px] transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary:
      "bg-primary-dark hover:bg-indigo-800 disabled:bg-gray-400 text-white focus:ring-indigo-500",
    secondary:
      "bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 text-gray-900 focus:ring-gray-500",
    outline:
      "border border-gray-300 hover:bg-gray-50 disabled:bg-gray-50 text-gray-700 focus:ring-gray-500 ",
  };

  const sizes = {
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-2 md:py-3  text-sm 3xl:text-base",
    lg: "px-6 py-4 text-lg",
  };

  const isDisabled = disabled || loading;

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2">
          <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          {children}
        </div>
      ) : (
        children
      )}
    </button>
  );
}
