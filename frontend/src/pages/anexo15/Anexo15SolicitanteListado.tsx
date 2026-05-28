import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  crearAnexo15,
  listarMisAnexo15,
  type Anexo15Documento,
  type Anexo15FormData,
} from "../../api/anexo15";
import Anexo15Form from "../../components/anexo15/Anexo15Form";
import {
  badgeStyle,
  buttonRowStyle,
  cardStyle,
  pageStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  sectionTitleStyle,
  shellStyle,
  softCardStyle,
  subtitleStyle,
  titleStyle,
} from "../permisionario/uiStyles";

function fmtDate(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString("es-AR");
}

export default function Anexo15SolicitanteListado({ basePath }: { basePath: string }) {
  const navigate = useNavigate();
  const [docs, setDocs] = useState<Anexo15Documento[]>([]);
  const [form, setForm] = useState<Anexo15FormData>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function cargar() {
    setLoading(true);
    setError("");
    try {
      setDocs(await listarMisAnexo15());
    } catch {
      setError("No es posible obtener solicitudes.");
    } finally {
      setLoading(false);
    }
  }

  async function crear() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const doc = await crearAnexo15(form);
      navigate(`${basePath}/${doc.token}`);
    } catch {
      setError("No es posible crear la solicitud. Verifique vivienda u ocupacion activa.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    cargar();
  }, []);

  return (
    <div style={pageStyle}>
      <div style={shellStyle}>
        <section style={cardStyle}>
          <h1 style={titleStyle}>Reintegros</h1>
          <p style={subtitleStyle}>Gestion de solicitudes de reintegro.</p>
        </section>

        {error ? <section style={{ ...cardStyle, marginTop: 12, color: "#fecaca" }}>{error}</section> : null}

        <section style={{ ...cardStyle, marginTop: 12 }}>
          <h2 style={sectionTitleStyle}>Nueva solicitud de reintegro</h2>
          <Anexo15Form value={form} onChange={setForm} readOnly={busy} />
          <div style={buttonRowStyle}>
            <button type="button" style={primaryButtonStyle} onClick={crear} disabled={busy}>
              {busy ? "Creando..." : "Crear borrador"}
            </button>
          </div>
        </section>

        <section style={{ ...cardStyle, marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <h2 style={sectionTitleStyle}>Mis solicitudes</h2>
            <button type="button" style={secondaryButtonStyle} onClick={cargar} disabled={loading}>
              {loading ? "Cargando..." : "Actualizar"}
            </button>
          </div>

          {!loading && !docs.length ? <div style={softCardStyle}>Sin solicitudes registradas.</div> : null}
          <div style={{ display: "grid", gap: 10 }}>
            {docs.map((doc) => (
              <div key={doc.token} style={softCardStyle}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <strong>{doc.codigo}</strong>
                  <span style={badgeStyle}>{doc.estado}</span>
                </div>
                <div style={{ marginTop: 8, color: "rgba(255,255,255,0.72)" }}>
                  Actualizado: {fmtDate(doc.updatedAt)}
                </div>
                <div style={buttonRowStyle}>
                  <button type="button" style={primaryButtonStyle} onClick={() => navigate(`${basePath}/${doc.token}`)}>
                    Ver
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
