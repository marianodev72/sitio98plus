import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "../../api/http";
import { useAuth } from "../../auth/useAuth";
import {
  buttonRowStyle,
  cardStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  subtitleStyle,
  successButtonStyle,
  titleStyle,
} from "../permisionario/uiStyles";

type Documento = {
  _id: string;
  codigo: string;
  estado: string;
  estadoInstitucional?: string | null;
  datos?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

type AdjuntoCampo = "fidofac" | "indiceTitularidad";

type AdjuntoMetadata = {
  id?: string;
  campo?: string;
  nombreOriginal?: string;
  mime?: string;
  size?: number;
  sha256?: string;
  fechaSubida?: string;
  subidoPor?: string;
};

type Representante = {
  apellidoNombres: string;
  grado: string;
  mr: string;
  destino: string;
  telefono: string;
};

type FormState = {
  tipoSolicitud: string;
  lugar: string;
  fechaLugar: string;
  autoridadAsignacion: string;
  zonaNaval: string;
  organismoAdministrador: string;
  mr: string;
  afiliadoIOSFA: string;
  gradoEscalafon: string;
  apellido: string;
  nombres: string;
  destinoActual: string;
  destinoFuturo: string;
  telefonoActual: string;
  telefonoFuturo: string;
  fechaUltimoAscenso: string;
  aniosServicioRecibo: string;
  aceptaCondicionesReglamento: boolean | null;
  agregaFidofac: boolean | null;
  tieneProblemasSocioeconomicos: boolean | null;
  oficioProblemasSocioeconomicos: string;
  declaradoIneptoDGPN: boolean | null;
  agregaIndiceTitularidad: boolean | null;
  representantes: Representante[];
  aceptaDecisionRepresentante: boolean | null;
  autorizaDescuentoHaberes: boolean | null;
  autorizaAdministracionExpensas: boolean | null;
  fechaEstimadaTrasladoZona: string;
  agregados: {
    fidofac: boolean | null;
    indiceTitularidad: boolean | null;
  };
};

const EMPTY_REPRESENTANTE: Representante = {
  apellidoNombres: "",
  grado: "",
  mr: "",
  destino: "",
  telefono: "",
};

const EMPTY_FORM: FormState = {
  tipoSolicitud: "",
  lugar: "",
  fechaLugar: "",
  autoridadAsignacion: "",
  zonaNaval: "",
  organismoAdministrador: "",
  mr: "",
  afiliadoIOSFA: "",
  gradoEscalafon: "",
  apellido: "",
  nombres: "",
  destinoActual: "",
  destinoFuturo: "",
  telefonoActual: "",
  telefonoFuturo: "",
  fechaUltimoAscenso: "",
  aniosServicioRecibo: "",
  aceptaCondicionesReglamento: null,
  agregaFidofac: null,
  tieneProblemasSocioeconomicos: null,
  oficioProblemasSocioeconomicos: "",
  declaradoIneptoDGPN: null,
  agregaIndiceTitularidad: null,
  representantes: [{ ...EMPTY_REPRESENTANTE }, { ...EMPTY_REPRESENTANTE }],
  aceptaDecisionRepresentante: null,
  autorizaDescuentoHaberes: null,
  autorizaAdministracionExpensas: null,
  fechaEstimadaTrasladoZona: "",
  agregados: {
    fidofac: null,
    indiceTitularidad: null,
  },
};

const pageStyle: CSSProperties = {
  maxWidth: 1080,
  margin: "0 auto",
  padding: "clamp(12px, 2vw, 24px)",
  color: "#F8FAFC",
  boxSizing: "border-box",
};

const noteStyle: CSSProperties = {
  marginTop: 12,
  color: "rgba(255,255,255,0.76)",
  lineHeight: 1.65,
};

const badgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "4px 10px",
  borderRadius: 999,
  border: "1px solid rgba(96,165,250,0.36)",
  background: "rgba(37,99,235,0.16)",
  color: "#bfdbfe",
  fontSize: 12,
  fontWeight: 800,
};

