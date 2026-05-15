import { useNavigate } from "react-router-dom";
import {
  cardStyle,
  secondaryButtonStyle,
  subtitleStyle,
  titleStyle,
} from "../permisionario/uiStyles";

const pageStyle = {
  maxWidth: 860,
  margin: "0 auto",
  padding: "clamp(12px, 2vw, 24px)",
  color: "#F8FAFC",
  boxSizing: "border-box" as const,
};

const noteStyle = {
  marginTop: 12,
  color: "rgba(255,255,255,0.76)",
  lineHeight: 1.65,
};

const badgeStyle = {
  display: "inline-flex",
  alignItems: "center",
  padding: "4px 10px",
  borderRadius: 999,
  border: "1px solid rgba(251,191,36,0.36)",
  background: "rgba(251,191,36,0.10)",
  color: "#fde68a",
  fontSize: 12,
  fontWeight: 800,
};

export default function PostulacionAlojamientoPlaceholder() {
  const navigate = useNavigate();

  return (
    <div style={pageStyle}>
      <h1 style={titleStyle}>Alojamiento Naval</h1>
      <p style={subtitleStyle}>Ingreso institucional al futuro trámite de Alojamientos Navales.</p>

      <section style={{ ...cardStyle, marginTop: 18 }}>
        <span style={badgeStyle}>Futuro ANEXO_21</span>
        <p style={noteStyle}>
          Esta sección queda preparada para el formulario de inscripción para ocupar Alojamiento Naval.
          En esta etapa no se generan formularios, no se envían solicitudes y no se modifica información operativa.
        </p>
        <p style={noteStyle}>
          Cuando el circuito documental sea habilitado, el trámite se integrará al módulo Alojamientos Navales
          respetando los controles institucionales de autenticación, autorización y trazabilidad.
        </p>
        <div style={{ marginTop: 18 }}>
          <button
            type="button"
            style={secondaryButtonStyle}
            onClick={() => navigate("/app/postulante/postulaciones")}
          >
            Volver a postulaciones
          </button>
        </div>
      </section>
    </div>
  );
}
