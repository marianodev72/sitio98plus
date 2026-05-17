import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "../../api/http";
import { useAuth } from "../../auth/useAuth";

type Documento = {
  _id: string;
  codigo: string;
  estado: string;
  estadoInstitucional?: string | null;
  datos?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
};

type AdjuntoCampo = "fidofac" | "reciboHaberes" | "indiceTitularidad";

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
  genero: string;
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
  agregaReciboHaberes: boolean | null;
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
    reciboHaberes: boolean | null;
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
  genero: "",
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
  agregaReciboHaberes: null,
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
    reciboHaberes: null,
    indiceTitularidad: null,
  },
};

const pageStyle: CSSProperties = {
  maxWidth: 1020,
  margin: "0 auto",
  padding: 24,
  color: "#F8FAFC",
  boxSizing: "border-box",
};

const sectionTitleStyle: CSSProperties = {
  fontWeight: 800,
  marginBottom: 8,
  color: "#F8FAFC",
};

const cardStyle: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.05)",
  borderRadius: 12,
  padding: 16,
  marginBottom: 12,
};

const rowLabelStyle: CSSProperties = {
  fontWeight: 700,
  fontSize: 13,
  marginBottom: 4,
  color: "#CBD5E1",
};

const controlStyle: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.04)",
  color: "#ffffff",
  boxSizing: "border-box",
  outline: "none",
};

const inputStyle = controlStyle;

const labelStyle: CSSProperties = {
  display: "grid",
  gap: 6,
  color: "rgba(255,255,255,0.80)",
  fontSize: 13,
  fontWeight: 700,
};

const selectStyle: CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.12)",
  backgroundColor: "#111827",
  color: "#ffffff",
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
  colorScheme: "dark",
};

const optionStyle: CSSProperties = {
  backgroundColor: "#1f2937",
  color: "#ffffff",
};

const dateInputStyle: CSSProperties = {
  ...controlStyle,
  background: "#111827",
  color: "#F8FAFC",
  border: "1px solid rgba(148,163,184,0.32)",
  colorScheme: "dark",
};

const neutralButtonStyle: CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#ffffff",
  borderRadius: 10,
  padding: "10px 14px",
  fontWeight: 700,
  cursor: "pointer",
};

const primaryButtonStyle: CSSProperties = {
  background: "rgba(59,130,246,0.20)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#ffffff",
  borderRadius: 10,
  padding: "10px 14px",
  fontWeight: 800,
  cursor: "pointer",
};

const successButtonStyle: CSSProperties = {
  ...primaryButtonStyle,
  background: "rgba(22,163,74,0.20)",
};

const dangerButtonStyle: CSSProperties = {
  background: "rgba(127,29,29,0.18)",
  border: "1px solid rgba(239,68,68,0.35)",
  color: "#FCA5A5",
  borderRadius: 10,
  padding: "10px 14px",
  fontWeight: 700,
  cursor: "pointer",
};

const buttonRowStyle: CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  alignItems: "center",
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

const fileNameStyle: CSSProperties = {
  fontSize: 12,
  color: "#9CA3AF",
  marginTop: 4,
};

const smallTextStyle: CSSProperties = {
  fontSize: 12,
  lineHeight: 1.35,
  opacity: 0.9,
  color: "#9CA3AF",
};

function Box({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <div style={cardStyle}>
      {title ? (
        <div style={{ fontWeight: 800, marginBottom: 10, fontSize: 14, color: "#F8FAFC" }}>
          {title}
        </div>
      ) : null}
      {children}
    </div>
  );
}

