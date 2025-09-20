import React, { createContext, useContext, useEffect, useState } from "react";
import Cookies from "js-cookie";
import CryptoJS from "crypto-js";
import type { AuthContextType, User } from "../types/auth/user.types";
import toast from "react-hot-toast";
import { queryClient } from "../main";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// const SECRET_KEY = "DAizie8rR+$3CR3T+PassC0de";
const SECRET_KEY = import.meta.env.VITE_CRYPTO_SECRET_KEY;

const encryptData = (data: unknown): string =>
  CryptoJS.AES.encrypt(JSON.stringify(data), SECRET_KEY).toString();

const decryptData = <T,>(encrypted: string): T | null => {
  try {
    const bytes = CryptoJS.AES.decrypt(encrypted, SECRET_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return JSON.parse(decrypted) as T;
  } catch (error) {
    console.error("Decryption failed:", error);
    return null;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [userLoggedIn, setUserLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = () => {
      const storedUser =
        Cookies.get("userData") || localStorage.getItem("userData");
      const storedAccess =
        Cookies.get("accessToken") || localStorage.getItem("accessToken");
      const storedRefresh =
        Cookies.get("refreshToken") || localStorage.getItem("refreshToken");

      if (storedUser && storedAccess && storedRefresh) {
        const decUser = decryptData<User>(storedUser);
        const decAccess = decryptData<string>(storedAccess);
        const decRefresh = decryptData<string>(storedRefresh);

        if (decUser && decAccess && decRefresh) {
          setUser(decUser);
          setAccessToken(decAccess);
          setRefreshToken(decRefresh);
          setUserLoggedIn(true);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = (
    newUser: User,
    newAccessToken: string,
    newRefreshToken: string
  ) => {
    console.log("log in auth being called");

    const encryptedUser = encryptData(newUser);
    const encryptedAccess = encryptData(newAccessToken);
    const encryptedRefresh = encryptData(newRefreshToken);

    Cookies.set("userData", encryptedUser, { expires: 7 });
    Cookies.set("accessToken", encryptedAccess, { expires: 7 });
    Cookies.set("refreshToken", encryptedRefresh, { expires: 7 });

    localStorage.setItem("userData", encryptedUser);
    localStorage.setItem("accessToken", encryptedAccess);
    localStorage.setItem("refreshToken", encryptedRefresh);

    setUser(newUser);
    setAccessToken(newAccessToken);
    setRefreshToken(newRefreshToken);
    setUserLoggedIn(true);
  };

  const logout = (message = "") => {
    Cookies.remove("userData");
    Cookies.remove("accessToken");
    Cookies.remove("refreshToken");

    localStorage.removeItem("userData");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    queryClient.clear();

    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    setUserLoggedIn(false);
    if (message) {
      toast.error(`${message}`);
    }
  };

  const value: AuthContextType = {
    user,
    accessToken,
    refreshToken,
    userLoggedIn,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
