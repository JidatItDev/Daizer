import { Link, useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { Button } from "../../components/common/Button";

interface ErrorPageProps {
  errorType: "404" | "401";
}

export default function ErrorPage({ errorType }: ErrorPageProps) {
  const navigate = useNavigate();

  const errorData = {
    "404": {
      title: "Page Not Found",
      description:
        "The page you're looking for doesn't exist or has been moved.",
      icon: <AlertCircle className="h-16 w-16 text-[#C50604]" />,
    },
    "401": {
      title: "Unauthorized Access",
      description: "You don't have permission to access this page.",
      icon: <AlertCircle className="h-16 w-16 text-[#C50604]" />,
    },
  };

  const currentError = errorData[errorType];

  return (
    <div className="min-h-screen bg-primary-dark flex items-center justify-center p-4">
      <div className="w-full max-w-[615px] bg-white rounded-tl-[20px] rounded-br-[20px] rounded-tr-[80px] rounded-bl-[80px] px-[45px] py-[35px] shadow-2xl">
        <div className="flex flex-col items-center text-center space-y-8">
          {/* Error Icon */}
          <div className="p-4 rounded-full bg-[#2C2E5F]/10">
            {currentError.icon}
          </div>

          {/* Error Title */}
          <h1
            className="text-[40px] font-tajawal font-bold text-[#2C2E5F] mb-2 uppercase"
            style={{ fontFamily: "Tajawal, sans-serif" }}
          >
            {currentError.title}
          </h1>

          {/* Error Description */}
          <p className="text-xl font-medium font-tajawal text-gray-600 max-w-md">
            {currentError.description}
          </p>

          {/* Error Code */}
          <div className="px-6 py-3  text-primary-dark rounded-full font-bold text-3xl">
            ERROR {errorType}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xs">
            <Button
              onClick={() => navigate(-1)}
              className="w-full bg-[#2C2E5F] hover:bg-[#2C2E5F]/90"
            >
              Go Back
            </Button>
            <Button
              variant="outline"
              className="w-full border-[#C50604] text-[#C50604] hover:bg-[#C50604]/10"
            >
              <Link to="/">Home Page</Link>
            </Button>
          </div>

          {/* Support Link */}
          {/* <div className="pt-4">
            <Link
              to="/contact"
              className="text-lg hover:text-[#2C2E5F] underline font-medium"
            >
              Need help? Contact Support
            </Link>
          </div> */}
        </div>
      </div>
    </div>
  );
}
