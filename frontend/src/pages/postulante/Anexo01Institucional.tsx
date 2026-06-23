//frontend/src/pages/postulante/Anexo01Institucional.tsx
import { CSSProperties, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "../../api/http";

type YesNo = "SI" | "NO" | "";

type Conviviente = {
  apellidoNombres: string;
  relacion: string;
  aCargo: "SI" | "NO" | "";
  edad: string;
  dni: string;
  OSFA: string;
};

type Mascota = {
  especie: string;
  raza: string;
  edad: string;
  sexo: string;
  peso: string;
  certificadoFile?: File | null; // soporte de certificados de vacunación (pto 9) u otro
};

type Propiedad = {
  direccion: string;
  observaciones: string;
};

type Representante = {
  apellidoNombres: string;
  grado: string;
  mr: string;
  destino: string;
  telefono: string;
};

type TipoSolicitud = "INSCRIPCION" | "CAMBIO_VIVIENDA" | "";

type Anexo01InstitucionalProps = {
  defaultTipoSolicitud?: TipoSolicitud;
  lockTipoSolicitud?: boolean;
  returnTo?: string;
  submitSuccessTo?: string;
  subtituloContextual?: string;
};

const pageStyle: CSSProperties = {
  maxWidth: 1020,
  margin: "0 auto",
  padding: 24,
  color: "#F8FAFC",
};

const cardStyle: CSSProperties = {
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.05)",
  borderRadius: 12,
  padding: 16,
  marginBottom: 12,
};

const sectionTitleStyle: CSSProperties = {
  fontWeight: 800,
  marginBottom: 8,
  color: "#F8FAFC",
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
};

const selectStyle: CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.12)",
  backgroundColor: "rgba(255,255,255,0.04)",
  color: "#ffffff",
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
};

const optionStyle: CSSProperties = {
  backgroundColor: "#1f2937",
  color: "#ffffff",
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

const dangerButtonStyle: CSSProperties = {
  background: "rgba(127,29,29,0.18)",
  border: "1px solid rgba(239,68,68,0.35)",
  color: "#FCA5A5",
  borderRadius: 10,
  padding: "10px 14px",
  fontWeight: 700,
  cursor: "pointer",
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  background: "rgba(255,255,255,0.02)",
};

const thStyle: CSSProperties = {
  color: "#9CA3AF",
  borderBottom: "1px solid rgba(255,255,255,0.12)",
  padding: 8,
  textAlign: "left",
};

const tdStyle: CSSProperties = {
  borderBottom: "1px solid rgba(255,255,255,0.06)",
  padding: 6,
};

const dateControlStyle: CSSProperties = {
  ...controlStyle,
  colorScheme: "dark",
};

const fileInputStyle: CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.04)",
  color: "#CBD5E1",
  cursor: "pointer",
};

const fileInputCompactStyle: CSSProperties = {
  ...fileInputStyle,
  minWidth: 220,
};

const fileNameStyle: CSSProperties = {
  fontSize: 12,
  color: "#9CA3AF",
  marginTop: 4,
};

const MAX_ANEXO_01_FILE_MB = 20;
const MAX_ANEXO_01_FILE_BYTES = MAX_ANEXO_01_FILE_MB * 1024 * 1024;
const MAX_ANEXO_01_TOTAL_MB = 28;
const MAX_ANEXO_01_TOTAL_BYTES = MAX_ANEXO_01_TOTAL_MB * 1024 * 1024;
const FILE_TOO_LARGE_413_MESSAGE =
  "Uno o más adjuntos superan el tamaño permitido. Reduzca/comprima los archivos e intente nuevamente.";

function fileTooLargeMessage(maxMb: number) {
  return `Uno o más adjuntos superan el tamaño permitido de ${maxMb} MB por archivo. Reduzca/comprima los archivos e intente nuevamente.`;
}

function findOversizedFile(files: Array<File | null | undefined>, maxBytes: number) {
  return files.find((file): file is File => Boolean(file && file.size > maxBytes)) || null;
}

function totalFileSize(files: Array<File | null | undefined>) {
  return files.reduce((total, file) => total + (file?.size || 0), 0);
}

