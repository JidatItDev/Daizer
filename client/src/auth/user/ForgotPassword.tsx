import type React from "react";
import { useState } from "react";
import { Input } from "../../components/common/Input";
import { Button } from "../../components/common/Button";
import { AlertCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import axiosPublic from "../../AxiosInstances/PublicAxiosInstance";
import { API_ENDPOINTS } from "../../config/api";
import toast from "react-hot-toast";
import { MdVerified } from "react-icons/md";

interface FormErrors {
  email?: string;
}

interface FormData {
  email: string;
}

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    email: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState({ email: false });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Validation function
  const validateEmail = (email: string): string | undefined => {
    if (!email) {
      return "Email address is required";
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return "Please enter a valid email address";
    }
    return undefined;
  };

  // Handle input changes
  const handleInputChange = (value: string) => {
    setFormData({ email: value });

    // Real-time validation
    if (touched.email) {
      const emailError = validateEmail(value);
      setErrors({ email: emailError });
    }
  };

  // Handle field blur
  const handleBlur = () => {
    setTouched({ email: true });
    const emailError = validateEmail(formData.email);
    setErrors({ email: emailError });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Validate field
    const emailError = validateEmail(formData.email);
    setErrors({ email: emailError });
    setTouched({ email: true });

    // If no errors, proceed with password reset request
    if (!emailError) {
      try {
        await axiosPublic.post(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, {
          email: formData.email,
        });

        // console.log("Password reset request successful:", response.data);
        toast.success("Password reset link sent to your email");
        setIsSubmitted(true);
      } catch (error: any) {
        console.error("Password reset request failed:", error);

        if (error.response?.status === 404) {
          setErrors({
            email: "Email not found. Please check your email address.",
          });
          toast.error("Email not found. Please check your email address.");
        } else if (error.response?.status === 500) {
          toast.error("Server error. Please try again later.");
        } else {
          toast.error(
            error.response?.data?.message ||
              "Password reset request failed unexpectedly."
          );
        }
      }
    }

    setIsSubmitting(false);
  };

  const isFormValid = !errors.email && formData.email;

  return (
    <div className="min-h-screen bg-primary-dark flex items-center justify-center p-4">
      <div className="w-full max-w-[520px]  3xl:max-w-[615px] 4xl:max-w-[800px] bg-white rounded-tl-[20px] rounded-br-[20px] rounded-tr-[80px] rounded-bl-[80px] px-[45px] py-[35px] shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="relative w-16 h-16 3xl:w-24 3xl:h-24">
            <img src="./assets/logo.png" alt="" />
          </div>
        </div>

        {/* Heading */}
        <div className="text-center mb-8">
          <h1
            className="text-lg lg:text-2xl 3xl:text-[36px] font-tajawal font-bold text-black mb-2 uppercase"
            style={{ fontFamily: "Tajawal, sans-serif" }}
          >
            Reset Password
          </h1>
          <p className="text-2xl font-medium font-tajawal uppercase">
            Enter your email address
          </p>
        </div>

        {isSubmitted ? (
          <div className="text-center space-y-6">
            <div className="text-success text-[60px] flex items-center justify-center">
              <MdVerified />
            </div>
            <p className="text-sm">
              We've sent a password reset link to{" "}
              <strong>{formData.email}</strong>. Please check your email.
            </p>
            <Button onClick={() => navigate("/login")} className="w-full">
              Back to Login
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Email Field */}
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange(e.target.value)}
              onBlur={handleBlur}
              placeholder="Email Address"
              error={errors.email}
              rightIcon={
                errors.email ? (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                ) : undefined
              }
            />

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={!isFormValid}
              loading={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? "Sending..." : "Send Reset Link"}
            </Button>

            {/* Back to Login Link */}
            <div className="text-center">
              <Link
                to="/login"
                className="text-sm 3xl:text-lg hover:text-dark-primary underline font-medium"
              >
                Remember your password? Log In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
