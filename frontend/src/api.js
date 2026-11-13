import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  try {
    const rawUser = localStorage.getItem("user");
    if (rawUser) {
      const parsedUser = JSON.parse(rawUser);
      if (parsedUser?.email) config.headers["X-User-Email"] = parsedUser.email;
      if (parsedUser?.id) config.headers["X-User-Id"] = parsedUser.id;
    }
  } catch {
    // ignore malformed localStorage user
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    const refreshedToken = response.headers?.["x-refreshed-token"];
    if (refreshedToken) {
      localStorage.setItem("token", refreshedToken);
    }
    const refreshedUser = response.headers?.["x-refreshed-user"];
    if (refreshedUser) {
      try {
        JSON.parse(refreshedUser);
        localStorage.setItem("user", refreshedUser);
      } catch {
        // ignore
      }
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const isAuthRoute =
      originalRequest?.url?.includes("/api/auth/login") ||
      originalRequest?.url?.includes("/api/auth/register") ||
      originalRequest?.url?.includes("/api/auth/refresh");

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthRoute) {
      originalRequest._retry = true;
      try {
        const rawUser = localStorage.getItem("user");
        const parsedUser = rawUser ? JSON.parse(rawUser) : {};
        const refreshRes = await axios.post(`${API_URL}/api/auth/refresh`, {
          email: parsedUser?.email,
          id: parsedUser?.id,
          role: parsedUser?.role,
        });
        if (refreshRes.data?.token) {
          localStorage.setItem("token", refreshRes.data.token);
          if (refreshRes.data.user) {
            localStorage.setItem("user", JSON.stringify(refreshRes.data.user));
          }
          originalRequest.headers.Authorization = `Bearer ${refreshRes.data.token}`;
          return api(originalRequest);
        }
      } catch {
        // Refresh failed
      }
    }
    return Promise.reject(error);
  }
);

export default api;
export { API_URL };
