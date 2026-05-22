import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { http } from "../../api/http";
import { useAuth } from "../../auth/useAuth";
import Anexo23InspectorForm from "../../components/alojamientos/Anexo23InspectorForm";
import {
  badgeStyle,
  cardStyle,
  metaStyle,
  sectionTitleStyle,
  softCardStyle,
  subtitleStyle,
  titleStyle,
} from "../permisionario/uiStyles";

type UsuarioRef =
  | string
  | {
      _id?: string;
      id?: string;
      nombre?: string;
      apellido?: string;
      email?: string;
    }
  | null;

type AlojamientoDocumento = {
  _id: string;
  codigo?: string;
  estado?: string;
  estadoInstitucional?: string | null;
  createdAt?: string;
  updatedAt?: string;
  datos?: Record<string, any>;
  solicitante?: UsuarioRef;
  alojado?: UsuarioRef;
  usuario?: {
    nombre?: string;
    apellido?: string;
    email?: string;
  };
  conformidades?: Array<Record<string, any>>;
  signers?: Array<Record<string, any>>;
  historialEstados?: Array<Record<string, any>>;
  intervenciones?: Array<Record<string, any>>;
  derivadoDe?: string | Record<string, any> | null;
};

function safe(value: unknown, fallback = "-") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function fmtDate(value: unknown) {
  if (!value) return "-";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("es-AR");
}

function up(value: unknown) {
  return String(value || "").trim().toUpperCase();
}

function idValue(value: unknown) {
  if (!value) return "";
  if (typeof value === "object") {
    const obj = value as { _id?: unknown; id?: unknown };
    return String(obj._id || obj.id || "").trim();
  }
  return String(value).trim();
}

function personaFromRef(value: UsuarioRef) {
  if (!value || typeof value === "string") return "";
  const nombre = [value.apellido, value.nombre].filter(Boolean).join(" ").trim();
  return nombre || String(value.email || "").trim();
}

function personaLabel(doc: AlojamientoDocumento | null) {
  const datos = doc?.datos || {};
  const datosLabel =
    safe(datos.huesped?.postulanteNombre, "") ||
    safe(datos.huesped?.nombreCompleto, "") ||
    safe(datos.huesped?.nombre, "") ||
    safe(datos.apellidoNombre, "") ||
    safe(datos.nombreCompleto, "") ||
    safe(datos.postulanteNombre, "") ||
    safe(datos.titularNombre, "");
  if (datosLabel) return datosLabel;

  const usuarioLabel = [doc?.usuario?.apellido, doc?.usuario?.nombre].filter(Boolean).join(" ").trim();
  if (usuarioLabel) return usuarioLabel;

  return personaFromRef(doc?.solicitante || null) || personaFromRef(doc?.alojado || null) || "Sin identificar";
}

function alojamientoLabel(doc: AlojamientoDocumento | null) {
  const datos = doc?.datos || {};
  const partes = [
    datos.alojamientoLabel,
    datos.alojamientoCodigo,
    datos.alojamiento?.codigo,
    datos.alojamientoSnapshot?.alojamientoCodigo,
    datos.lugar || datos.alojamientoLugar,
    datos.alojamientoSnapshot?.lugar,
    datos.plazaNumero ? `Plaza ${datos.plazaNumero}` : "",
    datos.plazaSnapshot?.numeroPlaza ? `Plaza ${datos.plazaSnapshot.numeroPlaza}` : "",
  ]
    .map((item) => safe(item, ""))
    .filter(Boolean);

  return partes.length ? partes.join(" / ") : "Sin alojamiento visible";
}

function derivadoDeLabel(doc: AlojamientoDocumento | null) {
  const value = doc?.derivadoDe;
  if (!value) return "-";
  if (typeof value === "string") return "Documento origen no disponible";

  const codigo = safe(value.codigo, "");
  const estado = safe(value.estado, "");
  const fecha = fmtDate(value.updatedAt || value.createdAt);
  const partes = [codigo, estado, fecha !== "-" ? fecha : ""].filter(Boolean);
  return partes.length ? partes.join(" / ") : "Documento origen no disponible";
}

function boolLabel(value: unknown) {
  if (value === true) return "SI";
  if (value === false) return "NO";
  return safe(value);
}

function descargarBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))",
  gap: 10,
};

const fieldStyle: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(15,23,42,0.42)",
  borderRadius: 10,
  padding: 10,
  minWidth: 0,
};

const labelStyle: CSSProperties = {
  display: "block",
  color: "rgba(255,255,255,0.62)",
  fontSize: 12,
  fontWeight: 800,
  textTransform: "uppercase",
};

const valueStyle: CSSProperties = {
  display: "block",
  marginTop: 4,
  color: "#ffffff",
  wordBreak: "break-word",
};

const thStyle: CSSProperties = {
  padding: "10px 8px",
  textAlign: "left",
  fontSize: 12,
  color: "rgba(255,255,255,0.64)",
  borderBottom: "1px solid rgba(255,255,255,0.14)",
  whiteSpace: "nowrap",
};

const tdStyle: CSSProperties = {
  padding: "10px 8px",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  color: "rgba(255,255,255,0.88)",
  fontSize: 13,
  verticalAlign: "top",
};

function Field({ label, value }: { label: string; value: unknown }) {
  return (
    <div style={fieldStyle}>
      <span style={labelStyle}>{label}</span>
      <span style={valueStyle}>{safe(value)}</span>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ ...softCardStyle, marginTop: 16 }}>
      <h3 style={sectionTitleStyle}>{title}</h3>
      {children}
    </section>
  );
}

