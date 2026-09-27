import React from "react";
import { Routes, Route, Link, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext.jsx";

import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import FarmerDashboard from "./pages/FarmerDashboard.jsx";
import CreateBatch from "./pages/CreateBatch.jsx";
import BatchDetails from "./pages/BatchDetails.jsx";
import PartnerDashboard from "./pages/PartnerDashboard.jsx";
import Trace from "./pages/Trace.jsx";

function NavBar() {
  const { user, logout } = useAuth();
  return (
    <header className="border-b border-stone-200 bg-white/80 backdrop-blur sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-semibold text-leaf-700 text-lg">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-leaf-500" />
          Organic Trace
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          {!user && (
            <>
              <Link to="/login" className="text-stone-600 hover:text-leaf-700">Login</Link>
              <Link to="/register" className="px-3 py-1.5 rounded-md bg-leaf-600 text-white hover:bg-leaf-700">
                Register
              </Link>
            </>
          )}
          {user && user.role === "FARMER" && (
            <Link to="/farmer" className="text-stone-600 hover:text-leaf-700">Farmer Dashboard</Link>
          )}
          {user && user.role === "PARTNER" && (
            <Link to="/partner" className="text-stone-600 hover:text-leaf-700">Partner Dashboard</Link>
          )}
          {user && (
            <button onClick={logout} className="text-stone-500 hover:text-red-600">
              Logout ({user.name})
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}

function Protected({ role, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen flex flex-col">
        <NavBar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/trace/:batchId" element={<Trace />} />
            <Route
              path="/farmer"
              element={
                <Protected role="FARMER">
                  <FarmerDashboard />
                </Protected>
              }
            />
            <Route
              path="/farmer/batches/new"
              element={
                <Protected role="FARMER">
                  <CreateBatch />
                </Protected>
              }
            />
            <Route
              path="/batches/:batchId"
              element={
                <Protected>
                  <BatchDetails />
                </Protected>
              }
            />
            <Route
              path="/partner"
              element={
                <Protected role="PARTNER">
                  <PartnerDashboard />
                </Protected>
              }
            />
          </Routes>
        </main>
        <footer className="border-t border-stone-200 text-center text-xs text-stone-500 py-6">
          Blockchain provides tamper-evident traceability of submitted and verified records.
          It does not independently verify the physical authenticity of agricultural practices.
        </footer>
      </div>
    </AuthProvider>
  );
}
