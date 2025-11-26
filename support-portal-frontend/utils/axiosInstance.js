import axios from "axios";

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use((config) => {
  console.log("➡️ REQUEST:", config.baseURL + config.url);
  return config;
});

axiosInstance.interceptors.response.use(
  (res) => {
    console.log("⬅️ RESPONSE:", res.status, res.data);
    return res;
  },
  (err) => {
    console.log("❌ API ERROR:", err.response?.data || err.message);
    return Promise.reject(err);
  }
);

export default axiosInstance;
