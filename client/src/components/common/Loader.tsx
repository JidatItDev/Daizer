import React from "react";

export interface LoaderProps {
  size?: "sm" | "md" | "lg" | "xl";
  variant?: "spinner" | "dots" | "pulse" | "progress";
  color?: "primary" | "secondary" | "success" | "error" | "white" | "gray";
  text?: string;
  className?: string;
  children?: React.ReactNode;
}

const sizeClasses = {
  sm: "h-3 w-3",
  md: "h-4 w-4",
  lg: "h-6 w-6",
  xl: "h-8 w-8",
};

const colorClasses = {
  primary: "border-primary-dark border-t-transparent",
  secondary: "border-gray-500 border-t-transparent",
  success: "border-green-500 border-t-transparent",
  error: "border-red-500 border-t-transparent",
  white: "border-white border-t-transparent",
  gray: "border-gray-300 border-t-transparent",
};

export const Loader: React.FC<LoaderProps> = ({
  size = "md",
  variant = "spinner",
  color = "primary",
  text,
  className,
  children,
}) => {
  const renderLoader = () => {
    switch (variant) {
      case "dots":
        return (
          <div className="flex items-center gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`rounded-full bg-current animate-bounce ${
                  sizeClasses[size]
                } animation-delay-${i * 100}`}
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        );

      case "pulse":
        return (
          <div
            className={`rounded-full bg-current animate-pulse ${sizeClasses[size]}`}
          />
        );

      case "progress":
        return (
          <div className="relative">
            <div
              className={`border-2 rounded-full ${
                sizeClasses[size]
              } ${colorClasses[color].replace(
                "border-t-transparent",
                "border-opacity-20"
              )}`}
            />
            <div
              className={`absolute top-0 left-0 border-2 border-t-transparent rounded-full animate-spin ${sizeClasses[size]} ${colorClasses[color]}`}
            />
          </div>
        );

      default: // spinner
        return (
          <div
            className={`border-2 border-t-transparent rounded-full animate-spin ${sizeClasses[size]} ${colorClasses[color]}`}
          />
        );
    }
  };

  return (
    <div
      className={`inline-flex items-center justify-center gap-2 ${
        className || ""
      }`}
      role="status"
      aria-label="Loading"
    >
      {renderLoader()}
      {(text || children) && (
        <span className="text-sm text-current">{text || children}</span>
      )}
    </div>
  );
};

// Additional specialized loader components
export const PageLoader: React.FC<{ message?: string }> = ({
  message = "Loading...",
}) => (
  <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
    <div className="text-center">
      <Loader size="xl" variant="spinner" />
      <p className="mt-4 text-lg text-gray-600">{message}</p>
    </div>
  </div>
);

export const ButtonLoader: React.FC<{ size?: LoaderProps["size"] }> = ({
  size = "sm",
}) => (
  <Loader
    size={size}
    variant="spinner"
    color="white"
    className="text-current"
  />
);

export const InlineLoader: React.FC<{ text?: string }> = ({ text }) => (
  <Loader variant="dots" size="sm" text={text} />
);
