import type React from "react";
import { useState } from "react";
import { Input } from "../../components/common/Input";
import { Button } from "../../components/common/Button";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import axiosPublic from "../../AxiosInstances/PublicAxiosInstance";
import { useAuth } from "../../context/AuthContext";
import { API_ENDPOINTS } from "../../config/api";
import toast from "react-hot-toast";

interface FormErrors {
  email?: string;
  password?: string;
}

interface FormData {
  email: string;
  password: string;
}

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<{ email: boolean; password: boolean }>(
    {
      email: false,
      password: false,
    }
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation functions
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

  // Handle input changes
  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Real-time validation
    if (touched[field]) {
      const newErrors = { ...errors };
      if (field === "email") {
        const emailError = validateEmail(value);
        if (emailError) {
          newErrors.email = emailError;
        } else {
          delete newErrors.email;
        }
      } else if (field === "password") {
        const passwordError = validatePassword(value);
        if (passwordError) {
          newErrors.password = passwordError;
        } else {
          delete newErrors.password;
        }
      }
      setErrors(newErrors);
    }
  };

  // Handle field blur
  const handleBlur = (field: keyof FormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));

    const newErrors = { ...errors };
    if (field === "email") {
      const emailError = validateEmail(formData.email);
      if (emailError) {
        newErrors.email = emailError;
      } else {
        delete newErrors.email;
      }
    } else if (field === "password") {
      const passwordError = validatePassword(formData.password);
      if (passwordError) {
        newErrors.password = passwordError;
      } else {
        delete newErrors.password;
      }
    }
    setErrors(newErrors);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Validate all fields
    const emailError = validateEmail(formData.email);
    const passwordError = validatePassword(formData.password);

    const newErrors: FormErrors = {};
    if (emailError) newErrors.email = emailError;
    if (passwordError) newErrors.password = passwordError;

    setErrors(newErrors);
    setTouched({ email: true, password: true });

    // If no errors, proceed with login
    if (Object.keys(newErrors).length === 0) {
      try {
        const response = await axiosPublic.post(API_ENDPOINTS.AUTH.LOGIN, {
          email: formData.email,
          password: formData.password,
        });

        const data = await response.data;
        console.log(response);

        if (data.success) {
          login(data.user, data.accessToken, data.refreshToken);
        }
        toast.success("login successfull");

        if (data.user.role === "user") {
          navigate("/");
        }
        if (data.user.role === "admin") {
          navigate("/admin");
        }
      } catch (error: any) {
        console.error("Login failed:", error);

        // Handle known backend error
        if (error.response?.status === 404) {
          setErrors((prev) => ({
            ...prev,
            email: "User not found. Please register first.",
          }));

          toast.error("User not found. Please register first.");
        } else if (error.response?.status === 401) {
          setErrors((prev) => ({
            ...prev,
            password: "Incorrect password",
          }));

          toast.error("Incorrect password. Please try again.");
        } else if (error.response?.status === 500) {
          toast.error("Server error. Please try again later.");
        } else {
          toast.error(
            error.response?.data?.message || "Login failed unexpectedly."
          );
        }
      }
    }

    setIsSubmitting(false);
  };

  const isFormValid =
    Object.keys(errors).length === 0 && formData.email && formData.password;

  return (
    <div className="min-h-screen bg-primary-dark flex items-center justify-center p-4">
      <div className="w-full max-w-[520px]  3xl:max-w-[615px] 4xl:max-w-[800px] bg-white rounded-tl-[20px] rounded-br-[20px] rounded-tr-[80px] rounded-bl-[80px]   px-[45px] py-[35px] shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="relative w-16 h-16 3xl:w-24 3xl:h-24">
            <img src="./assets/logo.png" alt="" />
          </div>
        </div>

        {/* Welcome Text */}
        <div className="text-center mb-8">
          <h1
            className="text-lg lg:text-2xl 3xl:text-[36px] font-tajawal font-bold text-black  mb-2 uppercase"
            style={{ fontFamily: "Tajawal, sans-serif" }}
          >
            Welcome
          </h1>
          <p className="text-lg lg:text-xl 3xl:text-2xl font-medium font-tajawal uppercase">
            Log in your account
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5 3xl:space-y-8">
          {/* Email Field */}
          <Input
            // label="Email Address"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange("email", e.target.value)}
            onBlur={() => handleBlur("email")}
            placeholder="Email Address"
            error={errors.email}
            rightIcon={
              errors.email ? (
                <AlertCircle className="h-5 w-5 text-red-500" />
              ) : undefined
            }
          />

          {/* Password Field */}
          <div className="space-y-2">
            <Input
              //   label="Password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={(e) => handleInputChange("password", e.target.value)}
              onBlur={() => handleBlur("password")}
              placeholder="Password"
              error={errors.password}
              rightIcon={
                <div className="flex items-center gap-2">
                  {errors.password && (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  )}
                  {showPassword ? (
                    <EyeOff strokeWidth={1.5} />
                  ) : (
                    <Eye strokeWidth={1.5} />
                  )}
                </div>
              }
              onRightIconClick={() => setShowPassword(!showPassword)}
              className={errors.password ? "pr-20" : "pr-12"}
            />
          </div>

          {/* Forgot Password Link */}
          <div className="text-right">
            <Link
              to="/forgot-password"
              className="text-sm 3xl:text-base font-medium  hover:text-gray-800 underline"
            >
              Forgot Password?
            </Link>
          </div>

          {/* Login Button */}
          <Button
            type="submit"
            disabled={!isFormValid}
            loading={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? "Logging in..." : "Log In"}
          </Button>

          {/* Sign Up Link */}
          <div className="text-center ">
            <Link
              to="/register"
              className="text-sm 3xl:text-lg hover:text-dark-primary underline font-medium"
            >
              Don't Have an Account? Sign Up
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