function SimpleTable({
  empty,
  headers,
  rows,
}: {
  empty: string;
  headers: string[];
  rows: Array<Array<unknown>>;
}) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header} style={thStyle}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td style={tdStyle} colSpan={headers.length}>{empty}</td>
            </tr>
          )}
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((value, cellIndex) => (
                <td key={cellIndex} style={tdStyle}>{safe(value)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AlojamientoDocumentoDetalleInspector() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const basePath = "/app/permisionario/alojamientos-inspector";
  const [documento, setDocumento] = useState<AlojamientoDocumento | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [accionMsg, setAccionMsg] = useState("");
  const [anexo23ExistenteId, setAnexo23ExistenteId] = useState("");
  const [anexo24ExistenteId, setAnexo24ExistenteId] = useState("");
  const [anexo23Verificado, setAnexo23Verificado] = useState(false);
  const [verificandoAnexo23, setVerificandoAnexo23] = useState(false);
  const [generandoAnexo23, setGenerandoAnexo23] = useState(false);
  const [descargandoPdf, setDescargandoPdf] = useState(false);
  const [revisandoAnexo24, setRevisandoAnexo24] = useState(false);
  const [observacionesInspector, setObservacionesInspector] = useState("");

  const datos = documento?.datos || {};
  const conformidades = useMemo(
    () => (Array.isArray(documento?.conformidades) ? documento?.conformidades || [] : []),
    [documento]
  );
  const signers = useMemo(
    () => (Array.isArray(documento?.signers) ? documento?.signers || [] : []),
    [documento]
  );
  const historialEstados = useMemo(
    () => (Array.isArray(documento?.historialEstados) ? documento?.historialEstados || [] : []),
    [documento]
  );
  const intervenciones = useMemo(
    () => (Array.isArray(documento?.intervenciones) ? documento?.intervenciones || [] : []),
    [documento]
  );
  const esAnexo22Cerrado = up(documento?.codigo) === "ANEXO_22" && up(documento?.estado) === "CERRADO";
  const esAnexo23 = up(documento?.codigo) === "ANEXO_23";
  const esAnexo24 = up(documento?.codigo) === "ANEXO_24";
  const puedeRevisarAnexo24 =
    esAnexo24 && up(documento?.estado) === "ENVIADO" && up(user?.role) === "INSPECTOR_ALOJAMIENTOS";
  const puedeGenerarAnexo23 =
    esAnexo22Cerrado && anexo23Verificado && !verificandoAnexo23 && !anexo23ExistenteId;

  async function verificarAnexo23Existente(doc: AlojamientoDocumento | null) {
    setAnexo23ExistenteId("");
    setAnexo24ExistenteId("");
    setAnexo23Verificado(false);
    if (!doc) return;
    if (up(doc.codigo) !== "ANEXO_22" && up(doc.codigo) !== "ANEXO_23") return;
    if (up(doc.estado) !== "CERRADO") return;

    setVerificandoAnexo23(true);
    try {
      const codigoDerivado = up(doc.codigo) === "ANEXO_22" ? "ANEXO_23" : "ANEXO_24";
      const res = await http.get("/alojamientos-documentos", { params: { codigo: codigoDerivado, limit: 100 } });
      const documentos = Array.isArray(res.data?.documentos) ? res.data.documentos : [];
      const derivado = documentos.find(
        (item: Record<string, any>) => idValue(item.derivadoDe) === doc._id
      );
      if (codigoDerivado === "ANEXO_23") {
        setAnexo23ExistenteId(idValue(derivado?._id));
      } else {
        setAnexo24ExistenteId(idValue(derivado?._id));
      }
      setAnexo23Verificado(true);
    } catch {
      setAccionMsg("No fue posible verificar si ya existe un anexo derivado.");
    } finally {
      setVerificandoAnexo23(false);
    }
  }

  async function cargar() {
    if (!id) return;
    setLoading(true);
    setErrorMsg("");
    setAccionMsg("");

    try {
      const res = await http.get(`/alojamientos-documentos/${id}`);
      const doc = res.data?.documento || null;
      setDocumento(doc);
      setObservacionesInspector(String(doc?.datos?.observacionesInspector || ""));
      await verificarAnexo23Existente(doc);
    } catch {
      setDocumento(null);
      setErrorMsg("No es posible acceder al documento solicitado.");
    } finally {
      setLoading(false);
    }
  }

  async function generarAnexo23() {
    if (!documento?._id || !puedeGenerarAnexo23) return;
    const ok = window.confirm("Se generara un ANEXO_23 readonly inicial desde este ANEXO_22 cerrado. ¿Continuar?");
    if (!ok) return;

    setGenerandoAnexo23(true);
    setAccionMsg("");
    try {
      const res = await http.post(`/alojamientos-documentos/${documento._id}/generar-anexo-23`);
      const nuevoId = idValue(res.data?.documento?._id);
      if (!nuevoId) {
        setAccionMsg("ANEXO_23 generado, pero no fue posible abrir el detalle automaticamente.");
        await verificarAnexo23Existente(documento);
        return;
      }
      navigate(`${basePath}/documentos/${nuevoId}`);
    } catch {
      setAccionMsg("No fue posible generar el ANEXO_23.");
    } finally {
      setGenerandoAnexo23(false);
    }
  }

  async function descargarPdfAnexo23() {
    if (!documento?._id || (!esAnexo23 && !esAnexo24) || descargandoPdf) return;

    setDescargandoPdf(true);
    setAccionMsg("");
    try {
      const res = await http.get(`/alojamientos-documentos/${documento._id}/pdf`, {
        responseType: "blob",
      });
      descargarBlob(new Blob([res.data], { type: "application/pdf" }), `${documento.codigo}_${documento._id}.pdf`);
      setAccionMsg("PDF descargado correctamente.");
    } catch {
      setAccionMsg("No fue posible descargar el PDF.");
    } finally {
      setDescargandoPdf(false);
    }
  }

  async function revisarAnexo24() {
    if (!documento?._id || !puedeRevisarAnexo24 || revisandoAnexo24) return;
    const ok = window.confirm("Confirma registrar la revision del inspector para ANEXO_24?");
    if (!ok) return;

    setRevisandoAnexo24(true);
    setAccionMsg("");
    try {
      const res = await http.patch(`/alojamientos-documentos/anexo-24/${documento._id}/revision-inspector`, {
        datos: {
          observacionesInspector,
        },
      });
      setDocumento(res.data?.documento || null);
      setAccionMsg("Revision inspector registrada correctamente.");
      await cargar();
    } catch {
      setAccionMsg("No fue posible registrar la revision inspector.");
    } finally {
      setRevisandoAnexo24(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <section style={cardStyle}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={titleStyle}>Detalle documental</h2>
          <p style={subtitleStyle}>
            Consulta readonly territorial. Las acciones administrativas no estan habilitadas para este perfil.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {anexo23ExistenteId && (
            <button
              type="button"
              onClick={() => navigate(`${basePath}/documentos/${anexo23ExistenteId}`)}
              style={{ ...badgeStyle, minHeight: 36, cursor: "pointer" }}
            >
              Ver ANEXO_23
            </button>
          )}
          {anexo24ExistenteId && (
            <button
              type="button"
              onClick={() => navigate(`${basePath}/documentos/${anexo24ExistenteId}`)}
              style={{ ...badgeStyle, minHeight: 36, cursor: "pointer" }}
            >
              Ver ANEXO_24
            </button>
          )}
          {puedeGenerarAnexo23 && (
            <button
              type="button"
              onClick={generarAnexo23}
              disabled={generandoAnexo23}
              style={{
                ...badgeStyle,
                minHeight: 36,
                cursor: generandoAnexo23 ? "not-allowed" : "pointer",
                opacity: generandoAnexo23 ? 0.65 : 1,
              }}
            >
              {generandoAnexo23 ? "Generando..." : "Generar ANEXO_23"}
            </button>
          )}
          {(esAnexo23 || esAnexo24) && (
            <button
              type="button"
              onClick={descargarPdfAnexo23}
              disabled={descargandoPdf}
              style={{
                ...badgeStyle,
                minHeight: 36,
                cursor: descargandoPdf ? "not-allowed" : "pointer",
                opacity: descargandoPdf ? 0.65 : 1,
              }}
            >
              {descargandoPdf ? "Descargando..." : "Descargar PDF"}
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate(`${basePath}/documentos`)}
            style={{ ...badgeStyle, minHeight: 36, cursor: "pointer" }}
          >
            Volver
          </button>
        </div>
      </header>

      {loading && <div style={{ ...softCardStyle, marginTop: 16 }}>Cargando documento...</div>}
      {errorMsg && <div style={{ ...softCardStyle, marginTop: 16, color: "#fecaca" }}>{errorMsg}</div>}
      {accionMsg && <div style={{ ...softCardStyle, marginTop: 16 }}>{accionMsg}</div>}

      {!loading && documento && (
        <>
          <Section title="Documento">
            <div style={gridStyle}>
              <Field label="Codigo" value={documento.codigo} />
              <Field label="Estado" value={documento.estado} />
              <Field label="Estado institucional" value={documento.estadoInstitucional} />
              <Field label="Creado" value={fmtDate(documento.createdAt)} />
              <Field label="Actualizado" value={fmtDate(documento.updatedAt)} />
              <Field label="Derivado de" value={derivadoDeLabel(documento)} />
            </div>
          </Section>

          <Section title="Postulante / alojado">
            <div style={gridStyle}>
              <Field label="Nombre" value={personaLabel(documento)} />
              <Field label="MR" value={datos.huesped?.mr || datos.mr || datos.matricula || datos.numeroRegistro} />
              <Field label="Grado" value={datos.huesped?.gradoEscalafon || datos.gradoEscalafon || datos.grado} />
              <Field label="Escalafon" value={datos.escalafon} />
              <Field label="Destino" value={datos.huesped?.destino || datos.destinoActual || datos.destino} />
              <Field label="Genero" value={datos.huesped?.genero || datos.genero || datos.sexo} />
            </div>
          </Section>

          <Section title="Alojamiento / plaza">
            <div style={gridStyle}>
              <Field label="Referencia" value={alojamientoLabel(documento)} />
              <Field label="Lugar" value={datos.alojamientoSnapshot?.lugar || datos.lugar || datos.alojamientoLugar || datos.alojamiento?.lugar} />
              <Field label="Dependencia" value={datos.alojamientoSnapshot?.dependencia || datos.dependencia || datos.alojamiento?.dependencia} />
              <Field label="Sector" value={datos.alojamientoSnapshot?.sector || datos.sector || datos.alojamiento?.sector} />
              <Field label="Tipo" value={datos.alojamientoSnapshot?.tipo || datos.tipo || datos.alojamiento?.tipo} />
              <Field label="Clase" value={datos.alojamientoSnapshot?.clase || datos.clase || datos.alojamiento?.clase} />
              <Field label="Plaza" value={datos.plazaSnapshot?.numeroPlaza ? `Plaza ${datos.plazaSnapshot.numeroPlaza}` : datos.plazaNumero ? `Plaza ${datos.plazaNumero}` : ""} />
              <Field label="Genero permitido" value={datos.alojamientoSnapshot?.generoPermitido || datos.generoPermitido || datos.alojamiento?.generoPermitido} />
            </div>
          </Section>

          <Section title="Datos documentales">
            <div style={gridStyle}>
              <Field label="Tipo solicitud" value={datos.tipoSolicitud} />
              <Field label="Zona naval" value={datos.zonaNaval} />
              <Field label="Fecha lugar" value={datos.fechaLugar} />
              <Field label="Autoridad asignacion" value={datos.autoridadAsignacion} />
              <Field label="Acepta reglamento" value={boolLabel(datos.aceptaCondicionesReglamento)} />
              <Field label="Agrega recibo" value={boolLabel(datos.agregaReciboHaberes)} />
            </div>
          </Section>

          <Section title="Conformidades">
            <SimpleTable
              empty="Sin conformidades registradas."
              headers={["Tipo", "Estado", "Rol", "Fecha", "Observacion"]}
              rows={conformidades.map((item) => [
                item.tipo,
                item.ok === true ? "Conforme" : item.ok === false ? "No conforme" : "-",
                item.rol,
                fmtDate(item.fecha),
                item.observacion,
              ])}
            />
          </Section>

          <Section title="Firmantes">
            <SimpleTable
              empty="Sin firmantes registrados."
              headers={["Tipo", "Nombre", "Rol", "Fecha", "Fuente"]}
              rows={signers.map((item) => [
                item.tipo,
                item.nombre,
                item.rol,
                fmtDate(item.fecha),
                item.fuente,
              ])}
            />
          </Section>

          <Section title="Historial e intervenciones">
            <SimpleTable
              empty="Sin historial de estados."
              headers={["Anterior", "Nuevo", "Fecha", "Observacion"]}
              rows={historialEstados.map((item) => [
                item.estadoAnterior,
                item.estadoNuevo || item.estado,
                fmtDate(item.fecha || item.createdAt),
                item.observacion,
              ])}
            />
            <div style={{ height: 12 }} />
            <SimpleTable
              empty="Sin intervenciones registradas."
              headers={["Tipo", "Rol", "Fecha", "Observacion"]}
              rows={intervenciones.map((item) => [
                item.tipo,
                item.rol,
                fmtDate(item.fecha || item.createdAt),
                item.observacion,
              ])}
            />
          </Section>

          {esAnexo23 && (
            <Anexo23InspectorForm
              documento={documento}
              onUpdated={cargar}
            />
          )}

          {puedeRevisarAnexo24 && (
            <Section title="Revision inspector ANEXO_24">
              <div style={{ display: "grid", gap: 12 }}>
                <label style={fieldStyle}>
                  <span style={labelStyle}>Observaciones del inspector</span>
                  <textarea
                    value={observacionesInspector}
                    onChange={(e) => setObservacionesInspector(e.target.value)}
                    rows={6}
                    style={{
                      width: "100%",
                      marginTop: 8,
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: "1px solid rgba(255,255,255,0.16)",
                      background: "rgba(255,255,255,0.05)",
                      color: "#fff",
                      resize: "vertical",
                      boxSizing: "border-box",
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={revisarAnexo24}
                  disabled={revisandoAnexo24}
                  style={{
                    ...badgeStyle,
                    minHeight: 40,
                    cursor: revisandoAnexo24 ? "not-allowed" : "pointer",
                    opacity: revisandoAnexo24 ? 0.65 : 1,
                  }}
                >
                  {revisandoAnexo24 ? "Registrando..." : "Registrar revision"}
                </button>
              </div>
            </Section>
          )}

          <p style={{ ...metaStyle, marginTop: 16 }}>
            Vista readonly: no permite editar, conformar, cerrar, generar ANEXO_22 ni descargar adjuntos.
          </p>
        </>
      )}

      {!loading && !documento && !errorMsg && (
        <div style={{ ...softCardStyle, marginTop: 16 }}>Documento no disponible.</div>
      )}
    </section>
  );
}
