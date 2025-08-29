import { Navigate } from "react-router-dom";
import type { JSX } from "react";
import { useAuth } from "../context/AuthContext";
import type { role } from "../types/auth/user.types";

interface Props {
  allowedRoles: role[];
  children: JSX.Element;
}

const RoleBasedRoute = ({ allowedRoles, children }: Props) => {
  const { user } = useAuth();

  if (!user || !user.role || !allowedRoles.includes(user?.role)) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default RoleBasedRoute;
