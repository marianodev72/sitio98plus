// src/pages/admin/AdminViviendasPage.jsx

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import InstitutionalHeader from "../../components/layout/InstitutionalHeader.jsx";
import { API_BASE_URL } from "../../config.js";

// Normaliza nombres de barrio para comparar:
// - mayúsculas
// - quita prefijo "BARRIO"
// - quita comillas
// - quita espacios extra
const canonicalBarrio = (str) =>
  (str || "")
    .toUpperCase()
    .replace(/^BARRIO\s*/g, "") // saca 'BARRIO ' del principio si está
    .replace(/"/g, "") // saca comillas
    .trim();

const ESTADOS = ["TODOS", "DISPONIBLE", "OCUPADA"];

export default function AdminViviendasPage() {
  const navigate = useNavigate();
  const [viviendas, setViviendas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // filtros (solo frontend)
  const [search, setSearch] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("TODOS");
  const [barrioFiltro, setBarrioFiltro] = useState("TODOS"); // valor CANÓNICO

  // clave de orden global: campo-dirección (ej: "codigo-asc", "dormitorios-desc")
  const [sortKey, setSortKey] = useState("codigo-asc");

  const token = localStorage.getItem("zn98_token");

  // ---------------------------------------------------------------------------
  // 1. Cargar TODAS las viviendas una sola vez
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    cargarViviendas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarViviendas = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();
      params.set("page", "1");
      params.set("limit", "5000");

      const resp = await fetch(
        `${API_BASE_URL}/api/viviendas/admin/list?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await resp.json();
      console.log("[ADMIN VIVIENDAS] data:", data);

      if (!resp.ok) {
        throw new Error(
          data?.message || "Error al cargar listado de viviendas."
        );
      }

      setViviendas(data.viviendas || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "No se pudo cargar el listado de viviendas.");
    } finally {
      setLoading(false);
    }
  };

  const handleVolver = () => {
    navigate("/admin");
  };

  // ---------------------------------------------------------------------------
  // 2. Barrios disponibles (combo) usando nombre CANÓNICO
  // ---------------------------------------------------------------------------
  const barriosDisponibles = useMemo(() => {
    const set = new Set();
    viviendas.forEach((v) => {
      const canon = canonicalBarrio(v.barrio);
      if (canon) set.add(canon);
    });
    return ["TODOS", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [viviendas]);

  // ---------------------------------------------------------------------------
  // 3. Lista única: filtrada + ordenada (visibleViviendas)
  // ---------------------------------------------------------------------------
  const visibleViviendas = useMemo(() => {
    const texto = search.trim().toLowerCase();

    // 1) filtros
    let lista = viviendas.filter((v) => {
      // estado operativo
      if (
        estadoFiltro !== "TODOS" &&
        (v.estadoOperativo || "").toUpperCase() !== estadoFiltro.toUpperCase()
      ) {
        return false;
      }

      // barrio canónico
      if (barrioFiltro !== "TODOS") {
        const canonViv = canonicalBarrio(v.barrio);
        if (canonViv !== barrioFiltro) return false;
      }

      // texto libre
      if (texto) {
        const hay = (val) =>
          val && val.toString().toLowerCase().includes(texto);
        if (
          !(
            hay(v.codigo) ||
            hay(v.barrio) ||
            hay(v.unidad) ||
            hay(v.titular)
          )
        ) {
          return false;
        }
      }

      return true;
    });

    // 2) orden
    const num = (val) => {
      const n = Number(val);
      return isNaN(n) ? null : n;
    };

    const cmpString = (a, b) => {
      const sA = (a ?? "").toString().toUpperCase();
      const sB = (b ?? "").toString().toUpperCase();
      if (sA === sB) return 0;
      return sA < sB ? -1 : 1;
    };

    const cmpNum = (a, b, asc = true) => {
      const nA = num(a);
      const nB = num(b);
      if (nA == null && nB == null) return 0;
      if (nA == null) return 1;
      if (nB == null) return -1;
      if (nA === nB) return 0;
      const sign = asc ? 1 : -1;
      return nA < nB ? -1 * sign : 1 * sign;
    };

    const [campo, dir] = sortKey.split("-");
    const asc = dir === "asc";

    lista.sort((a, b) => {
      switch (campo) {
        case "codigo":
          return cmpString(a.codigo, b.codigo) * (asc ? 1 : -1);

        case "barrio": {
          const canonA = canonicalBarrio(a.barrio);
          const canonB = canonicalBarrio(b.barrio);
          return cmpString(canonA, canonB) * (asc ? 1 : -1);
        }

        case "unidad":
          return cmpNum(a.unidad, b.unidad, asc);

        case "dormitorios":
          return cmpNum(a.dormitorios, b.dormitorios, asc);

        case "capacidad":
          return cmpNum(a.capacidad, b.capacidad, asc);

        case "estadoOperativo":
          return (
            cmpString(a.estadoOperativo, b.estadoOperativo) *
            (asc ? 1 : -1)
          );

        case "titular":
          return cmpString(a.titular, b.titular) * (asc ? 1 : -1);

        default:
          return 0;
      }
    });

    console.log(
      "[DEBUG visibleViviendas]",
      { sortKey, barrioFiltro, estadoFiltro, search },
      lista.slice(0, 10).map((v) => ({
        codigo: v.codigo,
        barrio: v.barrio,
        canonBarrio: canonicalBarrio(v.barrio),
        dorm: v.dormitorios,
        cap: v.capacidad,
      }))
    );

    return lista;
  }, [viviendas, search, estadoFiltro, barrioFiltro, sortKey]);

  // ---------------------------------------------------------------------------
  // 4. Debug visual de barrios (usando visibleViviendas)
  // ---------------------------------------------------------------------------
  const debugInfo = useMemo(
    () => ({
      barrioFiltro,
      totalOriginal: viviendas.length,
      totalFiltradas: visibleViviendas.length,
      primeros: visibleViviendas.slice(0, 8).map((v) => ({
        codigo: v.codigo,
        barrio: v.barrio,
        canon: canonicalBarrio(v.barrio),
      })),
    }),
    [barrioFiltro, viviendas, visibleViviendas]
  );

  // ---------------------------------------------------------------------------
  // 5. Controles de orden
  // ---------------------------------------------------------------------------
  const handleSort = (campo, direccion) => {
    setSortKey(`${campo}-${direccion}`);
  };

  const renderSortControls = (campo) => {
    const activeAsc = sortKey === `${campo}-asc`;
    const activeDesc = sortKey === `${campo}-desc`;

    const baseBtn =
      "px-1 text-[10px] leading-none rounded-sm border border-transparent";
    const activeAscClass = activeAsc
      ? "border-slate-400 text-slate-100"
      : "text-slate-500";
    const activeDescClass = activeDesc
      ? "border-slate-400 text-slate-100"
      : "text-slate-500";

    return (
      <span className="inline-flex flex-col ml-1">
        <button
          type="button"
          onClick={() => handleSort(campo, "asc")}
          className={`${baseBtn} ${activeAscClass}`}
          title="Ordenar de menor a mayor"
        >
          ▲
        </button>
        <button
          type="button"
          onClick={() => handleSort(campo, "desc")}
          className={`${baseBtn} ${activeDescClass}`}
          title="Ordenar de mayor a menor"
        >
          ▼
        </button>
      </span>
    );
  };

  const formatEstado = (estado) => {
    const e = (estado || "").toUpperCase();
    if (e === "OCUPADA") {
      return (
        <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
          OCUPADA
        </span>
      );
    }
    if (e === "DISPONIBLE") {
      return (
        <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/40">
          DISPONIBLE
        </span>
      );
    }
    return (
      <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-slate-500/20 text-slate-300 border border-slate-500/40">
        {estado || "DESCONOCIDO"}
      </span>
    );
  };

  return (
    <>
      <InstitutionalHeader />

      <main className="min-h-screen bg-slate-950 text-slate-50 px-8 py-10">
        <div className="max-w-6xl mx-auto">
          {/* Encabezado */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-semibold mb-1">
                Viviendas y alojamientos
              </h1>
              <p className="text-slate-300 text-sm">
                Consultá el stock de viviendas fiscales, su estado y capacidad
                básica. Usá los filtros y el orden por columnas para encontrar
                rápidamente una unidad.
              </p>
            </div>

            <button
              onClick={handleVolver}
              className="px-5 py-2 rounded-full bg-sky-500 hover:bg-sky-400 text-sm font-semibold"
            >
              Volver al panel
            </button>
          </div>

          {/* Filtros */}
          <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Buscar (código, barrio, unidad, titular)
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-full bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
                placeholder="Ej: ZN98-001, K01, ALTE. STORNI..."
              />
              <p className="text-[10px] text-slate-500 mt-1">
                La búsqueda se aplica en este listado; podés buscar por unidad
                (ej. K01), barrio, código o titular.
              </p>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Estado operativo
              </label>
              <select
                value={estadoFiltro}
                onChange={(e) => setEstadoFiltro(e.target.value)}
                className="w-full rounded-full bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
              >
                {ESTADOS.map((e) => (
                  <option key={e} value={e}>
                    {e === "TODOS" ? "Todos" : e}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                Barrio
              </label>
              <select
                value={barrioFiltro}
                onChange={(e) => setBarrioFiltro(e.target.value)}
                className="w-full rounded-full bg-slate-900 border border-slate-700 px-3 py-2 text-sm"
              >
                {barriosDisponibles.map((b) => (
                  <option key={b} value={b}>
                    {b === "TODOS" ? "Todos" : b}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Debug visual de barrios (usa visibleViviendas) */}
          <div className="mb-4 text-[11px] text-slate-400 border border-slate-700/70 bg-slate-900/80 rounded-lg px-3 py-2">
            <div>
              <strong>DEBUG BARRIOS:</strong> filtro ={" "}
              <span className="font-semibold text-sky-300">
                {debugInfo.barrioFiltro}
              </span>{" "}
              | total original = {debugInfo.totalOriginal} | total visibles ={" "}
              {debugInfo.totalFiltradas}
            </div>
            <div className="mt-1">
              Primeras filas visibles:
              {debugInfo.primeros.length === 0 && " (ninguna)"}
              {debugInfo.primeros.length > 0 && (
                <ul className="list-disc list-inside">
                  {debugInfo.primeros.map((r) => (
                    <li key={r.codigo}>
                      {r.codigo} — <span>{r.barrio}</span> — canon:{" "}
                      <span className="text-emerald-300">{r.canon}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-rose-500/70 bg-rose-950/50 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          )}

          {loading && (
            <p className="text-sm text-slate-400">Cargando viviendas…</p>
          )}

          {!loading && visibleViviendas.length === 0 && !error && (
            <p className="text-sm text-slate-400">
              No se encontraron viviendas con los filtros seleccionados.
            </p>
          )}

          {!loading && visibleViviendas.length > 0 && (
            <div className="mt-2 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/70">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-900/90">
                  <tr className="border-b border-slate-800 text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-4 py-3">
                      <div className="flex items-center">
                        <span>Código</span>
                        {renderSortControls("codigo")}
                      </div>
                    </th>
                    <th className="px-4 py-3">
                      <div className="flex items-center">
                        <span>Barrio</span>
                        {renderSortControls("barrio")}
                      </div>
                    </th>
                    <th className="px-4 py-3">
                      <div className="flex items-center">
                        <span>Unidad</span>
                        {renderSortControls("unidad")}
                      </div>
                    </th>
                    <th className="px-4 py-3">
                      <div className="flex items-center">
                        <span>Dorm.</span>
                        {renderSortControls("dormitorios")}
                      </div>
                    </th>
                    <th className="px-4 py-3">
                      <div className="flex items-center">
                        <span>Capacidad</span>
                        {renderSortControls("capacidad")}
                      </div>
                    </th>
                    <th className="px-4 py-3">
                      <div className="flex items-center">
                        <span>Estado</span>
                        {renderSortControls("estadoOperativo")}
                      </div>
                    </th>
                    <th className="px-4 py-3">
                      <div className="flex items-center">
                        <span>Titular</span>
                        {renderSortControls("titular")}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visibleViviendas.map((v, idx) => (
                    <tr
                      key={v._id || `${v.codigo}-${v.unidad}-${idx}`} // 🔑 KEY ÚNICA
                      className="border-b border-slate-800/60 last:border-0 hover:bg-slate-900"
                    >
                      <td className="px-4 py-3 text-slate-200">
                        {v.codigo || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-200">
                        {v.barrio || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-200">
                        {v.unidad || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-200">
                        {v.dormitorios ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-200">
                        {v.capacidad ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        {formatEstado(v.estadoOperativo)}
                      </td>
                      <td className="px-4 py-3 text-slate-200">
                        {v.titular || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
