import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import { useLanguage } from "../LanguageContext.jsx";

const DEMO_ACCOUNTS = [
  {
    label: "🌾 Farmer Demo",
    sub: "Ramesh Kumar (farmer@example.com)",
    email: "farmer@example.com",
    password: "Demo@1234",
  },
  {
    label: "🏭 Partner Demo",
    sub: "Suresh Traders (partner@example.com)",
    email: "partner@example.com",
    password: "Demo@1234",
  },
  {
    label: "🛡️ Admin Demo",
    sub: "Platform Admin (admin@example.com)",
    email: "admin@example.com",
    password: "Demo@1234",
  },
];

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();

  const performLogin = async (loginEmail, loginPassword) => {
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/api/auth/login", {
        email: loginEmail,
        password: loginPassword,
      });
      login(data.token, data.user);
      navigate(data.user.role === "FARMER" ? "/farmer" : "/partner");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    await performLogin(email, password);
  };

  const handleQuickDemo = async (acc) => {
    setEmail(acc.email);
    setPassword(acc.password);
    await performLogin(acc.email, acc.password);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12 animate-fade-in">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">
          {t("auth.loginTitle")}
        </h1>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
          {t("auth.demoPassHint")}{" "}
          <code className="bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 rounded font-mono text-xs">
            Demo@1234
          </code>
        </p>

        {/* 1-Click Quick Demo Sign-In Section */}
        <div className="mt-4 p-3 rounded-lg bg-leaf-50/70 dark:bg-stone-800/70 border border-leaf-200 dark:border-stone-700">
          <p className="text-xs font-semibold text-leaf-800 dark:text-leaf-300 mb-2">
            {lang === "hi"
              ? "⚡ 1-क्लिक त्वरित डेमो लॉगिन (बिना टाइप किए प्रवेश करें):"
              : "⚡ 1-Click Instant Demo Access (No typing required):"}
          </p>
          <div className="grid grid-cols-1 gap-1.5">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                disabled={loading}
                onClick={() => handleQuickDemo(acc)}
                className="flex items-center justify-between px-3 py-2 rounded-md bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 hover:border-leaf-500 text-left text-xs transition shadow-2xs"
              >
                <span className="font-semibold text-stone-800 dark:text-stone-100">{acc.label}</span>
                <span className="text-[11px] text-stone-500 dark:text-stone-400 font-mono">
                  {acc.email}
                </span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">
              {t("auth.emailLabel")}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="farmer@example.com"
              className="mt-1 w-full border border-stone-300 dark:border-stone-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-stone-900"
            />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300">
                {t("auth.passwordLabel")}
              </label>
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="text-xs text-leaf-700 dark:text-leaf-400 hover:underline"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1 w-full border border-stone-300 dark:border-stone-700 rounded-md px-3 py-2 text-sm bg-white dark:bg-stone-900"
            />
          </div>
          {error && (
            <div className="p-2.5 rounded-md bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
              ⚠ {error}
            </div>
          )}
          <button
            disabled={loading}
            className="w-full py-2.5 rounded-md bg-leaf-600 text-white text-sm font-semibold hover:bg-leaf-700 disabled:opacity-60 transition shadow-2xs"
          >
            {loading ? t("auth.loggingIn") : t("auth.loginBtn")}
          </button>
        </form>
        <p className="mt-4 text-sm text-stone-500 dark:text-stone-400 text-center">
          {t("auth.noAccount")}{" "}
          <Link to="/register" className="text-leaf-700 dark:text-leaf-400 font-medium hover:underline">
            {t("auth.registerLink")}
          </Link>
        </p>
      </div>
    </div>
  );
}
