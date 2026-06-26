import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { http } from "../../api/http";

type PreviewResponse = {
  usuario?: any;
  anexo01Base?: any;
  ultimo?: any;
  historial?: any[];
  datosHistoricos?: Record<string, any>;
  datosVigentes?: Record<string, any>;
  diferencias?: Array<{ campo: string; historico: any; vigente: any; cambio: boolean }>;
};

const CAMPOS = [
  ["gradoEscalafon", "Grado / Escalafon"],
  ["matricula", "Matricula"],
  ["apellido", "Apellido"],
  ["nombres", "Nombres"],
  ["destinoActual", "Destino actual"],
  ["telefonoActual", "Telefono actual"],
  ["aniosServicioRecibo", "Anios de servicio"],
  ["convivientes", "Convivientes"],
  ["mascotas", "Mascotas"],
] as const;

function up(value: unknown) {
  return String(value || "").toUpperCase().trim();
}

function text(value: unknown) {
  const raw = String(value ?? "").trim();
  return raw || "-";
}

function tipoPersonalLabel(value: unknown) {
  const tipo = up(value);
  if (tipo === "OF") return "Oficial";
  if (tipo === "SO") return "Suboficial";
  return text(value);
}

function grupoJerarquicoLabel(value: unknown) {
  const grupo = up(value);
  if (grupo === "OF") return "Oficiales";
  if (grupo === "SB_CP") return "Suboficiales / Cabos Principales";
  if (grupo === "CB") return "Cabos";
  if (grupo === "TR") return "Tropa";
  return text(value);
}

function formatDate(value: unknown) {
  if (!value) return "-";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("es-AR");
}

function valueSummary(value: any): string {
  if (Array.isArray(value)) {
    if (!value.length) return "Sin registros";
    return `${value.length} registro(s)`;
  }
  if (value && typeof value === "object") return JSON.stringify(value);
  return text(value);
}

function renderList(value: any, empty: string) {
  if (!Array.isArray(value) || value.length === 0) return <div style={mutedStyle}>{empty}</div>;
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {value.map((item, index) => (
        <div key={index} style={miniCardStyle}>
          {item && typeof item === "object" ? (
            Object.entries(item)
              .filter(([, v]) => String(v ?? "").trim())
              .map(([k, v]) => (
                <div key={k}>
                  <b>{k}:</b> {String(v)}
                </div>
              ))
          ) : (
            <div>{String(item ?? "")}</div>
          )}
        </div>
      ))}
    </div>
  );
}

const pageStyle: CSSProperties = {
  color: "#E5E7EB",
  display: "grid",
  gap: 16,
};

const cardStyle: CSSProperties = {
  border: "1px solid #334155",
  borderRadius: 12,
  background: "#020817",
  padding: 16,
};

const sectionTitleStyle: CSSProperties = {
  margin: "0 0 12px",
  color: "#F8FAFC",
  fontSize: 18,
};

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
};

const fieldStyle: CSSProperties = {
  border: "1px solid rgba(148,163,184,0.28)",
  borderRadius: 10,
  padding: 10,
  background: "rgba(15,23,42,0.72)",
};

const labelStyle: CSSProperties = {
  color: "#94A3B8",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  fontWeight: 800,
  marginBottom: 5,
};

const mutedStyle: CSSProperties = {
  color: "#94A3B8",
};

const buttonStyle: CSSProperties = {
  padding: "9px 12px",
  borderRadius: 9,
  border: "1px solid rgba(96,165,250,0.55)",
  background: "rgba(37,99,235,0.16)",
  color: "#BFDBFE",
  fontWeight: 800,
  cursor: "pointer",
};

const miniCardStyle: CSSProperties = {
  border: "1px solid rgba(148,163,184,0.24)",
  borderRadius: 8,
  padding: 10,
  background: "rgba(15,23,42,0.6)",
  lineHeight: 1.55,
};

