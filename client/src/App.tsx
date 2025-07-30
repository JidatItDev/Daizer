import { Route, Routes } from "react-router-dom";
import ProtectedRoute from "./routes/ProtectedRoute";
import RoleBasedRoute from "./routes/RoleBasedRoute";
import Login from "./auth/user/Login";
import AdminLogin from "./auth/admin/Login";
import Register from "./auth/user/Register";
import { AuthProvider } from "./context/AuthContext";

export const Signup = () => <div>Signup Page</div>;

export const ClientLayout = () => <div>Client Layout</div>;
export const ClientDashboard = () => <div>Client Dashboard</div>;

export const AdminLayout = () => <div>Admin Layout</div>;

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
        ></Route>

        <Route
          path="/client"
          element={
            <ProtectedRoute>
              <RoleBasedRoute allowedRoles={["user"]}>
                <ClientLayout />
              </RoleBasedRoute>
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<ClientDashboard />} />
        </Route>

        <Route path="*" element={<Login />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
