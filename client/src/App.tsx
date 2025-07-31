import { Route, Routes } from "react-router-dom";
import ProtectedRoute from "./routes/ProtectedRoute";
import RoleBasedRoute from "./routes/RoleBasedRoute";
import Login from "./auth/user/Login";
import AdminLogin from "./auth/admin/Login";
import Register from "./auth/user/Register";
import { AuthProvider } from "./context/AuthContext";
import UserLayout from "./user/UserLayout";
import Changepassword from "./auth/user/Changepassword";
import AdminLayout from "./admin/AdminLayout";

export const Signup = () => <div>Signup Page</div>;

export const ClientDashboard = () => <div>Client Dashboard</div>;
export const AdminDashboard = () => <div>Admin Dashboard</div>;

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route index path="/register" element={<Register />} />

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
          <Route index element={<AdminDashboard />} />
          <Route path="dashboard" element={<AdminDashboard />} />
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

        <Route path="*" element={<Login />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
