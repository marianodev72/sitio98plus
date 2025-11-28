// src/pages/admin/AdminLogin.jsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import InstitutionalHeader from "../../components/layout/InstitutionalHeader";

// Si algún día cambia el puerto/host, solo cambias esta constante
const API_BASE_URL = "http://127.0.0.1:3000";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Por favor, completá email y clave.");
      return;
    }

    try {
      setCargando(true);

      const resp = await fetch(`${API_BASE_URL}/api/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        throw new Error(data?.message || "Credenciales inválidas");
      }

      // Guardamos token y datos de usuario para usarlos en el panel
      localStorage.setItem("zn98_token", data.token);
      localStorage.setItem("zn98_user", JSON.stringify(data.user));

      const rol = data.user.role;

      // Roles que pueden entrar al panel de administración
      const adminRoles = ["ADMIN", "ADMINISTRACION", "ENCARGADO_GENERAL"];

      if (adminRoles.includes(rol)) {
        navigate("/admin"); // Panel de administración
      } else {
        // Más adelante: redirigir al panel según rol (permisionario, alojado, etc.)
        alert(
          `Login correcto, pero tu rol actual es "${rol}" y este acceso es solo para administración.`
        );
        navigate("/"); // Por ahora volvemos al inicio
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Ocurrió un error al iniciar sesión.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <InstitutionalHeader />

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-slate-900/80 border border-slate-700/60 rounded-2xl shadow-xl shadow-black/40 p-8">
          <h1 className="text-2xl font-semibold text-center mb-2">
            Acceso Administración
          </h1>
          <p className="text-sm text-slate-300 text-center mb-6">
            Ingresá con tu correo institucional y clave.
          </p>

          {error && (
            <div className="mb-4 rounded-lg bg-red-500/15 border border-red-500/40 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm mb-1">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                placeholder="ej: usuario@armada.mil.ar"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">
                Clave
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg bg-slate-950/70 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={cargando}
              className="w-full mt-2 rounded-full bg-sky-500 hover:bg-sky-400 disabled:bg-sky-700 px-4 py-2 font-semibold text-sm shadow-lg shadow-sky-500/40 transition"
            >
              {cargando ? "Ingresando..." : "Ingresar al panel"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
