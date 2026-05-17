import { useNavigate } from "react-router-dom";
import {
  cardStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  subtitleStyle,
  titleStyle,
} from "../permisionario/uiStyles";

const pageStyle = {
  maxWidth: 980,
  margin: "0 auto",
  padding: "clamp(12px, 2vw, 24px)",
  color: "#F8FAFC",
  boxSizing: "border-box" as const,
};

const gridStyle = {
  marginTop: 18,
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(min(260px, 100%), 1fr))",
  gap: 14,
};

const cardHeaderStyle = {
  margin: 0,
  color: "#ffffff",
  fontSize: 20,
  fontWeight: 850,
};

const cardTextStyle = {
  marginTop: 10,
  marginBottom: 0,
  color: "rgba(255,255,255,0.72)",
  lineHeight: 1.55,
};

export default function PostulacionesDashboard() {
  const navigate = useNavigate();

  return (
    <div style={pageStyle}>
      <h1 style={titleStyle}>Postulaciones</h1>
      <p style={subtitleStyle}>Seleccione el tipo de solicitud habitacional que desea iniciar.</p>

      <div style={gridStyle}>
        <section style={cardStyle}>
          <h2 style={cardHeaderStyle}>Solicitar Vivienda Fiscal</h2>
          <p style={cardTextStyle}>
            Inicia el flujo institucional vigente de inscripción para ocupar vivienda fiscal.
          </p>
          <div style={{ marginTop: 16 }}>
            <button
              type="button"
              style={primaryButtonStyle}
              onClick={() => navigate("/app/postulante/anexo-01")}
            >
              Iniciar solicitud
            </button>
          </div>
        </section>

        <section style={cardStyle}>
          <h2 style={cardHeaderStyle}>Solicitar Alojamiento Naval</h2>
          <p style={cardTextStyle}>
            Inicia el flujo institucional vigente de inscripcion para solicitar Alojamiento Naval.
          </p>
          <div style={{ marginTop: 16 }}>
            <button
              type="button"
              style={secondaryButtonStyle}
              onClick={() => navigate("/app/postulante/postulaciones/alojamiento")}
            >
              Iniciar solicitud
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
