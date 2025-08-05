import type React from "react";
import { useState } from "react";
import { Input } from "../../components/common/Input";
import { Button } from "../../components/common/Button";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";
import axiosPrivate from "../../AxiosInstances/PrivateAxiosInstance";
import { API_ENDPOINTS } from "../../config/api";

interface FormErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

interface FormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export default function ChangePassword() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation functions
  const validatePassword = (
    password: string,
    fieldName: string
  ): string | undefined => {
    if (!password) {
      return `${fieldName} is required`;
    }
    if (password.length < 8) {
      return `${fieldName} must be at least 8 characters long`;
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return `${fieldName} must contain at least one uppercase letter, one lowercase letter, and one number`;
    }
    return undefined;
  };

  const validateConfirmPassword = (
    confirmPassword: string,
    newPassword: string
  ): string | undefined => {
    if (!confirmPassword) {
      return "Please confirm your new password";
    }
    if (confirmPassword !== newPassword) {
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

      if (field === "currentPassword" || field === "newPassword") {
        const error = validatePassword(
          value,
          field === "currentPassword" ? "Current password" : "New password"
        );
        if (error) {
          newErrors[field] = error;
        } else {
          delete newErrors[field];
        }
      } else if (field === "confirmPassword") {
        const error = validateConfirmPassword(value, formData.newPassword);
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
  const handleBlur = (field: keyof FormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));

    const newErrors = { ...errors };

    if (field === "currentPassword" || field === "newPassword") {
      const error = validatePassword(
        formData[field],
        field === "currentPassword" ? "Current password" : "New password"
      );
      if (error) {
        newErrors[field] = error;
      } else {
        delete newErrors[field];
      }
    } else if (field === "confirmPassword") {
      const error = validateConfirmPassword(
        formData.confirmPassword,
        formData.newPassword
      );
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
    const currentPasswordError = validatePassword(
      formData.currentPassword,
      "Current password"
    );
    const newPasswordError = validatePassword(
      formData.newPassword,
      "New password"
    );
    const confirmPasswordError = validateConfirmPassword(
      formData.confirmPassword,
      formData.newPassword
    );

    const newErrors: FormErrors = {};
    if (currentPasswordError) newErrors.currentPassword = currentPasswordError;
    if (newPasswordError) newErrors.newPassword = newPasswordError;
    if (confirmPasswordError) newErrors.confirmPassword = confirmPasswordError;

    setErrors(newErrors);
    setTouched({
      currentPassword: true,
      newPassword: true,
      confirmPassword: true,
    });

    // If no errors, proceed with password change
    if (Object.keys(newErrors).length === 0) {
      try {
        const payload = {
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
          userId: user?.id, // Assuming your auth context provides the user object with id
        };

        console.log("Submitting password change:", payload);

        // Uncomment to actually call the API
        const response = await axiosPrivate.post(
          API_ENDPOINTS.AUTH.Change_PASSWORD,
          payload
        );

        if (response.data) toast.success("Password changed successfully");
        navigate("/"); // Or wherever you want to redirect after success
      } catch (error: any) {
        console.error("Password change failed:", error);

        if (error.response?.status === 401) {
          setErrors((prev) => ({
            ...prev,
            currentPassword:
              error.response.data.message || "Current password is incorrect",
          }));
          toast.error(
            error.response.data.message || "Current password is incorrect"
          );
        } else if (error.response?.status === 500) {
          toast.error("Server error. Please try again later.");
        } else {
          toast.error(
            error.response?.data?.message ||
              "Password change failed unexpectedly."
          );
        }
      }
    }

    setIsSubmitting(false);
  };

  const isFormValid =
    Object.keys(errors).length === 0 &&
    formData.currentPassword &&
    formData.newPassword &&
    formData.confirmPassword;

  return (
    <div className="h-full flex items-center justify-center  ">
      <div className="w-full max-w-[520px]  3xl:max-w-[615px] 4xl:max-w-[800px] bg-white rounded-tl-[20px] rounded-br-[20px] rounded-tr-[80px] rounded-bl-[80px] p-4  md:px-[20px] md:py-[20px]">
        <div className="flex justify-center mb-6">
          <div className="relative w-16 h-16 3xl:w-24 3xl:h-24">
            <img src="./assets/logo.png" alt="" />
          </div>
        </div>

        <div className="text-center mb-8">
          <p className="text-lg lg:text-2xl 3xl:text-[36px]  font-medium font-tajawal uppercase">
            Change your password
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 bg-[#F9F6FE] p-4 lg:p-8 rounded-xl"
        >
          {/* Current Password Field */}
          <div className="space-y-2">
            <Input
              type={showCurrentPassword ? "text" : "password"}
              value={formData.currentPassword}
              onChange={(e) =>
                handleInputChange("currentPassword", e.target.value)
              }
              onBlur={() => handleBlur("currentPassword")}
              placeholder="Current Password"
              error={errors.currentPassword}
              rightIcon={
                <div className="flex items-center gap-2">
                  {errors.currentPassword && (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  )}
                  {showCurrentPassword ? (
                    <EyeOff strokeWidth={1.5} size={18} />
                  ) : (
                    <Eye strokeWidth={1.5} size={18} />
                  )}
                </div>
              }
              onRightIconClick={() =>
                setShowCurrentPassword(!showCurrentPassword)
              }
              className={errors.currentPassword ? "pr-20" : "pr-12"}
            />
          </div>

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
                    <EyeOff strokeWidth={1.5} size={18} />
                  ) : (
                    <Eye strokeWidth={1.5} size={18} />
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
                    <EyeOff strokeWidth={1.5} size={18} />
                  ) : (
                    <Eye strokeWidth={1.5} size={18} />
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
            {isSubmitting ? "Changing Password..." : "Change Password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
