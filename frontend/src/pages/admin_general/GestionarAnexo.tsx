import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { http } from "../../api/http";
import { useAuth } from "../../auth/useAuth";
import AnexoViewer from "../../components/anexos/AnexoViewer";
import Anexo11ResumenRegistro from "../../components/anexos/Anexo11ResumenRegistro";
import Anexo01Viewer from "../../components/anexos/Anexo01Viewer";

type Conformidad = {
  ok?: boolean;
  fecha?: string;
  usuario?: string;
  observacion?: string;
};

type Anexo = {
  _id: string;
  codigo: string;
  estado: string;
  estadoInstitucional?: string | null;
  createdAt?: string;
  updatedAt?: string;
  derivadoDe?: string | null;
  datos?: any;
  adjuntos?: Array<{
    nombre?: string;
    ruta?: string;
    tipo?: string;
    size?: number;
  }>;
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

function prettyId(v: unknown) {
  const s = String(v || "").trim();
  if (!s) return "—";
  if (/^[0-9a-fA-F]{24}$/.test(s)) return `…${s.slice(-6)}`;
  return s;
}

export default function GestionarAnexo() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const role = up(user?.role);
  const isAdmin = role === "ADMIN_GENERAL" || role === "ADMIN";

  const [anexo, setAnexo] = useState<Anexo | null>(null);
  const [loading, setLoading] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState("");
  const [textoAdmin, setTextoAdmin] = useState("");

  // Generación ANEXO_02 desde ANEXO_01
  const [viviendaId, setViviendaId] = useState("");
  const [viviendasElegibles, setViviendasElegibles] = useState<any[]>([]);
  const [loadingViviendas, setLoadingViviendas] = useState(false);

  // Hidratación preview ANEXO_02 desde ANEXO_01 derivado (solo lectura)
  const [anexo01Datos, setAnexo01Datos] = useState<any>(null);

  async function cargarViviendasElegiblesAsignacion() {
    setLoadingViviendas(true);
    try {
      const res = await http.get(`/viviendas/elegibles-asignacion`, {
        withCredentials: true,
      });

      const data = res?.data;
      const lista =
        (Array.isArray(data) && data) ||
        (Array.isArray(data?.viviendas) && data.viviendas) ||
        (Array.isArray(data?.items) && data.items) ||
        [];

      setViviendasElegibles(lista);
    } catch (e) {
      console.error("[ADMIN] Error cargando viviendas elegibles", e);
      setViviendasElegibles([]);
    } finally {
      setLoadingViviendas(false);
    }
  }

  async function cargar() {
    if (!id) return;
    setLoading(true);
    setError(null);
    setInfoMsg("");

    try {
      const res = await http.get(`/formularios/${id}`);
      const a = (res.data?.anexo || res.data?.formulario || null) as Anexo | null;
      setAnexo(a);

      const datosLocal = a?.datos || {};
      if (datosLocal?.observacionesAdminGeneral) {
        setTextoAdmin(datosLocal.observacionesAdminGeneral);
      } else {
        setTextoAdmin("");
      }
    } catch (e) {
      console.error("[ADMIN] Error cargando anexo", e);
      setError("No se pudo cargar el anexo. Contacte al administrador.");
      setAnexo(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const codigo = useMemo(() => up(anexo?.codigo), [anexo?.codigo]);
  const estado = useMemo(() => up(anexo?.estado), [anexo?.estado]);
  const datos = anexo?.datos || {};

  useEffect(() => {
    if (!anexo?._id) return;

    if (codigo === "ANEXO_01") {
      cargarViviendasElegiblesAsignacion();
    } else {
      setViviendasElegibles([]);
      setViviendaId("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anexo?._id, codigo]);

  useEffect(() => {
    async function cargarAnexo01Derivado() {
      try {
        setAnexo01Datos(null);

        if (codigo !== "ANEXO_02") return;
        const derivadoDe = String(anexo?.derivadoDe || "").trim();
        if (!/^[0-9a-fA-F]{24}$/.test(derivadoDe)) return;

        const res = await http.get(`/formularios/${derivadoDe}`);
        const a01 = res.data?.anexo || res.data?.formulario || null;
        const d01 = a01?.datos || null;

        setAnexo01Datos(d01);
      } catch (e) {
        console.error("[ADMIN] Error cargando ANEXO_01 derivado para preview", e);
        setAnexo01Datos(null);
      }
    }

    if (anexo?._id) cargarAnexo01Derivado();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anexo?._id, codigo]);

  if (!isAdmin) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Acceso no autorizado</h2>
        <p>Esta página es solo para ADMIN_GENERAL.</p>
      </div>
    );
  }

  if (loading) return <div style={{ padding: 24 }}>Cargando…</div>;

  if (error) {
    return (
      <div style={{ padding: 24, color: "crimson" }}>
        {error}
        <div style={{ marginTop: 12 }}>
          <button onClick={() => navigate(-1)}>Volver</button>
        </div>
      </div>
    );
  }

  if (!anexo) {
    return (
      <div style={{ padding: 24 }}>
        <p>No se encontraron datos del anexo.</p>
        <button onClick={() => navigate(-1)}>Volver</button>
      </div>
    );
  }

  const confPerm: Conformidad | null =
    (datos && datos.conformidadPermisionario) || null;
  const confPermOk = !!confPerm?.ok;

  const confInspector: Conformidad | null =
    (datos && datos.conformidadInspector) || null;
  const confInspectorOk = !!confInspector?.ok;

  const esAnexo11 = codigo === "ANEXO_11";

  const obsHistInspector: any[] = Array.isArray(datos.observacionesInspectorHistorial)
    ? datos.observacionesInspectorHistorial
    : [];

  const visitasProgramadas: any[] = Array.isArray(datos.visitasProgramadas)
    ? datos.visitasProgramadas
    : [];

  const decisionInspector: string = datos.decisionInspector || "";
  const responsableTrabajo: string = datos.responsableTrabajo || "";
  const prioridadInspector: string = datos.prioridadInspector || datos.prioridad || "";
  const trabajoFinalizadoInspector: boolean = !!datos.trabajoFinalizadoInspector;

  // ╔══════════════════════════════╗
  // ║   ¿Puede cerrar ADMIN aquí?  ║
  // ╚══════════════════════════════╝
  const esAnexoCerrableClasico = [
    "ANEXO_02",
    "ANEXO_03",
    "ANEXO_07",
    "ANEXO_08",
    "ANEXO_09",
  ].includes(codigo);

  const esEstadoCerrable =
    (codigo === "ANEXO_02" && estado === "EN_REVISION") ||
    (codigo !== "ANEXO_02" && ["EN_REVISION", "ENVIADO"].includes(estado));

  const puedeCerrarAdminClasico =
    esAnexoCerrableClasico &&
    esEstadoCerrable &&
    (codigo === "ANEXO_02" ? role === "ADMIN_GENERAL" : isAdmin);

  const puedeGestionarAdmin11 = isAdmin && esAnexo11 && esEstadoCerrable;
  const puedeGenerarAnexo02 = isAdmin && codigo === "ANEXO_01";

  // ╔══════════════════════════════╗
  // ║   Cerrar trámite (02/03/07/08/09)
  // ╚══════════════════════════════╝
  async function cerrarTramiteAdminClasico() {
    if (!anexo?._id) return;

    const rutas: Record<string, string> = {
      ANEXO_02: "conformidad-admin",
      ANEXO_03: "cerrar-admin-03",
      ANEXO_07: "cerrar-admin-07",
      ANEXO_08: "cerrar-admin-08",
      ANEXO_09: "cerrar-admin-09",
    };

    const endpoint = rutas[codigo];
    if (!endpoint) {
      setError(`No existe ruta de cierre para ${codigo}`);
      return;
    }

    setBusy(true);
    setError(null);
    setInfoMsg("");

    try {
      const payload =
        codigo === "ANEXO_02"
          ? { datos: {} }
          : {
              datos: {
                observacionesAdminGeneral: textoAdmin || "",
              },
            };

      const res = await http.post(`/formularios/${anexo._id}/${endpoint}`, payload);

      const upd = res.data?.anexo || res.data?.formulario || null;
      if (upd) {
        setAnexo(upd);
      }

      setInfoMsg("Trámite cerrado correctamente por ADMIN GENERAL.");
    } catch (e: any) {
      console.error("[ADMIN] Error cerrando trámite", e);
      setError(
        e?.response?.data?.message ||
          "No se pudo cerrar el trámite. Contacte al administrador."
      );
    } finally {
      setBusy(false);
    }
  }

  // ╔══════════════════════════════╗
  // ║   Generar ANEXO_02 (desde 01)
  // ╚══════════════════════════════╝
  async function generarAnexo02Desde01() {
    if (!anexo?._id) return;

    if (codigo !== "ANEXO_01") {
      setError("Acción no disponible para este tipo de anexo.");
      return;
    }

    const idTrim = viviendaId.trim();

    if (!idTrim) {
      setError("Debe seleccionar una vivienda.");
      return;
    }

    if (!/^[a-f\d]{24}$/i.test(idTrim)) {
      setError("Debe ingresar un ObjectId válido de vivienda.");
      return;
    }

    setBusy(true);
    setError(null);
    setInfoMsg("");

    try {
      const res = await http.post(`/formularios/${anexo._id}/generar-anexo-02`, {
        viviendaId: idTrim,
      });

      const nuevo = res.data?.anexo || null;
      if (nuevo?._id) {
        setInfoMsg("ANEXO_02 generado correctamente.");
        navigate(`/app/admin-general/gestiones/${nuevo._id}`);
        return;
      }

      setError("No se ha podido procesar su solicitud.");
    } catch (e: any) {
      if (e?.response?.status === 409) {
        const existingId = e?.response?.data?.existingId;
        if (existingId) {
          navigate(`/app/admin-general/gestiones/${existingId}`);
          return;
        }
      }

      console.error("[ADMIN] Error generando ANEXO_02", e);
      setError(
        e?.response?.data?.message || "No se ha podido procesar su solicitud."
      );
    } finally {
      setBusy(false);
    }
  }

  // ╔══════════════════════════════╗
  // ║   Devolver ANEXO_11 al inspector
  // ╚══════════════════════════════╝
  async function devolverAnexo11AlInspector() {
    if (!anexo?._id) return;

    setBusy(true);
    setError(null);
    setInfoMsg("");

    try {
      const res = await http.post(`/formularios/${anexo._id}/gestion-admin-11`, {
        accion: "DEVOLVER_A_INSPECTOR",
        observacionesAdminGeneral: textoAdmin || "",
      });

      const upd = res.data?.anexo || res.data?.formulario || null;
      if (upd) setAnexo(upd);

      setInfoMsg(
        "Trámite devuelto al inspector para revisión, con observaciones de ADMIN GENERAL."
      );
    } catch (e: any) {
      console.error("[ADMIN] Error devolviendo ANEXO_11 al inspector", e);
      setError(
        e?.response?.data?.message ||
          "No se pudo devolver el trámite al inspector. Contacte al administrador."
      );
    } finally {
      setBusy(false);
    }
  }

  // ╔══════════════════════════════╗
  // ║   Cerrar ANEXO_11 (ADMIN)    ║
  // ╚══════════════════════════════╝
  async function cerrarAnexo11Admin() {
    if (!anexo?._id) return;

    setBusy(true);
    setError(null);
    setInfoMsg("");

    try {
      const res = await http.post(`/formularios/${anexo._id}/gestion-admin-11`, {
        accion: "CERRAR",
        observacionesAdminGeneral: textoAdmin || "",
      });

      const upd = res.data?.anexo || res.data?.formulario || null;
      if (upd) setAnexo(upd);

      setInfoMsg("Trámite ANEXO_11 cerrado por ADMIN GENERAL.");
    } catch (e: any) {
      console.error("[ADMIN] Error cerrando ANEXO_11", e);
      setError(
        e?.response?.data?.message ||
          "No se pudo cerrar el trámite ANEXO_11. Contacte al administrador."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Gestión de Anexo (ADMIN GENERAL)</h2>

      {infoMsg && (
        <div
          style={{
            marginBottom: 12,
            padding: 10,
            border: "1px solid #4caf50",
            background: "#e8f5e9",
          }}
        >
          {infoMsg}
        </div>
      )}

      {error && (
        <div
          style={{
            marginBottom: 12,
            padding: 10,
            border: "1px solid #f44336",
            background: "#ffebee",
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          marginBottom: 16,
          padding: 10,
          border: "1px solid #ddd",
          borderRadius: 8,
          background: "#f7f7f7",
        }}
      >
        <div>
          <b>ID:</b> {prettyId(anexo._id)}
        </div>
        <div>
          <b>Código:</b> {anexo.codigo}
        </div>
        <div>
          <b>Estado:</b> {safe(anexo.estado)}
          {anexo.estadoInstitucional ? ` / ${anexo.estadoInstitucional}` : ""}
        </div>
        <div>
          <b>Creado:</b> {fmtDate(anexo.createdAt)}
        </div>
        <div>
          <b>Actualizado:</b> {fmtDate(anexo.updatedAt)}
        </div>

        {codigo === "ANEXO_03" && (
          <div style={{ marginTop: 6, fontSize: 13 }}>
            <b>Conformidad Permisionario (03):</b>{" "}
            {confPermOk ? `SI — ${fmtDate(confPerm?.fecha as string)}` : "NO"}
          </div>
        )}

        {codigo === "ANEXO_07" && (
          <div style={{ marginTop: 6, fontSize: 13 }}>
            <b>Revisión Inspector (07):</b>{" "}
            {confInspectorOk ? `SI — ${fmtDate(confInspector?.fecha as string)}` : "NO"}
          </div>
        )}

        {codigo === "ANEXO_08" && (
          <div style={{ marginTop: 6, fontSize: 13 }}>
            <b>Conformidad Permisionario (08):</b>{" "}
            {confPermOk ? `SI — ${fmtDate(confPerm?.fecha as string)}` : "NO"}
          </div>
        )}

        {codigo === "ANEXO_09" && (
          <div style={{ marginTop: 6, fontSize: 13 }}>
            <b>Conformidad Permisionario (09):</b>{" "}
            {confPermOk ? `SI — ${fmtDate(confPerm?.fecha as string)}` : "NO"}
          </div>
        )}
      </div>

      {codigo === "ANEXO_11" && (
        <Anexo11ResumenRegistro anexo={anexo as any} mostrarAdmin={true} />
      )}

      <div style={{ marginTop: 16 }}>
        {codigo === "ANEXO_01" ? (
          <Anexo01Viewer datos={datos} />
        ) : (
          <AnexoViewer
            codigo={anexo.codigo}
            datos={datos}
            anexo01Datos={anexo01Datos}
            vivienda={undefined}
          />
        )}
      </div>

      {esAnexo11 && (
        <div
          style={{
            marginBottom: 16,
            padding: 10,
            border: "1px solid #ddd",
            borderRadius: 8,
            background: "#fafafa",
          }}
        >
          <h3>Resumen técnico — ANEXO 11 (Pedido de Trabajo)</h3>

          <p style={{ fontSize: 13 }}>
            <b>Prioridad fijada por inspector:</b> {safe(prioridadInspector || "—")}
          </p>
          <p style={{ fontSize: 13 }}>
            <b>Responsable del trabajo:</b> {safe(responsableTrabajo || "—")}
          </p>
          <p style={{ fontSize: 13 }}>
            <b>Decisión del inspector:</b> {safe(decisionInspector || "—")}
          </p>
          <p style={{ fontSize: 13 }}>
            <b>Trabajo marcado como finalizado por inspector:</b>{" "}
            {trabajoFinalizadoInspector ? "SI" : "NO"}
          </p>

          <p style={{ fontSize: 13, marginTop: 8 }}>
            <b>Conformidad del Permisionario:</b>{" "}
            {confPermOk ? `SI — ${fmtDate(confPerm?.fecha as string)}` : "NO"}
          </p>

          <p style={{ fontSize: 13 }}>
            <b>Conformidad de Inspector (sello):</b>{" "}
            {confInspectorOk ? `SI — ${fmtDate(confInspector?.fecha as string)}` : "NO"}
          </p>

          <div
            style={{
              marginTop: 10,
              paddingTop: 8,
              borderTop: "1px dashed #ccc",
              fontSize: 13,
            }}
          >
            <b>Historial de observaciones del inspector:</b>
            {obsHistInspector.length > 0 ? (
              <ul style={{ paddingLeft: 18, marginTop: 6 }}>
                {obsHistInspector.map((o, idx) => (
                  <li key={idx} style={{ marginBottom: 4 }}>
                    <b>{fmtDate(o.fecha)}</b>: {typeof o.texto === "string" ? o.texto : ""}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ marginTop: 4 }}>No hay observaciones registradas por el inspector.</p>
            )}
          </div>

          <div
            style={{
              marginTop: 10,
              paddingTop: 8,
              borderTop: "1px dashed #ccc",
              fontSize: 13,
            }}
          >
            <b>Visitas programadas:</b>
            {visitasProgramadas.length > 0 ? (
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  marginTop: 6,
                  fontSize: 12,
                }}
              >
                <thead>
                  <tr>
                    <th
                      style={{
                        borderBottom: "1px solid #ccc",
                        textAlign: "left",
                        padding: 4,
                      }}
                    >
                      Fecha programada
                    </th>
                    <th
                      style={{
                        borderBottom: "1px solid #ccc",
                        textAlign: "left",
                        padding: 4,
                      }}
                    >
                      Observación
                    </th>
                    <th
                      style={{
                        borderBottom: "1px solid #ccc",
                        textAlign: "left",
                        padding: 4,
                      }}
                    >
                      Registrada
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visitasProgramadas.map((v, idx) => (
                    <tr key={idx}>
                      <td style={{ borderBottom: "1px solid #eee", padding: 4 }}>
                        {fmtDate(v.fechaProgramada)}
                      </td>
                      <td style={{ borderBottom: "1px solid #eee", padding: 4 }}>
                        {safe(v.observacion)}
                      </td>
                      <td style={{ borderBottom: "1px solid #eee", padding: 4 }}>
                        {fmtDate(v.creadoAt || v.fechaRegistro)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p style={{ marginTop: 4 }}>No hay visitas registradas.</p>
            )}
          </div>
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <button onClick={() => navigate(-1)} disabled={busy}>
          Volver
        </button>

        <a
          href={`http://localhost:3000/api/formularios/${anexo._id}/pdf`}
          target="_blank"
          rel="noreferrer"
        >
          PDF
        </a>

        <button onClick={cargar} disabled={busy}>
          Recargar
        </button>
      </div>

      {(puedeCerrarAdminClasico || puedeGestionarAdmin11 || puedeGenerarAnexo02) && (
        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: 12,
            marginBottom: 18,
            background: "#fafafa",
          }}
        >
          <h3>Intervención ADMIN GENERAL</h3>

          <p style={{ fontSize: 13, marginBottom: 6 }}>
            Puede registrar observaciones institucionales y gestionar el cierre o devolución del trámite.
          </p>

          <textarea
            rows={4}
            style={{
              width: "100%",
              resize: "vertical",
              padding: 6,
              borderRadius: 6,
              border: "1px solid #ccc",
              marginBottom: 8,
            }}
            value={textoAdmin}
            onChange={(e) => setTextoAdmin(e.target.value)}
            placeholder="Observaciones institucionales (opcional)…"
            disabled={busy}
          />

          {codigo === "ANEXO_01" && (
            <div
              style={{
                marginBottom: 16,
                padding: 12,
                border: "1px solid #ddd",
                borderRadius: 8,
                background: "#fafafa",
              }}
            >
              <h4 style={{ marginTop: 0 }}>Generación institucional</h4>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <select
                  value={viviendaId}
                  onChange={(e) => setViviendaId(e.target.value)}
                  disabled={busy || loadingViviendas}
                  style={{ width: 320 }}
                >
                  <option value="">
                    {loadingViviendas ? "Cargando viviendas…" : "Seleccionar vivienda…"}
                  </option>

                  <optgroup label="DISPONIBLE">
                    {Array.isArray(viviendasElegibles) &&
                      viviendasElegibles
                        .filter((v: any) => up(v?.estado) === "DISPONIBLE")
                        .map((v: any) => (
                          <option key={String(v?._id)} value={String(v?._id)}>
                            {safe(v?.codigo || v?.nombre || v?.direccion || prettyId(v?._id))}
                          </option>
                        ))}
                  </optgroup>

                  <optgroup label="A_DESOCUPARSE">
                    {Array.isArray(viviendasElegibles) &&
                      viviendasElegibles
                        .filter((v: any) => up(v?.estado) === "A_DESOCUPARSE")
                        .map((v: any) => (
                          <option key={String(v?._id)} value={String(v?._id)}>
                            {safe(v?.codigo || v?.nombre || v?.direccion || prettyId(v?._id))}
                          </option>
                        ))}
                  </optgroup>
                </select>

                <button
                  type="button"
                  onClick={generarAnexo02Desde01}
                  disabled={busy}
                  style={{ fontWeight: 700 }}
                >
                  Generar ANEXO_02
                </button>
              </div>

              <div style={{ marginTop: 6, fontSize: 12, color: "#666" }}>
                Se asigna la vivienda en este paso. Si ya existe un ANEXO_02 derivado, se abrirá automáticamente.
              </div>
            </div>
          )}

          {esAnexo11 ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={devolverAnexo11AlInspector} disabled={busy}>
                Devolver al inspector (ANEXO 11)
              </button>
              <button
                onClick={cerrarAnexo11Admin}
                disabled={busy}
                style={{ fontWeight: 700 }}
              >
                Cerrar trámite ANEXO 11 (ADMIN GENERAL)
              </button>
            </div>
          ) : (
            <button
              onClick={cerrarTramiteAdminClasico}
              disabled={busy}
              style={{ fontWeight: 700 }}
            >
              Cerrar trámite (ADMIN GENERAL)
            </button>
          )}
        </div>
      )}
    </div>
  );
}