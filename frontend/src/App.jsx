import React from "react";
import { Routes, Route, Link, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext.jsx";
import { LanguageProvider, useLanguage } from "./LanguageContext.jsx";
import LanguageToggle from "./components/LanguageToggle.jsx";

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
  const { t } = useLanguage();

  return (
    <header className="border-b border-stone-200 bg-white/80 backdrop-blur sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-semibold text-leaf-700 text-lg">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-leaf-500" />
          {t("nav.title")}
        </Link>
        <div className="flex items-center gap-3 sm:gap-4">
          <LanguageToggle />
          <nav className="flex items-center gap-3 text-sm">
            {!user && (
              <>
                <Link to="/login" className="text-stone-600 hover:text-leaf-700 font-medium">
                  {t("nav.login")}
                </Link>
                <Link
                  to="/register"
                  className="px-3 py-1.5 rounded-md bg-leaf-600 text-white hover:bg-leaf-700 font-medium transition"
                >
                  {t("nav.register")}
                </Link>
              </>
            )}
            {user && user.role === "FARMER" && (
              <Link to="/farmer" className="text-stone-600 hover:text-leaf-700 font-medium">
                {t("nav.farmerDashboard")}
              </Link>
            )}
            {user && user.role === "PARTNER" && (
              <Link to="/partner" className="text-stone-600 hover:text-leaf-700 font-medium">
                {t("nav.partnerDashboard")}
              </Link>
            )}
            {user && (
              <button onClick={logout} className="text-stone-500 hover:text-red-600 text-sm">
                {t("nav.logout")} ({user.name})
              </button>
            )}
          </nav>
        </div>
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

function Footer() {
  const { t, lang, setLanguage, languages } = useLanguage();
  return (
    <footer className="border-t border-stone-200 text-xs text-stone-500 py-6 px-4">
      <div className="max-w-4xl mx-auto text-center space-y-3">
        <p>{t("footer.disclaimer")}</p>
        <div className="pt-2 flex flex-wrap items-center justify-center gap-1 text-[11px]">
          <span className="text-stone-400 font-medium mr-1">🇮🇳 Available in all Indian Languages:</span>
          {languages.slice(0, 9).map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => setLanguage(l.code)}
              className={`px-1.5 py-0.5 rounded transition ${
                lang === l.code
                  ? "bg-leaf-600 text-white font-semibold"
                  : "text-stone-600 hover:text-stone-900 hover:bg-stone-200/50"
              }`}
            >
              {l.nativeName}
            </button>
          ))}
          <span className="text-stone-400 text-[10px] ml-1">(+ 14 more in top selector)</span>
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <div className="min-h-screen flex flex-col bg-stone-50/50">
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
          <Footer />
        </div>
      </AuthProvider>
    </LanguageProvider>
  );
}
