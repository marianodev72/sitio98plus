// src/pages/Login.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import InstitutionalHeader from "../components/layout/InstitutionalHeader";

const API_BASE_URL = "http://127.0.0.1:3000";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !clave) {
      setError("Ingresá tu correo y contraseña.");
      return;
    }

    try {
      setCargando(true);
      console.log("[LOGIN] Enviando datos a backend…", { email });

      const resp = await fetch(`${API_BASE_URL}/api/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password: clave,
        }),
      });

      console.log("[LOGIN] Status HTTP:", resp.status);

      const data = await resp.json().catch((err) => {
        console.error("[LOGIN] Error parseando JSON:", err);
        throw new Error("Respuesta inválida del servidor.");
      });

      console.log("[LOGIN] Respuesta JSON:", data);

      if (!resp.ok || data.ok === false) {
        setError(data?.message || "Credenciales inválidas.");
        return;
      }

      const token = data.token;
      const user = data.user;

      if (!token || !user) {
        console.error("[LOGIN] Falta token o user en la respuesta:", data);
        setError("Respuesta inválida del servidor. Faltan datos.");
        return;
      }

      console.log("[LOGIN] Usuario autenticado:", user);

      // Guardamos en localStorage
      localStorage.setItem("zn98_token", token);
      localStorage.setItem("zn98_user", JSON.stringify(user));

      // Redirección según rol
      if (user.role === "ADMIN") {
        console.log("[LOGIN] Rol ADMIN, navegando a /admin");
        try {
          navigate("/admin");
        } catch (err) {
          console.error("[LOGIN] Error usando navigate, forzando redirect:", err);
          window.location.href = "/admin";
        }
        // plan B por las dudas (incluso si navigate no falla):
        setTimeout(() => {
          if (window.location.pathname === "/login") {
            console.log(
              "[LOGIN] Todavía en /login, forzando redirect manual a /admin"
            );
            window.location.href = "/admin";
          }
        }, 500);
      } else if (user.role === "PERMISIONARIO") {
        navigate("/permisionario");
      } else if (user.role === "ALOJADO") {
        navigate("/alojado");
      } else if (user.role === "INSPECTOR") {
        navigate("/inspector");
      } else if (user.role === "JEFE_BARRIO") {
        navigate("/jefe-barrio");
      } else {
        // Por defecto, postulante
        navigate("/postulante");
      }
    } catch (err) {
      console.error("[LOGIN] Error general:", err);
      setError("No se pudo conectar con el servidor. Intente de nuevo.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <InstitutionalHeader />

      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md bg-slate-900/80 border border-slate-700/70 rounded-2xl shadow-2xl shadow-black/40 px-8 py-10">
          <h1 className="text-2xl font-semibold text-center mb-2">
            Iniciar sesión
          </h1>
          <p className="text-sm text-slate-300 text-center mb-6">
            Ingresá con tu correo institucional y clave. El sistema te llevará a
            tu panel según tu rol.
          </p>

          {error && (
            <div className="mb-4 rounded-lg bg-red-500/15 border border-red-500/40 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Correo electrónico</label>
              <input
                type="email"
                className="w-full rounded-lg bg-slate-950/60 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Clave</label>
              <input
                type="password"
                className="w-full rounded-lg bg-slate-950/60 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                value={clave}
                onChange={(e) => setClave(e.target.value)}
                placeholder="********"
              />
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="mt-4 w-full rounded-full bg-sky-500 hover:bg-sky-400 disabled:opacity-60 disabled:cursor-not-allowed py-2 text-sm font-semibold shadow-lg shadow-sky-500/40"
            >
              {cargando ? "Ingresando..." : "Ingresar"}
            </button>
          </form>

          <p className="mt-4 text-xs text-slate-400 text-center">
            ¿Todavía no tenés usuario?{" "}
            <button
              type="button"
              className="text-sky-400 hover:underline"
              onClick={() => navigate("/registro")}
            >
              Registrate aquí
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}