function Box({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={cardStyle}>
      {title && (
        <div style={{ fontWeight: 800, marginBottom: 10, fontSize: 14, color: "#F8FAFC" }}>
          {title}
        </div>
      )}
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
  children: React.ReactNode;
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

function YesNoControl({
  value,
  onChange,
}: {
  value: YesNo;
  onChange: (v: YesNo) => void;
}) {
  return (
    <div style={{ display: "inline-flex", gap: 10, alignItems: "center", color: "#CBD5E1" }}>
      <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
        <input
          type="radio"
          checked={value === "SI"}
          onChange={() => onChange("SI")}
        />
        SI
      </label>
      <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
        <input
          type="radio"
          checked={value === "NO"}
          onChange={() => onChange("NO")}
        />
        NO
      </label>
    </div>
  );
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function options00a50() {
  const arr: string[] = [];
  for (let i = 0; i <= 50; i++) arr.push(pad2(i));
  return arr;
}

function options00a99() {
  const arr: string[] = [];
  for (let i = 0; i <= 99; i++) arr.push(pad2(i));
  return arr;
}

const VINCULOS_FAMILIARES = [
  "Cónyuge",
  "Conviviente",
  "Concubino/a",
  "Hijo/a",
  "Hijastro/a",
  "Nieto/a",
  "Padre/Madre",
  "Hermano/a",
  "Suegro/a",
  "Otro",
];

export default function Anexo01Institucional({
  defaultTipoSolicitud = "",
  lockTipoSolicitud = false,
  returnTo = "/app/postulante",
  submitSuccessTo = "/app/postulante",
  subtituloContextual,
}: Anexo01InstitucionalProps = {}) {
  const navigate = useNavigate();

  // Encabezado (Lugar y fecha / Autoridad de Asignación)
  const [lugar, setLugar] = useState("");
  const [fechaLugar, setFechaLugar] = useState(""); // date (igual a punto 16)
  const autoridadAsignacionFija = "Autoridad de Asignación";
  const [zonaNaval, setZonaNaval] = useState(""); // 00-99

  // Opciones de inscripción (marcar con X una)
  const [tipoSolicitud, setTipoSolicitud] =
    useState<TipoSolicitud>(defaultTipoSolicitud);

  // Punto 1 (conozco y acepto reglamento)
  const [aceptaReglamento, setAceptaReglamento] = useState(false);

  // Punto 2 (datos personales)
  const [mr, setMr] = useState("");
  const [afiliadoOSFA, setAfiliadoOSFA] = useState("");
  const [gradoEscalafon, setGradoEscalafon] = useState("");
  const [apellido, setApellido] = useState("");
  const [nombres, setNombres] = useState("");
  const [destinoActual, setDestinoActual] = useState("");
  const [destinoFuturo, setDestinoFuturo] = useState("");
  const [telefonoActual, setTelefonoActual] = useState("");
  const [telefonoFuturo, setTelefonoFuturo] = useState("");

  // Punto 3
  const [fechaUltimoAscenso, setFechaUltimoAscenso] = useState(""); // ahora date
  const [aniosServicioRecibo, setAniosServicioRecibo] = useState(""); // ahora select 00-50

  // Punto 4 (FIDOFAC)
  const [agregaFidofac, setAgregaFidofac] = useState<YesNo>("");
  const [fidofacFile, setFidofacFile] = useState<File | null>(null);

  // Punto 5 (convivientes)
  const [convivientes, setConvivientes] = useState<Conviviente[]>([]);
  function addConviviente() {
    setConvivientes((p) => [
      ...p,
      {
        apellidoNombres: "",
        relacion: "",
        aCargo: "",
        edad: "",
        dni: "",
        OSFA: "",
      },
    ]);
  }
  function removeConviviente(idx: number) {
    setConvivientes((p) => p.filter((_, i) => i !== idx));
  }
  function updateConviviente(idx: number, patch: Partial<Conviviente>) {
    setConvivientes((p) =>
      p.map((c, i) => (i === idx ? { ...c, ...patch } : c))
    );
  }

  // Punto 6 (mascotas) — en PDF es texto, pero lo hacemos planilla dinámica
  const [mascotas, setMascotas] = useState<Mascota[]>([]);
  function addMascota() {
    setMascotas((p) => [
      ...p,
      {
        especie: "",
        raza: "",
        edad: "",
        sexo: "",
        peso: "",
        certificadoFile: null,
      },
    ]);
  }
  function removeMascota(idx: number) {
    setMascotas((p) => p.filter((_, i) => i !== idx));
  }
  function updateMascota(idx: number, patch: Partial<Mascota>) {
    setMascotas((p) =>
      p.map((m, i) => (i === idx ? { ...m, ...patch } : m))
    );
  }

  // Punto 7 (propiedades)
  const [tienePropiedadesZona, setTienePropiedadesZona] = useState<YesNo>("");
  const [prop1, setProp1] = useState<Propiedad>({
    direccion: "",
    observaciones: "",
  });
  const [prop2, setProp2] = useState<Propiedad>({
    direccion: "",
    observaciones: "",
  });
  const [prop3, setProp3] = useState<Propiedad>({
    direccion: "",
    observaciones: "",
  });
  const [verificoArticulo506, setVerificoArticulo506] = useState<YesNo>("");

  // Punto 8 (problemas socioeconómicos)
  const [tieneProblemasSocio, setTieneProblemasSocio] = useState<YesNo>("");
  const [oficioSocio, setOficioSocio] = useState("");

  // Punto 9 (certificados vacunación)
  const [agregaCertVacunacion, setAgregaCertVacunacion] = useState<YesNo>("");

  // Punto 10 (inepto)
  const [ineptoDGPN, setIneptoDGPN] = useState<YesNo>("");

  // Punto 11 (recibo haberes)
  const [agregaReciboHaberes, setAgregaReciboHaberes] = useState<YesNo>("");
  const [reciboHaberesFile, setReciboHaberesFile] = useState<File | null>(null);

  // Punto 12 (años ocupación previa) — ahora select 00-50
  const [aniosOcupacionPrevia, setAniosOcupacionPrevia] = useState("");

  // Punto 13 (representantes)
  const [rep1, setRep1] = useState<Representante>({
    apellidoNombres: "",
    grado: "",
    mr: "",
    destino: "",
    telefono: "",
  });
  const [rep2, setRep2] = useState<Representante>({
    apellidoNombres: "",
    grado: "",
    mr: "",
    destino: "",
    telefono: "",
  });

  // Punto 14–15 (autorizaciones)
  const [autorizaDescuentos, setAutorizaDescuentos] = useState(false);
  const [autorizaAdministradorExpensas, setAutorizaAdministradorExpensas] =
    useState(false);

  // Punto 16 (fecha estimada traslado)
  const [fechaEstimadaTraslado, setFechaEstimadaTraslado] = useState("");

  // Agregados resumen
  const agregadoFidofac = agregaFidofac;
  const agregadoVacunacion = agregaCertVacunacion;
  const agregadoEscrituras = tienePropiedadesZona;
  const agregadoRecibo = agregaReciboHaberes;

  // Archivo extra (escrituras/contratos)
  const [escriturasYContratosFile, setEscriturasYContratosFile] =
    useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const errorGenerico = () =>
    setErr("No se ha podido procesar su solicitud, contacte al administrador.");

  const small = useMemo(
    () => ({ fontSize: 12, lineHeight: 1.35, opacity: 0.9, color: "#9CA3AF" }),
    []
  );

  const years00a50 = useMemo(() => options00a50(), []);
  const zones00a99 = useMemo(() => options00a99(), []);

  function validarMinimo(): boolean {
    if (!tipoSolicitud) return false;
    if (!aceptaReglamento) return false;

    if (!apellido.trim() || !nombres.trim()) return false;
    if (!mr.trim()) return false;

    // Cabecera mínima
    if (!lugar.trim()) return false;
    if (!fechaLugar.trim()) return false;
    if (!zonaNaval.trim()) return false;

    return true;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setOk(null);
    setErr(null);

    if (!validarMinimo()) {
      errorGenerico();
      return;
    }

    const adjuntos = [
      fidofacFile,
      reciboHaberesFile,
      escriturasYContratosFile,
      ...mascotas.map((m) => m.certificadoFile),
    ];

    const oversizedFile = findOversizedFile(adjuntos, MAX_ANEXO_01_FILE_BYTES);

    if (oversizedFile) {
      setErr(fileTooLargeMessage(MAX_ANEXO_01_FILE_MB));
      return;
    }

    if (totalFileSize(adjuntos) > MAX_ANEXO_01_TOTAL_BYTES) {
      setErr(FILE_TOO_LARGE_413_MESSAGE);
      return;
    }
    
// Compatibilidad: mantenemos los campos legacy
    const lugarYFecha = `${lugar}`.trim() + (fechaLugar ? ` ${fechaLugar}` : "");
    const alSenor = `${autoridadAsignacionFija} - Zona Naval ${zonaNaval}`;

    const datos = {
      // Cabecera (nuevo + compat)
      lugar: lugar || null,
      fechaLugar: fechaLugar || null,
      lugarYFecha: lugarYFecha || null, // compat
      autoridadAsignacion: autoridadAsignacionFija,
      zonaNaval: zonaNaval || null,
      alSenor: alSenor || null, // compat

      tipoSolicitud,

      // Punto 1
      aceptaReglamento,

      // Punto 2
      mr,
      afiliadoOSFA,
      gradoEscalafon,
      apellido,
      nombres,
      destinoActual,
      destinoFuturo,
      telefonoActual,
      telefonoFuturo,

      // Punto 3
      fechaUltimoAscenso,
      aniosServicioRecibo,

      // Punto 4
      agregaFidofac,

      // Punto 5
      convivientes,

      // Punto 6
      mascotas: mascotas.map((m) => ({
        especie: m.especie,
        raza: m.raza,
        edad: m.edad,
        sexo: m.sexo,
        peso: m.peso,
      })),

      // Punto 7
      tienePropiedadesZona,
      propiedades: [prop1, prop2, prop3],
      verificoArticulo506,

      // Punto 8
      tieneProblemasSocio,
      oficioSocio,

      // Punto 9
      agregaCertVacunacion,

      // Punto 10
      ineptoDGPN,

      // Punto 11
      agregaReciboHaberes,

      // Punto 12
      aniosOcupacionPrevia,

      // Punto 13
      representantes: [rep1, rep2],

      // Punto 14–15
      autorizaDescuentos,
      autorizaAdministradorExpensas,

      // Punto 16
      fechaEstimadaTraslado,

      // Agregados resumen
      agregados: {
        fidofac: agregadoFidofac,
        vacunacion: agregadoVacunacion,
        escriturasYContratos: agregadoEscrituras,
        reciboHaberes: agregadoRecibo,
      },
    };

    const fd = new FormData();
    fd.append("datos", JSON.stringify(datos));

    if (fidofacFile) fd.append("adj_fidofac", fidofacFile);
    if (reciboHaberesFile) fd.append("adj_recibo_haberes", reciboHaberesFile);
    if (escriturasYContratosFile)
      fd.append("adj_escrituras_contratos", escriturasYContratosFile);

    // Certificados por mascota (si adjuntan)
    mascotas.forEach((m, idx) => {
      if (m.certificadoFile) fd.append("adj_vacunacion", m.certificadoFile);
    });

    try {
      setLoading(true);
      const resp = await http.post("/formularios/ANEXO_01", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setOk(resp.data?.message || "Formulario enviado.");
      navigate(submitSuccessTo, { replace: true });
    } catch (e: any) {
  console.error("[ANEXO_01] error real:", e);

  const msg =
    e?.response?.status === 413
      ? FILE_TOO_LARGE_413_MESSAGE
      : e?.response?.data?.message ||
        e?.response?.data?.error ||
        "No se ha podido procesar su solicitud, contacte al administrador.";

  setErr(msg);
} finally {
  setLoading(false);
}

  }

  return (
    <div style={pageStyle}>
      <div style={{ ...cardStyle, border: "1px solid rgba(255,255,255,0.14)", marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <div style={{ fontWeight: 900, color: "#F8FAFC" }}>ARMADA ARGENTINA</div>
          <div style={{ fontWeight: 700, color: "#CBD5E1" }}>R.G-6-002 — PÚBLICO</div>
        </div>
        <div style={{ marginTop: 8, fontWeight: 900, fontSize: 16, color: "#F8FAFC" }}>
          ANEXO 01 — FORMULARIO DE INSCRIPCIÓN PARA OCUPAR VIVIENDA FISCAL
        </div>
        <div style={small}>DECLARACIÓN JURADA DE POSTULACIÓN</div>
      </div>

      {subtituloContextual && (
        <div style={{ ...cardStyle, marginBottom: 14, color: "#CBD5E1" }}>
          {subtituloContextual}
        </div>
      )}

      {err && (
        <div
          style={{
            border: "1px solid rgba(239,68,68,0.35)",
            padding: 12,
            marginBottom: 12,
            background: "rgba(127,29,29,0.18)",
            color: "#FCA5A5",
          }}
        >
          {err}
        </div>
      )}
      {ok && (
        <div
          style={{
            border: "1px solid rgba(34,197,94,0.35)",
            padding: 12,
            marginBottom: 12,
            background: "rgba(22,163,74,0.18)",
            color: "#86EFAC",
          }}
        >
          {ok}
        </div>
      )}

      <form onSubmit={onSubmit}>
        <Box>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <Row label="Lugar y fecha:" requiredMark>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 190px",
                  gap: 10,
                }}
              >
                <input
                  value={lugar}
                  onChange={(e) => setLugar(e.target.value)}
                  placeholder="Lugar (ej: Puerto Belgrano)"
                  style={dateControlStyle}
                />
                <input
                  type="date"
                  value={fechaLugar}
                  onChange={(e) => setFechaLugar(e.target.value)}
                  style={dateControlStyle}
                />
              </div>
              <div style={{ marginTop: 6, ...small }}>
                (La fecha usa el mismo formato que el punto 16)
              </div>
            </Row>

            <Row label="Autoridad de Asignación / Zona Naval:" requiredMark>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 120px 110px",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <input
                  value={autoridadAsignacionFija}
                  readOnly
                  style={{ ...controlStyle, background: "rgba(255,255,255,0.08)", color: "#CBD5E1" }}
                />
                <div style={{ fontWeight: 800, fontSize: 13, color: "#CBD5E1" }}>Zona Naval</div>
                <select
                  value={zonaNaval}
                  onChange={(e) => setZonaNaval(e.target.value)}
                  style={selectStyle}
                >
                  <option value="" style={optionStyle}>—</option>
                  {zones00a99.map((z) => (
                    <option key={z} value={z} style={optionStyle}>
                      {z}
                    </option>
                  ))}
                </select>
              </div>
            </Row>
          </div>

          <div style={{ marginTop: 6, ...small }}>
            Marcar con una equis la opción seleccionada que corresponda.
          </div>

          <div
            style={{
              marginTop: 10,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            <label
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                border: "1px solid rgba(255,255,255,0.14)",
                padding: 10,
              }}
            >
              <input
                type="radio"
                disabled={lockTipoSolicitud}
                checked={tipoSolicitud === "INSCRIPCION"}
                onChange={() => setTipoSolicitud("INSCRIPCION")}
              />
              Solicito mi inscripción como postulante para acceder a la ocupación
              de una Vivienda Fiscal.
            </label>

            <label
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                border: "1px solid rgba(255,255,255,0.14)",
                padding: 10,
              }}
            >
              <input
                type="radio"
                disabled={lockTipoSolicitud}
                checked={tipoSolicitud === "CAMBIO_VIVIENDA"}
                onChange={() => setTipoSolicitud("CAMBIO_VIVIENDA")}
              />
              Solicito mi inscripción como postulante para CAMBIO DE VIVIENDA.
            </label>
          </div>

          {lockTipoSolicitud && (
            <div style={{ marginTop: 10, ...small }}>
              Tipo de solicitud fijado por el circuito institucional del rol actual.
            </div>
          )}
        </Box>

        <Box>
          <div style={{ fontWeight: 800, marginBottom: 8, color: "#F8FAFC" }}>
            1. Conozco, cumplo con los requisitos y acepto sin objeción alguna
            las condiciones del Reglamento.
          </div>
          <label style={{ display: "flex", gap: 8, alignItems: "center", color: "#CBD5E1" }}>
            <input
              type="checkbox"
              checked={aceptaReglamento}
              onChange={(e) => setAceptaReglamento(e.target.checked)}
            />
            Acepto el reglamento y declaro bajo juramento que los datos
            consignados son veraces. *
          </label>
        </Box>

        <Box title="2. Mis datos personales son:">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "180px 1fr 220px 1fr",
              gap: 10,
            }}
          >
            <Row label="MR:" requiredMark>
              <input
                value={mr}
                onChange={(e) => setMr(e.target.value)}
                style={dateControlStyle}
              />
            </Row>

            <Row label="Nº Afiliado OSFA:">
              <input
                value={afiliadoOSFA}
                onChange={(e) => setAfiliadoOSFA(e.target.value)}
                style={controlStyle}
              />
            </Row>

            <Row label="Grado y escalafón:">
              <input
                value={gradoEscalafon}
                onChange={(e) => setGradoEscalafon(e.target.value)}
                style={controlStyle}
              />
            </Row>

            <Row label=" ">
              <div />
            </Row>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            <Row label="Apellido:" requiredMark>
              <input
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                style={controlStyle}
              />
            </Row>
            <Row label="Nombres:" requiredMark>
              <input
                value={nombres}
                onChange={(e) => setNombres(e.target.value)}
                style={controlStyle}
              />
            </Row>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            <Row label="Destino actual:">
              <input
                value={destinoActual}
                onChange={(e) => setDestinoActual(e.target.value)}
                style={controlStyle}
              />
            </Row>
            <Row label="Destino futuro:">
              <input
                value={destinoFuturo}
                onChange={(e) => setDestinoFuturo(e.target.value)}
                style={controlStyle}
              />
            </Row>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            <Row label="Teléfono actual:">
              <input
                value={telefonoActual}
                onChange={(e) => setTelefonoActual(e.target.value)}
                style={controlStyle}
              />
            </Row>
            <Row label="Teléfono futuro:">
              <input
                value={telefonoFuturo}
                onChange={(e) => setTelefonoFuturo(e.target.value)}
                style={controlStyle}
              />
            </Row>
          </div>
        </Box>

        <Box>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>
            3. Fecha último ascenso / Años de servicio según Recibo de Haberes
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            <Row label="Fecha último ascenso:">
              <input
                type="date"
                value={fechaUltimoAscenso}
                onChange={(e) => setFechaUltimoAscenso(e.target.value)}
                style={dateControlStyle}
              />
            </Row>

            <Row label="Años de servicio (recibo):">
              <select
                value={aniosServicioRecibo}
                onChange={(e) => setAniosServicioRecibo(e.target.value)}
                style={selectStyle}
              >
                <option value="" style={optionStyle}>—</option>
                {years00a50.map((y) => (
                  <option key={y} value={y} style={optionStyle}>
                    {y}
                  </option>
                ))}
              </select>
            </Row>
          </div>
        </Box>

        <Box>
  <div style={{ fontWeight: 800, marginBottom: 8, color: "#F8FAFC" }}>
    4. Agrego fotocopia autenticada de la FIDOFAC / Actualización de
    FIDOFAC
  </div>
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      gap: 12,
      alignItems: "center",
      flexWrap: "wrap",
    }}
  >
    <YesNoControl value={agregaFidofac} onChange={setAgregaFidofac} />

    <div
      style={{
        display: "flex",
        gap: 10,
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 13, color: "#CBD5E1" }}>
        Adjuntar (opcional):
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <label style={neutralButtonStyle}>
          Elegir archivo
          <input
            type="file"
            onChange={(e) => setFidofacFile(e.target.files?.[0] || null)}
            style={{ display: "none" }}
          />
        </label>

        <div style={{ fontSize: 12, color: "#9CA3AF" }}>
          {fidofacFile ? fidofacFile.name : "No se eligió ningún archivo"}
        </div>
      </div>
    </div>
  </div>
