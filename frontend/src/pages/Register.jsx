import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import { useLanguage } from "../LanguageContext.jsx";

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "FARMER" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/api/auth/register", form);
      login(data.token, data.user);
      navigate(data.user.role === "FARMER" ? "/farmer" : "/partner");
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto px-4 py-16">
      <h1 className="text-2xl font-semibold text-stone-900">{t("auth.registerTitle")}</h1>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-stone-700">{t("auth.fullNameLabel")}</label>
          <input
            required
            value={form.name}
            onChange={update("name")}
            className="mt-1 w-full border border-stone-300 rounded-md px-3 py-2 text-sm bg-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700">{t("auth.emailLabel")}</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={update("email")}
            className="mt-1 w-full border border-stone-300 rounded-md px-3 py-2 text-sm bg-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700">{t("auth.passwordLabel")}</label>
          <input
            type="password"
            required
            minLength={6}
            value={form.password}
            onChange={update("password")}
            className="mt-1 w-full border border-stone-300 rounded-md px-3 py-2 text-sm bg-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700">{t("auth.roleLabel")}</label>
          <select
            value={form.role}
            onChange={update("role")}
            className="mt-1 w-full border border-stone-300 rounded-md px-3 py-2 text-sm bg-white"
          >
            <option value="FARMER">{t("auth.roleFarmer")}</option>
            <option value="PARTNER">{t("auth.rolePartner")}</option>
          </select>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          disabled={loading}
          className="w-full py-2 rounded-md bg-leaf-600 text-white text-sm font-medium hover:bg-leaf-700 disabled:opacity-60 transition"
        >
          {loading ? t("auth.creatingAccount") : t("auth.registerBtn")}
        </button>
      </form>
      <p className="mt-4 text-sm text-stone-500 text-center">
        {t("auth.alreadyHaveAccount")}{" "}
        <Link to="/login" className="text-leaf-700 font-medium hover:underline">
          {t("auth.loginLink")}
        </Link>
      </p>
    </div>
  );
}
