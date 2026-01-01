import { Route, Routes } from "react-router-dom";
import ProtectedRoute from "./routes/ProtectedRoute";
import RoleBasedRoute from "./routes/RoleBasedRoute";
import Login from "./auth/user/Login";
import AdminLogin from "./auth/admin/Login";
import Register from "./auth/user/Register";
import { useAuth } from "./context/AuthContext";
import UserLayout from "./user/UserLayout";
import Changepassword from "./auth/user/Changepassword";
import AdminLayout from "./admin/AdminLayout";
import ForgotPassword from "./auth/user/ForgotPassword";
import ResetPassword from "./auth/user/ResetPassword";
import ErrorPage from "./auth/user/AccessErrorPage";
import { useEffect } from "react";
import { checkSession } from "./utils/auth";
import UserManagement from "./admin/userManagement";
import PricingGroup from "./admin/pricingGroups";
import ProductsManagement from "./admin/order&Product";
import Categories from "./user/categories";
import Subcategory from "./user/categories/Subcategory";
import Products from "./user/products";
import { Toaster } from "react-hot-toast";
import Checkout from "./user/products/Checkout";
import Wallet from "./user/wallet";
import Topup from "./user/wallet/Topup";
import WalletManagement from "./admin/WalletManagement";
import Settings from "./admin/platformSettings";
import UserDetails from "./admin/userManagement/UserDetails";
import ExternalProviderSettings from "./admin/ExternalApiProvider";

export const Signup = () => <div>Signup Page</div>;

export const ClientDashboard = () => <div>User Dashboard</div>;
export const AdminDashboard = () => <div>Admin Dashboardmmmmcm</div>;

function App() {
  const { logout, userLoggedIn } = useAuth();

  useEffect(() => {
    (async () => {
      const result = await checkSession();
      // console.log("result", result);
      if (!result.success && userLoggedIn) {
        logout("Session expired. Please log in to continue");
      }
    })();
  }, []);

  return (
    <>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={["admin"]}>
                <AdminLayout />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<UserManagement />} />
          <Route path="dashboard" element={<UserManagement />} />
          <Route path="user/:id" element={<UserDetails />} />
          <Route path="wallet" element={<WalletManagement />} />
          <Route path="pricing-groups" element={<PricingGroup />} />
          <Route path="orders-products" element={<ProductsManagement />} />
          <Route path="settings" element={<Settings />} />
          <Route path="external-api" element={<ExternalProviderSettings />} />
        </Route>

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={["user"]}>
                <UserLayout />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<Wallet />} />
          <Route path="/dashboard" element={<Wallet />} />
          <Route path="/browse-categories" element={<Categories />} />
          <Route path="/browse-categories/:id" element={<Subcategory />} />
          <Route path="/products/:id" element={<Products />} />
          <Route path="/checkout/:id" element={<Checkout />} />
          <Route path="/topup" element={<Topup />} />

          <Route path="/change-password" element={<Changepassword />} />
        </Route>

        <Route path="*" element={<ErrorPage errorType="404" />} />
      </Routes>
    </>
  );
}

export default App;
