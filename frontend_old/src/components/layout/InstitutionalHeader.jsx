// frontend/src/components/layout/InstitutionalHeader.jsx

import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

const API_BASE_URL = "http://127.0.0.1:3000";

export default function InstitutionalHeader() {
  const [loggedIn, setLoggedIn] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // Cada vez que cambia la ruta, revisamos si hay token
  useEffect(() => {
    const token = localStorage.getItem("zn98_token");
    setLoggedIn(!!token);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/users/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      console.warn("[LOGOUT] Error al llamar al backend:", err);
    }

    try {
      localStorage.removeItem("zn98_token");
      localStorage.removeItem("zn98_user");
    } catch (err) {
      console.warn("[LOGOUT] Error limpiando localStorage:", err);
    }

    setLoggedIn(false);
    navigate("/", { replace: true });
  };

  // Rutas públicas donde NO debe verse "Cerrar sesión"
  const rutasPublicas = ["/", "/login", "/register"];
  const showLogout =
    loggedIn && !rutasPublicas.includes(location.pathname || "");

  return (
    <header className="bg-slate-900 border-b border-slate-800">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Escudo izquierda + título con link al home */}
        <div className="flex items-center gap-3">
          <img
            src="/escudos/escudo-armada.PNG"
            alt="Escudo Armada Argentina"
            className="h-16 w-auto object-contain"
          />
          <Link to="/" className="flex flex-col justify-center">
            <span className="text-xs font-semibold text-slate-300 tracking-wide uppercase">
              Armada Argentina · ZN98
            </span>
            <span className="text-sm md:text-base font-semibold text-slate-100">
              Portal de Viviendas Fiscales y Alojamientos Navales
            </span>
          </Link>
        </div>

        {/* Escudo derecha + botón de cerrar sesión */}
        <div className="flex items-center gap-4">
          <img
            src="/escudos/base-naval.PNG"
            alt="Base Naval"
            className="h-24 w-auto object-contain"
          />

          {showLogout && (
            <button
              type="button"
              onClick={handleLogout}
              className="px-4 py-1.5 rounded-full bg-red-600 hover:bg-red-500 text-sm font-semibold text-slate-50 transition-colors"
            >
              Cerrar sesión
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
