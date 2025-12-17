import { useEffect, useMemo, useState } from "react";
import { apiClient } from "../../api/client";

type EstadoForm =
  | "BORRADOR"
  | "ENVIADO"
  | "EN_REVISION"
  | "APROBADO"
  | "CERRADO"
  | string;

interface FormSubmission {
  _id: string;
  codigo: string; // "ANEXO_02"
  estado: EstadoForm;
  createdAt?: string;
  updatedAt?: string;
  datos?: Record<string, any>;
  historialEstados?: Array<{
    estado: string;
    fecha: string;
    realizadoPor?: string;
    observacion?: string;
  }>;
}

function niceDate(d?: string) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString();
}

function badgeClass(estado: string) {
  const base =
    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] border";
  switch (estado) {
    case "ENVIADO":
      return `${base} bg-sky-950/40 text-sky-200 border-sky-900`;
    case "EN_REVISION":
      return `${base} bg-amber-950/40 text-amber-200 border-amber-900`;
    case "CERRADO":
      return `${base} bg-emerald-950/40 text-emerald-200 border-emerald-900`;
    default:
      return `${base} bg-slate-950/40 text-slate-200 border-slate-800`;
  }
}

export default function MisAnexos02Page() {
  const [loading, setLoading] = useState(false);
  const [loadingOk, setLoadingOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [anexos, setAnexos] = useState<FormSubmission[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(
    () => anexos.find((a) => a._id === selectedId) || null,
    [anexos, selectedId]
  );

  async function load() {
    try {
      setLoading(true);
      setError(null);
      setMessage(null);

      // ✅ Backend: GET /api/formularios/mios?codigo=ANEXO_02
      const resp = await apiClient.get("/formularios/mios", {
        params: { codigo: "ANEXO_02" },
      });

      const list: FormSubmission[] = Array.isArray(resp.data?.anexos)
        ? resp.data.anexos
        : [];

      setAnexos(list);
      setSelectedId(list[0]?._id ?? null);
    } catch (err) {
      console.error("[MisAnexos02] Error:", err);
      setError("No se pudieron cargar tus ANEXO 02. Revisá consola.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function darConformidad(anexoId: string) {
    try {
      setLoadingOk(anexoId);
      setError(null);
      setMessage(null);

      // ✅ Requiere el patch del backend para permitirlo
      await apiClient.patch(`/formularios/${anexoId}/estado`, {
        estado: "EN_REVISION",
        observacion: "Conformidad del titular",
      });

      setMessage("Conformidad registrada. Ya podés avisar al ADMIN GENERAL para el cierre.");
      await load();
    } catch (err: any) {
      console.error("[MisAnexos02] Error conformidad:", err);
      const msg =
        err?.response?.data?.message ||
        "No se pudo registrar la conformidad (revisar permisos/estado).";
      setError(msg);
    } finally {
      setLoadingOk(null);
    }
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl md:text-2xl font-bold text-slate-100">
          Mis ANEXO 02
        </h1>
        <p className="text-xs md:text-sm text-slate-400">
          Aquí verás tus asignaciones de vivienda fiscal. Cuando corresponda, podés presionar{" "}
          <b>DAR CONFORMIDAD</b>.
        </p>
      </header>

      {loading && (
        <div className="text-xs md:text-sm text-sky-300">Cargando...</div>
      )}

      {error && (
        <div className="text-xs md:text-sm text-rose-300 bg-rose-950/40 border border-rose-900 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {message && (
        <div className="text-xs md:text-sm text-emerald-300 bg-emerald-950/40 border border-emerald-900 rounded-lg px-3 py-2">
          {message}
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

          {anexos.length === 0 ? (
            <div className="text-xs text-slate-400">
              No tenés ANEXO 02 todavía.
            </div>
          ) : (
            <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800 overflow-hidden">
              {anexos.map((a) => {
                const active = a._id === selectedId;
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
                          {a.codigo} · {niceDate(a.createdAt)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Vivienda: {a.datos?.viviendaId ?? "—"}
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
              Seleccioná un ANEXO 02 para ver el detalle.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-slate-100">
                    {selected.codigo}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Creado: {niceDate(selected.createdAt)} · Actualizado:{" "}
                    {niceDate(selected.updatedAt)}
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
                {selected.datos?.fechaDesocupacionPrevista && (
                  <div className="text-slate-200">
                    <span className="text-slate-400">Desocupación prevista:</span>{" "}
                    {niceDate(selected.datos.fechaDesocupacionPrevista)}
                  </div>
                )}
                {selected.datos?.fechaIngresoPrevista && (
                  <div className="text-slate-200">
                    <span className="text-slate-400">Ingreso previsto:</span>{" "}
                    {niceDate(selected.datos.fechaIngresoPrevista)}
                  </div>
                )}
              </div>

              {/* Botón conformidad */}
              <div className="rounded-xl border border-amber-900 bg-amber-950/20 p-3">
                <div className="text-xs text-amber-200 font-semibold">
                  Conformidad del titular
                </div>
                <div className="mt-1 text-[11px] text-amber-200/80">
                  Si estás de acuerdo con la asignación, presioná “DAR CONFORMIDAD”.
                </div>

                <button
                  onClick={() => darConformidad(selected._id)}
                  disabled={
                    loadingOk === selected._id ||
                    selected.estado === "EN_REVISION" ||
                    selected.estado === "CERRADO"
                  }
                  className="mt-3 inline-flex items-center justify-center rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-slate-950 hover:bg-amber-500 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loadingOk === selected._id
                    ? "Registrando..."
                    : selected.estado === "EN_REVISION"
                    ? "Conformidad ya registrada"
                    : selected.estado === "CERRADO"
                    ? "Trámite cerrado"
                    : "DAR CONFORMIDAD"}
                </button>
              </div>

              {/* Historial */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
                <div className="text-[11px] font-semibold text-slate-200 mb-2">
                  Historial de estados
                </div>

                {Array.isArray(selected.historialEstados) &&
                selected.historialEstados.length > 0 ? (
                  <ul className="space-y-1 text-[11px]">
                    {selected.historialEstados
                      .slice()
                      .reverse()
                      .map((h, idx) => (
                        <li
                          key={idx}
                          className="rounded-lg border border-slate-800 bg-slate-950/30 px-2 py-1"
                        >
                          <div className="text-slate-100 font-semibold">
                            {h.estado} · {niceDate(h.fecha)}
                          </div>
                          {h.observacion && (
                            <div className="text-slate-400">{h.observacion}</div>
                          )}
                        </li>
                      ))}
                  </ul>
                ) : (
                  <div className="text-[11px] text-slate-400">
                    Sin historial disponible.
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
