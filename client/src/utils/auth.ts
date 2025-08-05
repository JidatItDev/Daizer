import axiosPrivate, {
  getRefreshToken,
  setAccessToken,
} from "../AxiosInstances/PrivateAxiosInstance";

export async function checkSession() {
  try {
    const refreshToken = getRefreshToken();

    if (!refreshToken) {
      return { success: false, message: "No refresh token found" };
    }

    const res = await axiosPrivate.post("/auth/refresh", {
      token: refreshToken,
    });

    const newAccessToken = res.data.accessToken;
    if (newAccessToken) {
      setAccessToken(newAccessToken);
      return { success: true };
    } else {
      return { success: false, message: "No access token in response" };
    }
  } catch (err: any) {
    return {
      success: false,
      message: err?.response?.data?.message || "Session refresh failed",
    };
  }
}
