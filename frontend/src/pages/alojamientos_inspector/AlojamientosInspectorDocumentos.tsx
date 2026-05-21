import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "../../api/http";
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
};

const CODIGOS = ["ANEXO_21", "ANEXO_22", "ANEXO_23", "ANEXO_24"];
const ESTADOS = ["BORRADOR", "ANULADO", "ENVIADO", "EN_REVISION", "CERRADO"];

function safe(value: unknown, fallback = "-") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function normalize(value: unknown) {
  return String(value || "").trim().toLowerCase();
}

function fmtDate(value: unknown) {
  if (!value) return "-";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("es-AR");
}

function personaFromRef(value: UsuarioRef) {
  if (!value || typeof value === "string") return "";
  const nombre = [value.apellido, value.nombre].filter(Boolean).join(" ").trim();
  return nombre || String(value.email || "").trim();
}

function personaLabel(doc: AlojamientoDocumento) {
  const datos = doc.datos || {};
  const datosLabel =
    safe(datos.huesped?.nombreCompleto, "") ||
    safe(datos.huesped?.postulanteNombre, "") ||
    safe(datos.apellidoNombre, "") ||
    safe(datos.nombreCompleto, "") ||
    safe(datos.postulanteNombre, "") ||
    safe(datos.titularNombre, "");
  if (datosLabel) return datosLabel;

  const usuarioLabel = [doc.usuario?.apellido, doc.usuario?.nombre].filter(Boolean).join(" ").trim();
  if (usuarioLabel) return usuarioLabel;

  return personaFromRef(doc.solicitante) || personaFromRef(doc.alojado) || "Sin identificar";
}

function alojamientoLabel(doc: AlojamientoDocumento) {
  const datos = doc.datos || {};
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

const inputStyle: CSSProperties = {
  width: "100%",
  minHeight: 40,
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.04)",
  color: "#ffffff",
  boxSizing: "border-box",
};

const optionStyle: CSSProperties = {
  backgroundColor: "#111827",
  color: "#ffffff",
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

export default function AlojamientosInspectorDocumentos() {
  const navigate = useNavigate();
  const basePath = "/app/permisionario/alojamientos-inspector";
  const [items, setItems] = useState<AlojamientoDocumento[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [codigo, setCodigo] = useState("");
  const [estado, setEstado] = useState("");
  const [busqueda, setBusqueda] = useState("");

  const filtrados = useMemo(() => {
    const q = normalize(busqueda);
    if (!q) return items;

    return items.filter((doc) => {
      const texto = [
        doc.codigo,
        doc.estado,
        doc.estadoInstitucional,
        personaLabel(doc),
        alojamientoLabel(doc),
        doc.datos?.lugar,
        doc.datos?.destinoActual,
      ]
        .map(normalize)
        .join(" ");

      return texto.includes(q);
    });
  }, [busqueda, items]);

  async function cargar() {
    setLoading(true);
    setErrorMsg("");

    try {
      const params: Record<string, string | number> = {
        limit: 100,
        page: 1,
        sort: "-updatedAt",
      };
      if (codigo) params.codigo = codigo;
      if (estado) params.estado = estado;

      const res = await http.get("/alojamientos-documentos", { params });
      const list = Array.isArray(res.data?.documentos) ? res.data.documentos : [];
      setItems(list);
    } catch {
      setItems([]);
      setErrorMsg("No es posible cargar los documentos territoriales en este momento.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codigo, estado]);

  return (
    <section style={cardStyle}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={titleStyle}>Documentos territoriales</h2>
          <p style={subtitleStyle}>
            Consulta readonly de documentos de alojamientos dentro de los territorios asignados.
          </p>
        </div>
        <button
          type="button"
          onClick={cargar}
          disabled={loading}
          style={{ ...badgeStyle, minHeight: 36, cursor: loading ? "not-allowed" : "pointer" }}
        >
          {loading ? "Actualizando..." : "Actualizar"}
        </button>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginTop: 18,
        }}
      >
        <label>
          <span style={metaStyle}>Codigo</span>
          <select value={codigo} onChange={(event) => setCodigo(event.target.value)} style={inputStyle}>
            <option value="" style={optionStyle}>Todos</option>
            {CODIGOS.map((item) => (
              <option key={item} value={item} style={optionStyle}>{item}</option>
            ))}
          </select>
        </label>

        <label>
          <span style={metaStyle}>Estado</span>
          <select value={estado} onChange={(event) => setEstado(event.target.value)} style={inputStyle}>
            <option value="" style={optionStyle}>Todos</option>
            {ESTADOS.map((item) => (
              <option key={item} value={item} style={optionStyle}>{item}</option>
            ))}
          </select>
        </label>

        <label>
          <span style={metaStyle}>Busqueda</span>
          <input
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            placeholder="Postulante, lugar, codigo..."
            style={inputStyle}
          />
        </label>
      </div>

      {errorMsg && (
        <div style={{ ...softCardStyle, marginTop: 16, color: "#fecaca" }}>
          {errorMsg}
        </div>
      )}

      <div style={{ ...softCardStyle, marginTop: 16, overflowX: "auto" }}>
        <div style={{ ...sectionTitleStyle, marginBottom: 10 }}>
          Resultados: {filtrados.length}
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
          <thead>
            <tr>
              <th style={thStyle}>Codigo</th>
              <th style={thStyle}>Estado</th>
              <th style={thStyle}>Postulante / alojado</th>
              <th style={thStyle}>Alojamiento / plaza</th>
              <th style={thStyle}>Fecha</th>
              <th style={thStyle}>Detalle</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td style={tdStyle} colSpan={6}>Cargando documentos...</td>
              </tr>
            )}
            {!loading && filtrados.length === 0 && (
              <tr>
                <td style={tdStyle} colSpan={6}>No hay documentos para los filtros seleccionados.</td>
              </tr>
            )}
            {!loading && filtrados.map((doc) => (
              <tr key={doc._id}>
                <td style={{ ...tdStyle, fontWeight: 800, color: "#ffffff" }}>{safe(doc.codigo)}</td>
                <td style={tdStyle}>
                  {safe(doc.estado)}
                  {doc.estadoInstitucional ? <div style={metaStyle}>{doc.estadoInstitucional}</div> : null}
                </td>
                <td style={tdStyle}>{personaLabel(doc)}</td>
                <td style={tdStyle}>{alojamientoLabel(doc)}</td>
                <td style={tdStyle}>
                  {fmtDate(doc.updatedAt || doc.createdAt)}
                  <div style={metaStyle}>Actualizacion / creacion</div>
                </td>
                <td style={tdStyle}>
                  <button
                    type="button"
                    onClick={() => navigate(`${basePath}/documentos/${doc._id}`)}
                    style={{ ...badgeStyle, cursor: "pointer" }}
                  >
                    Ver detalle
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