function Field({ label, value }: { label: string; value: unknown }) {
  return (
    <div style={fieldStyle}>
      <div style={labelStyle}>{label}</div>
      <div>{text(value)}</div>
    </div>
  );
}

function DatosGrid({ datos }: { datos: Record<string, any> }) {
  return (
    <div style={gridStyle}>
      {CAMPOS.filter(([key]) => key !== "convivientes" && key !== "mascotas").map(([key, label]) => (
        <Field key={key} label={label} value={datos?.[key]} />
      ))}
    </div>
  );
}

export default function UsuarioDatosDeclaradosPreview() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<PreviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await http.get(`/formularios/mis-datos-declarados/usuario/${userId}/preview`);
        if (alive) setData(res.data || null);
      } catch (e: any) {
        if (alive) setError(String(e?.response?.data?.message || "No se pudo cargar la vista previa."));
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [userId]);

  const usuario = data?.usuario || {};
  const historicos = data?.datosHistoricos || {};
  const vigentes = data?.datosVigentes || {};
  const diferencias = data?.diferencias || [];
  const historial = data?.historial || [];
  const anexo01 = data?.anexo01Base || null;
  const usuariosPath = location.pathname.startsWith("/app/admin/") ? "/app/admin/usuarios" : "/app/admin-general/usuarios";
  const gestionesPath = location.pathname.startsWith("/app/admin/") ? "/app/admin/gestiones" : "/app/admin-general/gestiones";

  const changedCount = useMemo(() => diferencias.filter((d) => d.cambio).length, [diferencias]);

  if (loading) return <p style={mutedStyle}>Cargando datos declarados...</p>;

  if (error) {
    return (
      <div style={pageStyle}>
        <button type="button" onClick={() => navigate(usuariosPath)} style={buttonStyle}>
          Volver a Usuarios
        </button>
        <div style={{ ...cardStyle, borderColor: "#7F1D1D", color: "#FCA5A5" }}>{error}</div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ margin: 0, color: "#F8FAFC", fontSize: 28 }}>Datos declarados</h1>
          <div style={mutedStyle}>{text(usuario.apellido)} {text(usuario.nombre || usuario.nombres)}</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={() => window.open(`/api/formularios/mis-datos-declarados/usuario/${userId}/preview/pdf`, "_blank")} style={buttonStyle}>
            PDF completo
          </button>
          <button type="button" onClick={() => navigate(usuariosPath)} style={buttonStyle}>
            Volver a Usuarios
          </button>
        </div>
      </div>

      <section style={cardStyle}>
        <h2 style={sectionTitleStyle}>Usuario</h2>
        <div style={gridStyle}>
          <Field label="Apellido y nombres" value={`${text(usuario.apellido)} ${text(usuario.nombre || usuario.nombres)}`} />
          <Field label="Email" value={usuario.email} />
          <Field label="Matricula" value={usuario.matricula} />
          <Field label="Rol" value={usuario.role} />
          <Field label="Tipo de personal" value={tipoPersonalLabel(usuario.tipoPersonal)} />
          <Field label="Grupo jerarquico" value={grupoJerarquicoLabel(usuario.grupoJerarquico)} />
          <Field label="Activo" value={usuario.activo === false ? "No" : "Si"} />
          <Field label="Archivado" value={usuario.archivado ? "Si" : "No"} />
          <Field label="Bloqueado" value={usuario.bloqueado ? "Si" : "No"} />
        </div>
      </section>

      <section style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <h2 style={sectionTitleStyle}>Declaracion historica ANEXO_01</h2>
          {anexo01?._id ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" style={buttonStyle} onClick={() => navigate(`${gestionesPath}/${anexo01._id}`)}>
                Ver ANEXO_01
              </button>
              <button type="button" style={buttonStyle} onClick={() => window.open(`/api/formularios/${anexo01._id}/pdf`, "_blank") }>
                PDF ANEXO_01
              </button>
            </div>
          ) : null}
        </div>
        <div style={gridStyle}>
          <Field label="ID ANEXO_01" value={anexo01?._id} />
          <Field label="Estado" value={anexo01?.estado || anexo01?.estadoInstitucional} />
          <Field label="Creacion" value={formatDate(anexo01?.createdAt)} />
        </div>
        <div style={{ marginTop: 12 }}><DatosGrid datos={historicos} /></div>
        <div style={{ marginTop: 14 }}>
          <h3 style={sectionTitleStyle}>Convivientes</h3>
          {renderList(historicos.convivientes, "Sin convivientes declarados")}
        </div>
        <div style={{ marginTop: 14 }}>
          <h3 style={sectionTitleStyle}>Mascotas</h3>
          {renderList(historicos.mascotas, "Sin mascotas declaradas")}
        </div>
      </section>

      <section style={cardStyle}>
        <h2 style={sectionTitleStyle}>Dato vigente institucional</h2>
        <DatosGrid datos={vigentes} />
        <div style={{ marginTop: 14 }}>
          <h3 style={sectionTitleStyle}>Convivientes</h3>
          {renderList(vigentes.convivientes, "Sin convivientes vigentes")}
        </div>
        <div style={{ marginTop: 14 }}>
          <h3 style={sectionTitleStyle}>Mascotas</h3>
          {renderList(vigentes.mascotas, "Sin mascotas vigentes")}
        </div>
      </section>

      <section style={cardStyle}>
        <h2 style={sectionTitleStyle}>Cambios detectados ({changedCount})</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
            <thead>
              <tr>
                {["Campo", "ANEXO_01 historico", "Dato vigente"].map((h) => (
                  <th key={h} style={{ textAlign: "left", padding: 10, border: "1px solid #334155", color: "#F8FAFC", background: "#0F172A" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {diferencias.map((d) => (
                <tr key={d.campo} style={{ background: d.cambio ? "rgba(245,158,11,0.14)" : "transparent" }}>
                  <td style={{ padding: 10, border: "1px solid #334155", fontWeight: 800 }}>{CAMPOS.find(([k]) => k === d.campo)?.[1] || d.campo}</td>
                  <td style={{ padding: 10, border: "1px solid #334155" }}>{valueSummary(d.historico)}</td>
                  <td style={{ padding: 10, border: "1px solid #334155" }}>{valueSummary(d.vigente)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section style={cardStyle}>
        <h2 style={sectionTitleStyle}>Historial de Mis Datos Declarados</h2>
        {!historial.length ? <div style={mutedStyle}>Sin actualizaciones registradas.</div> : null}
        <div style={{ display: "grid", gap: 12 }}>
          {historial.map((item) => (
            <div key={String(item._id)} style={miniCardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <b>{formatDate(item.createdAt)}</b>
                  <div style={mutedStyle}>Estado: {text(item.estado)} | Motivo: {text(item.motivo)} | Resumen: {text(item.resumen)}</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" style={buttonStyle} onClick={() => window.open(`/api/formularios/mis-datos-declarados/${item._id}/pdf/preview`, "_blank")}>Ver</button>
                  <button type="button" style={buttonStyle} onClick={() => window.open(`/api/formularios/mis-datos-declarados/${item._id}/pdf`, "_blank")}>PDF</button>
                </div>
              </div>
              <div style={{ marginTop: 10 }}>
                <div style={labelStyle}>Datos actualizados</div>
                <pre style={{ whiteSpace: "pre-wrap", margin: 0, color: "#CBD5E1" }}>{JSON.stringify(item.datosActualizados || {}, null, 2)}</pre>
              </div>
              <div style={{ marginTop: 10 }}>
                <div style={labelStyle}>Datos efectivos por registro</div>
                <pre style={{ whiteSpace: "pre-wrap", margin: 0, color: "#CBD5E1" }}>{JSON.stringify(item.datosEfectivos || {}, null, 2)}</pre>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}