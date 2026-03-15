// frontend/src/pages/permisionario/inspector/GestionarAnexoInspector.tsx

// frontend/src/pages/permisionario/inspector/GestionesInspector.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "../../../api/http";
import { useAuth } from "../../../auth/useAuth";

type AnexoInspector = {
  _id: string;
  codigo: string;
  estado: string;
  createdAt?: string;
  datos?: any;
};

function up(v: unknown) {
  return String(v || "").toUpperCase().trim();
}

function fmtDate(v?: string) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function safe(v: unknown) {
  return v === null || v === undefined || v === "" ? "—" : String(v);
}

// Mostrar vivienda/unidad de forma amable
function viviendaLabel(a: AnexoInspector): string {
  const d = a.datos || {};

  // 1️⃣ Prioridad: código hidratado desde backend (si existiera)
  const anyA: any = a as any;
  if (typeof anyA.viviendaCodigo === "string" && anyA.viviendaCodigo.trim()) {
    return anyA.viviendaCodigo.trim();
  }

  if (typeof d.viviendaCodigo === "string" && d.viviendaCodigo.trim()) {
    return d.viviendaCodigo.trim();
  }

  // 2️⃣ Compatibilidad histórica
  const unidad =
    typeof d.unidadHabitacional === "string" ? d.unidadHabitacional.trim() : "";

  const casa = typeof d.casa === "string" ? d.casa.trim() : "";

  const label =
    typeof d.viviendaLabel === "string" ? d.viviendaLabel.trim() : "";

  const vid = typeof d.viviendaId === "string" ? d.viviendaId : "";

  if (unidad) return unidad;
  if (casa) return casa;
  if (label) return label;

  // 3️⃣ Si es ObjectId, no lo mostramos
  const pareceObjectId =
    typeof vid === "string" && /^[a-fA-F0-9]{24}$/.test(vid);

  if (vid && !pareceObjectId) return vid;

  return "—";
}

function permisionarioLabel(a: AnexoInspector): string {
  const d = a.datos || {};

  // 1) Si viene en datos (casos ANEXO_11 y algunos legacy)
  const posibles = [d.apellidoNombres, d.permisionarioNombre, d.postulanteNombre];
  for (const v of posibles) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }

  // 2) Si viene usuario populado (caso endpoint /anexo/ANEXO_02)
  const u: any = (a as any).usuario;
  if (u && typeof u === "object") {
    const ap = typeof u.apellido === "string" ? u.apellido.trim() : "";
    const nom = typeof u.nombre === "string" ? u.nombre.trim() : "";
    const apnom = `${ap} ${nom}`.trim();
    if (apnom) return apnom;
    if (typeof u.email === "string" && u.email.trim()) return u.email.trim();
  }

  return "—";
}

function isTerminalFor09(estado: unknown): boolean {
  // ANEXO_09 dice “derivado de ANEXO_08 cerrado”.
  // Check conservador: si está explícitamente CERRADO/FINALIZADO/APROBADO.
  const e = up(estado);
  return e === "CERRADO" || e === "FINALIZADO" || e === "APROBADO";
}

