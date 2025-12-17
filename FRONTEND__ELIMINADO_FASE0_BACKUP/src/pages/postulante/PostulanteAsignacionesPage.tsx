// src/pages/postulante/PostulanteAsignacionesPage.tsx
import { useEffect, useMemo, useState } from "react";
import { darConformidadAnexo02, getMisAnexos } from "../../api/formularios";

type EstadoForm =
  | "BORRADOR"
  | "ENVIADO"
  | "EN_REVISION"
  | "APROBADO"
  | "CERRADO"
  | string;

type Anexo02 = {
  _id: string;
  codigo: string; // "ANEXO_02"
  estado: EstadoForm;
  createdAt?: string;
  updatedAt?: string;
  datos?: Record<string, any>;
};

function niceDateTime(d?: string) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleString("es-AR");
}

function badgeClass(estado: string) {
  const base =
    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] border";
  switch ((estado || "").toUpperCase()) {
    case "ENVIADO":
      return `${base} bg-sky-950/40 text-sky-200 border-sky-900`;
    case "APROBADO":
      return `${base} bg-amber-950/40 text-amber-200 border-amber-900`;
    case "CERRADO":
      return `${base} bg-emerald-950/40 text-emerald-200 border-emerald-900`;
    default:
      return `${base} bg-slate-950/40 text-slate-200 border-slate-800`;
  }
}

export default function PostulanteAsignacionesPage() {
  const [loading, setLoading] = useState(false);
  const [loadingOk, setLoadingOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [anexos, setAnexos] = useState<Anexo02[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(
    () => anexos.find((a) => a._id === selectedId) || null,
    [anexos, selectedId]
  );

  async function load() {
    try {
      setLoading(true);
      setError(null);
      setOk(null);

      // ✅ fuente de verdad: backend -> GET /api/formularios/mios?codigo=ANEXO_02
      const list = (await getMisAnexos("ANEXO_02")) as Anexo02[];

      const normalized = Array.isArray(list) ? list : [];
      setAnexos(normalized);
      setSelectedId(normalized[0]?._id ?? null);
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "No se pudieron cargar tus asignaciones (ANEXO_02).";
      setError(msg);
      setAnexos([]);
      setSelectedId(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function darConformidad(anexo02Id: string) {
    try {
      setLoadingOk(anexo02Id);
      setError(null);
      setOk(null);

      await darConformidadAnexo02(anexo02Id);

      setOk(
        "Conformidad registrada. Ahora el ADMIN GENERAL puede cerrar el trámite."
      );
      await load();
    } catch (e: any) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        "No se pudo registrar la conformidad.";
      setError(msg);
    } finally {
      setLoadingOk(null);
    }
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <header className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg md:text-xl font-bold text-slate-100">
              Mis Asignaciones
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              ANEXO 02 · Conformidad de asignación
            </p>
          </div>

          <button
            onClick={load}
            disabled={loading}
            className="rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-100 disabled:opacity-60"
          >
            {loading ? "Actualizando..." : "Actualizar"}
          </button>
        </div>
      </header>

      {error && (
        <div className="text-xs text-rose-200 bg-rose-950/40 border border-rose-900 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
      {ok && (
        <div className="text-xs text-emerald-200 bg-emerald-950/40 border border-emerald-900 rounded-lg px-3 py-2">
          {ok}
        </div>
      )}

      <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.6fr)] gap-4">
        {/* Lista */}
        <aside className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              ANEXO 02
            </div>
            <span className="text-[10px] text-slate-500">{anexos.length}</span>
          </div>

          {loading ? (
            <div className="text-xs text-slate-400">Cargando...</div>
          ) : anexos.length === 0 ? (
            <div className="text-xs text-slate-400">
              No hay asignaciones (ANEXO 02) disponibles para conformar.
            </div>
          ) : (
            <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800 overflow-hidden">
              {anexos.map((a) => {
                const active = a._id === selectedId;
                const confPost = !!a.datos?.conformidadPostulante?.ok;
                const cerrado = (a.estado || "").toUpperCase() === "CERRADO";

                return (
                  <li
                    key={a._id}
                    onClick={() => setSelectedId(a._id)}
                    className={[
                      "cursor-pointer px-3 py-2 text-xs hover:bg-slate-800/60",
                      active ? "bg-sky-900/40" : "bg-slate-950/30",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="font-semibold text-slate-100">
                          ANEXO_02 · {a.createdAt ? niceDateTime(a.createdAt) : "—"}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Vivienda: {a.datos?.viviendaId ?? "—"} ·{" "}
                          {cerrado
                            ? "Trámite cerrado"
                            : confPost
                            ? "Postulante conforme"
                            : "Pendiente de conformidad"}
                        </div>
                      </div>
                      <span className={badgeClass(a.estado)}>{a.estado}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        {/* Detalle */}
        <main className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
          {!selected ? (
            <div className="text-xs text-slate-400">
              Seleccioná una asignación (ANEXO_02) para ver el detalle.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-slate-100">
                    {selected.codigo}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Creado: {niceDateTime(selected.createdAt)} · Actualizado:{" "}
                    {niceDateTime(selected.updatedAt)}
                  </div>
                </div>
                <span className={badgeClass(selected.estado)}>{selected.estado}</span>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-xs space-y-1">
                <div className="text-[11px] font-semibold text-slate-200">
                  Datos principales
                </div>
                <div className="text-slate-200">
                  <span className="text-slate-400">Vivienda ID:</span>{" "}
                  {selected.datos?.viviendaId ?? "—"}
                </div>
                <div className="text-slate-200">
                  <span className="text-slate-400">PostulanteId:</span>{" "}
                  {selected.datos?.postulanteId ?? "—"}
                </div>
                <div className="text-slate-200">
                  <span className="text-slate-400">Anexo01Id:</span>{" "}
                  {selected.datos?.anexo01Id ?? "—"}
                </div>
              </div>

              {/* Conformidad postulante */}
              <div className="rounded-xl border border-amber-900 bg-amber-950/20 p-3">
                <div className="text-xs text-amber-200 font-semibold">
                  Conformidad del titular (postulante)
                </div>

                {selected.datos?.conformidadPostulante?.ok ? (
                  <div className="mt-2 text-[11px] text-emerald-200">
                    ✅ Ya registraste conformidad el{" "}
                    {niceDateTime(selected.datos.conformidadPostulante.fecha)}
                  </div>
                ) : (
                  <>
                    <div className="mt-1 text-[11px] text-amber-200/80">
                      Si estás de acuerdo con la asignación, presioná “DAR CONFORMIDAD”.
                    </div>

                    <button
                      onClick={() => darConformidad(selected._id)}
                      disabled={loadingOk === selected._id}
                      className="mt-3 inline-flex items-center justify-center rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-amber-500 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {loadingOk === selected._id ? "Registrando..." : "DAR CONFORMIDAD"}
                    </button>
                  </>
                )}

                {String(selected.estado).toUpperCase() === "CERRADO" && (
                  <div className="mt-2 text-[11px] text-emerald-200">
                    ✅ Trámite cerrado por AdminGeneral.
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </section>
    </div>
  );
}
