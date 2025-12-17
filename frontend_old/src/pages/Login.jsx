// src/pages/Login.jsx

import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import InstitutionalHeader from "../components/layout/InstitutionalHeader";
import { API_BASE_URL } from "../config";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  // Si venías de una ruta protegida, podríamos respetarla
  const from = (location.state && location.state.from) || "/";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !clave) {
      setError("Debe completar correo electrónico y clave.");
      return;
    }

    setCargando(true);

    try {
      const resp = await fetch(`${API_BASE_URL}/api/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // deja que el servidor setee la cookie HttpOnly
        body: JSON.stringify({ email, password: clave }),
      });

      let data = null;
      try {
        data = await resp.json();
      } catch {
        // si no hay JSON, data queda null
      }

      if (!resp.ok || !data || data.ok === false) {
        const msg =
          (data && (data.msg || data.message)) || "Error al iniciar sesión.";
        setError(msg);
        setCargando(false);
        return;
      }

      console.log("[LOGIN] Respuesta backend:", data);

      const usuario = data.user || {};
      const role = String(usuario.role || "").toUpperCase();
      const token = data.token || null;

      // 🔐 Guardamos token donde lo busca AuthContext
      try {
        if (token) {
          localStorage.setItem("token", token);
        }
        // guardamos también el usuario (por si lo usa el frontend)
        localStorage.setItem("user", JSON.stringify(usuario));

        // Si tenías claves antiguas (zn98_*), podemos seguir guardándolas
        localStorage.setItem("zn98_token", token || "");
        localStorage.setItem("zn98_user", JSON.stringify(usuario));
      } catch (e) {
        console.warn("[LOGIN] No se pudo acceder a localStorage:", e);
      }

      // 🔀 Redirección según rol
      if (role === "ADMIN") {
        navigate("/admin/dashboard", { replace: true });
      } else if (role === "POSTULANTE") {
        // panel del postulante
        navigate("/postulante/dashboard", { replace: true });
      } else if (role === "PERMISIONARIO") {
        // si más adelante hacés un dashboard propio
        navigate("/permisionario/dashboard", { replace: true });
      } else {
        // fallback: volvemos a donde estaba o al inicio
        navigate(from, { replace: true });
      }
    } catch (err) {
      console.error("[LOGIN] Error inesperado:", err);
      setError("No se pudo contactar al servidor.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <InstitutionalHeader />

      <main className="max-w-md mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold mb-6 text-center">
          Iniciar sesión
        </h1>

        {error && (
          <div className="mb-4 rounded bg-red-900/60 border border-red-500 px-3 py-2 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm mb-1">Correo electrónico</label>
            <input
              type="email"
              className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-600"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Clave</label>
            <input
              type="password"
              className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-600"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full py-2 rounded bg-sky-600 hover:bg-sky-500 disabled:bg-sky-900 font-semibold transition"
          >
            {cargando ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </main>
    </div>
  );
}