</Box>

        <Box>
          <div style={{ fontWeight: 800, marginBottom: 8, color: "#F8FAFC" }}>
            5. Conviviré con las siguientes personas de cuya conducta y actos
            asumo la absoluta responsabilidad.
          </div>

          <div
            style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}
          >
            <button type="button" style={neutralButtonStyle} onClick={addConviviente}>
              ➕ Agregar renglón
            </button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  {[
                    "APELLIDO Y NOMBRES",
                    "RELACIÓN",
                    "A CARGO (SI/NO)",
                    "EDAD",
                    "DNI",
                    "OSFA",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      style={thStyle}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {convivientes.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      style={{ ...tdStyle, opacity: 0.8, color: "#9CA3AF" }}
                    >
                      Sin renglones. Use “Agregar renglón”.
                    </td>
                  </tr>
                ) : (
                  convivientes.map((c, idx) => (
                    <tr key={`conv_${idx}`}>
                      <td style={tdStyle}>
                        <input
                          value={c.apellidoNombres}
                          onChange={(e) =>
                            updateConviviente(idx, {
                              apellidoNombres: e.target.value,
                            })
                          }
                          style={controlStyle}
                        />
                      </td>
                      <td style={tdStyle}>
                        <select
                          value={c.relacion}
                          onChange={(e) =>
                            updateConviviente(idx, { relacion: e.target.value })
                          }
                          style={selectStyle}
                        >
                          <option value="" style={optionStyle}>—</option>
                          {VINCULOS_FAMILIARES.map((vinculo) => (
                            <option key={vinculo} value={vinculo} style={optionStyle}>
                              {vinculo}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={tdStyle}>
                        <select
                          value={c.aCargo}
                          onChange={(e) =>
                            updateConviviente(idx, {
                              aCargo: e.target.value as any,
                            })
                          }
                          style={selectStyle}
                        >
                          <option value="" style={optionStyle}>—</option>
                          <option value="SI" style={optionStyle}>SI</option>
                          <option value="NO" style={optionStyle}>NO</option>
                        </select>
                      </td>
                      <td style={tdStyle}>
                        <input
                          value={c.edad}
                          onChange={(e) =>
                            updateConviviente(idx, { edad: e.target.value })
                          }
                          style={controlStyle}
                        />
                      </td>
                      <td style={tdStyle}>
                        <input
                          value={c.dni}
                          onChange={(e) =>
                            updateConviviente(idx, { dni: e.target.value })
                          }
                          style={controlStyle}
                        />
                      </td>
                      <td style={tdStyle}>
                        <input
                          value={c.OSFA}
                          onChange={(e) =>
                            updateConviviente(idx, { OSFA: e.target.value })
                          }
                          style={controlStyle}
                        />
                      </td>
                      <td style={tdStyle}>
                        <button
                          type="button"
                          style={dangerButtonStyle}
                          onClick={() => removeConviviente(idx)}
                        >
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Box>

        <Box>
          <div style={{ fontWeight: 800, marginBottom: 8, color: "#F8FAFC" }}>
            6. Animales domésticos (vivienda tipo casa): indicar especie, raza,
            edad, sexo, peso, etc.
          </div>

          <div
            style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}
          >
            <button type="button" style={neutralButtonStyle} onClick={addMascota}>
              ➕ Agregar mascota
            </button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  {[
                    "ESPECIE",
                    "RAZA",
                    "EDAD",
                    "SEXO",
                    "PESO",
                    "CERT. VACUNACIÓN (archivo)",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      style={thStyle}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mascotas.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      style={{ ...tdStyle, opacity: 0.8, color: "#9CA3AF" }}
                    >
                      Sin mascotas cargadas. Use “Agregar mascota”.
                    </td>
                  </tr>
                ) : (
                  mascotas.map((m, idx) => (
                    <tr key={`mas_${idx}`}>
                      <td style={tdStyle}>
                        <input
                          value={m.especie}
                          onChange={(e) =>
                            updateMascota(idx, { especie: e.target.value })
                          }
                          style={controlStyle}
                        />
                      </td>
                      <td style={tdStyle}>
                        <input
                          value={m.raza}
                          onChange={(e) =>
                            updateMascota(idx, { raza: e.target.value })
                          }
                          style={controlStyle}
                        />
                      </td>
                      <td style={tdStyle}>
                        <input
                          value={m.edad}
                          onChange={(e) =>
                            updateMascota(idx, { edad: e.target.value })
                          }
                          style={controlStyle}
                        />
                      </td>
                      <td style={tdStyle}>
                        <input
                          value={m.sexo}
                          onChange={(e) =>
                            updateMascota(idx, { sexo: e.target.value })
                          }
                          style={controlStyle}
                        />
                      </td>
                      <td style={tdStyle}>
                        <input
                          value={m.peso}
                          onChange={(e) =>
                            updateMascota(idx, { peso: e.target.value })
                          }
                          style={controlStyle}
                        />
                      </td>
                      <td style={tdStyle}>
                        <div style={{ minWidth: 220 }}>
                          <input
                            type="file"
                            onChange={(e) =>
                              updateMascota(idx, {
                                certificadoFile: e.target.files?.[0] || null,
                              })
                            }
                            style={fileInputStyle}
                          />
                          {m.certificadoFile && (
                            <div style={fileNameStyle}>{m.certificadoFile.name}</div>
                          )}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <button
                          type="button"
                          style={dangerButtonStyle}
                          onClick={() => removeMascota(idx)}
                        >
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Box>

        <Box>
          <div style={{ fontWeight: 800, marginBottom: 8, color: "#F8FAFC" }}>
            7. Soy (o familiares a cargo) propietario de viviendas en la zona
            naval de interés. En caso afirmativo agrego escrituras y contratos.
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <YesNoControl
              value={tienePropiedadesZona}
              onChange={setTienePropiedadesZona}
            />
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "#CBD5E1" }}>
                Adjuntar escrituras/contratos:
              </div>
              <div style={{ minWidth: 260, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
  <label style={neutralButtonStyle}>
    Elegir archivo
    <input
      type="file"
      onChange={(e) =>
        setEscriturasYContratosFile(e.target.files?.[0] || null)
      }
      style={{ display: "none" }}
    />
  </label>

  <div style={{ fontSize: 12, color: "#9CA3AF" }}>
    {escriturasYContratosFile
      ? escriturasYContratosFile.name
      : "No se eligió ningún archivo"}
  </div>
</div>
                {escriturasYContratosFile && (
                  <div style={fileNameStyle}>{escriturasYContratosFile.name}</div>
                )}
              </div>
            </div>
          </div>

          <div
            style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr", gap: 10 }}
          >
            <div style={{ border: "1px solid rgba(255,255,255,0.14)", padding: 10 }}>
              <div style={{ fontWeight: 700, marginBottom: 6, color: "#CBD5E1" }}>Dirección I</div>
              <input
                value={prop1.direccion}
                onChange={(e) =>
                  setProp1((p) => ({ ...p, direccion: e.target.value }))
                }
                style={controlStyle}
              />
              <div style={{ fontWeight: 700, marginTop: 8, marginBottom: 6 }}>
                Observaciones
              </div>
              <input
                value={prop1.observaciones}
                onChange={(e) =>
                  setProp1((p) => ({ ...p, observaciones: e.target.value }))
                }
                style={controlStyle}
              />
            </div>

            <div style={{ border: "1px solid rgba(255,255,255,0.14)", padding: 10 }}>
              <div style={{ fontWeight: 700, marginBottom: 6, color: "#CBD5E1" }}>
                Dirección II
              </div>
              <input
                value={prop2.direccion}
                onChange={(e) =>
                  setProp2((p) => ({ ...p, direccion: e.target.value }))
                }
                style={controlStyle}
              />
              <div style={{ fontWeight: 700, marginTop: 8, marginBottom: 6 }}>
                Observaciones
              </div>
              <input
                value={prop2.observaciones}
                onChange={(e) =>
                  setProp2((p) => ({ ...p, observaciones: e.target.value }))
                }
                style={controlStyle}
              />
            </div>

            <div style={{ border: "1px solid rgba(255,255,255,0.14)", padding: 10 }}>
              <div style={{ fontWeight: 700, marginBottom: 6, color: "#CBD5E1" }}>
                Dirección III
              </div>
              <input
                value={prop3.direccion}
                onChange={(e) =>
                  setProp3((p) => ({ ...p, direccion: e.target.value }))
                }
                style={controlStyle}
              />
              <div style={{ fontWeight: 700, marginTop: 8, marginBottom: 6 }}>
                Observaciones
              </div>
              <input
                value={prop3.observaciones}
                onChange={(e) =>
                  setProp3((p) => ({ ...p, observaciones: e.target.value }))
                }
                style={controlStyle}
              />
            </div>
          </div>

          <div
            style={{
              marginTop: 10,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ fontWeight: 800, color: "#F8FAFC" }}>
              Verificó el contenido del Artículo 5.06., incisos 3 y 4.
            </div>
            <YesNoControl value={verificoArticulo506} onChange={setVerificoArticulo506} />
          </div>
        </Box>

        <Box>
          <div style={{ fontWeight: 800, marginBottom: 8, color: "#F8FAFC" }}>
            8. Tengo problemas socioeconómicos atendibles e inicié el trámite
            correspondiente por Oficio:
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <YesNoControl value={tieneProblemasSocio} onChange={setTieneProblemasSocio} />
            <input
              value={oficioSocio}
              onChange={(e) => setOficioSocio(e.target.value)}
              placeholder="Oficio: ..."
              style={{ ...controlStyle, width: "55%" }}
            />
          </div>
        </Box>

        <Box>
          <div style={{ fontWeight: 800, marginBottom: 8, color: "#F8FAFC" }}>
            9. Agrego certificado de vacunación de los animales domésticos
            mencionados en punto 6.
          </div>
          <YesNoControl value={agregaCertVacunacion} onChange={setAgregaCertVacunacion} />
        </Box>

        <Box>
          <div style={{ fontWeight: 800, marginBottom: 8, color: "#F8FAFC" }}>
            10. Me encuentro declarado “INEPTO” por la Dirección General del
            Personal Naval para ocupar viviendas fiscales.
          </div>
          <YesNoControl value={ineptoDGPN} onChange={setIneptoDGPN} />
        </Box>

        <Box>
  <div style={{ fontWeight: 800, marginBottom: 8, color: "#F8FAFC" }}>
    11. Agrego fotocopia de mi último Recibo de Haberes.
  </div>
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
      flexWrap: "wrap",
    }}
  >
    <YesNoControl
      value={agregaReciboHaberes}
      onChange={setAgregaReciboHaberes}
    />

    <div
      style={{
        display: "flex",
        gap: 10,
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <div style={{ fontWeight: 700, fontSize: 13, color: "#CBD5E1" }}>
        Adjuntar:
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <label style={neutralButtonStyle}>
          Elegir archivo
          <input
            type="file"
            onChange={(e) =>
              setReciboHaberesFile(e.target.files?.[0] || null)
            }
            style={{ display: "none" }}
          />
        </label>

        <div style={{ fontSize: 12, color: "#9CA3AF" }}>
          {reciboHaberesFile
            ? reciboHaberesFile.name
            : "No se eligió ningún archivo"}
        </div>
      </div>
    </div>
  </div>
</Box>

        <Box>
          <div style={{ fontWeight: 800, marginBottom: 8, color: "#F8FAFC" }}>
            12. Total de años de ocupación previa en la zona naval solicitada:
          </div>
          <select
            value={aniosOcupacionPrevia}
            onChange={(e) => setAniosOcupacionPrevia(e.target.value)}
            style={selectStyle}
          >
            <option value="" style={optionStyle}>—</option>
            {years00a50.map((y) => (
              <option key={y} value={y} style={optionStyle}>
                {y}
              </option>
            ))}
          </select>
        </Box>

        {/* TODO: resto del formulario queda igual */}
        {/* Para mantener este mensaje legible, no toqué el resto del layout. */}
        {/* Pegá el archivo completo tal como está aquí: ya incluye todo. */}

        {/* 13..16 y footer: se mantienen exactamente como tu versión original,
            salvo que el punto 16 ya era date (sin cambios). */}

        {/* ↓↓↓ A PARTIR DE AQUÍ SIGUE TU CÓDIGO ORIGINAL SIN CAMBIOS ↓↓↓ */}

        <Box>
          <div style={{ fontWeight: 800, marginBottom: 8, color: "#F8FAFC" }}>
            13. Si no me encuentro presente el día de la asignación, autorizo
            como representante(s):
          </div>

          <div style={{ border: "1px solid rgba(255,255,255,0.14)", padding: 10, marginBottom: 10 }}>
            <div style={{ fontWeight: 800, marginBottom: 8, color: "#F8FAFC" }}>REPRESENTANTE I</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 160px", gap: 10 }}>
              <Row label="Apellido y nombres:">
                <input
                  value={rep1.apellidoNombres}
                  onChange={(e) => setRep1((p) => ({ ...p, apellidoNombres: e.target.value }))}
                  style={controlStyle}
                />
              </Row>
              <Row label="Grado:">
                <input
                  value={rep1.grado}
                  onChange={(e) => setRep1((p) => ({ ...p, grado: e.target.value }))}
                  style={controlStyle}
                />
              </Row>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 200px", gap: 10 }}>
              <Row label="M.R.:">
                <input
                  value={rep1.mr}
                  onChange={(e) => setRep1((p) => ({ ...p, mr: e.target.value }))}
                  style={controlStyle}
                />
              </Row>
              <Row label="Destino:">
                <input
                  value={rep1.destino}
                  onChange={(e) => setRep1((p) => ({ ...p, destino: e.target.value }))}
                  style={controlStyle}
                />
              </Row>
              <Row label="Teléfono:">
                <input
                  value={rep1.telefono}
                  onChange={(e) => setRep1((p) => ({ ...p, telefono: e.target.value }))}
                  style={controlStyle}
                />
              </Row>
            </div>
          </div>

          <div style={{ border: "1px solid rgba(255,255,255,0.14)", padding: 10 }}>
            <div style={{ fontWeight: 800, marginBottom: 8, color: "#F8FAFC" }}>REPRESENTANTE II</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 160px", gap: 10 }}>
              <Row label="Apellido y nombres:">
                <input
                  value={rep2.apellidoNombres}
                  onChange={(e) => setRep2((p) => ({ ...p, apellidoNombres: e.target.value }))}
                  style={controlStyle}
                />
              </Row>
              <Row label="Grado:">
                <input
                  value={rep2.grado}
                  onChange={(e) => setRep2((p) => ({ ...p, grado: e.target.value }))}
                  style={controlStyle}
                />
              </Row>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "160px 1fr 200px", gap: 10 }}>
              <Row label="M.R.:">
                <input
                  value={rep2.mr}
                  onChange={(e) => setRep2((p) => ({ ...p, mr: e.target.value }))}
                  style={controlStyle}
                />
              </Row>
              <Row label="Destino:">
                <input
                  value={rep2.destino}
                  onChange={(e) => setRep2((p) => ({ ...p, destino: e.target.value }))}
                  style={controlStyle}
                />
              </Row>
              <Row label="Teléfono:">
                <input
                  value={rep2.telefono}
                  onChange={(e) => setRep2((p) => ({ ...p, telefono: e.target.value }))}
                  style={controlStyle}
                />
              </Row>
            </div>
          </div>

          <div style={{ marginTop: 8, ...small }}>
            Acepto todas las decisiones que el/los representante/s tome/n respecto a la elección que haga/n.
          </div>
        </Box>

        <Box>
          <div style={{ fontWeight: 800, marginBottom: 8, color: "#F8FAFC" }}>
            14. Autorizo descuentos de compensaciones por uso (Alquiler/Mantenimiento/Reparaciones/Expensas) del haber mensual.
          </div>
          <label style={{ display: "flex", gap: 8, alignItems: "center", color: "#CBD5E1" }}>
            <input
              type="checkbox"
              checked={autorizaDescuentos}
              onChange={(e) => setAutorizaDescuentos(e.target.checked)}
            />
            Autorizo descuentos.
          </label>
        </Box>

        <Box>
          <div style={{ fontWeight: 800, marginBottom: 8, color: "#F8FAFC" }}>
            15. Autorizo administración de expensas comunes por Administrador bajo supervisión del Organismo Administrador.
          </div>
          <label style={{ display: "flex", gap: 8, alignItems: "center", color: "#CBD5E1" }}>
            <input
              type="checkbox"
              checked={autorizaAdministradorExpensas}
              onChange={(e) => setAutorizaAdministradorExpensas(e.target.checked)}
            />
            Autorizo administración de expensas.
          </label>
        </Box>

        <Box>
          <div style={{ fontWeight: 800, marginBottom: 8, color: "#F8FAFC" }}>
            16. Fecha estimada de traslado a la zona:
          </div>
          <input
            type="date"
            value={fechaEstimadaTraslado}
            onChange={(e) => setFechaEstimadaTraslado(e.target.value)}
            style={dateControlStyle}
          />
        </Box>

        <Box title="AGREGADOS (marcar SI/NO)">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 10 }}>
            <div>1. Fotocopia autenticada de la FIDOFAC.</div>
            <div style={{ textAlign: "right", fontWeight: 800 }}>{agregadoFidofac || "—"}</div>

            <div>2. Certificados de vacunación de animales domésticos.</div>
            <div style={{ textAlign: "right", fontWeight: 800 }}>{agregadoVacunacion || "—"}</div>

            <div>3. Copia de escrituras y/o contratos de locación (si corresponde).</div>
            <div style={{ textAlign: "right", fontWeight: 800 }}>{agregadoEscrituras || "—"}</div>

            <div>4. Fotocopia del último Recibo de Haberes.</div>
            <div style={{ textAlign: "right", fontWeight: 800 }}>{agregadoRecibo || "—"}</div>
          </div>
        </Box>

        <div style={{ borderTop: "1px solid rgba(255,255,255,0.12)", marginTop: 14, paddingTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
            <button type="button" style={neutralButtonStyle} onClick={() => navigate(returnTo)}>
              Cancelar
            </button>

            <button type="submit" style={primaryButtonStyle} disabled={loading}>
              {loading ? "Enviando..." : "Enviar ANEXO 01"}
            </button>
          </div>

          <div style={{ marginTop: 16, textAlign: "right", fontWeight: 800, color: "#CBD5E1" }}>
            Firma del Solicitante
          </div>
        </div>
      </form>
    </div>
  );
}
