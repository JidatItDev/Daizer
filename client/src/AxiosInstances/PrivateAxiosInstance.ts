import axios from "axios";
import Cookies from "js-cookie";
import toast from "react-hot-toast";
import CryptoJS from "crypto-js";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:3000/api/v1";
const SECRET_KEY = import.meta.env.VITE_CRYPTO_SECRET_KEY;

const axiosPrivate = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

let isRefreshing = false;
let failedQueue: any[] = [];

export const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

export const decryptData = <T>(encryptedData: string): T | null => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, SECRET_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    return JSON.parse(decrypted) as T;
  } catch (error) {
    console.error("Decryption error:", error);
    return null;
  }
};

export const getAccessToken = (): string | null => {
  const encrypted =
    Cookies.get("accessToken") || localStorage.getItem("accessToken");
  return encrypted ? decryptData<string>(encrypted) : null;
};

export const getRefreshToken = (): string | null => {
  const encrypted =
    Cookies.get("refreshToken") || localStorage.getItem("refreshToken");
  return encrypted ? decryptData<string>(encrypted) : null;
};

export const setAccessToken = (token: string) => {
  const encrypted = CryptoJS.AES.encrypt(
    JSON.stringify(token),
    SECRET_KEY
  ).toString();
  Cookies.set("accessToken", encrypted, { expires: 7 });
  localStorage.setItem("accessToken", encrypted);
};

// Attach token before every request
axiosPrivate.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle 401 and refresh token
axiosPrivate.interceptors.response.use(
  (response) => {
    if (response.data?.isLoggedOut) {
      handleLogout(response.data.message || "Session ended.");
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes("/auth/refresh")
    ) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token: string | unknown) => {
          originalRequest.headers.Authorization = "Bearer " + token;
          return axiosPrivate(originalRequest);
        });
      }

      isRefreshing = true;
      const refreshToken = getRefreshToken();

      if (!refreshToken) {
        handleLogout("No refresh token. Please log in again.");
        return Promise.reject(error);
      }

      try {
        const res = await axios.post(`${baseURL}/auth/refresh`, {
          token: refreshToken,
        });

        const newAccessToken = res.data.accessToken;
        setAccessToken(newAccessToken);
        processQueue(null, newAccessToken);

        originalRequest.headers.Authorization = "Bearer " + newAccessToken;
        return axiosPrivate(originalRequest);
      } catch (err) {
        processQueue(err, null);
        handleLogout("Session expired. Please log in again.");
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    if (error.response?.data?.loggedOut || error.response?.status === 403) {
      handleLogout("Session expired or unauthorized.");
    }

    return Promise.reject(error);
  }
);

function handleLogout(message: string) {
  Cookies.remove("userData");
  Cookies.remove("accessToken");
  Cookies.remove("refreshToken");

  localStorage.removeItem("userData");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");

  toast.error(message);
  setTimeout(() => {
    window.location.href = "/login";
  }, 2000);
}

export default axiosPrivate;
