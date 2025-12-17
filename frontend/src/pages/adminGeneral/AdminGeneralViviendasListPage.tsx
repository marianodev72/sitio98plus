// src/pages/adminGeneral/AdminGeneralViviendasListPage.tsx

import React, { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "../../store/authStore";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

// Tipos auxiliares para ocupación
interface OcupacionEntry {
  permisionario?: string; // ObjectId de User (no populado por ahora)
  fechaAsignacion?: string;
  fechaDesocupacionPrevista?: string;
  recordatorio90Enviado?: boolean;
  [key: string]: any;
}

interface Vivienda {
  _id: string;
  codigo: string;
  barrio: string;
  estado: string;
  dormitorios?: number;
  createdAt?: string;
  updatedAt?: string;
  ocupacionActual?: OcupacionEntry | null;
  historialOcupacion?: OcupacionEntry[];
  // Campos adicionales opcionales que pueda enviar el backend
  [key: string]: any;
}

type EstadoVivienda =
  | "DISPONIBLE"
  | "OCUPADA"
  | "RESERVADA"
  | "REPARACION"
  | "";

const ESTADO_LABELS: Record<string, string> = {
  DISPONIBLE: "Disponible",
  OCUPADA: "Ocupada",
  RESERVADA: "Reservada",
  REPARACION: "En reparación",
};

// Helper pequeño para fechas
function formatearFecha(value?: string): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-AR");
}

