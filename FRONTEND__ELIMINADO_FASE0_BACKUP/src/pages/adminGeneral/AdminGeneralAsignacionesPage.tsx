import { useEffect, useMemo, useState } from "react";
import {
  crearAnexo02,
  cerrarTramiteAnexo02,
  getAnexosPorCodigo,
  getViviendasDisponibles,
  type Anexo,
  type Vivienda,
} from "../../api/formularios";

function labelPostulacion(a: Anexo) {
  const u: any = a.usuario;
  const nombre =
    (u?.apellido || u?.nombre)
      ? `${u?.apellido || ""} ${u?.nombre || ""}`.trim()
      : "POSTULANTE";
  const fecha = a.createdAt ? new Date(a.createdAt).toLocaleDateString() : "";
  return `${nombre} (${fecha})`;
}

function labelVivienda(v: Vivienda) {
  const casaDepto = v.numero || (v as any).meta?.casaDepto || (v as any).meta?.casa_depto || "";
  const direccion = (v as any).meta?.direccion || (v as any).meta?.DIRECCION || "";
  const loc = (v as any).meta?.localidad || (v as any).meta?.LOCALIDAD || "";
  const barrio = v.barrio || (v as any).meta?.barrio || (v as any).meta?.BARRIO || "";
  const extra = [direccion, casaDepto, barrio, loc].filter(Boolean).join(" · ");
  return `${v.codigo}${extra ? " — " + extra : ""}`;
}

export default function AdminGeneralAsignacionesPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [postulaciones, setPostulaciones] = useState<Anexo[]>([]);
  const [viviendas, setViviendas] = useState<Vivienda[]>([]);
  const [asignaciones, setAsignaciones] = useState<Anexo[]>([]);

  const [anexo01Id, setAnexo01Id] = useState("");
  const [viviendaId, setViviendaId] = useState("");
  const [fechaDesocupacionPrevista, setFechaDesocupacionPrevista] = useState<string>("");
  const [observaciones, setObservaciones] = useState("");

  const [obsCierre, setObsCierre] = useState<Record<string, string>>({});

  async function cargarTodo() {
    try {
      setLoading(true);
      setError(null);
      setOk(null);

      const [a1, viv, a2] = await Promise.all([
        getAnexosPorCodigo("ANEXO_01"),
        getViviendasDisponibles(),
        getAnexosPorCodigo("ANEXO_02"),
      ]);

      setPostulaciones(a1 || []);
      setViviendas(viv || []);
      setAsignaciones(a2 || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Error cargando datos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargarTodo();
  }, []);

  const viviendasOrdenadas = useMemo(() => {
    return [...viviendas].sort((a, b) => (a.codigo || "").localeCompare(b.codigo || ""));
  }, [viviendas]);

  async function crear() {
    try {
      setError(null);
      setOk(null);

      if (!anexo01Id) return setError("Debe seleccionar una postulación (ANEXO 01).");
      if (!viviendaId) return setError("Debe seleccionar una vivienda disponible.");

      const a1 = postulaciones.find((p) => p._id === anexo01Id) as any;
      const postulanteId = typeof a1?.usuario === "string" ? a1.usuario : a1?.usuario?._id;

      if (!postulanteId) return setError("No se pudo determinar el postulante del ANEXO 01 seleccionado.");

      setLoading(true);

      await crearAnexo02({
        anexo01Id,
        postulanteId,
        viviendaId,
        fechaDesocupacionPrevista: fechaDesocupacionPrevista || null,
        observaciones,
      });

      setOk("ANEXO_02 creado.");
      setAnexo01Id("");
      setViviendaId("");
      setFechaDesocupacionPrevista("");
      setObservaciones("");

      await cargarTodo();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Error creando ANEXO_02.");
    } finally {
      setLoading(false);
    }
  }

  async function cerrar(a2: Anexo) {
    try {
      setError(null);
      setOk(null);
      setLoading(true);

      await cerrarTramiteAnexo02(a2._id, obsCierre[a2._id] || "");

      setOk("Trámite cerrado (ANEXO_02).");
      await cargarTodo();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Error cerrando trámite.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <header className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
        <h1 className="text-lg font-bold text-slate-100">ASIGNAR VIVIENDA (ANEXO 02)</h1>
        <div className="mt-3 flex gap-2">
          <button
            onClick={cargarTodo}
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

      <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-slate-300">Postulación (ANEXO 01) *</label>
            <select
              value={anexo01Id}
              onChange={(e) => setAnexo01Id(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-2 py-2 text-xs text-slate-100"
            >
              <option value="">-- seleccionar --</option>
              {postulaciones.map((a) => (
                <option key={a._id} value={a._id}>
                  {labelPostulacion(a)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-300">Vivienda disponible *</label>
            <select
              value={viviendaId}
              onChange={(e) => setViviendaId(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-2 py-2 text-xs text-slate-100"
            >
              <option value="">-- seleccionar --</option>
              {viviendasOrdenadas.map((v) => (
                <option key={v._id} value={v._id}>
                  {labelVivienda(v)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-slate-300">Fecha desocupación prevista (opcional)</label>
            <input
              type="date"
              value={fechaDesocupacionPrevista}
              onChange={(e) => setFechaDesocupacionPrevista(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-2 py-2 text-xs text-slate-100"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-300">Observaciones (opcional)</label>
            <input
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950/60 px-2 py-2 text-xs text-slate-100"
            />
          </div>
        </div>

        <button
          onClick={crear}
          disabled={loading}
          className="w-full rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-60 px-4 py-3 text-sm font-bold text-white"
        >
          {loading ? "CREANDO..." : "CREAR ANEXO 02"}
        </button>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
        <h2 className="text-sm font-semibold text-slate-100">Asignaciones (ANEXO 02)</h2>

        <div className="mt-3 space-y-2">
          {asignaciones.length === 0 ? (
            <div className="text-xs text-slate-400">No hay ANEXO_02 registrados.</div>
          ) : (
            asignaciones.map((a: any) => {
              const conforme = !!a?.datos?.conformidadPostulante?.ok;
              const puedeCerrar = conforme && a.estado === "EN_REVISION";

              return (
                <div key={a._id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-xs text-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold">ANEXO 02</div>
                    <div className="text-[10px] text-slate-400">
                      {a.createdAt ? new Date(a.createdAt).toLocaleString() : ""}
                    </div>
                  </div>

                  <div className="mt-1 text-[11px] text-slate-400">
                    Estado: <span className="text-slate-200">{a.estado}</span>{" · "}
                    Postulante:{" "}
                    <span className={conforme ? "text-emerald-200" : "text-amber-200"}>
                      {conforme ? "CONFORME" : "PENDIENTE"}
                    </span>
                  </div>

                  <div className="mt-2 text-[11px] text-slate-300">
                    anexo01Id: {a.datos?.anexo01Id || "-"} · viviendaId: {a.datos?.viviendaId || "-"} · postulanteId:{" "}
                    {a.datos?.postulanteId || "-"}
                  </div>

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                    <input
                      value={obsCierre[a._id] || ""}
                      onChange={(e) => setObsCierre((prev) => ({ ...prev, [a._id]: e.target.value }))}
                      placeholder="Observación cierre (opcional)"
                      className="md:col-span-2 w-full rounded-lg border border-slate-700 bg-slate-950/60 px-2 py-2 text-xs text-slate-100"
                    />

                    <button
                      onClick={() => cerrar(a)}
                      disabled={loading || !puedeCerrar}
                      className="rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 px-3 py-2 text-xs font-bold text-white"
                    >
                      CERRAR TRÁMITE
                    </button>
                  </div>

                  {!puedeCerrar && (
                    <div className="mt-2 text-[11px] text-slate-500">
                      Para cerrar: postulante debe estar CONFORME y estado debe ser EN_REVISION.
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
