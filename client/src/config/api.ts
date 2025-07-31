export const BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";

// Define all endpoints here
export const API_ENDPOINTS = {
  AUTH: {
    REGISTER: "/auth/register",
    LOGIN: "/auth/login",
    REFRESH: "/auth/refresh",
    LOGOUT: "/auth/logout",
    ChangePassword: "/auth/change-password",
  },
  USERS: {
    GET_ALL: "/users",
    GET_PROFILE: "/users/profile",
    UPDATE_PROFILE: "/users/update-profile",
  },
};