const sectionStyle: CSSProperties = {
  marginTop: 18,
  paddingTop: 16,
  borderTop: "1px solid rgba(255,255,255,0.10)",
};

const sectionTitleStyle: CSSProperties = {
  margin: "0 0 12px",
  fontSize: 16,
  color: "#E5E7EB",
};

const fieldGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
};

const labelStyle: CSSProperties = {
  display: "grid",
  gap: 6,
  color: "rgba(255,255,255,0.80)",
  fontSize: 13,
  fontWeight: 700,
};

const inputStyle: CSSProperties = {
  width: "100%",
  minHeight: 42,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.05)",
  color: "#ffffff",
  boxSizing: "border-box",
  outline: "none",
};

const selectStyle: CSSProperties = {
  ...inputStyle,
  background: "#111827",
  color: "#F8FAFC",
  border: "1px solid rgba(148,163,184,0.32)",
  colorScheme: "dark",
};

const optionStyle: CSSProperties = {
  background: "#111827",
  color: "#F8FAFC",
};

const dateInputStyle: CSSProperties = {
  ...inputStyle,
  background: "#111827",
  color: "#F8FAFC",
  border: "1px solid rgba(148,163,184,0.32)",
  colorScheme: "dark",
};

const radioRowStyle: CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
};

const radioOptionStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  minHeight: 42,
  padding: "9px 12px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.04)",
  color: "rgba(255,255,255,0.84)",
};

function up(value: unknown) {
  return String(value || "").toUpperCase().trim();
}

function safe(value: unknown) {
  return value === null || value === undefined || value === "" ? "-" : String(value);
}