export default function AdminGeneralViviendasListPage() {
  const { token } = useAuthStore();

  const [viviendas, setViviendas] = useState<Vivienda[]>([]);
  const [barrios, setBarrios] = useState<string[]>([]);

  const [loadingViviendas, setLoadingViviendas] = useState(false);
  const [loadingBarrios, setLoadingBarrios] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filtros
  const [filtroBusqueda, setFiltroBusqueda] = useState("");
  const [filtroBarrio, setFiltroBarrio] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<EstadoVivienda>("");
  const [filtroDormitorios, setFiltroDormitorios] = useState<string>("");

  // Detalle seleccionado
  const [selectedVivienda, setSelectedVivienda] = useState<Vivienda | null>(
    null
  );

  // ─────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────
  function getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  }

  // ─────────────────────────────────────────────
  // Carga de barrios
  // ─────────────────────────────────────────────
  async function loadBarrios() {
    if (!token) return;

    try {
      setLoadingBarrios(true);
      setErrorMsg(null);

      const res = await fetch(`${API_BASE_URL}/admin/viviendas/barrios`, {
        method: "GET",
        headers: getAuthHeaders(),
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      // Esperamos un array de strings
      setBarrios(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("[AdminGeneral] Error al cargar barrios:", error);
      setErrorMsg("No se pudieron cargar los barrios.");
    } finally {
      setLoadingBarrios(false);
    }
  }

  // ─────────────────────────────────────────────
  // Carga de viviendas
  // ─────────────────────────────────────────────
  async function loadViviendas() {
    if (!token) return;

    try {
      setLoadingViviendas(true);
      setErrorMsg(null);

      const res = await fetch(`${API_BASE_URL}/admin/viviendas`, {
        method: "GET",
        headers: getAuthHeaders(),
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText}`);
      }

      const data = await res.json();

      // Soportamos distintos formatos por seguridad
      let lista: Vivienda[] = [];
      if (Array.isArray(data)) {
        lista = data;
      } else if (Array.isArray(data.viviendas)) {
        lista = data.viviendas;
      }

      setViviendas(lista);
    } catch (error) {
      console.error("[AdminGeneral] Error al cargar viviendas:", error);
      setErrorMsg("No se pudieron cargar las viviendas.");
    } finally {
      setLoadingViviendas(false);
    }
  }

  useEffect(() => {
    if (!token) return;
    loadBarrios();
    loadViviendas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ─────────────────────────────────────────────
  // Filtro en memoria (no toca backend)
  // ─────────────────────────────────────────────
  const viviendasFiltradas = useMemo(() => {
    return viviendas.filter((v) => {
      if (
        filtroBusqueda &&
        !v.codigo.toLowerCase().includes(filtroBusqueda.toLowerCase())
      ) {
        return false;
      }

      if (filtroBarrio && v.barrio !== filtroBarrio) {
        return false;
      }

      if (filtroEstado && v.estado !== filtroEstado) {
        return false;
      }

      if (filtroDormitorios) {
        const n = Number(filtroDormitorios);
        const vd = v.dormitorios ?? 0;
        if (Number.isFinite(n) && n > 0) {
          if (n === 4) {
            // 4 = "4 o más"
            if (vd < 4) return false;
          } else if (vd !== n) {
            return false;
          }
        }
      }

      return true;
    });
  }, [viviendas, filtroBusqueda, filtroBarrio, filtroEstado, filtroDormitorios]);

  // Totales rápidos por estado (usado tanto en chips como para chequeos)
  const totalDisponibles = viviendas.filter(
    (v) => v.estado === "DISPONIBLE"
  ).length;
  const totalOcupadas = viviendas.filter((v) => v.estado === "OCUPADA").length;
  const totalReservadas = viviendas.filter(
    (v) => v.estado === "RESERVADA"
  ).length;
  const totalReparacion = viviendas.filter(
    (v) => v.estado === "REPARACION"
  ).length;

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">
            Gestión de viviendas
          </h1>
          <p className="text-sm text-slate-400">
            Administración del parque habitacional de la Base Naval Ushuaia.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setFiltroBarrio("");
              setFiltroEstado("");
              setFiltroDormitorios("");
              setFiltroBusqueda("");
            }}
            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-800"
          >
            Limpiar filtros
          </button>
          <button
            type="button"
            onClick={() => {
              loadBarrios();
              loadViviendas();
            }}
            className="rounded-xl bg-sky-600 px-3 py-1.5 text-xs font-medium text-slate-950 hover:bg-sky-500 disabled:opacity-60"
            disabled={loadingViviendas || loadingBarrios}
          >
            {loadingViviendas || loadingBarrios ? "Actualizando..." : "Actualizar"}
          </button>
        </div>
      </header>

      {/* Chips de resumen */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Total viviendas
          </p>
          <p className="mt-1 text-2xl font-semibold text-slate-50">
            {viviendas.length}
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-700/60 bg-emerald-950/40 p-3 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
            Disponibles
          </p>
          <p className="mt-1 text-2xl font-semibold text-emerald-100">
            {totalDisponibles}
          </p>
        </div>
        <div className="rounded-2xl border border-amber-700/60 bg-amber-950/40 p-3 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-300">
            Ocupadas
          </p>
          <p className="mt-1 text-2xl font-semibold text-amber-100">
            {totalOcupadas}
          </p>
        </div>
        <div className="rounded-2xl border border-sky-700/60 bg-sky-950/40 p-3 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-300">
            Reservadas / reparación
          </p>
          <p className="mt-1 text-2xl font-semibold text-sky-100">
            {totalReservadas + totalReparacion}
          </p>
        </div>
      </section>

      {/* Mensaje de error */}
      {errorMsg && (
        <div className="rounded-xl border border-rose-700/60 bg-rose-950/40 px-3 py-2 text-xs text-rose-100">
          {errorMsg}
        </div>
      )}

      {/* Contenido principal en 2 columnas: tabla + detalle */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
        {/* Columna izquierda: filtros + tabla */}
        <div className="space-y-3">
          {/* Filtros */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3 shadow-sm">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Filtros
            </h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {/* Búsqueda por código */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-slate-300">
                  Buscar por código
                </label>
                <input
                  type="text"
                  value={filtroBusqueda}
                  onChange={(e) => setFiltroBusqueda(e.target.value)}
                  placeholder="Ej: AS-501"
                  className="h-8 rounded-lg border border-slate-700 bg-slate-950 px-2 text-xs text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              {/* Barrio */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-slate-300">
                  Barrio
                </label>
                <select
                  value={filtroBarrio}
                  onChange={(e) => setFiltroBarrio(e.target.value)}
                  className="h-8 rounded-lg border border-slate-700 bg-slate-950 px-2 text-xs text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  <option value="">Todos</option>
                  {barrios.map((barrio) => (
                    <option key={barrio} value={barrio}>
                      {barrio}
                    </option>
                  ))}
                </select>
              </div>

              {/* Estado */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-slate-300">
                  Estado
                </label>
                <select
                  value={filtroEstado}
                  onChange={(e) =>
                    setFiltroEstado(e.target.value as EstadoVivienda)
                  }
                  className="h-8 rounded-lg border border-slate-700 bg-slate-950 px-2 text-xs text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  <option value="">Todos</option>
                  <option value="DISPONIBLE">Disponible</option>
                  <option value="OCUPADA">Ocupada</option>
                  <option value="RESERVADA">Reservada</option>
                  <option value="REPARACION">En reparación</option>
                </select>
              </div>

              {/* Dormitorios */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-slate-300">
                  Dormitorios
                </label>
                <select
                  value={filtroDormitorios}
                  onChange={(e) => setFiltroDormitorios(e.target.value)}
                  className="h-8 rounded-lg border border-slate-700 bg-slate-950 px-2 text-xs text-slate-100 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                >
                  <option value="">Todos</option>
                  <option value="1">1 dorm.</option>
                  <option value="2">2 dorm.</option>
                  <option value="3">3 dorm.</option>
                  <option value="4">4 o más</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tabla de viviendas */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Listado de viviendas
              </h2>
              <p className="text-[11px] text-slate-400">
                Mostrando{" "}
                <span className="font-semibold text-slate-100">
                  {viviendasFiltradas.length}
                </span>{" "}
                de {viviendas.length}
              </p>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="min-w-full text-left text-xs text-slate-100">
                <thead className="bg-slate-950/80 text-[11px] uppercase text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Código</th>
                    <th className="px-3 py-2">Barrio</th>
                    <th className="px-3 py-2 text-center">Dorm.</th>
                    <th className="px-3 py-2">Estado</th>
                    <th className="px-3 py-2 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-slate-900/80">
                  {viviendasFiltradas.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-6 text-center text-xs text-slate-500"
                      >
                        No se encontraron viviendas con los filtros aplicados.
                      </td>
                    </tr>
                  )}

                  {viviendasFiltradas.map((v) => (
                    <tr key={v._id} className="hover:bg-slate-900">
                      <td className="px-3 py-2 font-medium text-slate-50">
                        {v.codigo}
                      </td>
                      <td className="px-3 py-2 text-slate-200">
                        {v.barrio}
                      </td>
                      <td className="px-3 py-2 text-center text-slate-200">
                        {v.dormitorios ?? "–"}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={[
                            "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            v.estado === "DISPONIBLE" &&
                              "bg-emerald-500/10 text-emerald-300 border border-emerald-500/60",
                            v.estado === "OCUPADA" &&
                              "bg-amber-500/10 text-amber-300 border border-amber-500/60",
                            v.estado === "RESERVADA" &&
                              "bg-sky-500/10 text-sky-300 border border-sky-500/60",
                            v.estado === "REPARACION" &&
                              "bg-rose-500/10 text-rose-300 border border-rose-500/60",
                            !ESTADO_LABELS[v.estado] &&
                              "bg-slate-500/10 text-slate-200 border border-slate-500/60",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        >
                          {ESTADO_LABELS[v.estado] ?? v.estado ?? "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedVivienda(v)}
                          className="rounded-lg border border-slate-600 bg-slate-950 px-2 py-1 text-[11px] font-medium text-slate-100 hover:bg-slate-800"
                        >
                          Ver detalle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {(loadingViviendas || loadingBarrios) && (
              <p className="mt-2 text-[11px] text-slate-400">
                Cargando información…
              </p>
            )}
          </div>
        </div>

        {/* Columna derecha: detalle de vivienda seleccionada */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-sm">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Detalle de vivienda
          </h2>

          {!selectedVivienda ? (
            <p className="text-xs text-slate-500">
              Seleccione una vivienda del listado para ver su detalle.
            </p>
          ) : (
            <div className="space-y-3">
              {/* Encabezado del detalle */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-50">
                    {selectedVivienda.codigo}
                  </p>
                  <p className="text-xs text-slate-400">
                    {selectedVivienda.barrio}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedVivienda(null)}
                  className="text-[11px] text-slate-400 hover:text-slate-100"
                >
                  Cerrar
                </button>
              </div>

              {/* Estado / Dormitorios */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-slate-950/60 px-3 py-2 border border-slate-800">
                  <p className="text-[10px] font-semibold text-slate-400">
                    Estado
                  </p>
                  <p className="mt-0.5 font-medium text-slate-50">
                    {ESTADO_LABELS[selectedVivienda.estado] ??
                      selectedVivienda.estado ??
                      "—"}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-950/60 px-3 py-2 border border-slate-800">
                  <p className="text-[10px] font-semibold text-slate-400">
                    Dormitorios
                  </p>
                  <p className="mt-0.5 font-medium text-slate-50">
                    {selectedVivienda.dormitorios ?? "No informado"}
                  </p>
                </div>
              </div>

              {/* Ocupación actual */}
              <div className="rounded-xl bg-slate-950/60 px-3 py-2 text-[11px] text-slate-200 border border-slate-800">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Ocupación actual
                </p>
                {selectedVivienda.ocupacionActual ? (
                  <div className="space-y-0.5">
                    <div>
                      <span className="font-semibold">Estado: </span>
                      <span>
                        {selectedVivienda.estado === "OCUPADA"
                          ? "Vivienda ocupada"
                          : "Vivienda asignada"}
                      </span>
                    </div>
                    <div>
                      <span className="font-semibold">Desde: </span>
                      {formatearFecha(
                        selectedVivienda.ocupacionActual.fechaAsignacion as
                          | string
                          | undefined
                      )}
                    </div>
                    {selectedVivienda.ocupacionActual
                      .fechaDesocupacionPrevista && (
                      <div>
                        <span className="font-semibold">
                          Desocupación prevista:{" "}
                        </span>
                        {formatearFecha(
                          selectedVivienda.ocupacionActual
                            .fechaDesocupacionPrevista as string
                        )}
                      </div>
                    )}
                    <p className="mt-1 text-[10px] text-slate-500">
                      En futuras versiones se mostrará aquí el nombre completo
                      del permisionario y enlaces a los anexos asociados
                      (ANEXO 02, 03, 09).
                    </p>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400">
                    No hay ocupación vigente registrada en esta vivienda. El
                    ADMIN_GENERAL podrá asignar un permisionario desde las
                    gestiones (ANEXO 02) o desde un flujo específico de
                    asignación manual.
                  </p>
                )}
              </div>

              {/* Historial de ocupación (si el backend lo expone) */}
              <div className="rounded-xl bg-slate-950/60 px-3 py-2 text-[11px] text-slate-200 border border-slate-800">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Historial de ocupaciones
                </p>
                {Array.isArray(selectedVivienda.historialOcupacion) &&
                selectedVivienda.historialOcupacion.length > 0 ? (
                  <ul className="space-y-0.5">
                    {selectedVivienda.historialOcupacion
                      .slice(-3)
                      .reverse()
                      .map((h, idx) => (
                        <li key={idx} className="text-[11px] text-slate-300">
                          <span className="font-semibold">
                            {formatearFecha(h.fechaAsignacion as string)}{" "}
                          </span>
                          {h.fechaDesocupacionPrevista && (
                            <>
                              →{" "}
                              {formatearFecha(
                                h.fechaDesocupacionPrevista as string
                              )}{" "}
                            </>
                          )}
                          <span className="text-slate-500">
                            (permisionario ID:{" "}
                            {h.permisionario || "no especificado"})
                          </span>
                        </li>
                      ))}
                  </ul>
                ) : (
                  <p className="text-[11px] text-slate-400">
                    Aún no hay historial de ocupaciones registrado desde este
                    módulo. Cuando el backend exponga el historial completo,
                    se mostrará aquí línea por línea.
                  </p>
                )}
              </div>

              {/* Meta genérico / fechas de creación */}
              <div className="rounded-xl bg-slate-950/60 px-3 py-2 text-[11px] text-slate-200 border border-slate-800">
                <p className="mb-1 font-semibold text-slate-300">
                  Información adicional
                </p>
                <ul className="space-y-0.5">
                  <li>
                    <span className="font-semibold">Creada:</span>{" "}
                    {formatearFecha(selectedVivienda.createdAt)}
                  </li>
                  <li>
                    <span className="font-semibold">Actualizada:</span>{" "}
                    {formatearFecha(selectedVivienda.updatedAt)}
                  </li>
                </ul>
              </div>

              <p className="mt-2 text-[10px] text-slate-500">
                En futuras versiones, desde este panel el ADMIN_GENERAL podrá
                vincular / desvincular permisionarios, ver anexos asociados y
                navegar a la ficha completa de la vivienda, siempre respetando
                el flujo oficial de ANEXO 01 / 02 / 03 / 09.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
