// src/pages/PostulanteDashboard.jsx

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import InstitutionalHeader from "../components/layout/InstitutionalHeader";

const API_BASE_URL = "http://127.0.0.1:3000";

export default function PostulanteDashboard() {
  const [user, setUser] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("zn98_token");
    if (!token) {
      navigate("/login");
      return;
    }

    const fetchPerfil = async () => {
      try {
        const resp = await fetch(`${API_BASE_URL}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await resp.json();
        if (!resp.ok) {
          throw new Error(data?.message || "No autorizado");
        }

        if (data.user.role !== "POSTULANTE") {
          throw new Error("Este panel es solo para POSTULANTES.");
        }

        setUser(data.user);
      } catch (err) {
        console.error(err);
        setError(err.message || "Error cargando el panel.");
      } finally {
        setCargando(false);
      }
    };

    fetchPerfil();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("zn98_token");
    localStorage.removeItem("zn98_user");
    navigate("/login");
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-300">Cargando panel de postulante...</p>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col">
        <InstitutionalHeader />
        <main className="flex-1 flex flex-col items-center justify-center px-4">
          <p className="text-red-300 mb-4">
            {error || "No se pudo cargar el usuario."}
          </p>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-full bg-sky-500 hover:bg-sky-400 text-sm font-semibold"
          >
            Volver al login
          </button>
        </main>
      </div>
    );
  }

  const { nombre, apellido, email, matricula, grado, dni, estado } = user;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <InstitutionalHeader />

      <main className="flex-1 max-w-5xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Panel de Postulante</h1>
            <p className="text-slate-300 text-sm mt-1">
              Bienvenido, {nombre} {apellido}. Aquí podés ver el estado de tu
              postulación y generar nuevas solicitudes.
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-full bg-red-500 hover:bg-red-400 text-sm font-semibold"
          >
            Cerrar sesión
          </button>
        </div>

        {/* Acciones principales */}
        <section className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-4 flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-semibold mb-1">
                Nueva solicitud de vivienda fiscal
              </h2>
              <p className="text-sm text-slate-300">
                Completá el formulario ANEXO 01 en línea. Podés presentar más de una
                postulación si corresponde (por ejemplo, cambio de vivienda).
              </p>
            </div>
            <div className="mt-4">
              <button
                onClick={() => navigate("/postulante/postulacion/nueva")}
                className="px-4 py-2 rounded-full bg-sky-500 hover:bg-sky-400 text-sm font-semibold"
              >
                Completar formulario
              </button>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-4 flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-semibold mb-1">Mis postulaciones</h2>
              <p className="text-sm text-slate-300">
                Revisá todas las solicitudes que registraste, su estado (en análisis,
                aprobada, rechazada) y datos básicos.
              </p>
            </div>
            <div className="mt-4">
              <button
                onClick={() => navigate("/postulante/postulaciones")}
                className="px-4 py-2 rounded-full bg-slate-800 hover:bg-slate-700 text-sm font-semibold"
              >
                Ver mis postulaciones
              </button>
            </div>
          </div>
        </section>

        {/* Tarjeta de estado general del usuario (como ya tenías) */}
        <section className="mb-6">
          <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold mb-1">
                Estado general de tu registro
              </h2>
              <p className="text-sm text-slate-300">
                Este es el estado asociado a tu cuenta dentro del sistema.
              </p>
            </div>

            <div className="text-right">
              <span
                className={`
                  inline-flex px-4 py-1 rounded-full text-sm font-semibold
                  ${
                    estado === "APROBADO"
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50"
                      : estado === "RECHAZADO"
                      ? "bg-red-500/20 text-red-300 border border-red-500/50"
                      : "bg-yellow-500/20 text-yellow-300 border border-yellow-500/50"
                  }
                `}
              >
                {estado || "PENDIENTE"}
              </span>
            </div>
          </div>
        </section>

        {/* Datos personales */}
        <section className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-4">
          <h2 className="text-lg font-semibold mb-3">Tus datos registrados</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-400">Nombre completo</p>
              <p className="font-semibold">
                {nombre} {apellido}
              </p>
            </div>

            <div>
              <p className="text-slate-400">Correo electrónico</p>
              <p className="font-semibold">{email}</p>
            </div>

            <div>
              <p className="text-slate-400">Matrícula</p>
              <p className="font-semibold">{matricula || "-"}</p>
            </div>

            <div>
              <p className="text-slate-400">Grado</p>
              <p className="font-semibold">{grado || "-"}</p>
            </div>

            <div>
              <p className="text-slate-400">DNI</p>
              <p className="font-semibold">{dni || "-"}</p>
            </div>

            <div>
              <p className="text-slate-400">Rol actual en el sistema</p>
              <p className="font-semibold">POSTULANTE</p>
            </div>
          </div>

          <p className="text-xs text-slate-400 mt-4">
            Si encontrás algún dato incorrecto, comunicate con el Órgano Administrador
            de Viviendas Fiscales ZN98 para su corrección.
          </p>
        </section>
      </main>
    </div>
  );
}
