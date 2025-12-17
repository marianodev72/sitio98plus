// C:\sitio98plus\FRONTEND\src\pages\adminGeneral\AdminGeneralStatsPage.tsx

import { useEffect, useState } from "react";
import { apiClient } from "../../api/client";
import { useAuthStore } from "../../store/authStore";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

interface ViviendasResumen {
  total: number;
  [key: string]: number;
}

interface ViviendasPorEstadoItem {
  estado?: string;
  _id?: string;
  cantidad?: number;
  count?: number;
  total?: number;
}

interface ViviendasPorBarrioItem {
  barrio?: string;
  _id?: string;
  cantidad?: number;
  count?: number;
  total?: number;
}

interface ViviendasPorDormItem {
  dorm?: number;
  _id?: number;
  cantidad?: number;
  count?: number;
  total?: number;
}

interface UsuariosPorRolItem {
  rol?: string;
  _id?: string;
  cantidad?: number;
  count?: number;
  total?: number;
}

interface PedidosResumen {
  total: number;
  porEstado: { estado: string; cantidad: number }[];
}

interface AlojamientoResumen {
  total: number;
  porTipo: { tipo: string; cantidad: number }[];
}

interface AlojadosPorTipoItem {
  tipo?: string;
  _id?: string;
  cantidad?: number;
  count?: number;
  total?: number;
}

interface StatsResumen {
  viviendas?: ViviendasResumen;
  viviendasPorEstado?: ViviendasPorEstadoItem[];
  viviendasPorBarrio?: ViviendasPorBarrioItem[];
  viviendasPorDorm?: ViviendasPorDormItem[];
  usuariosPorRol?: UsuariosPorRolItem[];
  pedidos?: PedidosResumen;
  alojamientos?: AlojamientoResumen;
  alojadosPorTipo?: AlojadosPorTipoItem[];
}

const ESTADO_COLORS: Record<string, string> = {
  DISPONIBLE: "#22c55e",
  OCUPADA: "#0ea5e9",
  REPARACION: "#f97316",
  RESERVADA: "#eab308",
};

const ROL_COLORS: Record<string, string> = {
  ADMIN_GENERAL: "#0f172a",
  INSPECTOR: "#0ea5e9",
  PERMISIONARIO: "#22c55e",
  POSTULANTE: "#eab308",
  ALOJADO: "#6366f1",
};

const GENERIC_COLORS = [
  "#0ea5e9",
  "#22c55e",
  "#eab308",
  "#6366f1",
  "#f97316",
  "#14b8a6",
  "#64748b",
];

const IS_DEV = import.meta.env.DEV;

