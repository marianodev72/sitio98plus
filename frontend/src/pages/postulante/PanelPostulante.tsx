//frontend/src/pages/postulante/PanelPostulante.tsx
import { useNavigate } from "react-router-dom";

export default function PanelPostulante() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ marginTop: 0 }}>Panel del Postulante</h2>
      <p>Desde aquí puede iniciar su postulación y luego realizar el seguimiento.</p>

      <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button onClick={() => navigate("/app/postulante/nueva")}>
          Iniciar postulación (ANEXO 01)
        </button>

        <button onClick={() => navigate("/app/postulante/anexos")}>
          Ver Mis anexos
        </button>
      </div>
    </div>
  );
}
