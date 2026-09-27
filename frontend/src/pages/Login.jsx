import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import { useLanguage } from "../LanguageContext.jsx";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/api/auth/login", { email, password });
      login(data.token, data.user);
      navigate(data.user.role === "FARMER" ? "/farmer" : "/partner");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto px-4 py-16">
      <h1 className="text-2xl font-semibold text-stone-900">{t("auth.loginTitle")}</h1>
      <p className="text-sm text-stone-500 mt-1">
        {t("auth.demoPassHint")} <code className="bg-stone-100 px-1 rounded font-mono">Demo@1234</code>
      </p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-stone-700">{t("auth.emailLabel")}</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full border border-stone-300 rounded-md px-3 py-2 text-sm bg-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700">{t("auth.passwordLabel")}</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full border border-stone-300 rounded-md px-3 py-2 text-sm bg-white"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          disabled={loading}
          className="w-full py-2 rounded-md bg-leaf-600 text-white text-sm font-medium hover:bg-leaf-700 disabled:opacity-60 transition"
        >
          {loading ? t("auth.loggingIn") : t("auth.loginBtn")}
        </button>
      </form>
      <p className="mt-4 text-sm text-stone-500 text-center">
        {t("auth.noAccount")}{" "}
        <Link to="/register" className="text-leaf-700 font-medium hover:underline">
          {t("auth.registerLink")}
        </Link>
      </p>
    </div>
  );
}
