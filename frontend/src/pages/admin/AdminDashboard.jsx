import { useNavigate } from "react-router-dom";
import InstitutionalHeader from "../../components/layout/InstitutionalHeader";

export default function AdminDashboard() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Encabezado institucional */}
      <InstitutionalHeader />

      {/* Contenedor principal */}
      <div className="max-w-6xl mx-auto px-4 py-10">

        {/* Volver y cerrar sesión */}
        <div className="flex justify-between mb-8">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded"
          >
            ⬅ Volver
          </button>

          <button
            onClick={() => navigate("/login")}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded"
          >
            Cerrar sesión
          </button>
        </div>

        <h1 className="text-3xl font-bold mb-6">Panel de Administración</h1>

        {/* Tarjetas */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">

          <div
            onClick={() => navigate("/admin/postulaciones")}
            className="bg-slate-800 hover:bg-slate-700 p-6 rounded cursor-pointer shadow"
          >
            <h2 className="text-xl font-semibold">Postulaciones</h2>
            <p className="text-slate-400 mt-2">
              Ver, filtrar, ordenar, descargar PDF y gestionar estados.
            </p>
          </div>

          <div
            onClick={() => navigate("/admin/postulantes")}
            className="bg-slate-800 hover:bg-slate-700 p-6 rounded cursor-pointer shadow"
          >
            <h2 className="text-xl font-semibold">Postulantes</h2>
            <p className="text-slate-400 mt-2">
              Revisar y gestionar solicitudes.
            </p>
          </div>

          <div
            onClick={() => navigate("/admin/viviendas")}
            className="bg-slate-800 hover:bg-slate-700 p-6 rounded cursor-pointer shadow"
          >
            <h2 className="text-xl font-semibold">Viviendas</h2>
            <p className="text-slate-400 mt-2">
              Gestionar disponibilidad y asignaciones.
            </p>
          </div>

          <div
            onClick={() => navigate("/admin/usuarios")}
            className="bg-slate-800 hover:bg-slate-700 p-6 rounded cursor-pointer shadow"
          >
            <h2 className="text-xl font-semibold">Usuarios y roles</h2>
            <p className="text-slate-400 mt-2">
              Administrar cuentas de inspectores, jefes y alojados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