function boolFromUnknown(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function str(value: unknown) {
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function formatBytes(value: unknown) {
  const size = typeof value === "number" ? value : Number(value || 0);
  if (!Number.isFinite(size) || size <= 0) return "-";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function formatFecha(value: unknown) {
  if (!value) return "-";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("es-AR");
}

function getAdjunto(documento: Documento | null, campo: AdjuntoCampo): AdjuntoMetadata | null {
  const datos = documento?.datos && typeof documento.datos === "object" ? documento.datos : {};
  const adjuntos = datos?.adjuntos && typeof datos.adjuntos === "object"
    ? (datos.adjuntos as Record<string, unknown>)
    : {};
  const adjunto = adjuntos[campo];
  return adjunto && typeof adjunto === "object" ? (adjunto as AdjuntoMetadata) : null;
}

function validarArchivo(file: File) {
  const name = file.name.toLowerCase();
  const extOk = name.endsWith(".pdf") || name.endsWith(".jpg") || name.endsWith(".jpeg");
  if (!extOk) return false;
  return file.size <= 2 * 1024 * 1024;
}

function normalizeRepresentantes(value: unknown): Representante[] {
  const list = Array.isArray(value) ? value : [];
  const reps = list.slice(0, 2).map((item) => {
    const source = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
    return {
      apellidoNombres: str(source.apellidoNombres),
      grado: str(source.grado),
      mr: str(source.mr),
      destino: str(source.destino),
      telefono: str(source.telefono),
    };
  });

  while (reps.length < 2) {
    reps.push({ ...EMPTY_REPRESENTANTE });
  }

  return reps;
}

function buildInitialForm(user: any): FormState {
  return {
    ...EMPTY_FORM,
    apellido: str(user?.apellido),
    nombres: str(user?.nombre),
    mr: str(user?.matricula),
    telefonoActual: str(user?.telefono),
    representantes: [{ ...EMPTY_REPRESENTANTE }, { ...EMPTY_REPRESENTANTE }],
    agregados: { ...EMPTY_FORM.agregados },
  };
}

function datosToForm(datos: Record<string, unknown> | undefined, user: any): FormState {
  const initial = buildInitialForm(user);
  const agregados = datos?.agregados && typeof datos.agregados === "object"
    ? (datos.agregados as Record<string, unknown>)
    : {};

  return {
    ...initial,
    tipoSolicitud: str(datos?.tipoSolicitud),
    lugar: str(datos?.lugar),
    fechaLugar: str(datos?.fechaLugar),
    autoridadAsignacion: str(datos?.autoridadAsignacion),
    zonaNaval: str(datos?.zonaNaval),
    organismoAdministrador: str(datos?.organismoAdministrador),
    mr: str(datos?.mr) || initial.mr,
    afiliadoIOSFA: str(datos?.afiliadoIOSFA),
    gradoEscalafon: str(datos?.gradoEscalafon),
    apellido: str(datos?.apellido) || initial.apellido,
    nombres: str(datos?.nombres) || initial.nombres,
    destinoActual: str(datos?.destinoActual),
    destinoFuturo: str(datos?.destinoFuturo),
    telefonoActual: str(datos?.telefonoActual) || initial.telefonoActual,
    telefonoFuturo: str(datos?.telefonoFuturo),
    fechaUltimoAscenso: str(datos?.fechaUltimoAscenso),
    aniosServicioRecibo: str(datos?.aniosServicioRecibo),
    aceptaCondicionesReglamento: boolFromUnknown(datos?.aceptaCondicionesReglamento),
    agregaFidofac: boolFromUnknown(datos?.agregaFidofac),
    tieneProblemasSocioeconomicos: boolFromUnknown(datos?.tieneProblemasSocioeconomicos),
    oficioProblemasSocioeconomicos: str(datos?.oficioProblemasSocioeconomicos),
    declaradoIneptoDGPN: boolFromUnknown(datos?.declaradoIneptoDGPN),
    agregaIndiceTitularidad: boolFromUnknown(datos?.agregaIndiceTitularidad),
    representantes: normalizeRepresentantes(datos?.representantes),
    aceptaDecisionRepresentante: boolFromUnknown(datos?.aceptaDecisionRepresentante),
    autorizaDescuentoHaberes: boolFromUnknown(datos?.autorizaDescuentoHaberes),
    autorizaAdministracionExpensas: boolFromUnknown(datos?.autorizaAdministracionExpensas),
    fechaEstimadaTrasladoZona: str(datos?.fechaEstimadaTrasladoZona),
    agregados: {
      fidofac: boolFromUnknown(agregados.fidofac),
      indiceTitularidad: boolFromUnknown(agregados.indiceTitularidad),
    },
  };
}

function formToDatos(form: FormState) {
  return {
    tipoSolicitud: form.tipoSolicitud,
    lugar: form.lugar,
    fechaLugar: form.fechaLugar,
    autoridadAsignacion: form.autoridadAsignacion,
    zonaNaval: form.zonaNaval,
    organismoAdministrador: form.organismoAdministrador,
    mr: form.mr,
    afiliadoIOSFA: form.afiliadoIOSFA,
    gradoEscalafon: form.gradoEscalafon,
    apellido: form.apellido,
    nombres: form.nombres,
    destinoActual: form.destinoActual,
    destinoFuturo: form.destinoFuturo,
    telefonoActual: form.telefonoActual,
    telefonoFuturo: form.telefonoFuturo,
    fechaUltimoAscenso: form.fechaUltimoAscenso,
    aniosServicioRecibo: form.aniosServicioRecibo,
    aceptaCondicionesReglamento: form.aceptaCondicionesReglamento,
    agregaFidofac: form.agregaFidofac,
    tieneProblemasSocioeconomicos: form.tieneProblemasSocioeconomicos,
    oficioProblemasSocioeconomicos: form.oficioProblemasSocioeconomicos,
    declaradoIneptoDGPN: form.declaradoIneptoDGPN,
    agregaIndiceTitularidad: form.agregaIndiceTitularidad,
    representantes: form.representantes.slice(0, 2),
    aceptaDecisionRepresentante: form.aceptaDecisionRepresentante,
    autorizaDescuentoHaberes: form.autorizaDescuentoHaberes,
    autorizaAdministracionExpensas: form.autorizaAdministracionExpensas,
    fechaEstimadaTrasladoZona: form.fechaEstimadaTrasladoZona,
    agregados: {
      fidofac: form.agregados.fidofac,
      indiceTitularidad: form.agregados.indiceTitularidad,
    },
  };
}

function validarEnvio(form: FormState) {
  const requiredStrings: Array<keyof FormState> = [
    "tipoSolicitud",
    "lugar",
    "fechaLugar",
    "autoridadAsignacion",
    "zonaNaval",
    "organismoAdministrador",
    "mr",
    "afiliadoIOSFA",
    "gradoEscalafon",
    "apellido",
    "nombres",
    "destinoActual",
    "telefonoActual",
    "fechaUltimoAscenso",
    "aniosServicioRecibo",
  ];

  for (const field of requiredStrings) {
    if (!String(form[field] || "").trim()) return false;
  }

  if (form.aceptaCondicionesReglamento !== true) return false;
  if (form.autorizaDescuentoHaberes !== true) return false;
  if (form.autorizaAdministracionExpensas !== true) return false;

  const radios = [
    form.agregaFidofac,
    form.tieneProblemasSocioeconomicos,
    form.declaradoIneptoDGPN,
    form.agregaIndiceTitularidad,
    form.agregados.fidofac,
    form.agregados.indiceTitularidad,
  ];

  if (radios.some((value) => typeof value !== "boolean")) return false;
  if (form.tieneProblemasSocioeconomicos === true && !form.oficioProblemasSocioeconomicos.trim()) {
    return false;
  }

  return true;
}

function BoolRadio({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: boolean | null;
  disabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div style={labelStyle}>
      <span>{label}</span>
      <div style={radioRowStyle}>
        <label style={radioOptionStyle}>
          <input
            type="radio"
            checked={value === true}
            onChange={() => onChange(true)}
            disabled={disabled}
          />
          SI
        </label>
        <label style={radioOptionStyle}>
          <input
            type="radio"
            checked={value === false}
            onChange={() => onChange(false)}
            disabled={disabled}
          />
          NO
        </label>
      </div>
    </div>
  );
}

export default function PostulacionAlojamientoPlaceholder() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [documento, setDocumento] = useState<Documento | null>(null);
  const [form, setForm] = useState<FormState>(() => buildInitialForm(user));
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [busyAdjunto, setBusyAdjunto] = useState<AdjuntoCampo | "">("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const estado = useMemo(() => up(documento?.estado), [documento?.estado]);
  const isBorrador = estado === "BORRADOR";
  const isEnviado = estado === "ENVIADO";
  const canEdit = !documento || isBorrador;

  function setField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function setRepresentante(index: number, field: keyof Representante, value: string) {
    setForm((current) => {
      const representantes = current.representantes.map((rep, idx) =>
        idx === index ? { ...rep, [field]: value } : rep
      );
      return { ...current, representantes };
    });
  }

  function setAgregado(field: keyof FormState["agregados"], value: boolean) {
    setForm((current) => ({
      ...current,
      agregados: { ...current.agregados, [field]: value },
    }));
  }

  async function cargarDetalle(documentoId: string) {
    const detailRes = await http.get(`/alojamientos-documentos/${documentoId}`);
    const detail = detailRes.data?.documento || null;
    setDocumento(detail);
    setForm(datosToForm(detail?.datos, user));
    return detail;
  }

  async function cargar() {
    setLoading(true);
    setError("");
    setInfo("");

    try {
      const listRes = await http.get("/alojamientos-documentos", {
        params: { codigo: "ANEXO_21", limit: 1 },
      });

      const item = Array.isArray(listRes.data?.documentos) ? listRes.data.documentos[0] : null;
      if (!item?._id) {
        setDocumento(null);
        setForm(buildInitialForm(user));
        return;
      }

      await cargarDetalle(item._id);
    } catch {
      setDocumento(null);
      setError("No es posible acceder a la solicitud de alojamiento.");
    } finally {
      setLoading(false);
    }
  }

  async function guardar() {
    setBusy(true);
    setError("");
    setInfo("");

    try {
      const payload = { datos: formToDatos(form) };
      const res = documento?._id
        ? await http.patch(`/alojamientos-documentos/anexo-21/${documento._id}`, payload)
        : await http.post("/alojamientos-documentos/anexo-21", payload);

      const saved = res.data?.documento || null;
      setDocumento(saved);
      setForm(datosToForm(saved?.datos, user));
      setInfo("Solicitud guardada como borrador.");
    } catch {
      setError("No es posible procesar la solicitud.");
    } finally {
      setBusy(false);
    }
  }

  async function asegurarBorrador() {
    if (documento?._id) return documento;

    const payload = { datos: formToDatos(form) };
    const res = await http.post("/alojamientos-documentos/anexo-21", payload);
    const saved = res.data?.documento || null;
    setDocumento(saved);
    setForm(datosToForm(saved?.datos, user));
    return saved;
  }

  async function subirAdjunto(campo: AdjuntoCampo, file: File | null) {
    if (!file) return;
    setError("");
    setInfo("");

    if (!validarArchivo(file)) {
      setError("El archivo debe ser PDF o JPG/JPEG y no superar 2 MB.");
      return;
    }

    setBusyAdjunto(campo);
    try {
      const doc = await asegurarBorrador();
      if (!doc?._id) throw new Error("sin documento");

      const fd = new FormData();
      fd.append("archivo", file);
      await http.post(`/alojamientos-documentos/anexo-21/${doc._id}/adjuntos/${campo}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await cargarDetalle(doc._id);
      setInfo("Adjunto actualizado.");
    } catch {
      setError("No es posible procesar el adjunto.");
    } finally {
      setBusyAdjunto("");
    }
  }

  async function eliminarAdjunto(campo: AdjuntoCampo) {
    if (!documento?._id) return;

    setBusyAdjunto(campo);
    setError("");
    setInfo("");

    try {
      await http.delete(`/alojamientos-documentos/anexo-21/${documento._id}/adjuntos/${campo}`);
      await cargarDetalle(documento._id);
      setInfo("Adjunto eliminado.");
    } catch {
      setError("No es posible procesar el adjunto.");
    } finally {
      setBusyAdjunto("");
    }
  }

  function descargarAdjunto(campo: AdjuntoCampo) {
    if (!documento?._id) return;
    window.open(`/api/alojamientos-documentos/${documento._id}/adjuntos/${campo}`, "_blank", "noopener,noreferrer");
  }

  function renderAdjunto(campo: AdjuntoCampo, titulo: string) {
    const adjunto = getAdjunto(documento, campo);
    const disabled = busy || busyAdjunto === campo;

    return (
      <div style={{ ...cardStyle, marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h3 style={{ ...sectionTitleStyle, fontSize: 14, marginBottom: 8 }}>{titulo}</h3>
            {adjunto ? (
              <div style={{ color: "rgba(255,255,255,0.76)", lineHeight: 1.6, fontSize: 13 }}>
                <div>Archivo: <b>{safe(adjunto.nombreOriginal)}</b></div>
                <div>Tamano: {formatBytes(adjunto.size)}</div>
                <div>Tipo: {safe(adjunto.mime)}</div>
                <div>Fecha: {formatFecha(adjunto.fechaSubida)}</div>
              </div>
            ) : (
              <div style={{ color: "rgba(255,255,255,0.62)", fontSize: 13 }}>
                Sin adjunto cargado.
              </div>
            )}
          </div>

          <div style={{ ...buttonRowStyle, marginTop: 0 }}>
            {adjunto ? (
              <button
                type="button"
                style={secondaryButtonStyle}
                onClick={() => descargarAdjunto(campo)}
                disabled={disabled}
              >
                Descargar
              </button>
            ) : null}

            {isBorrador ? (
              <>
                <label style={{ ...secondaryButtonStyle, cursor: disabled ? "default" : "pointer" }}>
                  Subir
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg"
                    style={{ display: "none" }}
                    disabled={disabled}
                    onChange={(event) => {
                      const file = event.target.files?.[0] || null;
                      event.target.value = "";
                      subirAdjunto(campo, file);
                    }}
                  />
                </label>
                {adjunto ? (
                  <button
                    type="button"
                    style={secondaryButtonStyle}
                    onClick={() => eliminarAdjunto(campo)}
                    disabled={disabled}
                  >
                    Eliminar
                  </button>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  async function enviar() {
    if (!documento?._id) return;
    if (!validarEnvio(form)) {
      setError("Complete los campos obligatorios antes de enviar.");
      setInfo("");
      return;
    }

    setBusy(true);
    setError("");
    setInfo("");

    try {
      await http.patch(`/alojamientos-documentos/anexo-21/${documento._id}`, {
        datos: formToDatos(form),
      });
      const res = await http.post(`/alojamientos-documentos/anexo-21/${documento._id}/enviar`);
      const sent = res.data?.documento || null;
      setDocumento(sent);
      setForm(datosToForm(sent?.datos, user));
      setInfo("Solicitud enviada. Se encuentra en revision institucional.");
    } catch {
      setError("No es posible procesar la solicitud.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div style={pageStyle}>
        <h1 style={titleStyle}>Alojamiento Naval</h1>
        <p style={subtitleStyle}>Cargando solicitud...</p>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <h1 style={titleStyle}>Alojamiento Naval</h1>
      <p style={subtitleStyle}>Formulario de inscripcion para ocupar Alojamiento Naval.</p>

      <section style={{ ...cardStyle, marginTop: 18 }}>
        <span style={badgeStyle}>ANEXO_21</span>

        <p style={noteStyle}>
          Estado actual: <b>{documento ? safe(documento.estado) : "Sin solicitud iniciada"}</b>
          {documento?.estadoInstitucional ? ` / ${documento.estadoInstitucional}` : ""}
        </p>

        {isEnviado ? (
          <p style={noteStyle}>
            La solicitud fue enviada y se encuentra en revision institucional.
          </p>
        ) : null}

        {error ? (
          <div style={{ ...cardStyle, marginTop: 14, borderColor: "rgba(239,68,68,0.34)" }}>
            {error}
          </div>
        ) : null}

        {info ? (
          <div style={{ ...cardStyle, marginTop: 14, borderColor: "rgba(34,197,94,0.34)" }}>
            {info}
          </div>
        ) : null}

        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Declaracion jurada de postulacion</h2>
          <div style={fieldGridStyle}>
            <label style={labelStyle}>
              Tipo de solicitud
              <select
                value={form.tipoSolicitud}
                onChange={(e) => setField("tipoSolicitud", e.target.value)}
                style={selectStyle}
                disabled={!canEdit || busy}
              >
                <option value="" style={optionStyle}>Seleccionar...</option>
                <option value="INSCRIPCION_INICIAL" style={optionStyle}>Inscripcion inicial</option>
                <option value="CAMBIO_ALOJAMIENTO" style={optionStyle}>Cambio de alojamiento</option>
                <option value="RECTIFICACION" style={optionStyle}>Rectificacion</option>
              </select>
            </label>
            <label style={labelStyle}>
              Lugar
              <input value={form.lugar} onChange={(e) => setField("lugar", e.target.value)} style={inputStyle} disabled={!canEdit || busy} maxLength={80} />
            </label>
            <label style={labelStyle}>
              Fecha
              <input type="date" value={form.fechaLugar} onChange={(e) => setField("fechaLugar", e.target.value)} style={dateInputStyle} disabled={!canEdit || busy} />
            </label>
            <label style={labelStyle}>
              Autoridad de asignacion
              <input value={form.autoridadAsignacion} onChange={(e) => setField("autoridadAsignacion", e.target.value)} style={inputStyle} disabled={!canEdit || busy} maxLength={120} />
            </label>
            <label style={labelStyle}>
              Zona naval
              <input value={form.zonaNaval} onChange={(e) => setField("zonaNaval", e.target.value)} style={inputStyle} disabled={!canEdit || busy} maxLength={20} />
            </label>
            <label style={labelStyle}>
              Organismo administrador
              <input value={form.organismoAdministrador} onChange={(e) => setField("organismoAdministrador", e.target.value)} style={inputStyle} disabled={!canEdit || busy} maxLength={160} />
            </label>
          </div>
        </div>

        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Datos personales</h2>
          <div style={fieldGridStyle}>
            <label style={labelStyle}>MR<input value={form.mr} onChange={(e) => setField("mr", e.target.value)} style={inputStyle} disabled={!canEdit || busy} maxLength={40} /></label>
            <label style={labelStyle}>Nro. afiliado IOSFA<input value={form.afiliadoIOSFA} onChange={(e) => setField("afiliadoIOSFA", e.target.value)} style={inputStyle} disabled={!canEdit || busy} maxLength={40} /></label>
            <label style={labelStyle}>Grado y escalafon<input value={form.gradoEscalafon} onChange={(e) => setField("gradoEscalafon", e.target.value)} style={inputStyle} disabled={!canEdit || busy} maxLength={80} /></label>
            <label style={labelStyle}>Apellido<input value={form.apellido} onChange={(e) => setField("apellido", e.target.value)} style={inputStyle} disabled={!canEdit || busy} maxLength={80} /></label>
            <label style={labelStyle}>Nombres<input value={form.nombres} onChange={(e) => setField("nombres", e.target.value)} style={inputStyle} disabled={!canEdit || busy} maxLength={100} /></label>
            <label style={labelStyle}>Destino actual<input value={form.destinoActual} onChange={(e) => setField("destinoActual", e.target.value)} style={inputStyle} disabled={!canEdit || busy} maxLength={120} /></label>
            <label style={labelStyle}>Destino futuro<input value={form.destinoFuturo} onChange={(e) => setField("destinoFuturo", e.target.value)} style={inputStyle} disabled={!canEdit || busy} maxLength={120} /></label>
            <label style={labelStyle}>Telefono actual<input value={form.telefonoActual} onChange={(e) => setField("telefonoActual", e.target.value)} style={inputStyle} disabled={!canEdit || busy} maxLength={40} /></label>
            <label style={labelStyle}>Telefono futuro<input value={form.telefonoFuturo} onChange={(e) => setField("telefonoFuturo", e.target.value)} style={inputStyle} disabled={!canEdit || busy} maxLength={40} /></label>
            <label style={labelStyle}>Fecha ultimo ascenso<input type="date" value={form.fechaUltimoAscenso} onChange={(e) => setField("fechaUltimoAscenso", e.target.value)} style={dateInputStyle} disabled={!canEdit || busy} /></label>
            <label style={labelStyle}>Anios de servicio segun recibo<input type="number" min={0} max={60} value={form.aniosServicioRecibo} onChange={(e) => setField("aniosServicioRecibo", e.target.value)} style={inputStyle} disabled={!canEdit || busy} /></label>
          </div>
        </div>

        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Declaraciones</h2>
          <div style={fieldGridStyle}>
            <BoolRadio label="Acepto condiciones del reglamento" value={form.aceptaCondicionesReglamento} disabled={!canEdit || busy} onChange={(value) => setField("aceptaCondicionesReglamento", value)} />
            <BoolRadio label="Agrego FIDOFAC" value={form.agregaFidofac} disabled={!canEdit || busy} onChange={(value) => setField("agregaFidofac", value)} />
            <BoolRadio label="Tengo problemas socioeconomicos atendibles" value={form.tieneProblemasSocioeconomicos} disabled={!canEdit || busy} onChange={(value) => setField("tieneProblemasSocioeconomicos", value)} />
            <label style={labelStyle}>Oficio tramite socioeconomico<input value={form.oficioProblemasSocioeconomicos} onChange={(e) => setField("oficioProblemasSocioeconomicos", e.target.value)} style={inputStyle} disabled={!canEdit || busy || form.tieneProblemasSocioeconomicos !== true} maxLength={80} /></label>
            <BoolRadio label="Me encuentro declarado INEPTO por DGPN" value={form.declaradoIneptoDGPN} disabled={!canEdit || busy} onChange={(value) => setField("declaradoIneptoDGPN", value)} />
            <BoolRadio label="Agrego indice de titularidad" value={form.agregaIndiceTitularidad} disabled={!canEdit || busy} onChange={(value) => setField("agregaIndiceTitularidad", value)} />
          </div>
        </div>

        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Representantes autorizados</h2>
          {[0, 1].map((index) => (
            <div key={index} style={{ ...cardStyle, marginTop: index === 0 ? 0 : 12 }}>
              <h3 style={{ ...sectionTitleStyle, fontSize: 14 }}>Representante {index + 1}</h3>
              <div style={fieldGridStyle}>
                <label style={labelStyle}>Apellido y nombres<input value={form.representantes[index]?.apellidoNombres || ""} onChange={(e) => setRepresentante(index, "apellidoNombres", e.target.value)} style={inputStyle} disabled={!canEdit || busy} maxLength={120} /></label>
                <label style={labelStyle}>Grado<input value={form.representantes[index]?.grado || ""} onChange={(e) => setRepresentante(index, "grado", e.target.value)} style={inputStyle} disabled={!canEdit || busy} maxLength={60} /></label>
                <label style={labelStyle}>MR<input value={form.representantes[index]?.mr || ""} onChange={(e) => setRepresentante(index, "mr", e.target.value)} style={inputStyle} disabled={!canEdit || busy} maxLength={40} /></label>
                <label style={labelStyle}>Destino<input value={form.representantes[index]?.destino || ""} onChange={(e) => setRepresentante(index, "destino", e.target.value)} style={inputStyle} disabled={!canEdit || busy} maxLength={120} /></label>
                <label style={labelStyle}>Telefono<input value={form.representantes[index]?.telefono || ""} onChange={(e) => setRepresentante(index, "telefono", e.target.value)} style={inputStyle} disabled={!canEdit || busy} maxLength={40} /></label>
              </div>
            </div>
          ))}
          <div style={{ ...fieldGridStyle, marginTop: 12 }}>
            <BoolRadio label="Acepto las decisiones del representante" value={form.aceptaDecisionRepresentante} disabled={!canEdit || busy} onChange={(value) => setField("aceptaDecisionRepresentante", value)} />
          </div>
        </div>

        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Autorizaciones y agregados</h2>
          <div style={fieldGridStyle}>
            <BoolRadio label="Autorizo descuento de haberes" value={form.autorizaDescuentoHaberes} disabled={!canEdit || busy} onChange={(value) => setField("autorizaDescuentoHaberes", value)} />
            <BoolRadio label="Autorizo administracion de expensas" value={form.autorizaAdministracionExpensas} disabled={!canEdit || busy} onChange={(value) => setField("autorizaAdministracionExpensas", value)} />
            <label style={labelStyle}>Fecha estimada de traslado a la zona<input type="date" value={form.fechaEstimadaTrasladoZona} onChange={(e) => setField("fechaEstimadaTrasladoZona", e.target.value)} style={dateInputStyle} disabled={!canEdit || busy} /></label>
            <BoolRadio label="Agregado: fotocopia autenticada FIDOFAC" value={form.agregados.fidofac} disabled={!canEdit || busy} onChange={(value) => setAgregado("fidofac", value)} />
            <BoolRadio label="Agregado: indice de titularidad" value={form.agregados.indiceTitularidad} disabled={!canEdit || busy} onChange={(value) => setAgregado("indiceTitularidad", value)} />
          </div>
          {renderAdjunto("fidofac", "FIDOFAC")}
          {renderAdjunto("indiceTitularidad", "Indice de titularidad")}
        </div>

        <div style={{ ...buttonRowStyle, marginTop: 18 }}>
          <button
            type="button"
            style={secondaryButtonStyle}
            onClick={() => navigate("/app/postulante/postulaciones")}
            disabled={busy}
          >
            Volver a postulaciones
          </button>

          {canEdit ? (
            <button type="button" style={primaryButtonStyle} onClick={guardar} disabled={busy}>
              {documento ? "Guardar borrador" : "Iniciar solicitud"}
            </button>
          ) : null}

          {isBorrador ? (
            <button type="button" style={successButtonStyle} onClick={enviar} disabled={busy}>
              Enviar solicitud
            </button>
          ) : null}
        </div>
      </section>
    </div>
  );
}
