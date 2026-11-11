import axios from "axios";

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((p) => {
    if (error) p.reject(error);
    else p.resolve(token);
  });
  failedQueue = [];
};

let rawURL =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000/api/v1";

if (rawURL && !rawURL.endsWith("/api/v1") && !rawURL.endsWith("/api/v1/")) {
  rawURL = rawURL.replace(/\/+$/, "") + "/api/v1";
}
const baseURL = rawURL;

const axiosInstance = axios.create({
  baseURL: baseURL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;
    const status = err.response?.status;
    const errorMsg =
      err.response?.data?.error?.message ||
      err.response?.data?.message ||
      err.response?.data?.error_message ||
      err.response?.data?.detail ||
      "";
    const errorCode =
      err.response?.data?.error?.code ||
      err.response?.data?.code ||
      "";

    // Never intercept auth endpoints (login, signup, customer-signup, OAuth exchange, reset password)
    const requestUrl = originalRequest?.url || "";
    const isAuthRoute =
      requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/signup") ||
      requestUrl.includes("/auth/customer-signup") ||
      requestUrl.includes("/auth/refresh") ||
      requestUrl.includes("/auth/forgot-password") ||
      requestUrl.includes("/auth/reset-password") ||
      requestUrl.includes("/auth/verify-email") ||
      requestUrl.includes("/exchange");

    // Only attempt refresh / logout redirection if it's a 401 on an authenticated non-auth route,
    // or if the backend explicitly reports token expired
    const isTokenExpired =
      !isAuthRoute &&
      ((status === 401 && (errorMsg.toLowerCase().includes("expired") || errorMsg.toLowerCase().includes("token") || errorCode === "UNAUTHORIZED" || errorCode === "TOKEN_EXPIRED")) ||
       (status === 422 && errorMsg.toLowerCase().includes("token expired")));

    if (isTokenExpired && !originalRequest._retry) {
      // Stale/expired token — attempt silent refresh first (401 path)
      if (status === 401) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve, reject });
          }).then((token) => {
            originalRequest.headers.Authorization = "Bearer " + token;
            return axiosInstance(originalRequest);
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const refreshToken = localStorage.getItem("refresh_token");
          const refreshRes = await axios.post(
            `${baseURL}/auth/refresh`,
            refreshToken ? { refresh_token: refreshToken } : {},
            { withCredentials: true }
          );

          const tokenData = refreshRes.data?.data;
          const newToken = tokenData?.access_token;
          const newRefreshToken = tokenData?.refresh_token;

          if (newToken) {
            localStorage.setItem("token", newToken);
            if (newRefreshToken) {
              localStorage.setItem("refresh_token", newRefreshToken);
            } else {
              localStorage.removeItem("refresh_token");
            }

            axiosInstance.defaults.headers.Authorization = "Bearer " + newToken;
            processQueue(null, newToken);

            originalRequest.headers.Authorization = "Bearer " + newToken;
            return axiosInstance(originalRequest);
          }
        } catch (e) {
          processQueue(e, null);
        } finally {
          isRefreshing = false;
        }
      }

      // If token refresh failed on a protected route, clear session and redirect to appropriate login
      localStorage.removeItem("token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");

      if (typeof window !== "undefined") {
        const isCustomerPath = window.location.pathname.startsWith("/portal");
        const loginPath = isCustomerPath ? "/portal/login" : "/login";
        if (!window.location.pathname.includes("/login")) {
          window.location.href = loginPath;
        }
      }
      return Promise.reject(err);
    }

    return Promise.reject(err);
  }
);


export default axiosInstance;
