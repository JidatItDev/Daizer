import type React from "react";
import { useState, useEffect } from "react";
import { Input } from "../../components/common/Input";
import { Button } from "../../components/common/Button";
import { Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import axiosPublic from "../../AxiosInstances/PublicAxiosInstance";
import { API_ENDPOINTS } from "../../config/api";
import toast from "react-hot-toast";

interface FormErrors {
  newPassword?: string;
  confirmPassword?: string;
}

interface FormData {
  newPassword: string;
  confirmPassword: string;
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    newPassword: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState({
    newPassword: false,
    confirmPassword: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      toast.error("Missing reset token in URL");
      return;
    }

    setTokenValid(true);
  }, [token]);

  // Validation functions
  const validatePassword = (password: string): string | undefined => {
    if (!password) {
      return "Password is required";
    }
    if (password.length < 8) {
      return "Password must be at least 8 characters long";
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return "Password must contain at least one uppercase letter, one lowercase letter, and one number";
    }
    return undefined;
  };

  const validateConfirmPassword = (
    confirmPassword: string
  ): string | undefined => {
    if (!confirmPassword) {
      return "Please confirm your new password";
    }
    if (confirmPassword !== formData.newPassword) {
      return "Passwords do not match";
    }
    return undefined;
  };

  // Handle input changes
  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Real-time validation
    if (touched[field]) {
      const newErrors = { ...errors };

      if (field === "newPassword") {
        const error = validatePassword(value);
        if (error) {
          newErrors.newPassword = error;
        } else {
          delete newErrors.newPassword;
        }
        // Re-validate confirm password when new password changes
        if (touched.confirmPassword) {
          const confirmError = validateConfirmPassword(
            formData.confirmPassword
          );
          if (confirmError) {
            newErrors.confirmPassword = confirmError;
          } else {
            delete newErrors.confirmPassword;
          }
        }
      } else if (field === "confirmPassword") {
        const error = validateConfirmPassword(value);
        if (error) {
          newErrors.confirmPassword = error;
        } else {
          delete newErrors.confirmPassword;
        }
      }

      setErrors(newErrors);
    }
  };

  // Handle field blur
  const handleBlur = (field: keyof typeof touched) => {
    setTouched((prev) => ({ ...prev, [field]: true }));

    const newErrors = { ...errors };

    if (field === "newPassword") {
      const error = validatePassword(formData.newPassword);
      if (error) {
        newErrors.newPassword = error;
      } else {
        delete newErrors.newPassword;
      }
    } else if (field === "confirmPassword") {
      const error = validateConfirmPassword(formData.confirmPassword);
      if (error) {
        newErrors.confirmPassword = error;
      } else {
        delete newErrors.confirmPassword;
      }
    }

    setErrors(newErrors);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Validate all fields
    const newPasswordError = validatePassword(formData.newPassword);
    const confirmPasswordError = validateConfirmPassword(
      formData.confirmPassword
    );

    const newErrors: FormErrors = {};
    if (newPasswordError) newErrors.newPassword = newPasswordError;
    if (confirmPasswordError) newErrors.confirmPassword = confirmPasswordError;

    setErrors(newErrors);
    setTouched({
      newPassword: true,
      confirmPassword: true,
    });

    // If no errors, proceed with password reset
    if (Object.keys(newErrors).length === 0 && token) {
      try {
        const response = await axiosPublic.post(
          API_ENDPOINTS.AUTH.RESET_PASSWORD,
          {
            token: token,
            newPassword: formData.newPassword,
          }
        );

        console.log("Password reset successful:", response.data);
        toast.success("Password has been reset successfully");
        setIsSuccess(true);

        setTimeout(() => navigate("/login"), 3000);
      } catch (error: any) {
        console.error("Password reset failed:", error);

        if (error.response?.status === 400) {
          toast.error(error.response.data.error || "Invalid or expired token");
          setTokenValid(false);
        } else if (error.response?.status === 404) {
          toast.error("User not found");
        } else if (error.response?.status === 500) {
          toast.error("Server error. Please try again later.");
        } else {
          toast.error(
            error.response?.data?.message ||
              "Password reset failed unexpectedly."
          );
        }
      }
    }

    setIsSubmitting(false);
  };

  const isFormValid =
    Object.keys(errors).length === 0 &&
    formData.newPassword &&
    formData.confirmPassword &&
    tokenValid;

  if (tokenValid === false) {
    return (
      <div className="min-h-screen bg-primary-dark flex items-center justify-center p-4">
        <div className="w-full max-w-[520px]  3xl:max-w-[615px] 4xl:max-w-[800px] bg-white rounded-tl-[20px] rounded-br-[20px] rounded-tr-[80px] rounded-bl-[80px] px-[45px] py-[35px] shadow-2xl">
          <div className="text-center space-y-6">
            <div className="flex justify-center mb-6">
              <div className="relative w-16 h-16 3xl:w-24 3xl:h-24">
                <img src="./assets/logo.png" alt="" />
              </div>
            </div>
            <h1 className="text-lg lg:text-2xl 3xl:text-[36px] font-tajawal font-bold text-black mb-2 uppercase">
              Invalid Token
            </h1>
            <p className="text-lg">
              The password reset link is invalid or has expired.
            </p>
            <p className="text-lg">Please request a new password reset link.</p>
            <Button
              onClick={() => navigate("/forgot-password")}
              className="w-full"
            >
              Request New Reset Link
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-primary-dark flex items-center justify-center p-4">
        <div className="w-full  max-w-[520px]  3xl:max-w-[615px] 4xl:max-w-[800px] bg-white rounded-tl-[20px] rounded-br-[20px] rounded-tr-[80px] rounded-bl-[80px] px-[45px] py-[35px] shadow-2xl">
          <div className="text-center space-y-6">
            <div className="flex justify-center mb-6">
              <div className="relative w-16 h-16 3xl:w-24 3xl:h-24">
                <img src="./assets/logo.png" alt="" />
              </div>
            </div>
            <div className="flex justify-center">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <h1 className="text-lg lg:text-2xl 3xl:text-[36px] font-tajawal font-bold text-black mb-2 uppercase">
              Password Reset
            </h1>
            <p className="text-lg">
              Your password has been successfully reset.
            </p>
            <p className="text-lg">
              You will be redirected to the login page shortly.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary-dark flex items-center justify-center p-4">
      <div className="w-full max-w-[520px]  3xl:max-w-[615px] 4xl:max-w-[800px]  bg-white rounded-tl-[20px] rounded-br-[20px] rounded-tr-[80px] rounded-bl-[80px] px-[45px] py-[35px] shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="relative w-16 h-16 3xl:w-24 3xl:h-24">
            <img src="./assets/logo.png" alt="" />
          </div>
        </div>

        <div className="text-center mb-8">
          <h1
            className="text-lg lg:text-2xl 3xl:text-[36px] font-tajawal font-bold text-black mb-2 uppercase"
            style={{ fontFamily: "Tajawal, sans-serif" }}
          >
            Reset Password
          </h1>
          <p className="text-lg lg:text-xl 3xl:text-2xl font-medium font-tajawal uppercase">
            Create a new password
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* New Password Field */}
          <div className="space-y-2">
            <Input
              type={showNewPassword ? "text" : "password"}
              value={formData.newPassword}
              onChange={(e) => handleInputChange("newPassword", e.target.value)}
              onBlur={() => handleBlur("newPassword")}
              placeholder="New Password"
              error={errors.newPassword}
              rightIcon={
                <div className="flex items-center gap-2">
                  {errors.newPassword && (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  )}
                  {showNewPassword ? (
                    <EyeOff strokeWidth={1.5} />
                  ) : (
                    <Eye strokeWidth={1.5} />
                  )}
                </div>
              }
              onRightIconClick={() => setShowNewPassword(!showNewPassword)}
              className={errors.newPassword ? "pr-20" : "pr-12"}
            />
          </div>

          {/* Confirm Password Field */}
          <div className="space-y-2">
            <Input
              type={showConfirmPassword ? "text" : "password"}
              value={formData.confirmPassword}
              onChange={(e) =>
                handleInputChange("confirmPassword", e.target.value)
              }
              onBlur={() => handleBlur("confirmPassword")}
              placeholder="Confirm New Password"
              error={errors.confirmPassword}
              rightIcon={
                <div className="flex items-center gap-2">
                  {errors.confirmPassword && (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  )}
                  {showConfirmPassword ? (
                    <EyeOff strokeWidth={1.5} />
                  ) : (
                    <Eye strokeWidth={1.5} />
                  )}
                </div>
              }
              onRightIconClick={() =>
                setShowConfirmPassword(!showConfirmPassword)
              }
              className={errors.confirmPassword ? "pr-20" : "pr-12"}
            />
          </div>

          <Button
            type="submit"
            disabled={!isFormValid}
            loading={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? "Resetting..." : "Reset Password"}
          </Button>

          <div className="text-center">
            <Link
              to="/login"
              className="text-sm 3xl:text-lg hover:text-dark-primary underline font-medium"
            >
              Back to Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
