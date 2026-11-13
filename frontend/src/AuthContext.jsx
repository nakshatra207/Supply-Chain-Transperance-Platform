import React, { createContext, useContext, useState, useEffect } from "react";
import api from "./api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem("user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  // Verify or silently refresh token on startup if user is in localStorage
  useEffect(() => {
    if (!user) return;
    api
      .get("/api/auth/me")
      .then((res) => {
        if (res.data?.id) {
          setUser(res.data);
          localStorage.setItem("user", JSON.stringify(res.data));
        }
      })
      .catch(() => {
        // Handled by api.js interceptor
      });
  }, []);

  const login = (token, userData) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
