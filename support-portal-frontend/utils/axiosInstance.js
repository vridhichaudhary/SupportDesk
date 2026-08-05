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

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

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
    const errorMsg = err.response?.data?.error_message || "";
    const errorCode = err.response?.data?.code || "";

    // Handle token-expired responses that arrive as 422 (legacy) or 401 (fixed)
    const isTokenExpired =
      (status === 422 && (errorMsg.toLowerCase().includes("expired") || errorMsg.toLowerCase().includes("invalid") || errorCode === "VALIDATION_ERROR")) ||
      (status === 401 && errorMsg.toLowerCase().includes("expired"));

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
            { refresh_token: refreshToken },
            { withCredentials: true }
          );

          const tokenData = refreshRes.data?.data;
          const newToken = tokenData?.access_token;
          const newRefreshToken = tokenData?.refresh_token;

          if (newToken) {
            localStorage.setItem("token", newToken);
            if (newRefreshToken) localStorage.setItem("refresh_token", newRefreshToken);

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

      // Either 422 expired token, or refresh failed — clear session and redirect
      localStorage.removeItem("token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");

      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
      return Promise.reject(err);
    }

    return Promise.reject(err);
  }
);


export default axiosInstance;
