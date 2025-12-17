// src/pages/adminGeneral/AdminGeneralDashboard.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "../../api/client";

type ViviendasStats = {
  total: number;
  ocupadas: number;
};

type UsuariosStats = {
  total: number;
};

type PedidosStats = {
  total: number;
  viviendas: number;
  alojamientos: number;
};

type AlojamientoStats = {
  total: number;
};

type StatsResumen = {
  viviendas: ViviendasStats;
  usuarios: UsuariosStats;
  pedidos: PedidosStats;
  alojamientos: AlojamientoStats;
};

export default function AdminGeneralDashboard() {
  const navigate = useNavigate();

  const [stats, setStats] = useState<StatsResumen | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadStats() {
    try {
      setLoading(true);
      setError(null);

      const res = await apiClient.get<StatsResumen>("/stats/resumen");
      setStats(res.data);
    } catch (err) {
      console.error("[AdminGeneralDashboard] Error al cargar stats:", err);
      setError("No se pudo cargar el resumen estadístico.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm text-slate-500">Cargando resumen institucional...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-6 space-y-3">
        <h1 className="text-2xl font-bold">Panel de Administración General</h1>
        <p className="text-sm text-red-500">{error ?? "No se pudo obtener información."}</p>
      </div>
    );
  }

  const ocupacionPorcentaje =
    stats.viviendas.total > 0
      ? Math.round((stats.viviendas.ocupadas * 100) / stats.viviendas.total)
      : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Encabezado */}
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">
          Panel de Administración General
        </h1>
        <p className="text-sm text-slate-600">
          Resumen ejecutivo del estado de viviendas, usuarios y alojamientos.
        </p>
      </header>

      {/* Tarjetas principales */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Viviendas totales */}
        <button
          type="button"
          onClick={() => navigate("/app/admin-general/viviendas")}
          className="group bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition flex flex-col items-start text-left"
        >
          <span className="text-xs font-medium text-slate-500">Viviendas totales</span>
          <span className="mt-1 text-3xl font-bold text-slate-900">
            {stats.viviendas.total}
          </span>
          <span className="mt-2 text-xs text-slate-500 group-hover:text-slate-700">
            Gestionar viviendas →
          </span>
        </button>

        {/* Ocupación viviendas */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col">
          <span className="text-xs font-medium text-slate-500">
            Ocupación de viviendas
          </span>
          <span className="mt-1 text-3xl font-bold text-slate-900">
            {stats.viviendas.ocupadas}
          </span>
          <span className="mt-1 text-xs text-slate-500">
            {ocupacionPorcentaje}% de ocupación
          </span>
        </div>

        {/* Usuarios */}
        <button
          type="button"
          onClick={() => navigate("/app/admin-general/usuarios")}
          className="group bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition flex flex-col items-start text-left"
        >
          <span className="text-xs font-medium text-slate-500">Usuarios activos</span>
          <span className="mt-1 text-3xl font-bold text-slate-900">
            {stats.usuarios.total}
          </span>
          <span className="mt-2 text-xs text-slate-500 group-hover:text-slate-700">
            Ver y administrar usuarios →
          </span>
        </button>

        {/* Alojamiento / pedidos */}
        <button
          type="button"
          onClick={() => navigate("/app/admin-general/estadisticas")}
          className="group bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition flex flex-col items-start text-left"
        >
          <span className="text-xs font-medium text-slate-500">
            Alojamiento y pedidos
          </span>
          <span className="mt-1 text-lg font-semibold text-slate-900">
            {stats.alojamientos.total} alojamientos
          </span>
          <span className="mt-1 text-xs text-slate-500">
            {stats.pedidos.total} pedidos de trabajo
          </span>
          <span className="mt-2 text-xs text-slate-500 group-hover:text-slate-700">
            Ver detalle estadístico →
          </span>
        </button>
      </section>

      {/* Bloque descriptivo */}
      <section className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">
          Guía rápida de uso
        </h2>
        <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
          <li>
            <span className="font-semibold">Usuarios:</span> alta, baja, bloqueo,
            cambio de rol y reseteo de contraseña de cuentas institucionales.
          </li>
          <li>
            <span className="font-semibold">Viviendas:</span> administración de
            barrios, unidades habitacionales, ocupación, estados y
            asignación/desasignación de permisionarios.
          </li>
          <li>
            <span className="font-semibold">Estadísticas:</span> resumen gráfico
            de ocupación, distribución por barrios, dormitorios, roles de usuario,
            alojamientos y pedidos de trabajo (ANEXOS 11 y 28).
          </li>
        </ul>
      </section>
    </div>
  );
}
