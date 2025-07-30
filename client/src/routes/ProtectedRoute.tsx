import type { JSX } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface Props {
  children: JSX.Element;
}

const ProtectedRoute = ({ children }: Props) => {
  const { userLoggedIn } = useAuth();

  return userLoggedIn ? children : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
