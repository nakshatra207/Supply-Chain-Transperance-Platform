import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api.js";
import { useAuth } from "../AuthContext.jsx";

export default function Register() {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "FARMER" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
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
      <h1 className="text-2xl font-semibold text-stone-900">Create an account</h1>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-stone-700">Full name</label>
          <input required value={form.name} onChange={update("name")} className="mt-1 w-full border border-stone-300 rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700">Email</label>
          <input type="email" required value={form.email} onChange={update("email")} className="mt-1 w-full border border-stone-300 rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700">Password</label>
          <input type="password" required minLength={6} value={form.password} onChange={update("password")} className="mt-1 w-full border border-stone-300 rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700">I am a</label>
          <select value={form.role} onChange={update("role")} className="mt-1 w-full border border-stone-300 rounded-md px-3 py-2 text-sm bg-white">
            <option value="FARMER">Farmer</option>
            <option value="PARTNER">Supply Chain Partner (Processor / Distributor / Retailer)</option>
          </select>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={loading} className="w-full py-2 rounded-md bg-leaf-600 text-white text-sm font-medium hover:bg-leaf-700 disabled:opacity-60">
          {loading ? "Creating account..." : "Register"}
        </button>
      </form>
      <p className="mt-4 text-sm text-stone-500">
        Already have an account? <Link to="/login" className="text-leaf-700 font-medium">Log in</Link>
      </p>
    </div>
  );
}
