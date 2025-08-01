export async function checkSession() {
  try {
    const res = await fetch("auth/refresh", {
      method: "POST",
      credentials: "include", // if refresh token is in HTTP-only cookie
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("accessToken")}`,
      },
      body: JSON.stringify({
        token: localStorage.getItem("refreshToken"),
      }),
    });

    const data = await res.json();

    if (res.ok) {
      localStorage.setItem("accessToken", data.accessToken);
      return { success: true };
    } else {
      return { success: false, message: data.message };
    }
  } catch (err) {
    return { success: false, message: "Network error" };
  }
}
