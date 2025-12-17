import React from "react";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const handleLogout = () => {
    try {
      // limpiamos cualquier resto de sesión que estemos usando
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("zn98_token");
      localStorage.removeItem("zn98_user");
    } catch (e) {
      console.warn("Error limpiando storage en logout:", e);
    }

    // volvemos a la pantalla de login
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* CABECERA SIMPLE */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-semibold">
            Panel de Administración ZN98
          </h1>
          <p className="text-slate-400 text-sm">
            Administración de postulaciones, viviendas y usuarios.
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="px-4 py-2 rounded-full bg-red-600 hover:bg-red-500 text-sm font-semibold"
        >
          Cerrar sesión
        </button>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid md:grid-cols-3 gap-6">
          <div
            onClick={() => navigate("/admin/postulantes")}
            className="bg-slate-800 hover:bg-slate-700 rounded-xl p-6 cursor-pointer shadow"
          >
            <h2 className="text-lg font-semibold mb-2">Postulantes</h2>
            <p className="text-slate-400 text-sm">
              Ver y gestionar las solicitudes registradas en el sistema.
            </p>
          </div>

          <div
            onClick={() => navigate("/admin/viviendas")}
            className="bg-slate-800 hover:bg-slate-700 rounded-xl p-6 cursor-pointer shadow"
          >
            <h2 className="text-lg font-semibold mb-2">Viviendas</h2>
            <p className="text-slate-400 text-sm">
              Administrar disponibilidad y asignaciones de viviendas.
            </p>
          </div>

          <div
            onClick={() => navigate("/admin/users")}
            className="bg-slate-800 hover:bg-slate-700 rounded-xl p-6 cursor-pointer shadow"
          >
            <h2 className="text-lg font-semibold mb-2">Usuarios y roles</h2>
            <p className="text-slate-400 text-sm">
              Gestionar cuentas y roles de administración, inspectores,
              permisionarios y alojados.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