export default function AdminGeneralStatsPage() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<StatsResumen | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─────────────────────────────────────────────
  // Cargar estadísticas
  // ─────────────────────────────────────────────
  useEffect(() => {
    async function loadStats() {
      try {
        setLoading(true);
        setError(null);

        const resp = await apiClient.get("/stats/resumen");
        if (IS_DEV) {
          console.log("[AdminGeneral] Stats reales /stats/resumen:", resp.data);
        }
        setStats(resp.data as StatsResumen);
      } catch (err) {
        console.error("[AdminGeneral] Error al cargar estadísticas:", err);
        setError("No se pudieron cargar las estadísticas. Intente nuevamente.");
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, []);

  const viviendas = stats?.viviendas;
  const viviendasPorEstado = stats?.viviendasPorEstado ?? [];
  const viviendasPorBarrio = stats?.viviendasPorBarrio ?? [];
  const viviendasPorDorm = stats?.viviendasPorDorm ?? [];
  const usuariosPorRol = stats?.usuariosPorRol ?? [];
  const alojadosPorTipo = stats?.alojadosPorTipo ?? [];

  const hasAnyChartData =
    viviendasPorEstado.length > 0 ||
    viviendasPorBarrio.length > 0 ||
    viviendasPorDorm.length > 0 ||
    usuariosPorRol.length > 0 ||
    alojadosPorTipo.length > 0;

  // Helpers seguros para extraer nombre y valor
  const getNameFrom = (item: any, keys: string[], fallback: string) => {
    for (const key of keys) {
      if (item[key] !== undefined && item[key] !== null) {
        return String(item[key]);
      }
    }
    return fallback;
  };

  const getValueFrom = (item: any, keys: string[]): number => {
    for (const key of keys) {
      if (item[key] !== undefined && item[key] !== null) {
        const n = Number(item[key]);
        if (!Number.isNaN(n)) return n;
      }
    }
    return 0;
  };

  // Helpers para data Recharts (tolerantes a _id / count / total, etc.)
  const pieDataViviendasPorEstado = viviendasPorEstado.map((item, index) => ({
    name: getNameFrom(item, ["estado", "_id"], `Estado ${index + 1}`),
    value: getValueFrom(item, ["cantidad", "count", "total"]),
  }));

  const barDataViviendasPorBarrio = viviendasPorBarrio.map((item, index) => ({
    name: getNameFrom(item, ["barrio", "_id"], `Barrio ${index + 1}`),
    cantidad: getValueFrom(item, ["cantidad", "count", "total"]),
  }));

  const barDataViviendasPorDorm = viviendasPorDorm.map((item, index) => {
    const dormLabel = getNameFrom(item, ["dorm", "_id"], `${index + 1}`);
    return {
      name: `${dormLabel} dorm.`,
      cantidad: getValueFrom(item, ["cantidad", "count", "total"]),
    };
  });

  const pieDataUsuariosPorRol = usuariosPorRol.map((item, index) => ({
    name: getNameFrom(item, ["rol", "_id"], `Rol ${index + 1}`),
    value: getValueFrom(item, ["cantidad", "count", "total"]),
  }));

  const barDataAlojadosPorTipo = alojadosPorTipo.map((item, index) => ({
    name: getNameFrom(item, ["tipo", "_id"], `Tipo ${index + 1}`),
    cantidad: getValueFrom(item, ["cantidad", "count", "total"]),
  }));

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-4 md:space-y-6">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900">
            Estadísticas generales
          </h1>
          <p className="text-xs md:text-sm text-slate-600">
            Resumen operativo de viviendas, usuarios y alojamientos.
          </p>
        </div>
        {user && (
          <div className="text-xs md:text-sm text-right text-slate-700">
            <div>
              Sesión como:{" "}
              <span className="font-semibold">
                {user.nombre} {user.apellido}
              </span>
            </div>
            <div className="uppercase text-[10px] md:text-xs text-sky-700 font-bold">
              {user.role}
            </div>
          </div>
        )}
      </header>

      {/* Pequeño resumen técnico en dev para ver largos */}
      {IS_DEV && stats && (
        <details className="text-[11px] md:text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
          <summary className="cursor-pointer">
            Ver detalle técnico de estadísticas (dev)
          </summary>
          <pre className="mt-2 max-h-64 overflow-auto bg-slate-900 text-slate-50 rounded-lg p-2 text-[10px]">
            {JSON.stringify(
              {
                viviendas,
                viviendasPorEstadoLength: viviendasPorEstado.length,
                viviendasPorBarrioLength: viviendasPorBarrio.length,
                viviendasPorDormLength: viviendasPorDorm.length,
                usuariosPorRolLength: usuariosPorRol.length,
                alojadosPorTipoLength: alojadosPorTipo.length,
              },
              null,
              2
            )}
          </pre>
        </details>
      )}

      {/* Estado de carga / error */}
      {loading && (
        <div className="text-xs md:text-sm text-sky-700">
          Cargando estadísticas...
        </div>
      )}
      {error && (
        <div className="text-xs md:text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* Cards de resumen (viviendas, usuarios, alojamientos, pedidos) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 md:p-4">
          <p className="text-[11px] md:text-xs text-slate-500">
            Total de viviendas
          </p>
          <p className="text-2xl md:text-3xl font-semibold text-slate-900 mt-1">
            {viviendas?.total ?? 0}
          </p>
          {viviendas && (
            <p className="text-[11px] text-slate-500 mt-1">
              Ocupadas:{" "}
              <span className="font-semibold">
                {viviendas.ocupadas ?? viviendas["ocupadas"] ?? 0}
              </span>
            </p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 md:p-4">
          <p className="text-[11px] md:text-xs text-slate-500">
            Viviendas disponibles
          </p>
          <p className="text-2xl md:text-3xl font-semibold text-emerald-600 mt-1">
            {viviendas?.DISPONIBLE ?? viviendas?.disponibles ?? 0}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            En reparación:{" "}
            <span className="font-semibold">
              {viviendas?.REPARACION ?? viviendas?.reparacion ?? 0}
            </span>
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 md:p-4">
          <p className="text-[11px] md:text-xs text-slate-500">
            Usuarios por rol
          </p>
          <p className="text-2xl md:text-3xl font-semibold text-slate-900 mt-1">
            {usuariosPorRol.reduce((acc, item) => acc + getValueFrom(item, ["cantidad", "count", "total"]), 0)}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Roles activos:{" "}
            <span className="font-semibold">{usuariosPorRol.length}</span>
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 md:p-4">
          <p className="text-[11px] md:text-xs text-slate-500">
            Alojamiento / pedidos
          </p>
          <p className="text-2xl md:text-3xl font-semibold text-indigo-600 mt-1">
            {stats?.alojamientos?.total ?? 0}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            Pedidos:{" "}
            <span className="font-semibold">
              {stats?.pedidos?.total ?? 0}
            </span>
          </p>
        </div>
      </section>

      {/* Gráficos */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Pie: viviendas por estado */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 md:p-4 flex flex-col">
          <h2 className="text-sm md:text-base font-semibold text-slate-800 mb-2">
            Viviendas por estado
          </h2>
          {pieDataViviendasPorEstado.length === 0 ? (
            <p className="text-[11px] md:text-xs text-slate-500">
              No hay información disponible sobre estados de viviendas.
            </p>
          ) : (
            <div className="h-64 md:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieDataViviendasPorEstado}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="45%"
                    outerRadius="75%"
                    paddingAngle={3}
                  >
                    {pieDataViviendasPorEstado.map((entry, index) => {
                      const color =
                        ESTADO_COLORS[entry.name] ||
                        GENERIC_COLORS[index % GENERIC_COLORS.length];
                      return <Cell key={`cell-${index}`} fill={color} />;
                    })}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => [`${value} viviendas`, "Cantidad"]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Bar: viviendas por barrio */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 md:p-4 flex flex-col">
          <h2 className="text-sm md:text-base font-semibold text-slate-800 mb-2">
            Viviendas por barrio
          </h2>
          {barDataViviendasPorBarrio.length === 0 ? (
            <p className="text-[11px] md:text-xs text-slate-500">
              No hay información disponible por barrio.
            </p>
          ) : (
            <div className="h-64 md:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barDataViviendasPorBarrio}
                  margin={{ top: 8, right: 16, left: 0, bottom: 24 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="name"
                    angle={-25}
                    textAnchor="end"
                    height={40}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(value: any) => [`${value} viviendas`, "Cantidad"]}
                  />
                  <Bar dataKey="cantidad" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Bar: viviendas por dormitorios */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 md:p-4 flex flex-col">
          <h2 className="text-sm md:text-base font-semibold text-slate-800 mb-2">
            Viviendas por cantidad de dormitorios
          </h2>
          {barDataViviendasPorDorm.length === 0 ? (
            <p className="text-[11px] md:text-xs text-slate-500">
              No hay información disponible por dormitorios.
            </p>
          ) : (
            <div className="h-64 md:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barDataViviendasPorDorm}
                  margin={{ top: 8, right: 16, left: 0, bottom: 24 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(value: any) => [`${value} viviendas`, "Cantidad"]}
                  />
                  <Bar dataKey="cantidad" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Pie: usuarios por rol */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 md:p-4 flex flex-col">
          <h2 className="text-sm md:text-base font-semibold text-slate-800 mb-2">
            Usuarios por rol
          </h2>
          {pieDataUsuariosPorRol.length === 0 ? (
            <p className="text-[11px] md:text-xs text-slate-500">
              No hay información disponible de usuarios por rol.
            </p>
          ) : (
            <div className="h-64 md:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieDataUsuariosPorRol}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="45%"
                    outerRadius="75%"
                    paddingAngle={3}
                  >
                    {pieDataUsuariosPorRol.map((entry, index) => {
                      const color =
                        ROL_COLORS[entry.name] ||
                        GENERIC_COLORS[index % GENERIC_COLORS.length];
                      return <Cell key={`cell-rol-${index}`} fill={color} />;
                    })}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => [`${value} usuarios`, "Cantidad"]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Bar: alojados por tipo */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 md:p-4 flex flex-col lg:col-span-2">
          <h2 className="text-sm md:text-base font-semibold text-slate-800 mb-2">
            Alojados por tipo de alojamiento
          </h2>
          {barDataAlojadosPorTipo.length === 0 ? (
            <p className="text-[11px] md:text-xs text-slate-500">
              No hay información disponible de alojados por tipo.
            </p>
          ) : (
            <div className="h-64 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barDataAlojadosPorTipo}
                  margin={{ top: 8, right: 16, left: 0, bottom: 24 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip
                    formatter={(value: any) => [`${value} personas`, "Cantidad"]}
                  />
                  <Bar dataKey="cantidad" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

      {/* Fallback si todo viene vacío (pero sin error) */}
      {!loading && !error && !hasAnyChartData && (
        <p className="text-[11px] md:text-xs text-slate-500">
          No hay datos suficientes para generar gráficos en este momento. El
          backend está respondiendo correctamente, pero aún no hay registros de
          alojamientos, pedidos u ocupación.
        </p>
      )}
    </div>
  );
}