function Row({
  label,
  children,
  requiredMark,
}: {
  label: string;
  children: ReactNode;
  requiredMark?: boolean;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={rowLabelStyle}>
        {label} {requiredMark ? "*" : ""}
      </div>
      {children}
    </div>
  );
}

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
    genero: str(user?.genero || user?.sexo || user?.meta?.genero || user?.meta?.sexo).toUpperCase(),
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
    genero: str(datos?.genero || datos?.sexo) || initial.genero,
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
    agregaReciboHaberes: boolFromUnknown(datos?.agregaReciboHaberes),
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
      reciboHaberes: boolFromUnknown(agregados.reciboHaberes),
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
    genero: form.genero,
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
    agregaReciboHaberes: form.agregaReciboHaberes,
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
      reciboHaberes: form.agregados.reciboHaberes,
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
    "genero",
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
    form.agregaReciboHaberes,
    form.tieneProblemasSocioeconomicos,
    form.declaradoIneptoDGPN,
    form.agregaIndiceTitularidad,
    form.agregados.fidofac,
    form.agregados.reciboHaberes,
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
  const isAdjuntoBusy = Boolean(busyAdjunto);
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
        params: { codigo: "ANEXO_21", estado: "BORRADOR", limit: 1 },
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
    if (isAdjuntoBusy) return;
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
    if (documento && !isBorrador) throw new Error("documento no editable");

    const payload = { datos: formToDatos(form) };
    const res = await http.post("/alojamientos-documentos/anexo-21", payload);
    const saved = res.data?.documento || null;
    setDocumento(saved);
    setForm(datosToForm(saved?.datos, user));
    return saved;
  }

  async function subirAdjunto(campo: AdjuntoCampo, file: File | null) {
    if (!file) return;
    if (isAdjuntoBusy) return;
    if (documento && !isBorrador) {
      setInfo("");
      setError("No es posible procesar el adjunto.");
      return;
    }
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
    if (!isBorrador || isAdjuntoBusy) return;

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
    const disabled = busy || isAdjuntoBusy;
    const working = busyAdjunto === campo;

    return (
      <div style={{ marginTop: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {canEdit ? (
            <label style={{ ...neutralButtonStyle, cursor: disabled ? "default" : "pointer" }}>
              Elegir archivo
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
          ) : null}

          <div style={{ fontSize: 12, color: "#9CA3AF" }}>
            {working
              ? "Procesando archivo..."
              : adjunto?.nombreOriginal
                ? adjunto.nombreOriginal
                : "No se eligio ningun archivo"}
          </div>

          {adjunto ? (
            <button
              type="button"
              style={neutralButtonStyle}
              onClick={() => descargarAdjunto(campo)}
              disabled={disabled}
            >
              Descargar
            </button>
          ) : null}

          {isBorrador && adjunto ? (
            <button
              type="button"
              style={dangerButtonStyle}
              onClick={() => eliminarAdjunto(campo)}
              disabled={disabled}
            >
              Eliminar
            </button>
          ) : null}
        </div>

        <div style={fileNameStyle}>
          {adjunto
            ? `${titulo} - ${formatBytes(adjunto.size)} - ${safe(adjunto.mime)} - ${formatFecha(adjunto.fechaSubida)}`
            : null}
        </div>
      </div>
    );
  }

  async function enviar() {
    if (!documento?._id) return;
    if (isAdjuntoBusy) return;
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

  const disabled = !canEdit || busy || isAdjuntoBusy;
  const estadoLabel = documento ? safe(documento.estado) : "Sin solicitud iniciada";
  const aniosServicioOptions = Array.from({ length: 51 }, (_, i) => String(i).padStart(2, "0"));

  if (loading) {
    return (
      <div style={pageStyle}>
        <Box>
          <div style={{ fontWeight: 900, fontSize: 16, color: "#F8FAFC" }}>ANEXO 21</div>
          <div style={smallTextStyle}>Cargando solicitud...</div>
        </Box>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={{ ...cardStyle, marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontWeight: 900, color: "#F8FAFC" }}>ARMADA ARGENTINA</div>
          <div style={{ fontWeight: 700, color: "#CBD5E1" }}>R.G-6-002 - PUBLICO</div>
        </div>
        <div style={{ marginTop: 8, fontWeight: 900, fontSize: 16, color: "#F8FAFC" }}>
          ANEXO 21 - FORMULARIO DE INSCRIPCION PARA OCUPAR ALOJAMIENTO NAVAL
        </div>
        <div style={smallTextStyle}>DECLARACION JURADA DE POSTULACION</div>
        <div style={{ marginTop: 10, color: "#CBD5E1", fontSize: 13 }}>
          Estado actual: <b>{estadoLabel}</b>
          {documento?.estadoInstitucional ? ` / ${documento.estadoInstitucional}` : ""}
        </div>
      </div>

      {isEnviado ? (
        <div style={{ ...cardStyle, color: "#CBD5E1" }}>
          La solicitud fue enviada y se encuentra en revision institucional.
        </div>
      ) : null}

      {error ? (
        <div
          style={{
            border: "1px solid rgba(239,68,68,0.35)",
            padding: 12,
            marginBottom: 12,
            background: "rgba(127,29,29,0.18)",
            color: "#FCA5A5",
          }}
        >
          {error}
        </div>
      ) : null}

      {info ? (
        <div
          style={{
            border: "1px solid rgba(34,197,94,0.35)",
            padding: 12,
            marginBottom: 12,
            background: "rgba(22,163,74,0.18)",
            color: "#86EFAC",
          }}
        >
          {info}
        </div>
      ) : null}

      <form>
        <Box>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Row label="Lugar y fecha:" requiredMark>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 190px", gap: 10 }}>
                <input
                  value={form.lugar}
                  onChange={(e) => setField("lugar", e.target.value)}
                  placeholder="Lugar"
                  style={controlStyle}
                  disabled={disabled}
                  maxLength={80}
                />
                <input
                  type="date"
                  value={form.fechaLugar}
                  onChange={(e) => setField("fechaLugar", e.target.value)}
                  style={dateInputStyle}
                  disabled={disabled}
                />
              </div>
            </Row>

            <Row label="Autoridad de Asignacion / Zona Naval:" requiredMark>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 110px", gap: 10 }}>
                <input
                  value={form.autoridadAsignacion}
                  onChange={(e) => setField("autoridadAsignacion", e.target.value)}
                  style={controlStyle}
                  disabled={disabled}
                  maxLength={120}
                />
                <input
                  value={form.zonaNaval}
                  onChange={(e) => setField("zonaNaval", e.target.value)}
                  style={controlStyle}
                  disabled={disabled}
                  maxLength={20}
                />
              </div>
            </Row>
          </div>

          <div style={{ marginTop: 6, ...smallTextStyle }}>
            Marcar con una equis la opcion seleccionada que corresponda.
          </div>
          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {[
              ["INSCRIPCION_INICIAL", "Solicito mi inscripcion inicial"],
              ["CAMBIO_ALOJAMIENTO", "Solicito cambio de alojamiento"],
              ["RECTIFICACION", "Solicito rectificacion"],
            ].map(([value, label]) => (
              <label
                key={value}
                style={{ display: "flex", gap: 8, alignItems: "center", border: "1px solid rgba(255,255,255,0.14)", padding: 10 }}
              >
                <input
                  type="radio"
                  checked={form.tipoSolicitud === value}
                  disabled={disabled}
                  onChange={() => setField("tipoSolicitud", value)}
                />
                {label}
              </label>
            ))}
          </div>
        </Box>

        <Box>
          <div style={sectionTitleStyle}>
            1. Conozco y acepto las condiciones reglamentarias para ocupar Alojamiento Naval.
          </div>
          <BoolRadio
            label="Acepto condiciones del reglamento"
            value={form.aceptaCondicionesReglamento}
            disabled={disabled}
            onChange={(value) => setField("aceptaCondicionesReglamento", value)}
          />
        </Box>

        <Box title="2. Datos personales del solicitante">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
            <Row label="M.R." requiredMark><input value={form.mr} onChange={(e) => setField("mr", e.target.value)} style={controlStyle} disabled={disabled} maxLength={40} /></Row>
            <Row label="Afiliado IOSFA" requiredMark><input value={form.afiliadoIOSFA} onChange={(e) => setField("afiliadoIOSFA", e.target.value)} style={controlStyle} disabled={disabled} maxLength={40} /></Row>
            <Row label="Grado / Escalafon" requiredMark><input value={form.gradoEscalafon} onChange={(e) => setField("gradoEscalafon", e.target.value)} style={controlStyle} disabled={disabled} maxLength={80} /></Row>
            <Row label="Genero" requiredMark>
              <select value={form.genero} onChange={(e) => setField("genero", e.target.value)} style={selectStyle} disabled={disabled}>
                <option value="" style={optionStyle}>Seleccionar...</option>
                <option value="MASCULINO" style={optionStyle}>Masculino</option>
                <option value="FEMENINO" style={optionStyle}>Femenino</option>
              </select>
            </Row>
            <Row label="Apellido" requiredMark><input value={form.apellido} onChange={(e) => setField("apellido", e.target.value)} style={controlStyle} disabled={disabled} maxLength={80} /></Row>
            <Row label="Nombres" requiredMark><input value={form.nombres} onChange={(e) => setField("nombres", e.target.value)} style={controlStyle} disabled={disabled} maxLength={100} /></Row>
            <Row label="Organismo Administrador" requiredMark><input value={form.organismoAdministrador} onChange={(e) => setField("organismoAdministrador", e.target.value)} style={controlStyle} disabled={disabled} maxLength={160} /></Row>
            <Row label="Destino actual" requiredMark><input value={form.destinoActual} onChange={(e) => setField("destinoActual", e.target.value)} style={controlStyle} disabled={disabled} maxLength={120} /></Row>
            <Row label="Destino futuro"><input value={form.destinoFuturo} onChange={(e) => setField("destinoFuturo", e.target.value)} style={controlStyle} disabled={disabled} maxLength={120} /></Row>
            <Row label="Telefono actual" requiredMark><input value={form.telefonoActual} onChange={(e) => setField("telefonoActual", e.target.value)} style={controlStyle} disabled={disabled} maxLength={40} /></Row>
            <Row label="Telefono futuro"><input value={form.telefonoFuturo} onChange={(e) => setField("telefonoFuturo", e.target.value)} style={controlStyle} disabled={disabled} maxLength={40} /></Row>
          </div>
        </Box>

        <Box>
          <div style={sectionTitleStyle}>3. Fecha del ultimo ascenso y anos de servicio segun recibo.</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: 12 }}>
            <Row label="Fecha ultimo ascenso" requiredMark>
              <input type="date" value={form.fechaUltimoAscenso} onChange={(e) => setField("fechaUltimoAscenso", e.target.value)} style={dateInputStyle} disabled={disabled} />
            </Row>
            <Row label="Anos de servicio" requiredMark>
              <select value={form.aniosServicioRecibo} onChange={(e) => setField("aniosServicioRecibo", e.target.value)} style={selectStyle} disabled={disabled}>
                <option value="" style={optionStyle}>--</option>
                {aniosServicioOptions.map((y) => <option key={y} value={y} style={optionStyle}>{y}</option>)}
              </select>
            </Row>
          </div>
        </Box>

        <Box>
          <div style={sectionTitleStyle}>4. Agrego fotocopia autenticada de FIDOFAC.</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <BoolRadio label="Agrego FIDOFAC" value={form.agregaFidofac} disabled={disabled} onChange={(value) => setField("agregaFidofac", value)} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#CBD5E1", marginBottom: 6 }}>Adjuntar FIDOFAC:</div>
              {renderAdjunto("fidofac", "FIDOFAC")}
            </div>
          </div>
        </Box>

        <Box>
          <div style={sectionTitleStyle}>4.1 Agrego Recibo de Haberes.</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <BoolRadio label="Agrego Recibo de Haberes" value={form.agregaReciboHaberes} disabled={disabled} onChange={(value) => setField("agregaReciboHaberes", value)} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#CBD5E1", marginBottom: 6 }}>Adjuntar Recibo:</div>
              {renderAdjunto("reciboHaberes", "Recibo de Haberes")}
            </div>
          </div>
        </Box>

        <Box>
          <div style={sectionTitleStyle}>5. Tengo problemas socioeconomicos atendibles e inicie el tramite por Oficio.</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <BoolRadio label="Problemas socioeconomicos" value={form.tieneProblemasSocioeconomicos} disabled={disabled} onChange={(value) => setField("tieneProblemasSocioeconomicos", value)} />
            <input
              value={form.oficioProblemasSocioeconomicos}
              onChange={(e) => setField("oficioProblemasSocioeconomicos", e.target.value)}
              placeholder="Oficio..."
              style={{ ...controlStyle, maxWidth: 420 }}
              disabled={disabled || form.tieneProblemasSocioeconomicos !== true}
              maxLength={80}
            />
          </div>
        </Box>

        <Box>
          <div style={sectionTitleStyle}>6. Me encuentro declarado INEPTO por la Direccion General del Personal Naval.</div>
          <BoolRadio label="Declarado INEPTO DGPN" value={form.declaradoIneptoDGPN} disabled={disabled} onChange={(value) => setField("declaradoIneptoDGPN", value)} />
        </Box>

        <Box>
          <div style={sectionTitleStyle}>7. Agrego indice de titularidad.</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <BoolRadio label="Agrego indice de titularidad" value={form.agregaIndiceTitularidad} disabled={disabled} onChange={(value) => setField("agregaIndiceTitularidad", value)} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#CBD5E1", marginBottom: 6 }}>Adjuntar indice:</div>
              {renderAdjunto("indiceTitularidad", "Indice de titularidad")}
            </div>
          </div>
        </Box>

        <Box>
          <div style={sectionTitleStyle}>
            8. Si no me encuentro presente el dia de la asignacion, autorizo como representante(s):
          </div>
          {[0, 1].map((index) => (
            <div key={index} style={{ border: "1px solid rgba(255,255,255,0.14)", padding: 10, marginBottom: 10 }}>
              <div style={{ fontWeight: 800, marginBottom: 8, color: "#F8FAFC" }}>REPRESENTANTE {index + 1}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 160px", gap: 10 }}>
                <Row label="Apellido y nombres:"><input value={form.representantes[index]?.apellidoNombres || ""} onChange={(e) => setRepresentante(index, "apellidoNombres", e.target.value)} style={controlStyle} disabled={disabled} maxLength={120} /></Row>
                <Row label="Grado:"><input value={form.representantes[index]?.grado || ""} onChange={(e) => setRepresentante(index, "grado", e.target.value)} style={controlStyle} disabled={disabled} maxLength={60} /></Row>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 200px", gap: 10 }}>
                <Row label="M.R.:"><input value={form.representantes[index]?.mr || ""} onChange={(e) => setRepresentante(index, "mr", e.target.value)} style={controlStyle} disabled={disabled} maxLength={40} /></Row>
                <Row label="Destino:"><input value={form.representantes[index]?.destino || ""} onChange={(e) => setRepresentante(index, "destino", e.target.value)} style={controlStyle} disabled={disabled} maxLength={120} /></Row>
                <Row label="Telefono:"><input value={form.representantes[index]?.telefono || ""} onChange={(e) => setRepresentante(index, "telefono", e.target.value)} style={controlStyle} disabled={disabled} maxLength={40} /></Row>
              </div>
            </div>
          ))}
          <div style={smallTextStyle}>
            Acepto todas las decisiones que el/los representante/s tome/n respecto a la eleccion que haga/n.
          </div>
          <div style={{ marginTop: 10 }}>
            <BoolRadio label="Acepto decisiones del representante" value={form.aceptaDecisionRepresentante} disabled={disabled} onChange={(value) => setField("aceptaDecisionRepresentante", value)} />
          </div>
        </Box>

        <Box>
          <div style={sectionTitleStyle}>
            9. Autorizo descuento de compensaciones por uso del haber mensual.
          </div>
          <BoolRadio label="Autorizo descuento de haberes" value={form.autorizaDescuentoHaberes} disabled={disabled} onChange={(value) => setField("autorizaDescuentoHaberes", value)} />
        </Box>

        <Box>
          <div style={sectionTitleStyle}>
            10. Autorizo administracion de expensas comunes por Administrador bajo supervision del Organismo Administrador.
          </div>
          <BoolRadio label="Autorizo administracion de expensas" value={form.autorizaAdministracionExpensas} disabled={disabled} onChange={(value) => setField("autorizaAdministracionExpensas", value)} />
        </Box>

        <Box>
          <div style={sectionTitleStyle}>11. Fecha estimada de traslado a la zona:</div>
          <input
            type="date"
            value={form.fechaEstimadaTrasladoZona}
            onChange={(e) => setField("fechaEstimadaTrasladoZona", e.target.value)}
            style={dateInputStyle}
            disabled={disabled}
          />
        </Box>

        <Box title="AGREGADOS (marcar SI/NO)">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 160px", gap: 10, alignItems: "center" }}>
            <div>1. Fotocopia autenticada de la FIDOFAC.</div>
            <BoolRadio label="" value={form.agregados.fidofac} disabled={disabled} onChange={(value) => setAgregado("fidofac", value)} />
            <div>2. Fotocopia del ultimo Recibo de Haberes.</div>
            <BoolRadio label="" value={form.agregados.reciboHaberes} disabled={disabled} onChange={(value) => setAgregado("reciboHaberes", value)} />
            <div>3. Indice de titularidad.</div>
            <BoolRadio label="" value={form.agregados.indiceTitularidad} disabled={disabled} onChange={(value) => setAgregado("indiceTitularidad", value)} />
          </div>
        </Box>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.12)", marginTop: 14, paddingTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <button type="button" style={neutralButtonStyle} onClick={() => navigate("/app/postulante/postulaciones")} disabled={busy || isAdjuntoBusy}>
              Volver a postulaciones
            </button>

            <div style={buttonRowStyle}>
              {canEdit ? (
                <button type="button" style={primaryButtonStyle} onClick={guardar} disabled={busy || isAdjuntoBusy}>
                  {documento ? "Guardar borrador" : "Iniciar solicitud"}
                </button>
              ) : null}

              {isBorrador ? (
                <button type="button" style={successButtonStyle} onClick={enviar} disabled={busy || isAdjuntoBusy}>
                  {busy ? "Enviando..." : "Enviar ANEXO 21"}
                </button>
              ) : null}
            </div>
          </div>

          <div style={{ marginTop: 16, textAlign: "right", fontWeight: 800, color: "#CBD5E1" }}>
            Firma del Solicitante
          </div>
        </div>
      </form>
    </div>
  );
}
