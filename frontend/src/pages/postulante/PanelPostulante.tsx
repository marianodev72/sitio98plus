// frontend/src/pages/postulante/PanelPostulante.tsx
import { useNavigate } from "react-router-dom";

const containerStyle = {
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(255,255,255,0.05)",
  borderRadius: 12,
  padding: 24,
  color: "#F8FAFC",
};

const neutralButtonStyle = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#ffffff",
  borderRadius: 10,
  padding: "10px 14px",
  fontWeight: 700,
  cursor: "pointer" as const,
};

const primaryButtonStyle = {
  background: "rgba(59,130,246,0.20)",
  border: "1px solid rgba(255,255,255,0.12)",
  color: "#ffffff",
  borderRadius: 10,
  padding: "10px 14px",
  fontWeight: 800,
  cursor: "pointer" as const,
};

export default function PanelPostulante() {
  const navigate = useNavigate();

  return (
    <div style={containerStyle}>
      <h2 style={{ marginTop: 0, marginBottom: 8, color: "#F8FAFC" }}>
        Panel del Postulante
      </h2>
      <p style={{ margin: 0, color: "#CBD5E1" }}>
        Desde aquí puede iniciar su postulación y luego realizar el seguimiento.
      </p>

      <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          style={primaryButtonStyle}
          onClick={() => navigate("/app/postulante/nueva")}
        >
          Iniciar postulación (ANEXO 01)
        </button>

        <button
          style={neutralButtonStyle}
          onClick={() => navigate("/app/postulante/anexos")}
        >
          Ver Mis anexos
        </button>
      </div>
    </div>
  );
}
