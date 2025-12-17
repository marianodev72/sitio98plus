// src/pages/Register.jsx

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import InstitutionalHeader from "../components/layout/InstitutionalHeader";
import { API_BASE_URL } from "../config";

export default function Register() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [matricula, setMatricula] = useState("");
  const [clave, setClave] = useState("");
  const [confirmarClave, setConfirmarClave] = useState("");

  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMensaje("");

    if (!email || !matricula || !clave || !confirmarClave) {
      setError("Todos los campos son obligatorios.");
      return;
    }

    if (clave.length < 8) {
      setError("La clave debe tener al menos 8 caracteres.");
      return;
    }

    if (clave !== confirmarClave) {
      setError("Las claves no coinciden.");
      return;
    }

    setCargando(true);

    try {
      const resp = await fetch(`${API_BASE_URL}/api/users/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email,
          matricula,
          clave,
          confirmarClave,
        }),
      });

      let data = null;
      try {
        data = await resp.json();
      } catch {
        setError("Respuesta inválida del servidor.");
        return;
      }

      if (!resp.ok || !data || !data.ok) {
        const msg =
          data?.message ||
          data?.msg ||
          "Error al registrar usuario. Intente nuevamente.";
        setError(msg);
        return;
      }

      setMensaje("Registro exitoso. Ahora puede iniciar sesión.");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      console.error("[REGISTER] Error inesperado:", err);
      setError(
        "No se pudo contactar al servidor. Verificá tu conexión e intentá nuevamente."
      );
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <InstitutionalHeader />

      <main className="max-w-md mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold mb-6 text-center">
          Crear cuenta
        </h1>

        {error && (
          <div className="mb-4 rounded bg-red-900/60 border border-red-500 px-3 py-2 text-sm">
            {error}
          </div>
        )}

        {mensaje && (
          <div className="mb-4 rounded bg-emerald-900/60 border border-emerald-500 px-3 py-2 text-sm">
            {mensaje}
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
            <label className="block text-sm mb-1">Matrícula</label>
            <input
              type="text"
              className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-600"
              value={matricula}
              onChange={(e) => setMatricula(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Clave</label>
            <input
              type="password"
              className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-600"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Confirmar clave</label>
            <input
              type="password"
              className="w-full px-3 py-2 rounded bg-slate-800 border border-slate-600"
              value={confirmarClave}
              onChange={(e) => setConfirmarClave(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full py-2 rounded bg-sky-600 hover:bg-sky-500 disabled:bg-sky-900 font-semibold"
          >
            {cargando ? "Registrando..." : "Registrarse"}
          </button>
        </form>
      </main>
    </div>
  );
}