export default function GestionesInspector() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState<AnexoInspector[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [workingId, setWorkingId] = useState<string | null>(null);

  const [codigoFiltro, setCodigoFiltro] = useState<
    | "TODOS"
    | "ANEXO_02"
    | "ANEXO_03"
    | "ANEXO_07"
    | "ANEXO_08"
    | "ANEXO_09"
    | "ANEXO_11"
  >("TODOS");

  const inspectorNombre = `${safe(user?.apellido)} ${safe(user?.nombre)}`.replace(
    /^—\s*—$/,
    ""
  );

  const barrioAsignado = safe((user as any)?.barrioAsignado);

  async function cargar() {
    setLoading(true);
    setError(null);

    try {
      const [res02, res03, res07, res08, res09, res11] = await Promise.all([
        http.get("/formularios/anexo/ANEXO_02"),
        http.get("/formularios/mios", { params: { codigo: "ANEXO_03" } }),
        http.get("/formularios/mios", { params: { codigo: "ANEXO_07" } }),
        http.get("/formularios/mios", { params: { codigo: "ANEXO_08" } }),
        http.get("/formularios/mios", { params: { codigo: "ANEXO_09" } }),
        http.get("/formularios/mios", { params: { codigo: "ANEXO_11" } }),
      ]);

      const list02 = Array.isArray(res02.data?.anexos)
        ? (res02.data.anexos as AnexoInspector[])
        : [];
      const list03 = Array.isArray(res03.data?.anexos)
        ? (res03.data.anexos as AnexoInspector[])
        : [];
      const list07 = Array.isArray(res07.data?.anexos)
        ? (res07.data.anexos as AnexoInspector[])
        : [];
      const list08 = Array.isArray(res08.data?.anexos)
        ? (res08.data.anexos as AnexoInspector[])
        : [];
      const list09 = Array.isArray(res09.data?.anexos)
        ? (res09.data.anexos as AnexoInspector[])
        : [];
      const list11 = Array.isArray(res11.data?.anexos)
        ? (res11.data.anexos as AnexoInspector[])
        : [];

      const mergedMap = new Map<string, AnexoInspector>();
      [...list02, ...list03, ...list07, ...list08, ...list09, ...list11].forEach(
        (a) => mergedMap.set(a._id, a)
      );

      const merged = Array.from(mergedMap.values()).sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tb - ta;
      });

            setItems(merged);
    } catch (e) {
      console.error("[Inspector] Error cargando gestiones", e);
      setError(
        "La página solicitada no está disponible. Por favor, contacte al administrador."
      );
      setItems([]);
    } finally {
      setLoading(false);
      setWorkingId(null);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Crear ANEXO_03 desde ANEXO_02 (derivación institucional)
  async function iniciarAnexo03Desde02(anexo02: any) {
    const anexo02Id = anexo02?._id;
    const viviendaId = anexo02?.datos?.viviendaId;

    setWorkingId(anexo02Id || null);
    setError(null);

    try {
      // Fail-closed: no enviar POST si falta viviendaId válido
      if (
        !anexo02Id ||
        typeof viviendaId !== "string" ||
        !/^[a-fA-F0-9]{24}$/.test(viviendaId)
      ) {
        setError(
          "La página solicitada no está disponible. Por favor, contacte al administrador."
        );
        return;
      }

      const res = await http.post(`/formularios/ANEXO_03`, {
        datos: {
          derivadoDe: anexo02Id,
          viviendaId: viviendaId,
        },
      });

      const nuevoId =
        res?.data?.anexo?._id || res?.data?.formulario?._id || res?.data?._id || null;

      if (!nuevoId) {
        setError(
          "La página solicitada no está disponible. Por favor, contacte al administrador."
        );
        return;
      }

      navigate(`/app/permisionario/mi-barrio-inspector/gestiones/${nuevoId}`);
    } catch (e) {
      console.error("[Inspector] Error iniciando ANEXO_03", e);
      setError(
        "La página solicitada no está disponible. Por favor, contacte al administrador."
      );
    } finally {
      setWorkingId(null);
    }
  }

  // Crear ANEXO_08 desde ANEXO_03 (ruta especial en backend)
  async function iniciarAnexo08Desde03(anexo03Id: string) {
    setWorkingId(anexo03Id);
    setError(null);

    try {
      const res = await http.post(`/formularios/${anexo03Id}/anexo-08`, {});

      const nuevoId =
        res?.data?.anexo?._id || res?.data?.formulario?._id || res?.data?._id || null;

      if (!nuevoId) {
        setError(
          "La página solicitada no está disponible. Por favor, contacte al administrador."
        );
        return;
      }

      navigate(`/app/permisionario/anexos/${nuevoId}`);
    } catch (e) {
      console.error("[Inspector] Error iniciando ANEXO_08", e);
      setError(
        "La página solicitada no está disponible. Por favor, contacte al administrador."
      );
    } finally {
      setWorkingId(null);
    }
  }

  // Crear ANEXO_09 desde ANEXO_08 (ruta especial en backend)
  async function iniciarAnexo09Desde08(anexo08Id: string) {
    setWorkingId(anexo08Id);
    setError(null);

    try {
      const res = await http.post(`/formularios/${anexo08Id}/anexo-09`, {});

      const nuevoId =
        res?.data?.anexo?._id || res?.data?.formulario?._id || res?.data?._id || null;

      if (!nuevoId) {
        setError(
          "La página solicitada no está disponible. Por favor, contacte al administrador."
        );
        return;
      }

      navigate(`/app/permisionario/mi-barrio-inspector/gestiones/${nuevoId}`);
    } catch (e) {
      console.error("[Inspector] Error iniciando ANEXO_09", e);
      setError(
        "La página solicitada no está disponible. Por favor, contacte al administrador."
      );
    } finally {
      setWorkingId(null);
    }
  }

  // Aplicamos filtro por código
  const visibles =
    codigoFiltro === "TODOS"
      ? items
      : items.filter((a) => up(a.codigo) === codigoFiltro);

  if (loading) return <div style={{ padding: 24 }}>Cargando…</div>;

  return (
    <div style={{ padding: 24 }}>
      <h2>Gestiones — Inspector</h2>

      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: 12,
          marginBottom: 16,
          background: "#f7f7f7",
          fontSize: 14,
        }}
      >
        <div>
          <b>Inspector:</b> {inspectorNombre || "— —"}
        </div>
        <div>
          <b>Barrio asignado:</b> {barrioAsignado}
        </div>
        <p style={{ marginTop: 8 }}>
          Aquí verá las gestiones en las que interviene como inspector del barrio:
          <br />— <b>ANEXO_02</b>: actas de asignación desde las que puede generar el
          ANEXO_03.
          <br />— <b>ANEXO_03</b>: actas de recepción en las que intervino como inspector.
          <br />— <b>ANEXO_07</b>: ampliación de novedades posteriores al ANEXO_03.
          <br />— <b>ANEXO_08</b>: actas de inspección previa antes de la entrega de la
          vivienda.
          <br />— <b>ANEXO_09</b>: actas de entrega derivadas de ANEXO_08 cerrado.
          <br />— <b>ANEXO_11</b>: pedidos de trabajo sobre vivienda fiscal.
        </p>
      </div>

      {error ? <div style={{ marginBottom: 12, color: "crimson" }}>{error}</div> : null}

      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <button onClick={cargar} disabled={!!workingId}>
          Recargar
        </button>

        <button
          onClick={() => navigate("/app/permisionario/mi-barrio-inspector")}
          disabled={!!workingId}
        >
          Volver a: Mi Barrio (Inspector)
        </button>

        <div style={{ marginLeft: "auto" }}>
          <label style={{ fontSize: 13, marginRight: 4 }}>Filtrar por código:</label>
          <select
            value={codigoFiltro}
            onChange={(e) =>
              setCodigoFiltro(
                e.target.value as
                  | "TODOS"
                  | "ANEXO_02"
                  | "ANEXO_03"
                  | "ANEXO_07"
                  | "ANEXO_08"
                  | "ANEXO_09"
                  | "ANEXO_11"
              )
            }
          >
            <option value="TODOS">Todos</option>
            <option value="ANEXO_02">ANEXO_02</option>
            <option value="ANEXO_03">ANEXO_03</option>
            <option value="ANEXO_07">ANEXO_07</option>
            <option value="ANEXO_08">ANEXO_08</option>
            <option value="ANEXO_09">ANEXO_09</option>
            <option value="ANEXO_11">ANEXO_11</option>
          </select>
        </div>
      </div>

      {visibles.length === 0 ? (
        <p>No se encontraron gestiones para su usuario/barrio.</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ borderBottom: "1px solid #ccc", textAlign: "left", padding: 4 }}>
                Código
              </th>
              <th style={{ borderBottom: "1px solid #ccc", textAlign: "left", padding: 4 }}>
                Estado
              </th>
              <th style={{ borderBottom: "1px solid #ccc", textAlign: "left", padding: 4 }}>
                Vivienda / Unidad
              </th>
              <th style={{ borderBottom: "1px solid #ccc", textAlign: "left", padding: 4 }}>
                Permisionario / Postulante
              </th>
              <th style={{ borderBottom: "1px solid #ccc", textAlign: "left", padding: 4 }}>
                Creado
              </th>
              <th style={{ borderBottom: "1px solid #ccc", padding: 4 }}>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {visibles.map((a) => {
              const cod = up(a.codigo);
              const est = up(a.estado);
              const isBusy = workingId === a._id;

                            const handleGestionar = () => {
                if (cod === "ANEXO_02" || cod === "ANEXO_11") {
                  navigate(`/app/permisionario/mi-barrio-inspector/gestiones/${a._id}`);
                } else {
                  navigate(`/app/permisionario/anexos/${a._id}`);
                }
              };

              return (
                <tr key={a._id}>
                  <td style={{ borderBottom: "1px solid #eee", padding: 4 }}>{safe(a.codigo)}</td>
                  <td style={{ borderBottom: "1px solid #eee", padding: 4 }}>{safe(a.estado)}</td>
                  <td style={{ borderBottom: "1px solid #eee", padding: 4 }}>{viviendaLabel(a)}</td>
                  <td style={{ borderBottom: "1px solid #eee", padding: 4 }}>
                    {permisionarioLabel(a)}
                  </td>
                  <td style={{ borderBottom: "1px solid #eee", padding: 4 }}>{fmtDate(a.createdAt)}</td>

                  <td style={{ borderBottom: "1px solid #eee", padding: 4, whiteSpace: "nowrap" }}>
                    <button onClick={handleGestionar} disabled={!!workingId}>
                      Gestionar
                    </button>

                    {cod === "ANEXO_02" ? (
                      <>
                        {" "}
                        <button
                          onClick={() => iniciarAnexo03Desde02(a)}
                          disabled={!!workingId}
                          title="Generar ANEXO_03 derivado de este ANEXO_02"
                        >
                          {isBusy ? "Iniciando…" : "Iniciar ANEXO_03"}
                        </button>
                      </>
                    ) : null}

                    {cod === "ANEXO_03" ? (
                      <>
                        {" "}
                        <button
                          onClick={() => iniciarAnexo08Desde03(a._id)}
                          disabled={!!workingId}
                          title="Generar ANEXO_08 derivado de este ANEXO_03"
                        >
                          {isBusy ? "Iniciando…" : "Iniciar ANEXO_08"}
                        </button>
                      </>
                    ) : null}

                    {cod === "ANEXO_08" ? (
                      <>
                        {" "}
                        <button
                          onClick={() => iniciarAnexo09Desde08(a._id)}
                          disabled={!!workingId || !isTerminalFor09(est)}
                          title={
                            isTerminalFor09(est)
                              ? "Generar ANEXO_09 derivado de este ANEXO_08"
                              : "Disponible cuando el ANEXO_08 esté cerrado/finalizado"
                          }
                        >
                          {isBusy ? "Iniciando…" : "Iniciar ANEXO_09"}
                        </button>
                      </>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}