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

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
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
    const message = err.response?.data?.message;
    const status = err.response?.status;


    if (message === "jwt expired") {
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
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

        originalRequest.headers.Authorization = "Bearer " + newToken;
        return axiosInstance(originalRequest);
      } catch (e) {
        processQueue(e, null);

        localStorage.removeItem("token");
        localStorage.removeItem("user");

        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }

        return Promise.reject(e);
      } finally {
        isRefreshing = false;
      }
    }


    if (status === 401 || status === 403) {
      if (message === "jwt expired" || isRefreshing) {
        return Promise.reject(err);
      }

      try {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      } catch { }

      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(err);
  }
);


export default axiosInstance;
