import { useNavigate } from "react-router-dom";

export default function PanelPostulante() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: 24 }}>
      <h2>Panel del Postulante</h2>
      <p>Desde aquí puede iniciar su postulación y luego realizar el seguimiento.</p>

      <div style={{ marginTop: 16 }}>
        <button onClick={() => navigate("/app/postulante/nueva")}>
          Iniciar postulación (ANEXO 01)
        </button>
      </div>
    </div>
  );
}
