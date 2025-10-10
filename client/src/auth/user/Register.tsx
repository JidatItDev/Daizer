import type React from "react";
import { useEffect, useState } from "react";

import { Eye, EyeOff, AlertCircle, Loader } from "lucide-react";
import { Input } from "../../components/common/Input";
import { Button } from "../../components/common/Button";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import axiosPublic from "../../AxiosInstances/PublicAxiosInstance";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { API_ENDPOINTS } from "../../config/api";
import { useRegisterWithLink, useSignupLink } from "../../api/auth";
import { useConfigContext } from "../../context/ConfigContext";

interface FormErrors {
  email?: string;
  firstName?: string;
  lastName?: string;
  password?: string;
  confirmPassword?: string;
}

interface FormData {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  confirmPassword: string;
}

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    email: "",
    firstName: "",
    lastName: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState({
    email: false,
    firstName: false,
    lastName: false,
    password: false,
    confirmPassword: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [isSignupLink, setIsSignupLink] = useState(false);
  // const [prefilledData, setPrefilledData] = useState<Partial<FormData>>({});
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

  const validateName = (name: string, field: string): string | undefined => {
    if (!name) {
      return `${field} is required`;
    }
    if (name.length < 2) {
      return `${field} must be at least 2 characters`;
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

  const validateConfirmPassword = (
    confirmPassword: string,
    password: string
  ): string | undefined => {
    if (!confirmPassword) {
      return "Please confirm your password";
    }
    if (confirmPassword !== password) {
      return "Passwords do not match";
    }
    return undefined;
  };
  const { data: signupLinkData, isLoading: isLoadingSignupLink } =
    useSignupLink(token || "", {
      enabled: !!token,
    });

  const config = useConfigContext();
  const logo = config?.logoUrl || "";

  useEffect(() => {
    if (signupLinkData && signupLinkData.success) {
      setIsSignupLink(true);
      const nameParts = signupLinkData.link.name.split(" ");
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(" ");

      setFormData((prev) => ({
        ...prev,
        email: signupLinkData.link.email,

        firstName: firstName,
        lastName: lastName,
      }));
    }
  }, [signupLinkData]);

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
      } else if (field === "firstName") {
        const nameError = validateName(value, "First name");
        if (nameError) {
          newErrors.firstName = nameError;
        } else {
          delete newErrors.firstName;
        }
      } else if (field === "lastName") {
        const nameError = validateName(value, "Last name");
        if (nameError) {
          newErrors.lastName = nameError;
        } else {
          delete newErrors.lastName;
        }
      } else if (field === "password") {
        const passwordError = validatePassword(value);
        if (passwordError) {
          newErrors.password = passwordError;
        } else {
          delete newErrors.password;
        }
        // Also validate confirm password if it's been touched
        if (touched.confirmPassword) {
          const confirmError = validateConfirmPassword(
            formData.confirmPassword,
            value
          );
          if (confirmError) {
            newErrors.confirmPassword = confirmError;
          } else {
            delete newErrors.confirmPassword;
          }
        }
      } else if (field === "confirmPassword") {
        const confirmError = validateConfirmPassword(value, formData.password);
        if (confirmError) {
          newErrors.confirmPassword = confirmError;
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
    if (field === "email") {
      const emailError = validateEmail(formData.email);
      if (emailError) {
        newErrors.email = emailError;
      } else {
        delete newErrors.email;
      }
    } else if (field === "firstName") {
      const nameError = validateName(formData.firstName, "First name");
      if (nameError) {
        newErrors.firstName = nameError;
      } else {
        delete newErrors.firstName;
      }
    } else if (field === "lastName") {
      const nameError = validateName(formData.lastName, "Last name");
      if (nameError) {
        newErrors.lastName = nameError;
      } else {
        delete newErrors.lastName;
      }
    } else if (field === "password") {
      const passwordError = validatePassword(formData.password);
      if (passwordError) {
        newErrors.password = passwordError;
      } else {
        delete newErrors.password;
      }
      // Also validate confirm password if it's been touched
      if (touched.confirmPassword) {
        const confirmError = validateConfirmPassword(
          formData.confirmPassword,
          formData.password
        );
        if (confirmError) {
          newErrors.confirmPassword = confirmError;
        } else {
          delete newErrors.confirmPassword;
        }
      }
    } else if (field === "confirmPassword") {
      const confirmError = validateConfirmPassword(
        formData.confirmPassword,
        formData.password
      );
      if (confirmError) {
        newErrors.confirmPassword = confirmError;
      } else {
        delete newErrors.confirmPassword;
      }
    }
    setErrors(newErrors);
  };

  const registerWithLinkMutation = useRegisterWithLink();
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Validate all fields
    const emailError = validateEmail(formData.email);
    const firstNameError = validateName(formData.firstName, "First name");
    const lastNameError =
      token && formData.lastName
        ? validateName(formData.lastName, "Last name")
        : false;
    const passwordError = validatePassword(formData.password);
    const confirmPasswordError = validateConfirmPassword(
      formData.confirmPassword,
      formData.password
    );

    const newErrors: FormErrors = {};
    if (emailError) newErrors.email = emailError;
    if (firstNameError) newErrors.firstName = firstNameError;
    if (lastNameError) newErrors.lastName = lastNameError;
    if (passwordError) newErrors.password = passwordError;
    if (confirmPasswordError) newErrors.confirmPassword = confirmPasswordError;

    setErrors(newErrors);
    setTouched({
      email: true,
      firstName: true,
      lastName: true,
      password: true,
      confirmPassword: true,
    });

    // If no errors, proceed with registration
    if (Object.keys(newErrors).length === 0) {
      try {
        if (isSignupLink && token) {
          // Use the register with link method
          const response = await registerWithLinkMutation.mutateAsync({
            token,
            password: formData.password,
          });

          const data = await response;

          if (data.success) {
            login(data.user, data.accessToken, data.refreshToken);
            navigate("/");
            toast.success("Registration successful");
          }
        } else {
          // Use the normal registration method (your existing code)
          const fullName = `${formData.firstName} ${formData.lastName}`;

          const response = await axiosPublic.post(API_ENDPOINTS.AUTH.REGISTER, {
            email: formData.email,
            name: fullName,
            password: formData.password,
          });

          const data = await response.data;

          if (data.success) {
            login(data.user, data.accessToken, data.refreshToken);
          }
          navigate("/");
          toast.success("Registration successful");
        }
      } catch (error: any) {
        console.error("Registration failed:", error);

        // Handle known backend error
        if (error.response?.status === 409) {
          setErrors((prev) => ({
            ...prev,
            email: "Email already registered",
          }));

          toast.error(
            "This email is already registered. Try logging in instead."
          );
        } else if (error.response?.status === 500) {
          toast.error("Server error. Please try again later.");
        } else {
          toast.error(
            error.response?.data?.message || "Registration failed unexpectedly."
          );
        }
      }
    }

    setIsSubmitting(false);
  };

  const isFormValid =
    Object.keys(errors).length === 0 &&
    formData.email &&
    formData.firstName &&
    // formData.lastName &&
    formData.password &&
    formData.confirmPassword;

  if (isLoadingSignupLink) {
    return (
      <div className="min-h-screen bg-primary-dark flex items-center justify-center">
        <Loader className="animate-spin text-white" />
        <div className="ml-3 text-white">Verifying your signup link...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary-dark flex items-center justify-center p-4">
      <div className="w-full  max-w-[520px]  3xl:max-w-[615px] 4xl:max-w-[800px] bg-white rounded-tl-[20px] rounded-br-[20px] rounded-tr-[80px] rounded-bl-[80px] px-[45px] py-[35px] shadow-2xl">
        <div className="flex justify-center mb-6">
          <div className="relative w-16 h-16 3xl:w-24 3xl:h-24 ">
            <img src={logo} alt="" />
          </div>
        </div>

        <div className="text-center mb-8">
          <h1
            className="text-lg lg:text-2xl 3xl:text-[36px] font-tajawal font-bold text-black mb-2 uppercase"
            style={{ fontFamily: "Tajawal, sans-serif" }}
          >
            Welcome
          </h1>
          <p className="text-lg lg:text-xl 3xl:text-2xl font-medium font-tajawal uppercase">
            Create Admin Account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div
            className={`grid   ${
              isSignupLink && formData.lastName ? "grid-cols-2" : "grid-cols-1"
            }  gap-4  `}
          >
            <Input
              type="text"
              value={formData.firstName}
              onChange={(e) => handleInputChange("firstName", e.target.value)}
              onBlur={() => handleBlur("firstName")}
              placeholder="First Name"
              error={errors.firstName}
              disabled={isSignupLink}
              rightIcon={
                errors.firstName ? (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                ) : undefined
              }
            />
            {isSignupLink && formData.lastName && (
              <Input
                type="text"
                value={formData.lastName}
                onChange={(e) => handleInputChange("lastName", e.target.value)}
                onBlur={() => handleBlur("lastName")}
                placeholder="Last Name"
                error={errors.lastName}
                rightIcon={
                  errors.lastName ? (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  ) : undefined
                }
              />
            )}
            {/* <Input
              type="text"
              value={formData.lastName}
              onChange={(e) => handleInputChange("lastName", e.target.value)}
              onBlur={() => handleBlur("lastName")}
              placeholder="Last Name"
              error={errors.lastName}
              disabled={isSignupLink}
              rightIcon={
                errors.lastName ? (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                ) : undefined
              }
            /> */}
          </div>

          <Input
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange("email", e.target.value)}
            onBlur={() => handleBlur("email")}
            placeholder="Email Address"
            error={errors.email}
            disabled={isSignupLink}
            rightIcon={
              errors.email ? (
                <AlertCircle className="h-5 w-5 text-red-500" />
              ) : undefined
            }
          />

          <Input
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

          <Input
            type={showConfirmPassword ? "text" : "password"}
            value={formData.confirmPassword}
            onChange={(e) =>
              handleInputChange("confirmPassword", e.target.value)
            }
            onBlur={() => handleBlur("confirmPassword")}
            placeholder="Confirm Password"
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

          <Button
            type="submit"
            disabled={!isFormValid}
            loading={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? "Registering..." : "Register"}
          </Button>

          {/* Login Link */}
          <div className="text-center">
            <Link
              to="/login"
              className="text-sm 3xl:text-lg hover:text-dark-primary underline font-medium"
            >
              Already have an account? Log In
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
