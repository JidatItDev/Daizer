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
import { Toaster } from "react-hot-toast";

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
          <Route path="pricing-groups" element={<PricingGroup />} />
          <Route path="orders-products" element={<ProductsManagement />} />
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
          <Route index element={<ClientDashboard />} />
          <Route path="/dashboard" element={<ClientDashboard />} />
          <Route path="/change-password" element={<Changepassword />} />
        </Route>

        <Route path="*" element={<ErrorPage errorType="404" />} />
      </Routes>
    </>
  );
}

export default App;
