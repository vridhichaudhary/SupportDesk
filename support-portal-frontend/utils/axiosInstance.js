import axios from "axios";

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(p => {
    if (error) p.reject(error);
    else p.resolve(token);
  });
  failedQueue = [];
};

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosInstance.interceptors.response.use(
  res => res,
  async err => {
    const originalRequest = err.config;

    // If expired
    if (err.response?.data?.message === "jwt expired") {

      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = "Bearer " + token;
          return axiosInstance(originalRequest);
        });
      }

      isRefreshing = true;

      try {
        const oldToken = localStorage.getItem("token");

        const refreshRes = await axios.post(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/refresh-token`,
          { token: oldToken }
        );

        const newToken = refreshRes.data.newToken;

        localStorage.setItem("token", newToken);
        axiosInstance.defaults.headers.Authorization = "Bearer " + newToken;

        processQueue(null, newToken);

        // Retry request
        return axiosInstance(originalRequest);

      } catch (e) {
        processQueue(e, null);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  }
);

export default axiosInstance;
